/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          canvas:  '#0f0f0f',
          surface: '#1a1a1a',
          raised:  '#222222',
          nav:     '#0f0f0f',
          signal:  '#F5C800',
          accent:  '#C8102E',
          text:    '#f0f0f0',
          muted:   '#888888',
          dim:     '#505050',
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
