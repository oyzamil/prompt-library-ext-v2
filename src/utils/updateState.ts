export function updateState<T extends object>(setState: React.Dispatch<React.SetStateAction<T>>, updates: Partial<T>): Promise<T> {
  return new Promise((resolve) => {
    setState((prev) => {
      const merged = deepMerge(prev, updates);
      resolve(merged);
      return merged;
    });
  });
}

// Deep merge helper
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };

  for (const key in source) {
    const targetVal = output[key];
    const sourceVal = source[key];

    if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else {
      output[key] = sourceVal as any;
    }
  }

  return output;
}

function isPlainObject(value: any): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
