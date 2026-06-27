// Privacy helper: collapse a performer's full name down to their first (and any
// middle) name plus the last name's initial — e.g. "Alyse Boteler" -> "Alyse B."
// and "Anna Claire Occhipinti" -> "Anna Claire O.".
//
// Names are stored and keyed (favorites, notes, search) by their raw string;
// this is applied ONLY at render time so it stays idempotent — running it on an
// already-truncated "Alyse B." returns "Alyse B." unchanged.
export function lastInitial(name) {
  if (typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(' ')} ${last.charAt(0).toUpperCase()}.`;
}

// Render a performer name according to the viewer's privilege: `full` viewers
// (super/studio admins or allowlisted emails) see the raw stored name; everyone
// else sees the last-initial form.
export function displayName(name, full) {
  if (full) return typeof name === 'string' ? name.trim() : '';
  return lastInitial(name);
}
