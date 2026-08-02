// In-Memory cache for API to satisfy rate limits and make loading instant!
interface CacheEntry {
  data: any;
  timestamp: number;
}
const proxyCache = new Map<string, CacheEntry>();

export const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function handleProxyResponse(res: Response, cacheKey: string) {
  if (!res.ok) {
    if (res.status === 429) {
      const cached = proxyCache.get(cacheKey);
      if (cached) {
        console.log(`Rate limited! Serving stale cache for ${cacheKey}`);
        return cached.data;
      }
      throw new Error("API rate limit reached. Please wait a moment and try again.");
    }
    throw new Error(`API responded with status ${res.status}`);
  }
  return await res.json();
}

export async function getCachedProxy<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = proxyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  console.log(`Fetching from MAL Proxy API for key: ${cacheKey}`);
  try {
    const data = await fetchFn();
    proxyCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (err: any) {
    console.error(`MAL Proxy API fetch failed for key "${cacheKey}". Error:`, err);
    if (cached) {
      console.log(`Serving stale cache for ${cacheKey}`);
      return cached.data;
    }
    throw err;
  }
}