/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep ink navy - primary dark surface / text
        ink: {
          DEFAULT: '#101A24',
          50: '#F2F4F6',
          100: '#DDE3E8',
          300: '#8FA0AC',
          500: '#3D4E5C',
          700: '#1B2733',
          900: '#101A24',
        },
        // Cool off-white paper (intentionally NOT warm cream)
        paper: {
          DEFAULT: '#F3F5F2',
          dim: '#E8EBE7',
        },
        // Ledger green - positive balances, primary actions, "pago"
        ledger: {
          50: '#E6F5EE',
          200: '#A9DEC4',
          400: '#3FB585',
          500: '#1F9D6C',
          600: '#167A54',
          700: '#0F5C3F',
        },
        // Signal red - overdue, negative balances, destructive actions
        signal: {
          50: '#FBEAE8',
          200: '#EFB3AC',
          400: '#DF6F63',
          500: '#D64545',
          600: '#B23434',
        },
        // Amber - pending / scheduled
        pending: {
          400: '#E0A93F',
          500: '#C98F1F',
        },
      },
      fontFamily: {
        // Display face with a technical, ledger-adjacent character
        display: ['"Space Grotesk"', 'sans-serif'],
        // Body face, optimized for reading dense UI
        sans: ['"Inter"', 'sans-serif'],
        // Tabular mono for every currency value in the app
        ledger: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 26 36 / 0.06), 0 1px 8px -2px rgb(16 26 36 / 0.08)',
      },
    },
  },
  plugins: [],
};
