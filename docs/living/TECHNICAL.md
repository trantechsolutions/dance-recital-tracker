# Recital App: Technical Log

Files, data, architecture, tests and rollback. Newest first.

## 2026-11-13 — Firebase CLI config and main sync (5a049ea..7a89252)

- **5a049ea:** add `firebase.json` (rules path) and `.firebaserc` (default project `dance-recital-tracker`). A dry run compiled `firestore.rules` successfully.
- **7a89252:** merge `origin/main` into develop before release. It brings PRs #3–#5 (move up/down buttons), which only change `src/components/admin/tabs/ShowsTab.jsx`; that component isn't imported anywhere, so the buttons aren't visible in the app. No conflicts; 156 tests pass.

## 2026-11-13 — Crash fix and pink live highlights (2355b2e..2063acd)

- **Fix (2355b2e):** `App.jsx` read `recitalData` in the dependency list of the remember-show effect before `useLiveTracker` declared it, so every render threw `ReferenceError` (temporal dead zone). The effect now sits below the tracker call. New `src/__tests__/App.smoke.test.jsx` renders `<App />` signed out and signed in, with `useApp` and `useLiveTracker` mocked; it reproduces the original error when the fix is removed. `LoginScreen` footer copy updated.
- **Style (2063acd):** in `tailwind.config.js`, the `stage` palette now uses the `brand` pink values and `shadow-stage` uses pink rgba. In `LiveBar`, `RunShow` and `AdminHome`, `bg-stage-400 text-ink-900 hover:bg-stage-300` became `bg-brand-600 text-white hover:bg-brand-700`; the radio accent and the `WorkspaceTab` CSV panel moved from amber to brand. Amber stays in `ConfirmModal` (warning), `DevToolsTab` and the unused `ShowsTab`.
- **Tests:** 156 passing (12 files). **Rollback:** revert 2063acd (colours) and/or 2355b2e (fix; reverting it restores the crash).

## 2026-11-13 — Show-day redesign (b1a79ff..b1a79ff)

52 files changed, +3,799 / −2,057.

**New modules**
- `src/utils/liveProgress.js`: parent-facing live status (`getLiveStatus`, `liveInstruction`, `whoLabel`, `scrollToCurrentAct`). Counts by running-order position, not act number. Handles `intermission` and `ended`.
- `src/utils/showControl.js`: `stepAct`, `keyToCommand` (clicker keys), `actTimings`, `typicalActMs` (median, 30 s–15 min window, needs ≥3 acts), `minutesAway`, `backToBackDancers`.
- `src/utils/soundSegmenter.js` + `src/hooks/useListeningAssist.js`: microphone RMS and spectral-flatness segmentation (music → quiet/applause → music) with screen wake lock. Audio is analysed only on the device.
- `src/utils/find.js`: cross-show dancer search on the displayed (redacted) name, with a duplicate flag; act search for the current show.
- `src/utils/theme.js`: theme preference plus dim-during-show, applied by App on `THEME_EVENT`.
- `src/utils/alerts.js`, `src/hooks/useActAlerts.js`, `public/notify-sw.js`: opt-in notifications at 3 acts away and "up next". The service worker is notifications-only, with no fetch handler and no cache.
- `src/utils/familyLink.js`: family link carrying `?code=`.
- **Components:**
  - `ui/LiveBar`, `ui/DimPrompt`, `ui/AlertsToggle`, `ui/AccessSteps`, `ui/RunnerWelcome`, `onboarding/Welcome`
  - `admin/AdminHome`, `admin/RunShow`, `admin/AccessView`

**Changed**
- `App.jsx`:
  - Routes: `/admin` (home), `/admin/run/:showId`, `/admin/setup`, `/admin/access`, `/my-night` (`/my-schedule` redirects).
  - Show memory (`localStorage.lastShow`), auto-pick (live show, then the show your followed dancers are in, then the only show), and the live-show switch bar.
  - Welcome flow, family-link code handling, and a badge counting your remaining acts.
- `hooks/useLiveTracker.js`:
  - The live show comes from an `onSnapshot` on `show_status` where `org_id` matches and `is_tracking == true`, replacing the one-off check.
  - `updateActNumber` writes `act_started_at`, `act_log` (via `arrayUnion`) and `phase: null`.
  - New `setShowPhase('intermission'|'ended')`; `currentAct` gains `startedAt` and `phase`.
- `context/AppContext.jsx`: `runnerShows`, `isShowRunner`, `canRunShow(showId)` from org `showRunners`.
- `services/showService.js`: `updateOrgShowRunners` writes `showRunners` and the `runnerShows` map using `mergeFields`.
- `admin/AdminDashboard.jsx` and `tabs/WorkspaceTab.jsx`: two-column setup, unsaved-changes guard (fingerprint compare, `beforeunload`, confirm on switch/back), back-to-back warning. Studio code and admins moved to AccessView.
- **Program, schedule and search:** `ProgramView` (fold, intermission, ETA; "Mine" filter removed), `ActCard`, `ActDetailModal` (bottom sheet), `MyScheduleView` (My night), `SearchView` (Find).
- **Settings and sign-in:** `SettingsView`, `LoginScreen`, `StudioCodeScreen`, `TutorialOverlay` (no automatic open), plus wording changes.

**Removed**
- `ui/StickyHeader`, `program/LiveTrackerHero`, `admin/LiveShowController`
- The unused `search/SearchActView` and `search/SearchDancerView`

**Data and schema** (additive, no migration needed)
- `show_status/{showId}`: `act_started_at`, `act_log[] {number, at}`, `phase`, `intermission_at`, `ended_at`.
- `organizations/{orgId}`: `showRunners[] {email, shows[]}` and `runnerShows {email: showIds[]}` (an empty list means all shows).
- **Firestore index:** none needed. The live query uses two equality filters.

**Security: `firestore.rules`** (now tracked; not yet deployed)
- Shows, acts and status are scoped to the owning studio via `get`/`getAfter`, so batched creates work.
- Status writes must carry the show's real `org_id`.
- Runners are checked through the `runnerShows` map.
- Studio admins may update only `studioCode`, `admins`, `showRunners` and `runnerShows`.
- Emulator suite: 27/27 checks pass (kept outside the repo).

**Deploy order**
1. Deploy the app.
2. Admins re-save show runners on Access, which writes `runnerShows`.
3. `firebase deploy --only firestore:rules`.

**Tests:** 154 passing across 11 files. New: `liveProgress`, `showControl`, `soundSegmenter`, `find`, `alerts`, `RunShow`. `useLiveTracker` was updated for the second listener and the new fields.

**Known lint:** the errors that remain were already present (`PromptModal`, `ShowsTab`, `AdminDashboard` set-state-in-effect, `AppContext` refresh export, `preview.jsx`, `test/setup.js`, `useLiveTracker.test`).

**Rollback:** `git revert b1a79ff`. The new Firestore fields are ignored by the old code. If the rules were deployed, redeploy the previous rules first.

## 2026-06-26 — Baseline before living documentation (9ea7a33..0bad6d4)

Seeded from `git log`: 59 commits, 2026-03-03 to 2026-06-26.
- **Stack:** React 19 + Vite, Tailwind, Firebase Auth and Firestore, Vitest. Deployed on Vercel.
- **Milestones:**
  - Initial React port (4531d3e)
  - Organizations and users (9966677)
  - Supabase and back to Firebase (883d293, c69448a)
  - Admin workspace consolidation (8bdc0db)
  - Single-studio mode flag (c5ccfa1)
  - Per-dancer notes and tutorial (2ef4b62)
  - Guest favorites (05e7265)
  - Security lock-down and studio codes (ea725e8, d6d91f1, 0b22c6f)
  - Post-login loading fix (0bad6d4)
