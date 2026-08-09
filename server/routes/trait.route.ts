import { Express } from "express";
import { getRegisteredTraitsCount, deleteRegisteredTrait, registerNewTrait, getRegisteredTraits, updateRegisteredTrait } from "server/controller/traits.controller.js";

export async function traitRoutes(app: Express) {
    // Fetch Traits Count
    app.get("/api/traits/count", async (_, res) => {
        try {
            const traitsCount = await getRegisteredTraitsCount();
            res.status(200).json({ count: traitsCount });
        } catch (err) {
            console.error("[Traits Route] Failed to fetch traits count:", err);
            res.status(500).json({ error: `Failed to fetch traits count: ${err}`});
        }
    });

    // Fetch All Traits
    app.get("/api/traits", async (_, res) => {
        try {
            const traits = await getRegisteredTraits();
            res.status(200).json({ traits });
        } catch (err) {
            console.error("[Traits Route] Failed to fetch traits:", err);
            res.status(500).json({ error: `Failed to fetch traits: ${err}` });
        }
    });

    // Add New Trait
    app.post("/api/traits", async (req, res) => {
        try {
            const newTrait = req.body;
            if (!newTrait || typeof newTrait !== "object" || Array.isArray(newTrait)) {
                return res.status(400).json({ error: "Invalid trait data object layout." });
            }
            const savedTrait = await registerNewTrait(newTrait);
            res.status(201).json({ success: true, savedTrait });
        } catch (err) {
            console.error("[Traits Route] Failed to save trait to database:", err);
            res.status(500).json({ error: `Failed to save trait to database: ${err}` });
        }
    });
    
    // Delete Trait
    app.delete("/api/traits", async (req, res) => {
        try {
            const trait = req.body;
            if (!trait || typeof trait !== "object" || Array.isArray(trait)) {
                return res.status(400).json({ error: "Invalid trait data object layout." });
            }
            const deletedTrait = await deleteRegisteredTrait(trait);
            if (!deletedTrait) throw new Error();
            res.status(200).json({ success: true, deletedTrait });
        } catch (err) {
            console.error("[Traits Route] Failed to delete trait from database:", err);
            res.status(500).json({ error: "Failed to delete trait from database." });
        }
    });

    // Update Trait
    app.post("/api/traits/:id", async (req, res) => {
        try {
            const traitId = req.params.id;
            if (!traitId) {
                return res.status(400).json({ error: "Invalid trait ID."});
            }
            const updatedTrait = req.body;
            if (!updatedTrait || typeof updatedTrait !== "object" || Array.isArray(updatedTrait)) {
                return res.status(400).json({ error: "Invalid trait data object layout." });
            }
            const savedUpdatedTrait = await updateRegisteredTrait(updatedTrait);
            res.status(200).json({ success: true, savedUpdatedTrait });
        } catch (err) {
            console.error("[Traits Route] Failed to update trait in database:", err);
            res.status(500).json({ error: `Failed to update trait in database: ${err}` });
        }
    });
}