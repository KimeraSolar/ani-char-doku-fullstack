import { Express } from "express";
import { fetchAllAnimes, saveAnimeRecord } from "../model/index.js";
import { getMALAnime, searchMALAnime } from "server/controller/anime.controller.js";
import { AnimeMediaType } from "@shared/types/anime.types.js";

export async function animeRoutes(app: Express) {
    app.get("/api/mal/anime", async (req, res) => {
        const { page, query, type } = req.query;
        const validatedPage = (Number(page) > 0) ? Number(page) : 1;
        const validatedQuery = query ? String(query) : undefined;
        const validatedType = type ? String(type) as AnimeMediaType : undefined;
        try {
            const searchResults = await searchMALAnime(validatedPage, validatedType, validatedQuery);
            res.status(200).json(searchResults);
        } catch (err) {
            console.error("[MAL API Route] Failed to search animes:", err);
            res.status(500).json({ error: `Failed to search animes: ${err}` });
        }
    });

    app.get("/api/mal/anime/:id", async (req, res) => {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Invalid anime data: ID is required." });
        }
        try {
            const animeResult = await getMALAnime(Number(id));
            res.status(200).json(animeResult);
        } catch (err) {
            console.error("[MAL API Route] Failed to fetch anime details:", err);
            res.status(500).json({ error: `Failed to fetch anime details: ${err}` });
        }
    })

    // OLD ROUTES
    app.get("/api/database/animes", async (req, res) => {
        try {
            const animes = await fetchAllAnimes();
            res.json(animes);
        } catch (err) {
            console.error("Failed to read registered animes:", err);
            res.status(500).json({ error: "Failed to read registered animes." });
        }
    });

    app.post("/api/database/animes", async (req, res) => {
        try {
            const anime = req.body;
            if (!anime || !anime.malId || !anime.title) {
                return res.status(400).json({ error: "Invalid anime data: malId and title are required." });
            }
            await saveAnimeRecord(anime);
            res.json({ success: true, message: "Anime successfully saved in the registry." });
        } catch (err) {
            console.error("Failed to save anime record:", err);
            res.status(500).json({ error: "Failed to save anime record." });
        }
    });
}