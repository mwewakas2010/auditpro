/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#16253D',
        navy2: '#223354',
        paper: '#F7F5F0',
        ink: '#22262B',
        inksoft: '#5B5F66',
        line: '#DCD6C8',
        gold: '#B8862B',
        goldsoft: '#EFE2C3',
        conform: '#2F6E4E',
        conformbg: '#E6F0EA',
        minor: '#C08A1E',
        minorbg: '#FBF0DB',
        major: '#A83A2C',
        majorbg: '#F8E7E3',
        ofi: '#2E6B78',
        ofibg: '#E4EEF0',
        na: '#8A8778',
        nabg: '#EFEDE5',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
