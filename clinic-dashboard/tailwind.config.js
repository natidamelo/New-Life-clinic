/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          teal: '#0D9488',
          tealHover: '#0F766E',
          tealDark: '#14B8A6',
          tealDarkHover: '#2DD4BF',
        },
        light: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          textPrimary: '#0F172A',
          textMuted: '#64748B',
        },
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          textPrimary: '#F8FAFC',
          textMuted: '#94A3B8',
        },
        semantic: {
          emerald: '#10B981',
          amber: '#F59E0B',
          crimson: '#EF4444',
        }
      },
      borderRadius: {
        xl: '12px',
      }
    },
  },
  plugins: [],
};
