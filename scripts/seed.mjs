/**
 * Seed script — populates Firestore with realistic test data.
 *
 * Run:  node scripts/seed.mjs
 *
 * It reads the same .env your app uses, so no extra config is needed.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env manually (no dotenv dependency) ──────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '..', '.env');
const envFile = readFileSync(envPath, 'utf-8');

const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

// ── Firebase init ──────────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, setDoc, writeBatch
} from 'firebase/firestore';

const app = initializeApp({
  apiKey:            env.VITE_FIREBASE_API_KEY,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

// ── Test Data ──────────────────────────────────────────────────────

const ORG_ID = 'dancers-pointe';

const organization = {
  name: "Dancer's Pointe",
  admins: [env.VITE_AUTHORIZED_ADMINS || 'jonny5v@gmail.com'],
};

// Two shows
const shows = [
  {
    id: '2026-spring-recital-saturday',
    label: '2026 Spring Recital — Saturday 2:00 PM',
    org_id: ORG_ID,
  },
  {
    id: '2026-spring-recital-sunday',
    label: '2026 Spring Recital — Sunday 4:00 PM',
    org_id: ORG_ID,
  },
];

// Realistic act names for a dance recital
const saturdayActs = [
  { number: 1,  title: 'Opening: A New Day',           performers: ['Emma Rodriguez', 'Sophia Chen', 'Olivia Martinez', 'Ava Johnson', 'Isabella Brown', 'Mia Davis'] },
  { number: 2,  title: 'Tiny Tutus',                   performers: ['Lily Thompson', 'Zoe Garcia', 'Chloe Wilson', 'Ella Moore'] },
  { number: 3,  title: 'Rhythm Nation',                 performers: ['Harper Lee', 'Aria Taylor', 'Luna Anderson', 'Scarlett Thomas', 'Grace Jackson'] },
  { number: 4,  title: 'Swan Lake (Excerpt)',           performers: ['Emma Rodriguez', 'Madison White', 'Abigail Harris'] },
  { number: 5,  title: 'Hip Hop Remix',                 performers: ['Jayden Clark', 'Ethan Lewis', 'Liam Robinson', 'Noah Walker', 'Aria Taylor'] },
  { number: 6,  title: 'Butterfly Garden',              performers: ['Chloe Wilson', 'Lily Thompson', 'Zoe Garcia', 'Penelope Hall'] },
  { number: 7,  title: 'Contemporary Dreams',           performers: ['Sophia Chen', 'Madison White', 'Abigail Harris', 'Grace Jackson'] },
  { number: 8,  title: 'Jazz Hands',                    performers: ['Scarlett Thomas', 'Harper Lee', 'Layla Allen', 'Riley Young'] },
  { number: 9,  title: 'Frozen Fantasies',              performers: ['Ella Moore', 'Lily Thompson', 'Penelope Hall', 'Chloe Wilson', 'Zoe Garcia'] },
  { number: 10, title: 'Tap Attack',                    performers: ['Luna Anderson', 'Aria Taylor', 'Riley Young', 'Layla Allen'] },
  { number: 11, title: 'The Nutcracker Suite',          performers: ['Emma Rodriguez', 'Sophia Chen', 'Olivia Martinez', 'Madison White'] },
  { number: 12, title: 'Acro Stars',                    performers: ['Ava Johnson', 'Isabella Brown', 'Mia Davis', 'Jayden Clark'] },
  { number: 13, title: 'Lyrical: Chasing Light',        performers: ['Grace Jackson', 'Abigail Harris', 'Scarlett Thomas', 'Harper Lee'] },
  { number: 14, title: 'Musical Theater Medley',        performers: ['Riley Young', 'Layla Allen', 'Luna Anderson', 'Ella Moore', 'Penelope Hall'] },
  { number: 15, title: 'Pointe Perfection',             performers: ['Emma Rodriguez', 'Sophia Chen', 'Madison White'] },
  { number: 16, title: 'K-Pop Energy',                  performers: ['Aria Taylor', 'Scarlett Thomas', 'Harper Lee', 'Jayden Clark', 'Ethan Lewis', 'Liam Robinson'] },
  { number: 17, title: 'Under the Sea',                 performers: ['Lily Thompson', 'Zoe Garcia', 'Chloe Wilson', 'Ella Moore', 'Penelope Hall'] },
  { number: 18, title: 'Ballroom Elegance',             performers: ['Olivia Martinez', 'Noah Walker', 'Ava Johnson', 'Ethan Lewis'] },
  { number: 19, title: 'Finale: We Are the Light',      performers: ['Emma Rodriguez', 'Sophia Chen', 'Olivia Martinez', 'Ava Johnson', 'Isabella Brown', 'Mia Davis', 'Aria Taylor', 'Grace Jackson', 'Madison White', 'Abigail Harris', 'Scarlett Thomas', 'Harper Lee'] },
];

const sundayActs = [
  { number: 1,  title: 'Opening: Rise Up',             performers: ['Natalie Kim', 'Victoria Scott', 'Samantha Green', 'Hannah Adams', 'Audrey Baker'] },
  { number: 2,  title: 'Little Stars',                  performers: ['Claire Nelson', 'Maya Carter', 'Ruby Mitchell', 'Stella Perez'] },
  { number: 3,  title: 'Bollywood Beats',               performers: ['Priya Patel', 'Anaya Shah', 'Natalie Kim', 'Samantha Green', 'Hannah Adams'] },
  { number: 4,  title: 'Classical Elegance',            performers: ['Victoria Scott', 'Audrey Baker', 'Charlotte Evans'] },
  { number: 5,  title: 'Street Jazz',                   performers: ['Zara Campbell', 'Brooklyn Stewart', 'Jasmine Morris', 'Savannah Rogers'] },
  { number: 6,  title: 'Enchanted Forest',              performers: ['Claire Nelson', 'Maya Carter', 'Ruby Mitchell', 'Stella Perez', 'Ivy Cooper'] },
  { number: 7,  title: 'Modern: Gravity',               performers: ['Victoria Scott', 'Charlotte Evans', 'Audrey Baker'] },
  { number: 8,  title: 'Salsa Caliente',                performers: ['Priya Patel', 'Anaya Shah', 'Zara Campbell', 'Brooklyn Stewart'] },
  { number: 9,  title: "Cinderella's Waltz",            performers: ['Claire Nelson', 'Maya Carter', 'Stella Perez', 'Ivy Cooper'] },
  { number: 10, title: 'Tap Spectacular',               performers: ['Jasmine Morris', 'Savannah Rogers', 'Hannah Adams', 'Samantha Green'] },
  { number: 11, title: 'Pas de Deux',                   performers: ['Natalie Kim', 'Victoria Scott'] },
  { number: 12, title: 'Tumbling Thunder',              performers: ['Brooklyn Stewart', 'Zara Campbell', 'Jasmine Morris'] },
  { number: 13, title: 'Lyrical: Paper Wings',          performers: ['Audrey Baker', 'Charlotte Evans', 'Savannah Rogers', 'Hannah Adams'] },
  { number: 14, title: 'Broadway Baby',                 performers: ['Ruby Mitchell', 'Stella Perez', 'Ivy Cooper', 'Claire Nelson', 'Maya Carter'] },
  { number: 15, title: 'Pointe: Giselle Variation',     performers: ['Natalie Kim', 'Victoria Scott', 'Charlotte Evans'] },
  { number: 16, title: 'Finale: Shine Together',        performers: ['Natalie Kim', 'Victoria Scott', 'Samantha Green', 'Hannah Adams', 'Audrey Baker', 'Charlotte Evans', 'Priya Patel', 'Anaya Shah', 'Zara Campbell', 'Brooklyn Stewart'] },
];

// ── Seed Logic ─────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Seeding Firestore...\n');

  // 1. Create organization (in both prefixed and unprefixed collections)
  console.log(`   📁  Organization: ${ORG_ID}`);
  await setDoc(doc(db, 'organizations', ORG_ID), organization);
  await setDoc(doc(db, 'test_organizations', ORG_ID), organization);

  // 2. Create shows
  for (const show of shows) {
    console.log(`   🎭  Show: ${show.label}`);
    await setDoc(doc(db, 'shows', show.id), {
      org_id: show.org_id,
      label: show.label,
    });
  }

  // 3. Create acts (batch write for speed)
  const allActs = [
    ...saturdayActs.map(a => ({ ...a, show_id: shows[0].id })),
    ...sundayActs.map(a => ({ ...a, show_id: shows[1].id })),
  ];

  // Firestore batch limit is 500, we're well under
  const batch = writeBatch(db);
  for (const act of allActs) {
    const actRef = doc(collection(db, 'acts'));
    batch.set(actRef, {
      show_id: act.show_id,
      number: act.number,
      title: act.title,
      performers: act.performers,
    });
  }
  await batch.commit();
  console.log(`   💃  ${allActs.length} acts created across ${shows.length} shows`);

  // 4. Initialize show_status for live tracking demo
  for (const show of shows) {
    await setDoc(doc(db, 'show_status', show.id), {
      show_id: show.id,
      org_id: ORG_ID,
      current_act_number: 1,
      is_tracking: false,
      updated_at: new Date().toISOString(),
    });
  }
  console.log('   📡  Show status initialized\n');

  console.log('✅  Done! Your test data is ready.');
  console.log(`   Org ID:    ${ORG_ID}`);
  console.log(`   Shows:     ${shows.length}`);
  console.log(`   Total Acts: ${allActs.length}`);
  console.log(`   Sat Acts:  ${saturdayActs.length}`);
  console.log(`   Sun Acts:  ${sundayActs.length}\n`);
  console.log('🚀  Run "npm run dev" and select "Dancer\'s Pointe" to see the data.');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
