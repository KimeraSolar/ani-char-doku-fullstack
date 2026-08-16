import { AnimeMediaType, AnimeRegistry, PaginatedResponse } from "@shared/types";
import { throwErrorResponse } from "@shared/utils";
import { createAnime, getMALAnimeDetails, getCached, getMALTopAnime, searchMALAnime, fetchAnimes, fetchAnimeDetails } from "server/model";

// MAL API Controllers
async function getMALAnime(page: number, type?: AnimeMediaType, query?: string): Promise<PaginatedResponse<AnimeRegistry[]> | null> {
    const cacheKey = `anime-search-${page}${type ? "-" + type : ""}${query ? "-" + query : ""}`;
    try {
        let malAnimeResults: PaginatedResponse<AnimeRegistry[]> | null = null;
        if (!query || query?.trim() === "") {
            malAnimeResults = await getCached<PaginatedResponse<AnimeRegistry[]> | null>(cacheKey, () => getMALTopAnime(page, type));
        } else {
            malAnimeResults = await getCached<PaginatedResponse<AnimeRegistry[]> | null>(cacheKey, () => searchMALAnime(page, query, type));
        }
        if (malAnimeResults !== null) {
        const resultsMALIDs = malAnimeResults?.data.map(anime => anime.mal_id).filter(Boolean);
        const registeredAnimes = await fetchAnimes(resultsMALIDs);
        const malAnimeResultsDataUpdated = malAnimeResults?.data.map(anime => (
            registeredAnimes?.find((registry => registry.mal_id === anime.mal_id)) || anime
        ));
            const malAnimeResultsUpdated: PaginatedResponse<AnimeRegistry[]> = {
                ...malAnimeResults,
                data: malAnimeResultsDataUpdated || [],
            };
            return malAnimeResultsUpdated;
        } else {
            throw new Error("Failed to search animes on MAL API.");
        }
    } catch (err) {
        throwErrorResponse("[Anime Controller] Error searching anime on MAL API:", err);
        return null;
    }
}

// Database Controllers
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

async function getRegisteredAnime(page: number, type?: AnimeMediaType, query?: string): Promise<PaginatedResponse<AnimeRegistry[]> | null> {
    try {
        console.warn("Skipping: getRegisteredAnime not implemented yet.");
        const registeredAnime = null;
        return registeredAnime;
    } catch (err) {
        throwErrorResponse("[Anime Controller] Error fetching registered anime count:", err);
        return null;
    }
}

export async function searchAnime(page: number, type?: AnimeMediaType, query?: string, dbOnly?: boolean): Promise<PaginatedResponse<AnimeRegistry[]> | null> {
    try {
        let animeResults: PaginatedResponse<AnimeRegistry[]> | null = null;
        if (!dbOnly) {
            animeResults = await getMALAnime(page, type, query);
        } else {
            animeResults = await getRegisteredAnime(page, type, query);
        }
        return animeResults;
    } catch (err) {
        throwErrorResponse("[Anime Controller] Error searching anime on MAL API:", err);
        return null;
    }
}

export async function getAnimeDetails(malId: number): Promise<AnimeRegistry | null> {
    const cacheKey = `anime-details-${malId}`;
    try {
        let registeredAnimeResult = null;
        try {
            registeredAnimeResult = await fetchAnimeDetails(malId);
        } catch {
            registeredAnimeResult = null;
        }
        if (!registeredAnimeResult) {
            const animeResult = await getCached<AnimeRegistry | null>(cacheKey, () => getMALAnimeDetails(malId));
            return animeResult;
        } else {
            return registeredAnimeResult;
        }
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