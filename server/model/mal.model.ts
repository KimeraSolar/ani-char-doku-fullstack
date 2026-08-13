import { AnimeMediaType, AnimeRegistry, MALAnimeResponse, PaginatedResponse } from "@shared/types";
import { throwErrorResponse } from "@shared/utils";

// In-Memory cache for API to satisfy rate limits and make loading instant
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();

export const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getCached<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.info(`[MAL Model] Serving cache data for ${cacheKey}`);
    return cached.data;
  }

  console.info(`[MAL Model] Fetching from MAL API for key: ${cacheKey}`);
  try {
    const data = await fetchFn();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.error(`[MAL Model] MAL API fetch failed for key "${cacheKey}". Error:`, err);
    if (cached) {
      console.info(`[MAL Model] Serving stale cache for ${cacheKey}`);
      return cached.data;
    }
    throw err;
  }
}

const API_BASE_URL = process.env.MAL_PROXY_API_BASE_URL || "";

export async function getTopAnime(page: number, type?: string): Promise<PaginatedResponse<AnimeRegistry[]> | null> {
    try {
        const topAnime = await fetch(`${API_BASE_URL}/top/anime?page=${page}&limit=25${type ? "&type=" + type : ""}`);
        const topAnimeData: PaginatedResponse<MALAnimeResponse[]> = await topAnime.json();
        const topAnimeResponseData: AnimeRegistry[] = topAnimeData.data.map(anime => ({
            mal_id: anime.mal_id,
            title: anime.title_english || anime.title,
            image_url: anime.images.jpg.image_url,
            score: anime.score,
            type: anime.type as AnimeMediaType,
            year: anime.year,
            genres: anime.genres.map(genre => genre.name),
            source: anime.source,
        }));
        const topAnimeResponse: PaginatedResponse<AnimeRegistry[]> = {
            pagination: {
                current_page: topAnimeData.pagination.current_page,
                last_visible_page: topAnimeData.pagination.last_visible_page,
                items: topAnimeData.pagination.items,
            },
            data: topAnimeResponseData,
        }
        return topAnimeResponse;
    } catch (err) {
        throwErrorResponse("[MAL Model] Failed to get MAL Top Anime.", err);
        return null;
    }
}