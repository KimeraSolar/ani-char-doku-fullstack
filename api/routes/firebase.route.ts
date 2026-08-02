import { Express } from "express";
import { getFirebaseStatus } from "../model";

export async function firebaseRoutes(app: Express) {
    // Firebase status API
    app.get("/api/firebase-status", (_, res) => {
        try {
            res.json(getFirebaseStatus());
        } catch (err) {
            res.status(500).json({ error: "Failed to determine Firebase status." });
        }
    });
}