import { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { uploadImageBuffer } from "../model/index.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES },
});

function handleImageUpload(req: Request, res: Response, next: NextFunction) {
    upload.single("file")(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ error: "Image exceeds the 5 MB limit." });
        }
        if (err) return next(err);
        next();
    });
}

export async function imageRoutes(app: Express) {
    app.post("/api/images", handleImageUpload, async (req, res) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: "No file uploaded." });
            }
            if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                return res.status(415).json({ error: "Unsupported image type. Use JPEG, PNG or WebP." });
            }
            const url = await uploadImageBuffer(file.buffer, file.mimetype);
            res.json({ url });
        } catch (err) {
            console.error("Failed to upload image:", err);
            res.status(500).json({ error: "Failed to upload image." });
        }
    });
}
