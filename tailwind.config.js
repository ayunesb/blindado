/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './**/*.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: 'rgba(255,255,255,0.06)',
        surfaceMuted: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.10)',
      },
      borderRadius: { 'lgx': '28px', 'xlx': '32px' },
    },
  },
  plugins: [],
}
