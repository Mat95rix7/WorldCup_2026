type CacheEntry<T> = { data: T; timestamp: number };
const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string, maxAgeMs: number): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) return null;
  return entry.data as T;
}

export function setCached<T>(key: string, data: T) {
  store.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key: string) {
  store.delete(key);
}