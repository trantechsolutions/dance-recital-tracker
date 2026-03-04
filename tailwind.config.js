/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#db2777', // From your style.css pink theme
          light: '#f9a8d4',
        },
        surface: {
          light: '#ffffff',
          dark: '#1f2937',
        }
      },
    },
  },
  plugins: [],
}