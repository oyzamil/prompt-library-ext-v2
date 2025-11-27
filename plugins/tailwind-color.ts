// plugins/tailwind-color.js
import Color from 'color';
import plugin from 'tailwindcss/plugin';

import config from '../src/app.config.js';

// helper to convert to alpha-capable rgb()
function toRgbWithAlpha(hex: string) {
  const [r, g, b] = Color(hex).rgb().array();
  return `rgb(${r} ${g} ${b} / <alpha-value>)`;
}

export default plugin.withOptions(
  () => {
    // no custom utilities needed, just theme extension
    return function () {};
  },
  () => {
    const themeColor = config.APP.COLOR_PRIMARY;
    const base = Color(themeColor);

    const shades = {
      50: base.lighten(0.9).hex(),
      100: base.lighten(0.7).hex(),
      200: base.lighten(0.5).hex(),
      300: base.lighten(0.3).hex(),
      400: base.lighten(0.1).hex(),
      500: base.hex(),
      600: base.darken(0.1).hex(),
      700: base.darken(0.3).hex(),
      800: base.darken(0.5).hex(),
      900: base.darken(0.7).hex(),
    };

    // convert to alpha-aware form
    const alphaShades = Object.fromEntries(Object.entries(shades).map(([k, v]) => [k, toRgbWithAlpha(v)]));

    return {
      theme: {
        extend: {
          colors: {
            app: alphaShades,
          },
        },
      },
    };
  }
);
