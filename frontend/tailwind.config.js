/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#050816',
          900: '#0B1227',
          850: '#111C38',
        },
        royal: {
          400: '#7AA8FF',
          500: '#4F8CFF',
          600: '#3B82F6',
          700: '#5D6BFF',
        },
      },
      boxShadow: {
        premium: '0 10px 40px rgba(0,0,0,.45)',
        glow: '0 0 40px rgba(59,130,246,.25)',
      },
      borderRadius: {
        button: '14px',
        card: '18px',
        input: '14px',
      },
      maxWidth: {
        container: '1280px',
        content: '720px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        waveform: {
          '0%, 100%': { transform: 'scaleY(.45)' },
          '50%': { transform: 'scaleY(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', filter: 'blur(14px)', transform: 'translateY(20px)' },
          '100%': { opacity: '1', filter: 'blur(0)', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 22px rgba(59,130,246,.18)' },
          '50%': { boxShadow: '0 0 44px rgba(59,130,246,.36)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        fadeUp: 'fadeUp .6s ease both',
        pulseGlow: 'pulseGlow 2.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
