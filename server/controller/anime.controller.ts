import { AnimeMediaType, AnimeRegistry, PaginatedResponse } from "@shared/types";
import { throwErrorResponse } from "@shared/utils";
import { createAnime, getAnimeDetails, getCached, getTopAnime, searchAnime } from "server/model";

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
        let animeResults: PaginatedResponse<AnimeRegistry[]> | null = null;
        if (!query || query?.trim() === "") {
            animeResults = await getCached<PaginatedResponse<AnimeRegistry[]> | null>(cacheKey, () => getTopAnime(page, type));
        } else {
            animeResults = await getCached<PaginatedResponse<AnimeRegistry[]> | null>(cacheKey, () => searchAnime(page, query, type));
        }
        return animeResults;
    } catch (err) {
        throwErrorResponse("[Anime Controller] Error searching anime on MAL API:", err);
        return null;
    }
}

export async function getMALAnime(malId: number): Promise<AnimeRegistry | null> {
    const cacheKey = `anime-details-${malId}`;
    try {
        const animeResult = await getCached<AnimeRegistry | null>(cacheKey, () => getAnimeDetails(malId));
        return animeResult;
    } catch (err) {
        throwErrorResponse("[Anime Controller] Error fetching anime details on MAL API:", err);
        return null;
    }
}

export async function registerNewAnime(newAnime: AnimeRegistry): Promise<AnimeRegistry | null> {
    try {
        const savedAnime = await createAnime(newAnime);
        return savedAnime;
    } catch (err) {
        throwErrorResponse("[Anime Controller] Error registering new anime:", err);
        return null;
    }
}