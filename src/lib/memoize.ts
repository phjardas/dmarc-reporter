export function memoize<T>(factory: () => T): () => T {
  let value: T | undefined;
  return () => {
    if (!value) value = factory();
    return value;
  };
}

export function cache<T>(factory: (key: string) => T): (key: string) => T {
  const cache = new Map<string, T>();
  return (key: string) => {
    const value = cache.get(key);
    if (value) return value;

    const newValue = factory(key);
    cache.set(key, newValue);
    return newValue;
  };
}
