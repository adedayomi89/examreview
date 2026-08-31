/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1C1220',
        indigo: {
          DEFAULT: '#2D1B4E',
          deep: '#1B1030',
          soft: '#402a68'
        },
        gold: {
          DEFAULT: '#C9A227',
          light: '#E7C765',
          dim: '#9c7d1d'
        },
        forest: {
          DEFAULT: '#2F6B4F',
          light: '#3f8768'
        },
        rose: {
          DEFAULT: '#A93A38'
        },
        cream: '#FAF5EA',
        paper: '#FFFDF8'
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,18,32,0.04), 0 8px 24px -8px rgba(28,18,32,0.18)',
        lift: '0 12px 32px -12px rgba(45,27,78,0.35)'
      },
      backgroundImage: {
        'radiant': 'radial-gradient(circle at 20% 20%, rgba(201,162,39,0.16), transparent 45%), radial-gradient(circle at 85% 0%, rgba(47,107,79,0.14), transparent 40%)'
      }
    }
  },
  plugins: []
}
