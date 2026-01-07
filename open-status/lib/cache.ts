import { getRedis } from "./redis";

const CACHE_TTL_STATUS = 300; // 5 minutes
const CACHE_TTL_SEARCH = 900; // 15 minutes

export async function getCachedStatus(placeId: string): Promise<any | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const cached = await redis.get(`status:${placeId}`);
    if (!cached) return null;
    // Upstash returns the value directly, may already be parsed
    return typeof cached === "string" ? JSON.parse(cached) : cached;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

export async function setCachedStatus(placeId: string, data: any): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.setex(`status:${placeId}`, CACHE_TTL_STATUS, JSON.stringify(data));
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

export async function getCachedSearch(
  chainSlug: string,
  lat: number,
  lng: number
): Promise<any | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = `search:${chainSlug}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = await redis.get(key);
    if (!cached) return null;
    return typeof cached === "string" ? JSON.parse(cached) : cached;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

export async function setCachedSearch(
  chainSlug: string,
  lat: number,
  lng: number,
  data: any
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = `search:${chainSlug}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    await redis.setex(key, CACHE_TTL_SEARCH, JSON.stringify(data));
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

