import { DESK } from "@/config/desk";

type Entry<T> = { expiresAt: number; value: T };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const promise = load()
    .then((value) => {
      store.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

export function oddsCacheKey(sport: string, markets: string, bookmakers: string, regions: string): string {
  return `${sport}|${markets}|${bookmakers}|${regions}|american|${DESK.cacheTtlMs}`;
}
