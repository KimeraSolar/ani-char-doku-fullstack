import { AnimeMediaType, AnimeRegistry, DefaultResponse, MALAnimeResponse, PaginatedResponse } from "@shared/types";
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

export async function searchAnime(page: number, query: string, type?: string): Promise<PaginatedResponse<AnimeRegistry[]> | null> {
  try {
    const animeSearch = await fetch(`${API_BASE_URL}/anime?page=${page}&limit=25${type ? "&type=" + type : ""}&q=${query}`);
    const animeSearchData: PaginatedResponse<MALAnimeResponse[]> = await animeSearch.json();
    const animeSearchResponseData: AnimeRegistry[] = animeSearchData.data.map(anime => ({
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
        current_page: animeSearchData.pagination.current_page,
        last_visible_page: animeSearchData.pagination.last_visible_page,
        items: animeSearchData.pagination.items,
      },
      data: animeSearchResponseData,
    }
    return topAnimeResponse;
  } catch (err) {
    throwErrorResponse("[MAL Model] Failed to search MAL Anime.", err);
    return null;
  }
}

export async function getAnimeDetails(malId: number): Promise<AnimeRegistry | null> {
  try {
    const anime = await fetch(`${API_BASE_URL}/anime/${malId}/full`);
    const animeRes: DefaultResponse<MALAnimeResponse> = await anime.json();
    const animeData = animeRes.data;
    const animeDataResponse: AnimeRegistry = {
      mal_id: animeData.mal_id,
      title: animeData.title_english || animeData.title,
      image_url: animeData.images.jpg.image_url,
      score: animeData.score,
      type: animeData.type as AnimeMediaType,
      year: animeData.year,
      genres: animeData.genres.map(genre => genre.name),
      source: animeData.source,
    }
    return animeDataResponse;
  } catch (err) {
    throwErrorResponse("[MAL Model] Failed to get MAL Anime details.", err);
    return null;
  }
}