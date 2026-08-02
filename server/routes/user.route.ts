import { Express } from "express";
import { fetchAllUsers, syncUserRecord, updateUserBanStatus, updateUserRole } from "../model/index.js";

export async function userRoutes(app: Express) {
    app.post("/api/users/sync", async (req, res) => {
        try {
            const { uid, email, displayName, photoURL } = req.body;
            if (!uid || !email) {
                return res.status(400).json({ error: "uid and email are required parameters." });
            }
            const userProfile = await syncUserRecord({ uid, email, displayName, photoURL });
            res.json({ success: true, userProfile });
        } catch (err) {
            console.error("Failed to sync user profile:", err);
            res.status(500).json({ error: "Failed to sync user profile." });
        }
    });

    app.get("/api/users", async (req, res) => {
        try {
            const users = await fetchAllUsers();
            res.json(users);
        } catch (err) {
            console.error("Failed to fetch registered users list:", err);
            res.status(500).json({ error: "Failed to fetch registered users list." });
        }
    });

    app.patch("/api/users/:uid/role", async (req, res) => {
        try {
            const { uid } = req.params;
            const { role } = req.body;
            if (!role || !["user", "admin", "owner"].includes(role)) {
                return res.status(400).json({ error: "Role must be 'user', 'admin', or 'owner'." });
            }
            const updatedUser = await updateUserRole(uid, role);
            res.json({ success: true, user: updatedUser });
        } catch (err: any) {
            console.error("Failed to update user role:", err);
            res.status(500).json({ error: err.message || "Failed to update user role." });
        }
    });

    app.patch("/api/users/:uid/ban", async (req, res) => {
        try {
            const { uid } = req.params;
            const { isBanned, banReason } = req.body;
            if (typeof isBanned !== "boolean") {
                return res.status(400).json({ error: "isBanned must be a boolean." });
            }
            const updatedUser = await updateUserBanStatus(uid, isBanned, banReason);
            res.json({ success: true, user: updatedUser });
        } catch (err: any) {
            console.error("Failed to update user ban status:", err);
            res.status(500).json({ error: err.message || "Failed to update user ban status." });
        }
    });
}