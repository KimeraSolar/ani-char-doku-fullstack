import { Express } from "express";
import { batchUpdateCharacterTraits, deleteCharacterRecord, fetchAllCharacters, importCharactersBatch, saveCharacterRecord } from "../model/index.js";

export async function characterRoutes(app: Express) {
    app.get("/api/database", async (req, res) => {
        try {
            const characters = await fetchAllCharacters();
            res.json(characters);
        } catch (err) {
            console.error("Failed to read database:", err);
            res.status(500).json({ error: "Failed to read database." });
        }
    });

    app.post("/api/database", async (req, res) => {
        try {
            const newChar = req.body;
            if (!newChar || !newChar.name) {
                return res.status(400).json({ error: "Invalid character data: Name is required." });
            }
            await saveCharacterRecord(newChar);
            res.json({ success: true, message: "Character successfully registered." });
        } catch (err) {
            console.error("Failed to save character:", err);
            res.status(500).json({ error: "Failed to save character data." });
        }
    });

    app.delete("/api/database/:id", async (req, res) => {
        try {
            const { id } = req.params;
            await deleteCharacterRecord(id);
            res.json({ success: true, message: "Character removed from database." });
        } catch (err) {
            console.error("Failed to delete character:", err);
            res.status(500).json({ error: "Failed to delete character record." });
        }
    });

    app.post("/api/database/batch-update-traits", async (req, res) => {
        try {
            const { characterIds, traits, action } = req.body;
            if (!Array.isArray(characterIds) || characterIds.length === 0) {
                return res.status(400).json({ error: "characterIds must be a non-empty array." });
            }
            if (!traits || typeof traits !== "object") {
                return res.status(400).json({ error: "traits must be an object with trait keys and values." });
            }
            const act = action === "remove" ? "remove" : "add";
            const result = await batchUpdateCharacterTraits(characterIds, traits, act);
            const msg = act === "remove"
                ? `Successfully removed configured traits from ${result.updatedCount} characters.`
                : `Successfully merged traits into ${result.updatedCount} characters.`;
            res.json({ success: true, updatedCount: result.updatedCount, message: msg });
        } catch (err) {
            console.error("Failed to batch update traits:", err);
            res.status(500).json({ error: "Failed to apply batch traits update to database." });
        }
    });

    app.post("/api/database/import", async (req, res) => {
        try {
            const { characters: importedChars, mode } = req.body;
            if (!Array.isArray(importedChars)) {
                return res.status(400).json({ error: "Imported data must be an array of characters." });
            }
            const count = await importCharactersBatch(importedChars, mode);
            const allCharacters = await fetchAllCharacters();
            res.json({ success: true, count, total: allCharacters.length });
        } catch (err) {
            console.error("Failed to import database:", err);
            res.status(500).json({ error: "Failed to parse and import database record." });
        }
    });
}