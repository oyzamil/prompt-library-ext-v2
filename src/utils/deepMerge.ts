export function deepMerge<T extends Record<string, any>>(base: T, patch: DeepPartial<T>): T {
  const out = { ...base };

  for (const k in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;

    const p = patch[k];
    const b = base[k];

    // If patch value is explicitly undefined, skip it (use base value)
    if (p === undefined) continue;

    // Check if both values are plain objects (not null, not array)
    const isPatchObject =
      p !== null &&
      typeof p === 'object' &&
      !Array.isArray(p) &&
      Object.prototype.toString.call(p) === '[object Object]';

    const isBaseObject =
      b !== null &&
      typeof b === 'object' &&
      !Array.isArray(b) &&
      Object.prototype.toString.call(b) === '[object Object]';

    if (isPatchObject && isBaseObject) {
      // Both are plain objects - merge recursively
      out[k] = deepMerge(b, p as any);
    } else {
      // Direct assignment for primitives, arrays, null, etc.
      out[k] = p as T[typeof k];
    }
  }

  return out;
}
