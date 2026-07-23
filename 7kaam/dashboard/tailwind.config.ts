import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './types/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#0F6E56',
          light: '#1a9070',
          dim: '#0a4f3e',
        },
        'bg-dark': '#0a0e13',
        'bg-card': '#111827',
        'bg-card2': '#1a2233',
      },
      backgroundOpacity: {
        '3': '0.03',
        '8': '0.08',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
