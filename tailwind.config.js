/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Green-black neutral scale: text and dark surfaces
        ink: {
          DEFAULT: '#10231F',
          50: '#F1F6F3',
          100: '#D9E3DE',
          300: '#91A29C',
          500: '#586C65',
          700: '#17302B',
          900: '#061B17',
        },
        // Soft green-white page background
        paper: {
          DEFAULT: '#F6F9F7',
          dim: '#ECF3EF',
        },
        // Brand green: navigation, selection, actions and positive values
        ledger: {
          50: '#E8F9EF',
          200: '#96E7B5',
          400: '#19D468',
          500: '#00B956',
          600: '#009D49',
          700: '#087B3E',
        },
        // Clear red: negative values, overdue and destructive actions only
        signal: {
          50: '#FFF0F0',
          200: '#FFB8BA',
          400: '#FF5156',
          500: '#F62F35',
          600: '#D91E25',
        },
        // Expense-type selection. Distinct from destructive/error red.
        expense: {
          50: '#FDECEF',
          500: '#E8465A',
          600: '#CE3549',
        },
        // Amber - pending / scheduled
        pending: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        // Orange accent - personality touches: recurring badge, illustrations, highlights
        clay: {
          50: '#FFF7ED',
          200: '#FED7AA',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
        },
        // Category color: "Outros Recebimentos" (teal, receita subgroup)
        mint: {
          50: '#F0FDFA',
          500: '#14B8A6',
          700: '#0F766E',
        },
        // Category color: "Patrimônio" (gold)
        gold: {
          50: '#FEFCE8',
          500: '#CA8A04',
          700: '#713F12',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        ledger: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.25rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        base: ['1.0625rem', { lineHeight: '1.625rem' }],
      },
      borderRadius: {
        card: '18px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 2px 5px rgb(6 27 23 / 0.07), 0 10px 28px -14px rgb(6 27 23 / 0.24)',
        'card-hover': '0 3px 8px rgb(6 27 23 / 0.10), 0 16px 34px -14px rgb(6 27 23 / 0.30)',
        pop: '0 18px 42px -10px rgb(2 15 12 / 0.48)',
      },
    },
  },
  plugins: [],
};
