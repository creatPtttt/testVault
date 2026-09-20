/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0B0E',
        granite: '#161922',
        runeflame: '#00F0FF',
        amethyst: '#9D4EDD',
        'antique-gold': '#B8860B',
      },
      fontFamily: {
        // Diablo-adjacent gothic display (Pirata One is free OFL; Blade-2 is commercial)
        heading: ['"Pirata One"', 'Cinzel', 'serif'],
        // Readable fantasy UI / body
        body: ['Cinzel', 'serif'],
        sans: ['Cinzel', 'serif'],
        // Raw numbers only
        pixel: ['Silkscreen', 'monospace'],
      },
      boxShadow: {
        carved:
          'inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -2px 6px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(184, 134, 11, 0.35)',
        runeglow: '0 0 12px rgba(0, 240, 255, 0.45), 0 0 24px rgba(157, 78, 221, 0.25)',
        amethystglow: '0 0 12px rgba(157, 78, 221, 0.5), 0 0 20px rgba(0, 240, 255, 0.2)',
        cardhover: '0 0 15px #00F0FF, 0 0 28px rgba(0, 240, 255, 0.25)',
      },
      zIndex: {
        modal: '200',
        rename: '210',
        toast: '220',
      },
    },
  },
  plugins: [],
}
