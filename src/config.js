// Deployment-level feature flags (see docs/architecture/decisions/ADR-001, ADR-002).
//
// MULTI_STUDIO_ENABLED — when false (default), the app runs in single-studio mode:
// no studio picker, no switch/create/delete studio UI. All multi-studio code stays
// in the bundle and is re-enabled by setting VITE_MULTI_STUDIO=true and rebuilding.
export const MULTI_STUDIO_ENABLED = import.meta.env.VITE_MULTI_STUDIO === 'true';

// DEFAULT_ORG_ID — pins the tenant in single-studio mode. When unset, the app
// auto-resolves by picking the first document (sorted by id) in `organizations`.
export const DEFAULT_ORG_ID = import.meta.env.VITE_DEFAULT_ORG_ID || '';

// LOGIN_REQUIRED — when true (the default), the whole app is gated: a visitor
// must clear the studio code (if the studio set one) and sign in before
// reaching the program. Set VITE_REQUIRE_LOGIN=false to reopen guest browsing
// without a code change — a kill switch for this temporary access lock.
export const LOGIN_REQUIRED = import.meta.env.VITE_REQUIRE_LOGIN !== 'false';
