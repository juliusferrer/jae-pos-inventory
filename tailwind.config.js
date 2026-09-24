/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./components/**/*.{js,ts,jsx,tsx}','./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"','sans-serif'],
        body:    ['"Inter"','sans-serif'],
        mono:    ['"JetBrains Mono"','monospace'],
      },
      colors: {
        sizzle: { 400:'#fb923c', 500:'#f97316', 600:'#ea6c08', 700:'#c2540a' },
        dark:   { 800:'#13161e', 900:'#0d0f14', 950:'#080a0f' },
      },
      boxShadow: {
        'sizzle': '0 0 24px rgba(249,115,22,0.25)',
        'modal':  '0 20px 60px rgba(0,0,0,0.5)',
      },
      animation: {
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        slideUp: { from:{ opacity:0, transform:'translateY(14px)' }, to:{ opacity:1, transform:'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
