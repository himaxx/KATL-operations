/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050C16',
          900: '#0B192C',
          850: '#112239',
          800: '#1E3E62',
          700: '#2B527E',
          600: '#3D6C9F',
          100: '#E6EFF9',
          50: '#F0F6FC',
        },
        hotpink: {
          DEFAULT: '#FF007F',
          hover: '#E60072',
          active: '#CC0066',
          50: '#FFF0F7',
          100: '#FFE2F0',
          200: '#FFB8DC',
          500: '#FF007F',
          600: '#E60072',
          700: '#B8005A',
        },
        lightpink: {
          50: '#FFF5F5',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'Noto Sans Devanagari', 'sans-serif'],
        hindi: ['Noto Sans Devanagari', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
