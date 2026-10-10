/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0914',
        cardBg: '#151124',
        accentPurple: '#7c3aed',
        accentGlow: '#8b5cf6',
        neonRed: '#ef4444',
      },
    },
  },
  plugins: [],
}
