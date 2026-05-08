import { db } from '../firebase';
import {
  collection, doc, getDocs, setDoc, deleteDoc, query,
  where, writeBatch
} from 'firebase/firestore';

// ── Acts ─────────────────────────────────────────────────────────────

/**
 * Atomically replace all acts for a show and upsert the show document.
 */
export async function saveShow(orgId, showId, label, cleanedActs) {
  const existing = await getDocs(query(collection(db, 'acts'), where('show_id', '==', showId)));
  const batch = writeBatch(db);

  batch.set(doc(db, 'shows', showId), { org_id: orgId, label });
  existing.docs.forEach(d => batch.delete(d.ref));
  cleanedActs.forEach(act => {
    batch.set(doc(collection(db, 'acts')), {
      show_id: showId,
      number: act.number,
      title: act.title,
      performers: act.performers,
    });
  });

  await batch.commit();
}

/**
 * Create a new show + initialize its show_status document.
 */
export async function createShow(orgId, id, label) {
  await setDoc(doc(db, 'shows', id), { org_id: orgId, label });
  await setDoc(doc(db, 'show_status', id), {
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
  const existing = await getDocs(query(collection(db, 'acts'), where('show_id', '==', showId)));
  const batch = writeBatch(db);
  existing.docs.forEach(d => batch.delete(d.ref));
  validatedActs.forEach(act => {
    batch.set(doc(collection(db, 'acts')), { show_id: showId, ...act });
  });
  await batch.commit();
  return validatedActs.map(({ number, title, performers }) => ({ number, title, performers }));
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
    const acts = showMap[showName];

    onProgress(`Creating "${showName}" (${acts.length} acts)...`);

    // Atomically create the show doc + show_status together
    const initBatch = writeBatch(db);
    initBatch.set(doc(db, 'shows', showId), { org_id: orgId, label: showName });
    initBatch.set(doc(db, 'show_status', showId), {
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
        batch.set(doc(collection(db, 'acts')), {
          show_id: showId,
          number: act.number,
          title: act.title,
          performers: act.performers,
        });
      });
      await batch.commit();
    }

    newRecitalData[showId] = {
      id: showId,
      label: showName,
      acts: acts.map(({ number, title, performers }) => ({ number, title, performers })),
    };
    totalActs += acts.length;
  }

  return { newRecitalData, totalActs };
}

// ── Organizations ────────────────────────────────────────────────────

export async function createOrg(formattedId, name, admins) {
  await setDoc(doc(db, 'organizations', formattedId), { name, admins });
}

export async function updateOrgAdmins(orgId, newAdmins) {
  await setDoc(doc(db, 'organizations', orgId), { admins: newAdmins }, { merge: true });
}

/**
 * Cascade-delete an entire org: shows, acts, show_status, org doc,
 * and scrub affected user favorites. Calls onProgress(msg) for log lines.
 * Returns { totalActs, showCount, usersUpdated }.
 */
export async function deleteStudio(targetOrgId, onProgress) {
  onProgress('Finding shows...');
  const showsSnap = await getDocs(query(collection(db, 'shows'), where('org_id', '==', targetOrgId)));
  const showIds = showsSnap.docs.map(d => d.id);
  onProgress(`Found ${showIds.length} show(s)`);

  let totalActs = 0;
  const allPerformers = new Set();

  for (const showId of showIds) {
    onProgress(`Deleting acts for show: ${showId}...`);
    const actsSnap = await getDocs(query(collection(db, 'acts'), where('show_id', '==', showId)));
    if (actsSnap.size > 0) {
      actsSnap.docs.forEach(d => {
        (d.data().performers || []).forEach(p => allPerformers.add(p));
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

  onProgress('Deleting shows...');
  await Promise.all(showIds.map(id => deleteDoc(doc(db, 'shows', id))));

  onProgress('Deleting show statuses...');
  await Promise.all(showIds.map(id => deleteDoc(doc(db, 'show_status', id))));

  onProgress('Deleting organization...');
  await Promise.all([
    deleteDoc(doc(db, 'organizations', targetOrgId)),
    deleteDoc(doc(db, 'test_organizations', targetOrgId)),
  ]);

  onProgress('Cleaning user favorites...');
  const keysToRemoveArr = [...allPerformers];
  for (let n = 1; n <= totalActs; n++) keysToRemoveArr.push(`act-${n}`);
  const keysToRemoveSet = new Set(keysToRemoveArr);

  const CHUNK = 30;
  const affectedUserMap = new Map();
  for (let i = 0; i < keysToRemoveArr.length; i += CHUNK) {
    const snap = await getDocs(query(
      collection(db, 'user_profiles'),
      where('favorites', 'array-contains-any', keysToRemoveArr.slice(i, i + CHUNK))
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
  onProgress(`Cleaned favorites from ${usersUpdated} user(s)`);

  return { totalActs, showCount: showIds.length, usersUpdated };
}
