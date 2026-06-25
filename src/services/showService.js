import { db, coll } from '../firebase';
import { newActId } from '../utils/ids';
import {
  collection, doc, getDocs, setDoc, deleteDoc, query,
  where, writeBatch
} from 'firebase/firestore';

// Normalize an act title for matching across a CSV re-upload (case- and
// whitespace-insensitive) so trivial formatting differences don't orphan notes.
const normalizeTitle = (title) => (title || '').trim().replace(/\s+/g, ' ').toLowerCase();

// ── Favorites ────────────────────────────────────────────────────────

/**
 * Remove the given favorite keys (act keys like `act-<showId>-<n>` and/or
 * dancer names) from every user profile that holds any of them. Chunks the
 * array-contains-any reads (Firestore's 30-value limit) and batches the
 * writes. Returns the number of user profiles updated.
 */
async function scrubFavorites(keysToRemove) {
  if (keysToRemove.length === 0) return 0;
  const keysToRemoveSet = new Set(keysToRemove);
  const CHUNK = 30;
  const affectedUserMap = new Map();
  for (let i = 0; i < keysToRemove.length; i += CHUNK) {
    const snap = await getDocs(query(
      collection(db, coll('user_profiles')),
      where('favorites', 'array-contains-any', keysToRemove.slice(i, i + CHUNK))
    ));
    snap.docs.forEach(d => affectedUserMap.set(d.id, d));
  }

  let usersUpdated = 0;
  if (affectedUserMap.size > 0) {
    const affected = [...affectedUserMap.values()];
    for (let i = 0; i < affected.length; i += 500) {
      const batch = writeBatch(db);
      affected.slice(i, i + 500).forEach(userDoc => {
        const favs = userDoc.data().favorites;
        if (!Array.isArray(favs)) return;
        batch.set(userDoc.ref, { favorites: favs.filter(f => !keysToRemoveSet.has(f)) }, { merge: true });
        usersUpdated++;
      });
      await batch.commit();
    }
  }
  return usersUpdated;
}

// ── Acts ─────────────────────────────────────────────────────────────

/**
 * Atomically replace all acts for a show and upsert the show document.
 */
export async function saveShow(orgId, showId, label, cleanedActs) {
  const existing = await getDocs(query(collection(db, coll('acts')), where('show_id', '==', showId)));
  const batch = writeBatch(db);

  // Bump updated_at so live viewers refetch acts (their cache is keyed on it).
  batch.set(doc(db, coll('shows'), showId), { org_id: orgId, label, updated_at: new Date().toISOString() });
  existing.docs.forEach(d => batch.delete(d.ref));
  cleanedActs.forEach(act => {
    batch.set(doc(collection(db, coll('acts'))), {
      show_id: showId,
      number: act.number,
      title: act.title,
      performers: act.performers,
      // Stable logical id — preserved from the act if it already has one
      // (so reorders/edits keep it), generated here for legacy/new acts.
      id: act.id || newActId(),
    });
  });

  await batch.commit();
}

/**
 * Create a new show + initialize its show_status document.
 */
export async function createShow(orgId, id, label) {
  await setDoc(doc(db, coll('shows'), id), { org_id: orgId, label, updated_at: new Date().toISOString() });
  await setDoc(doc(db, coll('show_status'), id), {
    show_id: id,
    org_id: orgId,
    current_act_number: 1,
    is_tracking: false,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Replace acts for a single show from a validated acts array.
 * Returns the saved acts (number/title/performers only).
 */
export async function uploadActsForShow(showId, validatedActs) {
  const existing = await getDocs(query(collection(db, coll('acts')), where('show_id', '==', showId)));

  // Preserve each dance's stable id across re-upload so private notes (keyed on
  // act.id) stay attached. The CSV carries no ids, so match incoming acts to the
  // acts currently saved by title. Matching by title — not number — keeps a note
  // with its dance through reordering/renumbering, and correctly orphans the note
  // when a dance is *replaced* (a number-based match would misattach it to the
  // new dance). Duplicate titles are consumed in number order. Acts whose title
  // has no match (new or renamed dances) get a fresh id.
  const titleQueues = new Map();
  existing.docs
    .map(d => d.data())
    .filter(a => a.id)
    .sort((a, b) => (a.number || 0) - (b.number || 0))
    .forEach(a => {
      const key = normalizeTitle(a.title);
      if (!titleQueues.has(key)) titleQueues.set(key, []);
      titleQueues.get(key).push(a.id);
    });

  const actsWithIds = validatedActs.map(act => {
    if (act.id) return act;
    const queue = titleQueues.get(normalizeTitle(act.title));
    const preservedId = queue && queue.length ? queue.shift() : null;
    return { ...act, id: preservedId || newActId() };
  });

  const batch = writeBatch(db);
  existing.docs.forEach(d => batch.delete(d.ref));
  actsWithIds.forEach(act => {
    batch.set(doc(collection(db, coll('acts'))), { show_id: showId, ...act });
  });
  // Bump updated_at so live viewers refetch acts (their cache is keyed on it).
  batch.set(doc(db, coll('shows'), showId), { updated_at: new Date().toISOString() }, { merge: true });
  await batch.commit();
  return actsWithIds.map(({ number, title, performers, id }) => ({ number, title, performers, id }));
}

/**
 * Import multiple shows + acts from a pre-validated showMap.
 * Calls onProgress(msg) for each log line.
 * Returns { newRecitalData, totalActs }.
 */
export async function bulkImportShows(orgId, showMap, existingRecitalData, onProgress) {
  const showNames = Object.keys(showMap);
  let totalActs = 0;
  const newRecitalData = { ...existingRecitalData };

  for (const showName of showNames) {
    const showId = `${orgId}-${showName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
    // Assign stable ids once, shared by the persisted docs and newRecitalData.
    const acts = showMap[showName].map(act => ({ ...act, id: act.id || newActId() }));

    onProgress(`Creating "${showName}" (${acts.length} acts)...`);

    // Atomically create the show doc + show_status together
    const initBatch = writeBatch(db);
    initBatch.set(doc(db, coll('shows'), showId), { org_id: orgId, label: showName, updated_at: new Date().toISOString() });
    initBatch.set(doc(db, coll('show_status'), showId), {
      show_id: showId,
      org_id: orgId,
      current_act_number: 1,
      is_tracking: false,
      updated_at: new Date().toISOString(),
    });
    await initBatch.commit();

    for (let i = 0; i < acts.length; i += 400) {
      const chunk = acts.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(act => {
        batch.set(doc(collection(db, coll('acts'))), {
          show_id: showId,
          number: act.number,
          title: act.title,
          performers: act.performers,
          id: act.id,
        });
      });
      await batch.commit();
    }

    newRecitalData[showId] = {
      id: showId,
      label: showName,
      acts: acts.map(({ number, title, performers, id }) => ({ number, title, performers, id })),
    };
    totalActs += acts.length;
  }

  return { newRecitalData, totalActs };
}

/**
 * Delete a single show: its acts, the show doc, and its show_status,
 * then scrub now-orphaned favorites from affected user profiles —
 * this show's act keys (`act-<showId>-<n>`) plus any dancer name that no
 * longer appears in another show of the same org. Dancer names still used
 * by other shows are preserved so their schedules stay intact.
 * Calls onProgress(msg) for each log line.
 * Returns { actCount, dancersRemoved, usersUpdated }.
 */
export async function deleteShow(orgId, showId, onProgress = () => {}) {
  onProgress('Loading acts...');
  const actsSnap = await getDocs(query(collection(db, coll('acts')), where('show_id', '==', showId)));
  const actCount = actsSnap.size;

  const showPerformers = new Set();
  const actNumbers = [];
  actsSnap.docs.forEach(d => {
    const data = d.data();
    if (typeof data.number === 'number') actNumbers.push(data.number);
    (data.performers || []).forEach(p => showPerformers.add(p));
  });

  // Collect dancer names that survive in the org's other shows so we don't
  // unfavorite a dancer who is still performing elsewhere.
  onProgress('Checking remaining shows...');
  const remainingPerformers = new Set();
  if (showPerformers.size > 0) {
    const orgShowsSnap = await getDocs(query(collection(db, coll('shows')), where('org_id', '==', orgId)));
    const otherShowIds = orgShowsSnap.docs.map(d => d.id).filter(id => id !== showId);
    if (otherShowIds.length > 0) {
      const otherActs = await Promise.all(
        otherShowIds.map(id => getDocs(query(collection(db, coll('acts')), where('show_id', '==', id))))
      );
      otherActs.forEach(snap => snap.docs.forEach(d => {
        (d.data().performers || []).forEach(p => remainingPerformers.add(p));
      }));
    }
  }

  onProgress(`Deleting ${actCount} acts...`);
  for (let i = 0; i < actsSnap.docs.length; i += 400) {
    const batch = writeBatch(db);
    actsSnap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  onProgress('Deleting show...');
  await Promise.all([
    deleteDoc(doc(db, coll('shows'), showId)),
    deleteDoc(doc(db, coll('show_status'), showId)),
  ]);

  // Favorites to scrub: this show's act keys + dancers orphaned by the delete.
  const orphanNames = [...showPerformers].filter(name => !remainingPerformers.has(name));
  const keysToRemove = [
    ...actNumbers.map(n => `act-${showId}-${n}`),
    ...orphanNames,
  ];

  onProgress('Cleaning schedules...');
  const usersUpdated = await scrubFavorites(keysToRemove);
  onProgress(`Cleaned schedules for ${usersUpdated} user(s)`);

  return { actCount, dancersRemoved: orphanNames.length, usersUpdated };
}

// ── Organizations ────────────────────────────────────────────────────

export async function createOrg(formattedId, name, admins) {
  // slug mirrors the doc id so the identifier is readable in queries/exports
  await setDoc(doc(db, coll('organizations'), formattedId), { name, admins, slug: formattedId });
}

export async function updateOrgAdmins(orgId, newAdmins) {
  await setDoc(doc(db, coll('organizations'), orgId), { admins: newAdmins }, { merge: true });
}

/**
 * Rename a studio's display name. The document id is intentionally never
 * changed — it's referenced by shows.org_id, share links, and localStorage.
 * The slug field is (re)written alongside as a backfill for org docs created
 * before slugs were stored.
 */
export async function updateOrgName(orgId, name) {
  await setDoc(doc(db, coll('organizations'), orgId), { name, slug: orgId }, { merge: true });
}

/**
 * Find shows whose org_id doesn't match any existing organization doc —
 * the result of an org being deleted and recreated under a different id
 * (e.g. "dancer-s-pointe" → "dancers-pointe"). Returns a map of
 * { orphanOrgId: [{ id, label }, ...] }.
 */
export async function findOrphanedShows() {
  const [orgsSnap, showsSnap] = await Promise.all([
    getDocs(collection(db, coll('organizations'))),
    getDocs(collection(db, coll('shows'))),
  ]);
  const orgIds = new Set(orgsSnap.docs.map(d => d.id));
  const orphans = {};
  showsSnap.docs.forEach(d => {
    const data = d.data();
    if (data.org_id && orgIds.has(data.org_id)) return;
    const key = data.org_id || '(no org_id)';
    if (!orphans[key]) orphans[key] = [];
    orphans[key].push({ id: d.id, label: data.label || d.id });
  });
  return orphans;
}

/**
 * Re-point shows (and their show_status docs) to another organization.
 * Acts and favorites are keyed by show_id, so they follow automatically.
 */
export async function relinkShows(showIds, toOrgId) {
  // 250 shows × 2 writes stays within Firestore's 500-op batch limit
  for (let i = 0; i < showIds.length; i += 250) {
    const batch = writeBatch(db);
    showIds.slice(i, i + 250).forEach(id => {
      batch.set(doc(db, coll('shows'), id), { org_id: toOrgId, updated_at: new Date().toISOString() }, { merge: true });
      batch.set(doc(db, coll('show_status'), id), { show_id: id, org_id: toOrgId }, { merge: true });
    });
    await batch.commit();
  }
}

/**
 * Cascade-delete an entire org: shows, acts, show_status, org doc,
 * and scrub affected user favorites. Calls onProgress(msg) for log lines.
 * Returns { totalActs, showCount, usersUpdated }.
 */
export async function deleteStudio(targetOrgId, onProgress) {
  onProgress('Finding shows...');
  const showsSnap = await getDocs(query(collection(db, coll('shows')), where('org_id', '==', targetOrgId)));
  const showIds = showsSnap.docs.map(d => d.id);
  onProgress(`Found ${showIds.length} show(s)`);

  let totalActs = 0;
  const allPerformers = new Set();
  const actKeys = [];

  for (const showId of showIds) {
    onProgress(`Deleting acts for show: ${showId}...`);
    const actsSnap = await getDocs(query(collection(db, coll('acts')), where('show_id', '==', showId)));
    if (actsSnap.size > 0) {
      actsSnap.docs.forEach(d => {
        const data = d.data();
        if (typeof data.number === 'number') actKeys.push(`act-${showId}-${data.number}`);
        (data.performers || []).forEach(p => allPerformers.add(p));
      });
      for (let i = 0; i < actsSnap.docs.length; i += 400) {
        const batch = writeBatch(db);
        actsSnap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      totalActs += actsSnap.size;
    }
  }
  onProgress(`Deleted ${totalActs} acts`);

  // Dancer names still performing in OTHER studios must keep their favorites.
  onProgress('Checking other studios...');
  const externalPerformers = new Set();
  if (allPerformers.size > 0) {
    const deletedShowIds = new Set(showIds);
    const allShowsSnap = await getDocs(collection(db, coll('shows')));
    const externalShowIds = allShowsSnap.docs.map(d => d.id).filter(id => !deletedShowIds.has(id));
    if (externalShowIds.length > 0) {
      const externalActs = await Promise.all(
        externalShowIds.map(id => getDocs(query(collection(db, coll('acts')), where('show_id', '==', id))))
      );
      externalActs.forEach(snap => snap.docs.forEach(d => {
        (d.data().performers || []).forEach(p => externalPerformers.add(p));
      }));
    }
  }

  onProgress('Deleting shows...');
  await Promise.all(showIds.map(id => deleteDoc(doc(db, coll('shows'), id))));

  onProgress('Deleting show statuses...');
  await Promise.all(showIds.map(id => deleteDoc(doc(db, coll('show_status'), id))));

  onProgress('Deleting organization...');
  await deleteDoc(doc(db, coll('organizations'), targetOrgId));

  onProgress('Cleaning user favorites...');
  const orphanNames = [...allPerformers].filter(name => !externalPerformers.has(name));
  const keysToRemove = [...actKeys, ...orphanNames];
  const usersUpdated = await scrubFavorites(keysToRemove);
  onProgress(`Cleaned favorites from ${usersUpdated} user(s)`);

  return { totalActs, showCount: showIds.length, usersUpdated };
}
