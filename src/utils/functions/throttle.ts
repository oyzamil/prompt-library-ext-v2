export const throttle = (fn: (...args: any[]) => void, delay: number) => {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;

  return (...args: any[]) => {
    const now = Date.now();

    const invoke = () => {
      lastCall = Date.now();
      fn(...(lastArgs || args));
      timeoutId = null;
      lastArgs = null;
    };

    if (now - lastCall >= delay) {
      invoke();
    } else {
      lastArgs = args;
      if (!timeoutId) {
        timeoutId = setTimeout(invoke, delay - (now - lastCall));
      }
    }
  };
};
