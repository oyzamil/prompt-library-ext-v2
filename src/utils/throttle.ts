/**
 * Creates a throttled version of a function that invokes func at most once
 * per every `wait` milliseconds. The throttled function comes with these properties:
 * - `.cancel()`  → cancels any pending execution
 * - `.flush()`   → immediately invokes the function with the latest arguments
 *
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @param options Configuration options
 * @param options.leading Specify invoking on the leading edge (default: true)
 * @param options.trailing Specify invoking on the trailing edge (default: true)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void; flush: () => void } {
  const { leading = true, trailing = true } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const invokeFunc = (time: number) => {
    const elapsed = time - lastCallTime;
    if (elapsed >= wait) {
      // Time to run it
      if (lastArgs !== null) {
        const result = func.apply(lastThis, lastArgs);
        lastArgs = null;
        lastThis = null;
        lastCallTime = time;
        return result;
      }
    }
  };

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    // First call — leading edge
    if (!lastCallTime && leading) {
      lastCallTime = now;
      return func.apply(this, args);
    }

    lastArgs = args;
    lastThis = this;

    if (timer) clearTimeout(timer);

    if (trailing) {
      // Schedule trailing execution if not already waiting
      const remaining = wait - (now - lastCallTime);
      if (remaining <= 0) {
        // We've waited long enough → run now
        if (timer) clearTimeout(timer);
        timer = null;
        const result = invokeFunc(now);
        lastCallTime = now;
        return result;
      } else {
        timer = setTimeout(() => {
          invokeFunc(Date.now());
          timer = null;
        }, remaining);
      }
    }
  } as T & { cancel: () => void; flush: () => void };

  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
    lastThis = null;
    lastCallTime = 0;
  };

  throttled.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs !== null) {
      const result = func.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
      lastCallTime = Date.now();
      return result;
    }
  };

  return throttled;
}
