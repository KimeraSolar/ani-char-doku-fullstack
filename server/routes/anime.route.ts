import { Express } from "express";
import { fetchAllAnimes, saveAnimeRecord } from "../model/index.js";
import { getMALAnime, registerNewAnime, searchMALAnime } from "server/controller/anime.controller.js";
import { AnimeMediaType, AnimeRegistry } from "@shared/types/anime.types.js";

export async function animeRoutes(app: Express) {
    // MAL API Routes
    // Search MAL animes
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

    // Get MAL anime details
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
    });

    // Database Routes
    // Add new anime
    app.post("/api/anime", async (req, res) => {
        const newAnime: AnimeRegistry = req.body;
        if (!newAnime || typeof newAnime !== "object" || Array.isArray(newAnime)) {
            return res.status(400).json({ error: "Invalid anime data object layout." });
        }
        try {
            const savedAnime = await registerNewAnime(newAnime);
            res.status(201).json({ success: true, savedAnime });
        } catch (err) {
            console.error("[Anime Route] Failed to save anime to database:", err);
            res.status(500).json({ error: `Failed to save anime to database: ${err}` });
        }
    });

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