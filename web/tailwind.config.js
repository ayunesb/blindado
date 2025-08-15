/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'hsl(var(--bg))',
          muted: 'hsl(var(--bg-muted))',
          raised: 'hsl(var(--bg-raised))',
        },
        foreground: 'hsl(var(--fg))',
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          fg: 'hsl(var(--brand-fg))',
          muted: 'hsl(var(--brand-muted))',
        },
        success: 'hsl(var(--success))',
        danger: 'hsl(var(--danger))',
        warning: 'hsl(var(--warning))',
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(0,0,0,.45)',
      },
    },
  },
  plugins: [],
}
