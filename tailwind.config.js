/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sinagra: {
          yellow: '#F5C800',
          red: '#C8102E',
          black: '#1A1A1A',
          dark: '#111111',
          gray: '#2A2A2A',
        },
      },
      fontFamily: {
        display: ['Impact', 'Arial Black', 'sans-serif'],
        body: ['Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
