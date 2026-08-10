/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: '#f2f7ee',
          100: '#e2edd7',
          200: '#c6ddb2',
          300: '#a3c885',
          400: '#7fae5e',
          500: '#5f9140',
          600: '#497230',
          700: '#3a5a27',
          800: '#2f4720',
          900: '#263a1b',
        },
        earth: {
          50: '#faf6ee',
          100: '#f3ead6',
          200: '#e5d2ac',
          300: '#d3b27c',
          400: '#c1934f',
          500: '#a97538',
          600: '#8a5c2c',
          700: '#6c4624',
          800: '#4f3420',
          900: '#38271b',
        },
        cream: '#fbf7ee',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px -8px rgba(38, 58, 27, 0.25)',
      },
    },
  },
  plugins: [],
}
