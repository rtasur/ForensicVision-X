import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fvx: {
          paper: '#F4F1E8',
          white: '#FFFDF8',
          cctv: '#DDE7E3',
          cctv2: '#C9D7D2',
          teal: '#3E756C',
          tealLight: '#9FC2B9',
          corners: '#4F8B80',
          navy: '#0B263A',
          orange: '#E65A33',
          green: '#2F7D60',
          red: '#C94A3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '5px 5px 0 rgba(11, 38, 58, 0.14)',
        brutal: '7px 7px 0 #0B263A',
      },
    },
  },
  plugins: [],
} satisfies Config
