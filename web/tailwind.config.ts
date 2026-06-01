import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
      },
      colors: {
        brand: {
          bg: '#FFFBF1',
          surface: '#FFF2D0',
          light: '#FFB2B2',
          accent: '#E36A6A',
          dark: '#c45555',
          text: '#2D1A1A',
          muted: '#8B6F6F',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
