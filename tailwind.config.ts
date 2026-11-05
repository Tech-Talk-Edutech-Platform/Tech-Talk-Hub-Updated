import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: '#3F51B5',
        secondary: '#FF4081',
        accent: '#00BFA5',
        background: '#F5F5F5',
        text: '#333333',
        funPop: '#FFEB3B',
        dashboard: {
          canvas: '#F8FAFC',
          night: '#0b1020',
        },
        heroGradientStart: '#3F51B5',
        heroGradientMiddle: '#FF4081',
        heroGradientEnd: '#00BFA5',
      },
      backgroundImage: {
        'hero-gradient':
          'linear-gradient(to bottom right, #3F51B5, #FF4081, #00BFA5)',
      },
      keyframes: {
        smoothPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.9' },
        },
      },
      animation: {
        smoothPulse: 'smoothPulse 3s ease-in-out infinite',
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        card: '0 10px 20px rgba(0,0,0,0.1)',
        btn: '0 4px 6px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [typography],
}

export default config
