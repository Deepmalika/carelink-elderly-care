/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F2933',
        muted: '#5B6B69',
        cream: '#FBF9F4',
        pine: {
          50: '#EAF3F0',
          100: '#CFE4DD',
          300: '#6FA697',
          500: '#1F6F5C',
          600: '#195A4A',
          700: '#134339',
        },
        amber: {
          100: '#FBE8C8',
          400: '#E8A33D',
          500: '#D98F22',
          600: '#B9741A',
        },
        clay: '#C1502E',
      },
      fontFamily: {
        display: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}

