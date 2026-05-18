module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  safelist: [
    'bg-itson-blue',
    'bg-itson-blue-dark',
    'bg-itson-blue-light',
    'bg-itson-gray',
    'text-itson-blue',
    'text-itson-blue-light',
    'text-itson-blue-dark',
    'text-itson-gray',
    'border-itson-blue',
    'border-itson-blue-dark',
    'focus:border-itson-blue',
    'focus:ring-itson-blue/30',
    'hover:bg-itson-blue-light',
    'disabled:bg-itson-blue/50',
    'bg-itson-blue/10',
    'bg-itson-blue/50',
    'border-itson-blue/30',
    'border-itson-blue/50',
  ],
  theme: {
    extend: {
      colors: {
        itson: {
          blue: '#006DB6',
          'blue-dark': '#005a94',
          'blue-light': '#1a7ec4',
          gray: '#9CA4AF',
        },
      },
    },
  },
  plugins: [require('tailwind-scrollbar')],
};
