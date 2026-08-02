import { Express } from "express";
import { addTraitValue, fetchAllTraits, removeTraitAndCleanCharacters, renameTraitKey, saveTraitsRecord, updateTraitDefinition } from "../model/index.js";

export async function traitRoutes(app: Express) {
    app.get("/api/traits", async (req, res) => {
        try {
            const traits = await fetchAllTraits();
            res.json(traits);
        } catch (err) {
            console.error("Failed to read traits database:", err);
            res.status(500).json({ error: "Failed to read traits database." });
        }
    });

    app.get("/api/traits/count", async (req, res) => {
        try {
            const traits = await fetchAllTraits();
            res.json({ count: Object.keys(traits).length });
        } catch (err) {
            console.error("Failed to read traits database:", err);
            res.status(500).json({ error: "Failed to read traits database." });
        }
    });

    app.post("/api/traits", async (req, res) => {
        try {
            const updatedTraits = req.body;
            if (!updatedTraits || typeof updatedTraits !== "object" || Array.isArray(updatedTraits)) {
                return res.status(400).json({ error: "Invalid traits data object layout." });
            }
            await saveTraitsRecord(updatedTraits);
            res.json({ success: true, traits: updatedTraits });
        } catch (err) {
            console.error("Failed to save traits database:", err);
            res.status(500).json({ error: "Failed to save traits database." });
        }
    });

    app.post("/api/traits/delete", async (req, res) => {
        try {
            const { key } = req.body;
            if (!key) {
                return res.status(400).json({ error: "Key is required to delete a trait." });
            }
            const traits = await removeTraitAndCleanCharacters(key);
            res.json({ success: true, traits });
        } catch (err) {
            console.error("Failed to delete trait:", err);
            res.status(500).json({ error: "Failed to delete trait from database system." });
        }
    });

    app.post("/api/traits/rename", async (req, res) => {
        try {
            const { oldKey, newKey } = req.body;
            if (!oldKey || !newKey) {
                return res.status(400).json({ error: "Both oldKey and newKey are required." });
            }
            const traits = await renameTraitKey(oldKey, newKey);
            res.json({ success: true, traits });
        } catch (err) {
            console.error("Failed to rename trait key:", err);
            res.status(500).json({ error: "Failed to rename trait key." });
        }
    });

    app.post("/api/traits/update-definition", async (req, res) => {
        try {
            const { key, newKey, values } = req.body;
            if (!key || !Array.isArray(values)) {
                return res.status(400).json({ error: "Key and values array are required." });
            }
            const traits = await updateTraitDefinition(key, newKey, values);
            res.json({ success: true, traits });
        } catch (err) {
            console.error("Failed to update trait definition:", err);
            res.status(500).json({ error: "Failed to update trait configuration." });
        }
    });

    app.post("/api/traits/add-value", async (req, res) => {
        try {
            const { key, value, description } = req.body;
            if (!key || !value) {
                return res.status(400).json({ error: "Key and value are required." });
            }
            const traits = await addTraitValue(key, value, description);
            res.json({ success: true, traits });
        } catch (err) {
            console.error("Failed to append trait value:", err);
            res.status(500).json({ error: "Failed to append trait value." });
        }
    });
}