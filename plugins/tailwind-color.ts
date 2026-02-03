// plugins/tailwind-color.js
import Color from 'color';
import plugin from 'tailwindcss/plugin';

import config from '../src/app.config.js';

// helper to convert to alpha-capable rgb()
function toRgbWithAlpha(hex: string) {
  const [r, g, b] = Color(hex).rgb().array();
  return `rgb(${r} ${g} ${b} / <alpha-value>)`;
}

function mix(color: any, target: string, amount: number) {
  return color.mix(Color(target), amount).hex();
}

export default plugin.withOptions(
  () => {
    // no custom utilities needed, just theme extension
    return function () {};
  },
  () => {
    const themeColor = config.APP.color;
    const base = Color(themeColor).lab();

    const shades = {
      50: mix(base, '#ffffff', 0.95),
      100: mix(base, '#ffffff', 0.85),
      200: mix(base, '#ffffff', 0.7),
      300: mix(base, '#ffffff', 0.55),
      400: mix(base, '#ffffff', 0.3),
      500: base.hex(),
      600: mix(base, '#000000', 0.1),
      700: mix(base, '#000000', 0.25),
      800: mix(base, '#000000', 0.45),
      900: mix(base, '#000000', 0.65),
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
