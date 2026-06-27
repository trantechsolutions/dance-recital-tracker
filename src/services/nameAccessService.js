import { db, coll } from '../firebase';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// Super-admin-managed allowlist of emails permitted to see full (non-redacted)
// performer names. Stored as a single doc so it can be watched in real time and
// edited from the admin console. Emails are normalized to lowercase so matching
// is case-insensitive.
//
// NOTE: this is a UX/visibility gate, not access control — full names still ship
// to every client from the show docs. The list itself must be write-locked to
// super admins via Firestore security rules (read can stay public).
const nameAccessRef = () => doc(db, coll('app_config'), 'name_access');

const normalize = (email) => (email || '').trim().toLowerCase();

// Subscribe to the allowlist. Calls onChange with a lowercased email array
// (empty if the doc doesn't exist yet). Returns the unsubscribe function.
export function subscribeNameAccess(onChange, onError) {
  const unsubscribe = onSnapshot(
    nameAccessRef(),
    (snap) => onChange(snap.exists() ? (snap.data().emails || []) : []),
    (err) => { if (onError) onError(err); }
  );
  // onSnapshot returns an unsubscribe fn; guard so callers can always invoke it
  // (e.g. test mocks that return undefined).
  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
}

export async function addNameAccessEmail(email) {
  const e = normalize(email);
  if (!e) return;
  await setDoc(nameAccessRef(), { emails: arrayUnion(e) }, { merge: true });
}

export async function removeNameAccessEmail(email) {
  await setDoc(nameAccessRef(), { emails: arrayRemove(normalize(email)) }, { merge: true });
}
