import plugin from 'tailwindcss/plugin';

export default plugin(function ({ addUtilities, addVariant }) {
  // --- Slider variants ---
  const sliderVariants = {
    'slider-thumb': ['&::-webkit-slider-thumb', '&::slider-thumb', '&::-moz-range-thumb'],
    'slider-track': ['&::-webkit-slider-runnable-track', '&::-moz-range-track'],
    'slider-fill': ['&::-moz-range-progress'], // Firefox only
  };

  Object.entries(sliderVariants).forEach(([name, selectors]) => {
    addVariant(name, selectors);
  });

  // --- Scrollbar variants ---
  const scrollbarVariants = {
    scrollbar: ['&::-webkit-scrollbar'], // entire scrollbar
    'scrollbar-track': ['&::-webkit-scrollbar-track'],
    'scrollbar-thumb': ['&::-webkit-scrollbar-thumb'],
  };

  Object.entries(scrollbarVariants).forEach(([name, selectors]) => {
    addVariant(name, selectors);
  });

  // --- Utilities ---
  addUtilities({
    // Reset slider so we can style it consistently
    '.slider-reset': {
      '-webkit-appearance': 'none',
      appearance: 'none',
      background: 'transparent',
    },

    // Example defaults for scrollbar (can be overridden with classes)
    '.scrollbar-thin': {
      'scrollbar-width': 'thin', // Firefox
      '&::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
    },
    '.scrollbar-none': {
      'scrollbar-width': 'none', // Firefox
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },
  });
});
