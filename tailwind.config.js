/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./app.js"
  ],
  theme: {
    extend: {
      colors: {
        // Matrix green theme
        matrix: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          glow: '#00ff41',
          bright: '#39ff14',
          dim: '#0d3d1a',
        },
        // Dark mode colors
        dark: {
          bg: '#050505',
          card: '#0a0d0a',
          'card-hover': '#0f140f',
          border: '#1a2e1a',
          text: '#e8ebe8',
          'text-muted': '#5a7a5a',
        }
      }
    },
  },
  plugins: [],
}
