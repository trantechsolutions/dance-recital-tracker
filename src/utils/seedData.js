import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';

// ── Name Pools ─────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Emma', 'Sophia', 'Olivia', 'Ava', 'Isabella', 'Mia', 'Lily', 'Zoe',
  'Chloe', 'Ella', 'Harper', 'Aria', 'Luna', 'Scarlett', 'Grace', 'Madison',
  'Abigail', 'Riley', 'Layla', 'Penelope', 'Natalie', 'Victoria', 'Samantha',
  'Hannah', 'Audrey', 'Claire', 'Maya', 'Ruby', 'Stella', 'Ivy', 'Priya',
  'Anaya', 'Zara', 'Brooklyn', 'Jasmine', 'Savannah', 'Charlotte', 'Jayden',
  'Ethan', 'Liam', 'Noah', 'Camila', 'Valentina', 'Nora', 'Hazel', 'Aurora',
  'Ellie', 'Paisley', 'Willow', 'Emilia', 'Violet', 'Nova', 'Isla', 'Jade',
  'Kinsley', 'Delilah', 'Sienna', 'Ariana', 'Aaliyah', 'Mackenzie', 'Kylie',
  'Gianna', 'Maeve', 'Autumn', 'Piper', 'Taylor', 'Jordyn', 'Sydney', 'Reagan',
  'Brianna', 'Kennedy', 'Leilani', 'Catalina', 'Alina', 'Athena', 'Myla',
  'Vera', 'Amara', 'Daisy', 'Sage', 'Brielle', 'Raelynn', 'Kaia', 'Eliana',
  'Iris', 'Fiona', 'Anastasia', 'Esmeralda', 'Serena', 'Juliana', 'Lola',
  'Tessa', 'Margot', 'Elena', 'Freya', 'Wren', 'Thea', 'Rowan', 'June',
];

const LAST_NAMES = [
  'Rodriguez', 'Chen', 'Martinez', 'Johnson', 'Brown', 'Davis', 'Thompson',
  'Garcia', 'Wilson', 'Moore', 'Lee', 'Taylor', 'Anderson', 'Thomas', 'Jackson',
  'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Allen',
  'Young', 'Kim', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter',
  'Mitchell', 'Perez', 'Cooper', 'Patel', 'Shah', 'Campbell', 'Stewart',
  'Morris', 'Rogers', 'Evans', 'Murphy', 'Rivera', 'Nguyen', 'Singh', 'Park',
  'Sullivan', 'Bennett', 'Coleman', 'Foster', 'Brooks', 'Reed', 'Hayes',
  'Ortiz', 'Ramirez', 'Flores', 'Cruz', 'Gomez', 'Diaz', 'Reyes', 'Morales',
  'Chang', 'Wu', 'Liu', 'Yang', 'Tanaka', 'Sato', 'Yamamoto', 'Watanabe',
];

const STUDIO_NAMES = [
  "Dancer's Pointe", 'Starlight Dance Academy', 'Rhythm & Grace Studio',
  'Elite Dance Company', 'Pirouette Dance Center', 'Allegro Dance Academy',
  'Dance Fusion Studio', 'The Dance Collective', 'Arabesque Academy',
  'Momentum Dance Studio', 'Silver Slipper Dance', 'En Pointe Academy',
  'Harmony Dance Center', 'Leaps & Bounds Dance', 'The Moving Arts Studio',
];

const ACT_TITLES = [
  // Opening/Closing
  'Opening: A New Day', 'Opening: Rise Up', 'Opening: Here We Go', 'Opening: Spotlight',
  'Finale: We Are the Light', 'Finale: Shine Together', 'Finale: Take a Bow', 'Finale: Standing Ovation',
  // Ballet
  'Swan Lake (Excerpt)', 'The Nutcracker Suite', 'Sleeping Beauty Waltz', 'Giselle Variation',
  'Pas de Deux', 'Pointe Perfection', 'Classical Elegance', 'Ballet Blanc',
  'Coppélia Dreams', 'Don Quixote Variation', 'La Bayadère', 'Raymonda',
  // Jazz
  'Jazz Hands', 'All That Jazz', 'Street Jazz', 'Jazz Explosion', 'Cool Cat Jazz',
  'Razzle Dazzle', 'Sassy Strut', 'Jazz Noir', 'Cabaret Nights',
  // Hip Hop
  'Hip Hop Remix', 'K-Pop Energy', 'Street Beats', 'Break It Down', 'Rhythm Nation',
  'Urban Groove', 'Pop & Lock', 'Boombox Blast', 'Neon Lights',
  // Contemporary/Lyrical
  'Contemporary Dreams', 'Lyrical: Chasing Light', 'Lyrical: Paper Wings',
  'Modern: Gravity', 'Freefall', 'Echoes', 'Unraveling', 'Breathe',
  'Reflections', 'Silhouettes', 'Broken Beautiful', 'Ocean of Emotion',
  // Tap
  'Tap Attack', 'Tap Spectacular', 'Rhythm Makers', 'Happy Feet', 'Shuffle & Stomp',
  'Syncopation Station', 'Tap That Beat', 'The Tap Pack',
  // Theme/Character
  'Frozen Fantasies', 'Under the Sea', 'Enchanted Forest', 'Butterfly Garden',
  "Cinderella's Waltz", 'Wonderland', 'Stardust', 'Pixie Dust',
  'Candyland', 'Toy Soldier March', 'Once Upon a Time', 'Fairy Tale Ball',
  // Young/Kids
  'Tiny Tutus', 'Little Stars', 'Baby Ballerinas', 'Twinkle Toes',
  'Itty Bitty Ballet', 'Mini Movers', 'Petite Performers', 'Sparkle Squad',
  // World/Cultural
  'Bollywood Beats', 'Salsa Caliente', 'Ballroom Elegance', 'Flamenco Fire',
  'Irish Jig', 'Samba Spirit', 'Tango Nights', 'African Rhythms',
  // Acro/Tumble
  'Acro Stars', 'Tumbling Thunder', 'Gravity Defiers', 'Flip Factory',
  // Musical Theater
  'Musical Theater Medley', 'Broadway Baby', 'West Side Story', 'Chicago Nights',
  'A Chorus Line', 'Grease Lightning', 'Moulin Rouge', 'Hamilton Hustle',
];

const SHOW_LABELS = [
  'Spring Recital', 'Winter Showcase', 'Summer Spectacular', 'Fall Festival',
  'Holiday Performance', 'Year-End Gala', 'Annual Showcase', 'Dance Festival',
  'Spring Showcase', 'Celebration of Dance',
];

const DAYS_TIMES = [
  'Friday 6:00 PM', 'Friday 7:30 PM', 'Saturday 11:00 AM', 'Saturday 2:00 PM',
  'Saturday 5:00 PM', 'Saturday 7:00 PM', 'Sunday 1:00 PM', 'Sunday 4:00 PM',
  'Sunday 6:30 PM',
];

// ── Helpers ────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateDancerPool(count) {
  const names = new Set();
  while (names.size < count) {
    names.add(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`);
  }
  return [...names];
}

function generateActs(count, dancerPool) {
  const usedTitles = new Set();
  const acts = [];

  for (let i = 1; i <= count; i++) {
    let title;
    // First act is always an opening, last is always a finale
    if (i === 1) {
      title = pick(ACT_TITLES.filter(t => t.startsWith('Opening')));
    } else if (i === count) {
      title = pick(ACT_TITLES.filter(t => t.startsWith('Finale')));
    } else {
      // Pick a unique title
      const available = ACT_TITLES.filter(t => !usedTitles.has(t) && !t.startsWith('Opening') && !t.startsWith('Finale'));
      title = available.length > 0 ? pick(available) : `Act ${i}`;
    }
    usedTitles.add(title);

    const performerCount = rand(1, Math.min(12, dancerPool.length));
    const performers = pickN(dancerPool, performerCount);

    acts.push({ number: i, title, performers });
  }

  return acts;
}

function generateShows(orgId, count, dancerPool) {
  const usedLabels = new Set();
  const shows = [];

  for (let i = 0; i < count; i++) {
    let label;
    const available = SHOW_LABELS.filter(l => !usedLabels.has(l));
    label = available.length > 0 ? pick(available) : `Show ${i + 1}`;
    usedLabels.add(label);

    const dayTime = DAYS_TIMES[i % DAYS_TIMES.length];
    const fullLabel = `2026 ${label} — ${dayTime}`;
    const id = `${orgId}-${slugify(label)}-${i}`;

    const actCount = rand(20, 35);
    const acts = generateActs(actCount, dancerPool);

    shows.push({ id, label: fullLabel, org_id: orgId, acts });
  }

  return shows;
}

function generateStudios() {
  const studioCount = rand(2, 4);
  const pickedNames = pickN(STUDIO_NAMES, studioCount);

  return pickedNames.map(name => {
    const orgId = slugify(name);
    const showCount = rand(1, 5);
    const dancerPoolSize = rand(20, 60);
    const dancerPool = generateDancerPool(dancerPoolSize);
    const shows = generateShows(orgId, showCount, dancerPool);

    return {
      orgId,
      name,
      admins: ['jonny5v@gmail.com'],
      shows,
      dancerPool,
    };
  });
}

// ── Seed ───────────────────────────────────────────────────────────

const MANIFEST_REF = '_seed_manifest/latest';

export async function seedDatabase(onProgress) {
  const log = (msg) => onProgress?.(msg);

  const studios = generateStudios();

  // Build manifest for later cleanup
  const manifest = {
    orgIds: [],
    showIds: [],
    allPerformers: new Set(),
    seededAt: new Date().toISOString(),
  };

  for (const studio of studios) {
    log(`Creating studio: ${studio.name}...`);
    manifest.orgIds.push(studio.orgId);

    await setDoc(doc(db, 'organizations', studio.orgId), {
      name: studio.name,
      admins: studio.admins,
    });
    await setDoc(doc(db, 'test_organizations', studio.orgId), {
      name: studio.name,
      admins: studio.admins,
    });

    for (const show of studio.shows) {
      log(`  Show: ${show.label} (${show.acts.length} acts)...`);
      manifest.showIds.push(show.id);

      await setDoc(doc(db, 'shows', show.id), {
        org_id: show.org_id,
        label: show.label,
      });

      // Batch write acts (Firestore batch limit = 500)
      const acts = show.acts;
      for (let i = 0; i < acts.length; i += 400) {
        const chunk = acts.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const act of chunk) {
          const actRef = doc(collection(db, 'acts'));
          batch.set(actRef, {
            show_id: show.id,
            number: act.number,
            title: act.title,
            performers: act.performers,
          });
          act.performers.forEach(p => manifest.allPerformers.add(p));
        }
        await batch.commit();
      }

      // Initialize show_status
      await setDoc(doc(db, 'show_status', show.id), {
        show_id: show.id,
        org_id: show.org_id,
        current_act_number: 1,
        is_tracking: false,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Save manifest so clear knows what to delete
  log('Saving seed manifest...');
  await setDoc(doc(db, MANIFEST_REF), {
    orgIds: manifest.orgIds,
    showIds: manifest.showIds,
    allPerformers: [...manifest.allPerformers],
    seededAt: manifest.seededAt,
  });

  const totalShows = studios.reduce((s, st) => s + st.shows.length, 0);
  const totalActs = studios.reduce((s, st) => s + st.shows.reduce((a, sh) => a + sh.acts.length, 0), 0);

  log(`Done! ${studios.length} studios, ${totalShows} shows, ${totalActs} acts.`);

  return {
    studios: studios.length,
    shows: totalShows,
    totalActs,
    performers: manifest.allPerformers.size,
  };
}

// ── Clear ──────────────────────────────────────────────────────────

export async function clearSeedData(onProgress) {
  const log = (msg) => onProgress?.(msg);

  // 1. Read the manifest
  log('Reading seed manifest...');
  const manifestSnap = await getDoc(doc(db, MANIFEST_REF));

  if (!manifestSnap.exists()) {
    throw new Error('No seed manifest found. Nothing to clear.');
  }

  const { orgIds, showIds, allPerformers } = manifestSnap.data();
  let deletedActs = 0;

  // 2. Delete acts for each seeded show
  for (const showId of showIds) {
    log(`Deleting acts for show: ${showId}...`);
    const actsSnap = await getDocs(query(collection(db, 'acts'), where('show_id', '==', showId)));
    if (actsSnap.size > 0) {
      // Batch in chunks of 400
      const docs = actsSnap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      deletedActs += actsSnap.size;
    }
  }

  // 3. Delete shows
  log(`Deleting ${showIds.length} shows...`);
  for (const showId of showIds) {
    await deleteDoc(doc(db, 'shows', showId));
  }

  // 4. Delete show_status
  log('Deleting show statuses...');
  for (const showId of showIds) {
    await deleteDoc(doc(db, 'show_status', showId));
  }

  // 5. Delete organizations
  log(`Deleting ${orgIds.length} organizations...`);
  for (const orgId of orgIds) {
    await deleteDoc(doc(db, 'organizations', orgId));
    await deleteDoc(doc(db, 'test_organizations', orgId));
  }

  // 6. Scrub favorites from all user profiles
  log('Cleaning favorites from user profiles...');
  const seededKeys = new Set(allPerformers || []);
  // Also add act-N patterns (acts go up to 35 max)
  for (let n = 1; n <= 50; n++) {
    seededKeys.add(`act-${n}`);
  }

  let usersUpdated = 0;
  const usersSnap = await getDocs(collection(db, 'user_profiles'));
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const favs = data.favorites;
    if (!Array.isArray(favs) || favs.length === 0) continue;

    const cleaned = favs.filter(f => !seededKeys.has(f));
    if (cleaned.length !== favs.length) {
      await setDoc(userDoc.ref, { favorites: cleaned }, { merge: true });
      usersUpdated++;
    }
  }

  // 7. Delete the manifest itself
  log('Removing seed manifest...');
  await deleteDoc(doc(db, MANIFEST_REF));

  log(`Done! Removed ${deletedActs} acts, ${showIds.length} shows, ${orgIds.length} studios, cleaned ${usersUpdated} user(s).`);

  return {
    deletedActs,
    shows: showIds.length,
    studios: orgIds.length,
    usersUpdated,
  };
}
