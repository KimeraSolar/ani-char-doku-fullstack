import { Express } from "express";
import { fetchAllTraits, fetchTraitsCount } from "../model/index.js";
import { registerNewTrait } from "server/controller/traits.controller.js";

export async function traitRoutes(app: Express) {
    app.get("/api/traits/count", async (_, res) => {
        try {
            const traitsCount = await fetchTraitsCount();
            res.status(200).json({ count: traitsCount });
        } catch (err) {
            console.error("[Traits Route] Failed to fetch traits count:", err);
            res.status(500).json({ error: "Failed to fetch traits count."});
        }
    });

    app.get("/api/traits", async (req, res) => {
        try {
            const traits = await fetchAllTraits();
            res.json({ traits });
        } catch (err) {
            console.error("[Traits Route] Failed to fetch traits:", err);
            res.status(500).json({ error: "Failed to fetch traits." });
        }
    });

    app.post("/api/traits", async (req, res) => {
        try {
            const newTrait = req.body;
            if (!newTrait || typeof newTrait !== "object" || Array.isArray(newTrait)) {
                return res.status(400).json({ error: "Invalid traits data object layout." });
            }
            const savedTrait = await registerNewTrait(newTrait);
            res.status(201).json({ success: true, savedTrait });
        } catch (err) {
            console.error("[Traits Route] Failed to save trait to database:", err);
            res.status(500).json({ error: "Failed to save trait to database." });
        }
    });  

    // app.post("/api/traits/delete", async (req, res) => {
    //     try {
    //         const { key } = req.body;
    //         if (!key) {
    //             return res.status(400).json({ error: "Key is required to delete a trait." });
    //         }
    //         const traits = await removeTraitAndCleanCharacters(key);
    //         res.json({ success: true, traits });
    //     } catch (err) {
    //         console.error("Failed to delete trait:", err);
    //         res.status(500).json({ error: "Failed to delete trait from database system." });
    //     }
    // });

    // app.post("/api/traits/rename", async (req, res) => {
    //     try {
    //         const { oldKey, newKey } = req.body;
    //         if (!oldKey || !newKey) {
    //             return res.status(400).json({ error: "Both oldKey and newKey are required." });
    //         }
    //         const traits = await renameTraitKey(oldKey, newKey);
    //         res.json({ success: true, traits });
    //     } catch (err) {
    //         console.error("Failed to rename trait key:", err);
    //         res.status(500).json({ error: "Failed to rename trait key." });
    //     }
    // });

    // app.post("/api/traits/update-definition", async (req, res) => {
    //     try {
    //         const { key, newKey, values } = req.body;
    //         if (!key || !Array.isArray(values)) {
    //             return res.status(400).json({ error: "Key and values array are required." });
    //         }
    //         const traits = await updateTraitDefinition(key, newKey, values);
    //         res.json({ success: true, traits });
    //     } catch (err) {
    //         console.error("Failed to update trait definition:", err);
    //         res.status(500).json({ error: "Failed to update trait configuration." });
    //     }
    // });

    // app.post("/api/traits/add-value", async (req, res) => {
    //     try {
    //         const { key, value, description } = req.body;
    //         if (!key || !value) {
    //             return res.status(400).json({ error: "Key and value are required." });
    //         }
    //         const traits = await addTraitValue(key, value, description);
    //         res.json({ success: true, traits });
    //     } catch (err) {
    //         console.error("Failed to append trait value:", err);
    //         res.status(500).json({ error: "Failed to append trait value." });
    //     }
    // });
}