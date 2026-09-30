import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 10px 30px rgba(0,0,0,.22)',
      },
    },
  },
  plugins: [],
} satisfies Config
