import { AnimeMediaType, AnimeRegistry, PaginatedResponse } from "@shared/types";
import { throwErrorResponse } from "@shared/utils";
import { getCached, getTopAnime } from "server/model";

export async function getRegisteredAnimeCount(): Promise<number | null> {
    try {
        console.warn("Skipping: getRegisteredAnimeCount not implemented yet.");
        const animeCount = 5;
        return animeCount;
    } catch (err) {
        throwErrorResponse("[Anime Controller] Error fetching registered anime count:", err);
        return null;
    }
}

export async function searchMALAnime(page: number, type?: AnimeMediaType, query?: string): Promise<PaginatedResponse<AnimeRegistry[]> | null> {
    const cacheKey = `anime-search-${page}${type ? "-" + type : ""}${query ? "-" + query : ""}`;
    try {
        const animeResults = await getCached<PaginatedResponse<AnimeRegistry[]> | null>(cacheKey, () => getTopAnime(page, type));
        return animeResults;
    } catch (err) {
        throwErrorResponse("[Anime Controller] Error searching anime on MAL API", err);
        return null;
    }
}