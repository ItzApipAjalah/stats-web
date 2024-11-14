module.exports = {
  content: ["./views/**/*.ejs"],
  theme: {
    extend: {
      colors: {
        minecraft: {
          dirt: '#855C32',
          grass: '#5C8D1E',
          stone: '#7A7A7A',
          wood: '#A0522D',
        },
      },
      fontFamily: {
        minecraft: ['Minecraft', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      }
    },
  },
  plugins: [],
} 