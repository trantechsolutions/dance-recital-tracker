# Recital App: Management Summary

Scope, decisions, risk and what's still open. Newest first.

## 2026-11-13 — Show-day redesign (b1a79ff..b1a79ff)

**Scope delivered**
- **Parents:** one live status bar, a personal "My night" view with act and minute countdowns, intermission and end-of-show states, a first-visit welcome, the show remembered between visits, unified search, simplified Settings, optional dimming and alerts, and a clearer two-step sign-in.
- **Show running:** admin split into show day and setup; a one-button run screen with Undo, double-tap protection, clicker support and a laptop "booth" layout with act timings; optional listening assist; a show runner role with invites.
- **Data safety:** warnings for unsaved setup edits and for back-to-back dancers.
- **Security:** rewritten database rules that limit each studio's admins to their own studio and show runners to their assigned shows.

**Key decisions and rationale**
- **One live signal instead of five.** The previous screen repeated "now playing" in five places, so a single docked bar now carries it with an instruction ("head back after act 15").
- **Countdowns in acts first, minutes second.** Minutes are only shown once at least 3 acts have been timed that day; until then, estimates would be guesses.
- **Listening assist proposes, never decides.** It detects music stopping and starting rather than recognising songs: no song uploads, no paid service, and no internet needed. Off by default.
- **Alerts without new infrastructure.** Alerts fire while the app is open, including in the background. True lock-screen push was deferred because it needs a server function and messaging setup.

**Risk**
- **High (deployment order):** the new database rules must be deployed after the app, and after admins re-save existing show runners on the Access page. Deploying the rules first would block existing show runners.
- **Medium:** listening assist hasn't been tried in a real venue. Test it in "Ask me" mode at a dress rehearsal before a show.
- **Medium:** alerts won't reach a locked iPhone, where the page is usually suspended. Communicate this to families as "keep the app open".
- **Low:** existing families no longer see the automatic tour. It stays available from Settings.

**Effort and timeline**
- One development cycle covering design (wireframes), build, an audit, and fixes for the audit's findings.
- 154 automated tests pass, and the database rules passed 27 checks in Google's local test environment.

**Still open**
- Server push for lock-screen alerts (a Cloud Function plus Firebase Cloud Messaging).
- A dress-rehearsal trial of listening assist.
- Deploying the database rules (manual step; see Risk).

## 2026-06-26 — Baseline before living documentation (9ea7a33..0bad6d4)

Starting point for this log: a React and Firebase recital program with studio access codes, sign-in, favorites and notes, and a live act tracker driven from an admin console. Earlier history is in git (59 commits, March–June 2026).
