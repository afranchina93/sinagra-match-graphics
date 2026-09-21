/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          canvas:  '#0c1210',
          surface: '#18211d',
          raised:  '#202b25',
          nav:     '#101713',
          signal:  '#e4f543',
          text:    '#edf1e7',
          muted:   '#7e8a82',
          dim:     '#49574e',
        },
        sinagra: {
          yellow: '#F5C800',
          red: '#C8102E',
          black: '#1A1A1A',
          dark: '#111111',
          gray: '#2A2A2A',
        },
      },
      fontFamily: {
        display:   ['Impact', 'Arial Black', 'sans-serif'],
        body:      ['Arial', 'sans-serif'],
        condensed: ['"Barlow Condensed"', 'Impact', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
