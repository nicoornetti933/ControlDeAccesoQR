/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta principal del sistema: un violeta/indigo moderno que
        // transmite tecnologia y eventos, con buen contraste sobre blanco
        // y sobre fondo oscuro.
        marca: {
          50: '#f2f1ff',
          100: '#e6e4ff',
          200: '#cfccff',
          300: '#aca5ff',
          400: '#8b7bff',
          500: '#6d4dfa',
          600: '#5b32e8',
          700: '#4b26c4',
          800: '#3d20a0',
          900: '#341d80',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
