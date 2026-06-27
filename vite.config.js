import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Resolve the Firestore collection prefix at BUILD time so deployments point at
// the right collections (import.meta.env.DEV is only true under `vite dev`, so a
// deployed build can't decide this on its own — it always looks like prod).
//   - local dev (`vite serve`) → 'test_'
//   - Vercel non-production deploys (Preview env, e.g. the develop branch) → 'test_'
//   - Vercel Production deploy (main) and local `vite build` → '' (live collections)
// An explicit VITE_DB_PREFIX env var (e.g. set in the Vercel dashboard) always wins.
function resolveDbPrefix(command) {
  if (process.env.VITE_DB_PREFIX !== undefined) return process.env.VITE_DB_PREFIX;
  const vercelEnv = process.env.VERCEL_ENV; // 'production' | 'preview' | 'development' | undefined
  const isDev = command === 'serve';
  const isNonProdDeploy = vercelEnv !== undefined && vercelEnv !== 'production';
  return isDev || isNonProdDeploy ? 'test_' : '';
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
  ],
  define: {
    'import.meta.env.VITE_DB_PREFIX': JSON.stringify(resolveDbPrefix(command)),
  },
test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/utils/seedData.js', 'src/utils/mockData.js'],
    },
  },
}));