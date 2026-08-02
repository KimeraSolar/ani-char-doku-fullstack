import { handleProxyResponse } from "./api.proxy.js";

const API_BASE_URL = process.env.MAL_PROXY_API_BASE_URL || "";

export async function fetchTopAnime(page: number, cacheKey: string) {
  const res = await fetch(`${API_BASE_URL}/top/anime?page=${page}`);
  return handleProxyResponse(res, cacheKey);
}

export async function fetchSearchAnime(q: string, page: number, type: string, cacheKey: string) {
  let url = `${API_BASE_URL}/anime?q=${encodeURIComponent(q)}&page=${page}`;
  if (type && type !== "All") {
    url += `&type=${type.toLowerCase()}`;
  }
  const res = await fetch(url);
  return handleProxyResponse(res, cacheKey);
}

export async function fetchAnimeCharacters(animeId: number, cacheKey: string) {
  const res = await fetch(`${API_BASE_URL}/anime/${animeId}/characters`);
  return handleProxyResponse(res, cacheKey);
}

export async function fetchAnimeDetails(animeId: number, cacheKey: string) {
  const res = await fetch(`${API_BASE_URL}/anime/${animeId}/full`);
  return handleProxyResponse(res, cacheKey);
}