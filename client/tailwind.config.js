/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#080C14',
          900: '#0D1421',
          800: '#111C2E',
          700: '#182338',
          600: '#1E2D47',
        },
        electric: {
          400: '#4FFFB0',
          500: '#00E87A',
          600: '#00C668',
        },
        plasma: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        danger: '#FF4D6D',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(79,255,176,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,255,176,0.03) 1px, transparent 1px)",
        'glow-electric': 'radial-gradient(ellipse at center, rgba(79,255,176,0.15) 0%, transparent 70%)',
        'glow-plasma': 'radial-gradient(ellipse at center, rgba(167,139,250,0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'electric': '0 0 20px rgba(79,255,176,0.3), 0 0 60px rgba(79,255,176,0.1)',
        'plasma': '0 0 20px rgba(167,139,250,0.3), 0 0 60px rgba(167,139,250,0.1)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'inset-border': 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
