import { Redis } from "@upstash/redis";

// the three Redis operations rooms need
export interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts: { ex: number; nx?: boolean }): Promise<boolean>;
  del(key: string): Promise<void>;
}

export function memoryStore(): Store {
  const data = new Map<string, { v: unknown; until: number }>();
  const live = (k: string) => {
    const e = data.get(k);
    if (e && e.until < Date.now()) data.delete(k);
    return data.get(k);
  };
  return {
    async get<T>(k: string) {
      const e = live(k);
      return e ? (structuredClone(e.v) as T) : null;
    },
    async set(k, v, { ex, nx }) {
      if (nx && live(k)) return false;
      data.set(k, { v: structuredClone(v), until: Date.now() + ex * 1000 });
      return true;
    },
    async del(k) {
      data.delete(k);
    },
  };
}

function redisStore(redis: Redis): Store {
  return {
    get: (k) => redis.get(k),
    async set(k, v, { ex, nx }) {
      return (await (nx ? redis.set(k, v, { ex, nx: true }) : redis.set(k, v, { ex }))) === "OK";
    },
    async del(k) {
      await redis.del(k);
    },
  };
}

// Vercel's Upstash integration sets KV_REST_API_*; plain Upstash uses UPSTASH_REDIS_REST_*
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
export const persistent = !!(url && token);

// ponytail: memory fallback only works on a single dev server; on Vercel each function instance has its own memory
const g = globalThis as { __werbinichStore?: Store };
export const db: Store = url && token ? redisStore(new Redis({ url, token })) : (g.__werbinichStore ??= memoryStore());
