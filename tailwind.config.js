module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  safelist: [
    { pattern: /bg-itson-(blue|blue-dark|blue-light|gray)/ },
    { pattern: /text-itson-(blue|blue-dark|blue-light|gray)/ },
    { pattern: /border-itson-(blue|blue-dark|blue-light|gray)/ },
    { pattern: /hover:bg-itson-(blue|blue-dark|blue-light|gray)/ },
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
  plugins: [],
};
