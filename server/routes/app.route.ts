import { Express } from "express";
import { getRegisteredAnimeCount, getRegisteredCharactersCount, getRegisteredTraitsCount } from "server/controller";

export async function AppRoutes(app: Express) {
    // Fetch Registered Items Count
    app.get("/api/app/registered/count", async (_, res) => {
        try {
            const traitsCount = await getRegisteredTraitsCount();
            if (!traitsCount) throw new Error("Failed to fetch registered traits count.");

            const charactersCount = await getRegisteredCharactersCount();
            if (!charactersCount) throw new Error("Failed to fetch registered characters count.");

            const animeCount = await getRegisteredAnimeCount();
            if (!animeCount) throw new Error("Failed to fetch registered animes count.");

            res.status(200).json({ traits: traitsCount, characters: charactersCount, animes: animeCount });
        } catch (err) {
            console.error("[App Route] Failed to fetch registered items count:", err);
            res.status(500).json({ error: `Failed to fetch registered items count: ${err}` });
        }
    });
}