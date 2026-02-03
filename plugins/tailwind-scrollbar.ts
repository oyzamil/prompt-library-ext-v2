import plugin from 'tailwindcss/plugin';

export default plugin(function ({ addVariant, addUtilities, matchUtilities, theme }) {
  // --- Slider variants ---
  addVariant('slider-thumb', ['&::-webkit-slider-thumb', '&::-moz-range-thumb']);

  addVariant('slider-track', ['&::-webkit-slider-runnable-track', '&::-moz-range-track']);

  addVariant('slider-fill', ['&::-moz-range-progress']);

  // --- Scrollbar variants ---
  addVariant('scrollbar', ['&::-webkit-scrollbar']);
  addVariant('scrollbar-track', ['&::-webkit-scrollbar-track']);
  addVariant('scrollbar-thumb', ['&::-webkit-scrollbar-thumb']);
  addVariant('scrollbar-corner', ['&::-webkit-scrollbar-corner']);
  addVariant('selection', ['&::selection', '&::-moz-selection']);
  // --- Base utilities ---
  addUtilities({
    // Slider reset with proper defaults
    '.slider-reset': {
      '-webkit-appearance': 'none',
      '-moz-appearance': 'none',
      appearance: 'none',
      background: 'transparent',
      width: '100%',
      outline: 'none',

      // WebKit thumb defaults
      '&::-webkit-slider-thumb': {
        '-webkit-appearance': 'none',
        appearance: 'none',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: '#3b82f6',
        cursor: 'pointer',
        border: 'none',
      },

      // WebKit track defaults
      '&::-webkit-slider-runnable-track': {
        width: '100%',
        height: '4px',
        background: '#e5e7eb',
        borderRadius: '2px',
      },

      // Firefox thumb defaults
      '&::-moz-range-thumb': {
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: '#3b82f6',
        cursor: 'pointer',
        border: 'none',
      },

      // Firefox track defaults
      '&::-moz-range-track': {
        width: '100%',
        height: '4px',
        background: '#e5e7eb',
        borderRadius: '2px',
      },
    },

    // Minimal slider reset (for full custom styling)
    '.slider-reset-minimal': {
      '-webkit-appearance': 'none',
      '-moz-appearance': 'none',
      appearance: 'none',
      background: 'transparent',
      width: '100%',
      outline: 'none',

      '&::-webkit-slider-thumb': {
        '-webkit-appearance': 'none',
        appearance: 'none',
      },

      '&::-moz-range-thumb': {
        border: 'none',
      },
    },

    '.scrollbar-stable': {
      'scrollbar-gutter': 'stable',
    },

    '.scrollbar-hide': {
      'scrollbar-width': 'none',
      '-ms-overflow-style': 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },
  });

  // --- Scrollbar size utilities ---
  matchUtilities(
    {
      scrollbar: (value) => ({
        '&::-webkit-scrollbar': {
          width: value,
          height: value,
        },
      }),
    },
    {
      values: theme('spacing'),
    }
  );

  matchUtilities(
    {
      'scrollbar-w': (value) => ({
        '&::-webkit-scrollbar': {
          width: value,
        },
      }),
      'scrollbar-h': (value) => ({
        '&::-webkit-scrollbar': {
          height: value,
        },
      }),
    },
    {
      values: theme('spacing'),
    }
  );

  // --- Slider size utilities ---
  matchUtilities(
    {
      'slider-thumb': (value) => ({
        '&::-webkit-slider-thumb': {
          width: value,
          height: value,
        },
        '&::-moz-range-thumb': {
          width: value,
          height: value,
        },
      }),
    },
    {
      values: theme('spacing'),
    }
  );

  matchUtilities(
    {
      'slider-track': (value) => ({
        '&::-webkit-slider-runnable-track': {
          height: value,
        },
        '&::-moz-range-track': {
          height: value,
        },
      }),
    },
    {
      values: theme('spacing'),
    }
  );
});
