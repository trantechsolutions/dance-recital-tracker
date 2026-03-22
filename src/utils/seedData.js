import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';

const ORG_ID = 'dancers-pointe';

const organization = {
  name: "Dancer's Pointe",
  admins: ['jonny5v@gmail.com'],
};

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

export async function seedDatabase(onProgress) {
  const log = (msg) => onProgress?.(msg);

  log('Creating organization...');
  await setDoc(doc(db, 'organizations', ORG_ID), organization);
  await setDoc(doc(db, 'test_organizations', ORG_ID), organization);

  log('Creating shows...');
  for (const show of shows) {
    await setDoc(doc(db, 'shows', show.id), {
      org_id: show.org_id,
      label: show.label,
    });
  }

  log('Creating Saturday acts...');
  const batch1 = writeBatch(db);
  for (const act of saturdayActs) {
    const actRef = doc(collection(db, 'acts'));
    batch1.set(actRef, {
      show_id: shows[0].id,
      number: act.number,
      title: act.title,
      performers: act.performers,
    });
  }
  await batch1.commit();

  log('Creating Sunday acts...');
  const batch2 = writeBatch(db);
  for (const act of sundayActs) {
    const actRef = doc(collection(db, 'acts'));
    batch2.set(actRef, {
      show_id: shows[1].id,
      number: act.number,
      title: act.title,
      performers: act.performers,
    });
  }
  await batch2.commit();

  log('Initializing show status...');
  for (const show of shows) {
    await setDoc(doc(db, 'show_status', show.id), {
      show_id: show.id,
      org_id: ORG_ID,
      current_act_number: 1,
      is_tracking: false,
      updated_at: new Date().toISOString(),
    });
  }

  const totalActs = saturdayActs.length + sundayActs.length;
  log(`Done! Created ${totalActs} acts across ${shows.length} shows.`);

  return {
    orgId: ORG_ID,
    shows: shows.length,
    saturdayActs: saturdayActs.length,
    sundayActs: sundayActs.length,
    totalActs,
  };
}

export async function clearSeedData(onProgress) {
  const log = (msg) => onProgress?.(msg);
  let deleted = 0;

  // 1. Delete acts for seeded shows
  for (const show of shows) {
    log(`Deleting acts for: ${show.label}...`);
    const actsSnap = await getDocs(query(collection(db, 'acts'), where('show_id', '==', show.id)));
    if (actsSnap.size > 0) {
      const batch = writeBatch(db);
      actsSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      deleted += actsSnap.size;
    }
  }

  // 2. Delete shows
  log('Deleting shows...');
  for (const show of shows) {
    await deleteDoc(doc(db, 'shows', show.id));
  }

  // 3. Delete show_status
  log('Deleting show status...');
  for (const show of shows) {
    await deleteDoc(doc(db, 'show_status', show.id));
  }

  // 4. Delete organization from both collections
  log('Deleting organization...');
  await deleteDoc(doc(db, 'organizations', ORG_ID));
  await deleteDoc(doc(db, 'test_organizations', ORG_ID));

  log(`Done! Removed ${deleted} acts, ${shows.length} shows, and the organization.`);

  return { deleted, shows: shows.length, orgId: ORG_ID };
}
