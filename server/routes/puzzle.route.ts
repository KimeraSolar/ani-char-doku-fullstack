import { Express } from "express";
import { deleteDailyLeaderboardEntry, deletePuzzleHistoryRecord, fetchDailyLeaderboard, fetchDailyPuzzle, fetchUserPuzzleHistory, saveDailyLeaderboardEntry, saveDailyPuzzle, savePuzzleHistoryRecord } from "../model/index.js";

export async function puzzleRoutes(app: Express) {
    app.post("/api/puzzle-history", async (req, res) => {
        try {
            const record = req.body;
            if (!record || !record.id || !record.userId || !record.puzzleCode) {
                return res.status(400).json({ error: "Missing required puzzle history parameters." });
            }
            const saved = await savePuzzleHistoryRecord(record);
            res.json({ success: true, record: saved });
        } catch (err) {
            console.error("Failed to save puzzle history record:", err);
            res.status(500).json({ error: "Failed to save puzzle history record." });
        }
    });

    app.get("/api/puzzle-history/:userId", async (req, res) => {
        try {
            const { userId } = req.params;
            const history = await fetchUserPuzzleHistory(userId);
            res.json(history);
        } catch (err) {
            console.error("Failed to fetch puzzle history:", err);
            res.status(500).json({ error: "Failed to fetch puzzle history." });
        }
    });

    app.delete("/api/puzzle-history/:id", async (req, res) => {
        try {
            const { id } = req.params;
            await deletePuzzleHistoryRecord(id);
            res.json({ success: true });
        } catch (err) {
            console.error("Failed to delete puzzle history entry:", err);
            res.status(500).json({ error: "Failed to delete puzzle history entry." });
        }
    });

    app.get("/api/daily-puzzle", async (req, res) => {
        try {
            const todayStr = new Date().toISOString().split("T")[0];
            const date = String(req.query.date || todayStr);
            if (date > todayStr) {
                return res.status(400).json({ error: "Cannot access daily puzzle for future dates.", exists: false, puzzle: null });
            }
            const puzzle = await fetchDailyPuzzle(date);
            if (puzzle) {
                res.json({ exists: true, puzzle });
            } else {
                res.json({ exists: false, puzzle: null });
            }
        } catch (err) {
            console.error("Failed to fetch daily puzzle:", err);
            res.status(500).json({ error: "Failed to fetch daily puzzle." });
        }
    });

    app.post("/api/daily-puzzle", async (req, res) => {
        try {
            const todayStr = new Date().toISOString().split("T")[0];
            const { date, puzzleCode, gameMode } = req.body;
            if (!date || !puzzleCode || !gameMode) {
                return res.status(400).json({ error: "date, puzzleCode, and gameMode are required." });
            }
            if (date > todayStr) {
                return res.status(400).json({ error: "Cannot generate or save daily puzzle for future dates." });
            }
            // Check if already exists for date first
            const existing = await fetchDailyPuzzle(date);
            if (existing) {
                return res.json({ exists: true, puzzle: existing });
            }
            const saved = await saveDailyPuzzle(date, puzzleCode, gameMode);
            res.json({ exists: true, puzzle: saved });
        } catch (err) {
            console.error("Failed to save daily puzzle:", err);
            res.status(500).json({ error: "Failed to save daily puzzle." });
        }
    });

    app.get("/api/daily-leaderboard", async (req, res) => {
        try {
            const todayStr = new Date().toISOString().split("T")[0];
            const date = String(req.query.date || todayStr);
            if (date > todayStr) {
                return res.status(400).json({ error: "Cannot view leaderboard for future dates.", date, leaderboard: [] });
            }
            const leaderboard = await fetchDailyLeaderboard(date);
            res.json({ date, leaderboard });
        } catch (err) {
            console.error("Failed to fetch daily leaderboard:", err);
            res.status(500).json({ error: "Failed to fetch daily leaderboard." });
        }
    });

    app.post("/api/daily-leaderboard", async (req, res) => {
        try {
            const todayStr = new Date().toISOString().split("T")[0];
            const { date, userId, userDisplayName, userPhotoURL, matchScore, pointsScore, jokerFound, completedAt, placedCharacterIds, gameMode } = req.body;
            if (!date || !userId || pointsScore === undefined || !completedAt) {
                return res.status(400).json({ error: "date, userId, pointsScore, and completedAt are required." });
            }
            if (date > todayStr) {
                return res.status(400).json({ error: "Cannot submit leaderboard entries for future dates." });
            }

            const result = await saveDailyLeaderboardEntry({
                date,
                userId,
                userDisplayName,
                userPhotoURL,
                matchScore: matchScore || "0",
                pointsScore: Number(pointsScore),
                jokerFound: Boolean(jokerFound),
                completedAt,
                placedCharacterIds: Array.isArray(placedCharacterIds) ? placedCharacterIds : [],
                gameMode: gameMode || "none"
            });

            if (!result.success) {
                return res.status(400).json({ error: result.reason || "Score not saved to leaderboard." });
            }

            res.json({ success: true, entry: result.entry });
        } catch (err) {
            console.error("Failed to save daily leaderboard entry:", err);
            res.status(500).json({ error: "Failed to save daily leaderboard entry." });
        }
    });

    app.delete("/api/daily-leaderboard/:id", async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: "Leaderboard entry ID is required." });
            }
            await deleteDailyLeaderboardEntry(id);
            res.json({ success: true, message: "Leaderboard entry deleted successfully." });
        } catch (err) {
            console.error("Failed to delete daily leaderboard entry:", err);
            res.status(500).json({ error: "Failed to delete daily leaderboard entry." });
        }
    });
}