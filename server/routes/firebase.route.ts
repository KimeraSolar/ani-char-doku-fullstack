import { Express } from "express";
import { getDatabaseStatus } from "../model/index.js";

export async function firebaseRoutes(app: Express) {
    // Database (MongoDB) status API
    app.get("/api/firebase-status", async (_, res) => {
        try {
            res.json(await getDatabaseStatus());
        } catch (err) {
            res.status(500).json({ error: "Failed to determine database status." });
        }
    });
}