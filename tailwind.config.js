/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Slate - primary dark surface / text
        ink: {
          DEFAULT: '#0F172A',
          50: '#F8FAFC',
          100: '#E2E8F0',
          300: '#94A3B8',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },
        // Slate-tinted page background
        paper: {
          DEFAULT: '#F8FAFC',
          dim: '#F1F5F9',
        },
        // Emerald - positive balances, primary actions, "pago"
        ledger: {
          50: '#ECFDF5',
          200: '#A7F3D0',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        // Rose - overdue, negative balances, destructive actions
        signal: {
          50: '#FFF1F2',
          200: '#FECDD3',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
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
      borderRadius: {
        card: '18px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.05), 0 6px 20px -6px rgb(15 23 42 / 0.12)',
        'card-hover': '0 2px 4px 0 rgb(15 23 42 / 0.06), 0 10px 28px -6px rgb(15 23 42 / 0.16)',
        pop: '0 12px 32px -8px rgb(15 23 42 / 0.28)',
      },
    },
  },
  plugins: [],
};
