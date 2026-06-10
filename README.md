# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Studio Mode (single vs. multi)

The app runs in **single-studio mode** by default: no studio picker, no
switch/create/delete studio UI. The multi-studio code remains in the bundle and
is controlled by build-time env vars (see `docs/architecture/decisions/ADR-001`
and `ADR-002`):

| Variable | Default | Effect |
|---|---|---|
| `VITE_MULTI_STUDIO` | unset (off) | Set to `true` to re-enable the studio picker and all multi-studio admin UI. |
| `VITE_DEFAULT_ORG_ID` | unset | Pins the tenant in single-studio mode. When unset, the app auto-selects the first document (sorted by id) in the `organizations` collection. |

Recommended production posture: leave `VITE_MULTI_STUDIO` unset and set
`VITE_DEFAULT_ORG_ID` to the studio's Firestore document id.
