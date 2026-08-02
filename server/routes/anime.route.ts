import { Express } from "express";
import { fetchAllAnimes, saveAnimeRecord } from "../model/index.js";

export async function animeRoutes(app: Express) {
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