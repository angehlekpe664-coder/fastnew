type Entry<T> = { value: T; expires: number };

export function createCache<T>(ttlMs: number) {
  let entry: Entry<T> | null = null;

  return {
    get(): T | null {
      if (!entry || entry.expires < Date.now()) return null;
      return entry.value;
    },
    set(value: T) {
      entry = { value, expires: Date.now() + ttlMs };
    },
    clear() {
      entry = null;
    },
  };
}
