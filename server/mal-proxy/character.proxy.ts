import { handleProxyResponse } from "./api.proxy.js";

const API_BASE_URL = process.env.MAL_PROXY_API_BASE_URL || "";

export async function fetchCharacterDetails(charId: number, cacheKey: string) {
  const res = await fetch(`${API_BASE_URL}/characters/${charId}/full`);
  return handleProxyResponse(res, cacheKey);
}