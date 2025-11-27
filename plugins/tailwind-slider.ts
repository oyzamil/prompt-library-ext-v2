import plugin from 'tailwindcss/plugin';

export default plugin(function ({ addUtilities, addVariant }) {
  const sliderVariants = {
    'slider-thumb': ['&::-webkit-slider-thumb', '&::slider-thumb', '&::-moz-range-thumb'],
    'slider-track': ['&::-webkit-slider-runnable-track', '&::-moz-range-track'],
    'slider-fill': ['&::-moz-range-progress'], // Firefox only
  };

  Object.entries(sliderVariants).forEach(([name, selectors]) => {
    addVariant(name, selectors);
  });
  addUtilities({
    '.slider-reset': {
      '-webkit-appearance': 'none',
      appearance: 'none',
      background: 'transparent', // so track styles apply
    },
  });
});
