import { Express } from "express";
import { fetchAnimeCharacters, fetchAnimeDetails, fetchCharacterDetails, fetchSearchAnime, fetchTopAnime, getCachedProxy } from "../mal-proxy";

export async function apiRoutes(app: Express) {
    app.get("/api/proxy/top-anime", async (req, res) => {
        const pageVal = Number(req.query.page || "1");
        const cacheKey = `top-anime-${pageVal}`;
        try {
            const data = await getCachedProxy(cacheKey, () => fetchTopAnime(pageVal, cacheKey));
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get("/api/proxy/search-anime", async (req, res) => {
        const q = req.query.q || "";
        const pageVal = Number(req.query.page || "1");
        const type = req.query.type || "";

        const cacheKey = `search-anime-${q}-${pageVal}-${type}`;
        try {
            const data = await getCachedProxy(cacheKey, () => fetchSearchAnime(String(q), pageVal, String(type), cacheKey));
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get("/api/proxy/anime-characters/:id", async (req, res) => {
        const { id } = req.params;
        const animeId = Number(id);
        const cacheKey = `anime-characters-${animeId}`;
        try {
            const data = await getCachedProxy(cacheKey, () => fetchAnimeCharacters(animeId, cacheKey));
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get("/api/proxy/anime/:id", async (req, res) => {
        const { id } = req.params;
        const animeId = Number(id);
        const cacheKey = `anime-${animeId}`;
        try {
            const data = await getCachedProxy(cacheKey, () => fetchAnimeDetails(animeId, cacheKey));
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get("/api/proxy/character/:id", async (req, res) => {
        const { id } = req.params;
        const charId = Number(id);
        const cacheKey = `character-${charId}`;
        try {
            const data = await getCachedProxy(cacheKey, () => fetchCharacterDetails(charId, cacheKey));
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });
}