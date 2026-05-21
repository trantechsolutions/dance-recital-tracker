/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Display serif for show/act titles — theatrical program voice.
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        // UI sans for chrome, navigation, body, forms.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Brand — the studio's identity. Used for navigation, favorites, primary CTAs.
        brand: {
          50:  '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
        // Stage — the "live now" signal. Warm amber, like a follow-spot. Distinct from brand.
        stage: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Ink — neutrals. Renamed from "slate" semantically.
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      borderRadius: {
        // Cards mirror a printed program — gentle, not pill-shaped.
        card: '0.625rem',  // 10px
        // Pills are for status only (live badge, count chips).
        pill: '9999px',
      },
      boxShadow: {
        // Stage-light glow under the live hero. Warm, not pink.
        stage: '0 20px 60px -15px rgba(245, 158, 11, 0.45), 0 0 0 1px rgba(245, 158, 11, 0.1)',
        // Card shadow — flat program-booklet feel, not floating-SaaS.
        program: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)',
      },
      backgroundImage: {
        // Theatrical spotlight: warm at the top, fading to deep rose.
        // Replaces the generic diagonal pink→rose gradient.
        spotlight: 'radial-gradient(120% 80% at 50% 0%, #fcd34d 0%, #f59e0b 22%, #db2777 60%, #831843 100%)',
      },
      letterSpacing: {
        marquee: '0.08em',
      },
    },
  },
  plugins: [],
}
