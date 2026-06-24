// Stable, persisted identifier for an act. Generated once at the persistence
// boundary (showService / seed) and stored as an `id` field on the act doc —
// NOT the Firestore document id, which is regenerated on every save because
// saveShow deletes-and-recreates act docs. This logical id survives reorders
// and re-saves, so per-act data (e.g. private dancer notes) stays attached to
// the right dance even when act numbers are reshuffled.
export function newActId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older Node, insecure
  // contexts). Collision risk is negligible for the scale of a recital.
  return 'act_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}
