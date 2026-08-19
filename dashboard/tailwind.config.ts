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
        // Stitch Design System - Kinetic Enterprise Tokens
        primary: {
          DEFAULT: '#4648d4',
          container: '#6063ee',
          fixed: '#e1e0ff',
          'fixed-dim': '#c0c1ff',
        },
        'on-primary': '#ffffff',
        'on-primary-container': '#fffbff',
        surface: {
          DEFAULT: '#f7f9fb',
          dim: '#d8dadc',
          bright: '#f7f9fb',
          variant: '#e0e3e5',
          'container-lowest': '#ffffff',
          'container-low': '#f2f4f6',
          container: '#eceef0',
          'container-high': '#e6e8ea',
          'container-highest': '#e0e3e5',
        },
        'on-surface': '#191c1e',
        'on-surface-variant': '#464554',
        'inverse-surface': '#1e232a',
        'inverse-on-surface': '#eff1f3',
        outline: '#767586',
        'outline-variant': '#c7c4d7',
        secondary: '#565e74',
        'secondary-container': '#dae2fd',
        tertiary: '#4f5d72',

        // 7-Kaam Brand Tokens
        teal: {
          DEFAULT: '#0F6E56',
          light: '#10b981',
          dim: '#064e3b',
        },
        'bg-dark': '#070a0f',
        'bg-card': '#ffffff',
        'bg-card2': '#f7f9fb',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
