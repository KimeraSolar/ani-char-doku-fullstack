import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { getDb } from "./mongo.model.js";

const DATA_URL_PATTERN = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/s;
const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export async function uploadImageBuffer(buffer: Buffer, contentType: string): Promise<string> {
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const blob = await put(`characters/${randomUUID()}.${ext}`, buffer, {
    access: "public",
    contentType,
  });
  return blob.url;
}

// Converts a base64 data URL into a Blob URL. Non-data URLs are returned untouched.
export async function externalizeImageUrl(url: string, cache: Map<string, string> = new Map()): Promise<string> {
  if (!url.startsWith("data:")) return url;

  const cached = cache.get(url);
  if (cached) return cached;

  const match = DATA_URL_PATTERN.exec(url);
  if (!match) throw new Error("Invalid image data URL.");

  const blobUrl = await uploadImageBuffer(Buffer.from(match[2], "base64"), match[1]);
  cache.set(url, blobUrl);
  return blobUrl;
}

export async function externalizeCharacterImages(char: any, cache: Map<string, string> = new Map()): Promise<any> {
  const images = Array.isArray(char.images)
    ? await Promise.all(char.images.map(async (img: any) => ({ ...img, url: await externalizeImageUrl(img.url, cache) })))
    : char.images;
  const imageUrl = char.imageUrl ? await externalizeImageUrl(char.imageUrl, cache) : char.imageUrl;
  return { ...char, images, imageUrl };
}

export function collectBlobUrls(docs: any[]): string[] {
  const urls = new Set<string>();
  for (const doc of docs) {
    if (!doc) continue;
    if (typeof doc.imageUrl === "string" && isBlobUrl(doc.imageUrl)) urls.add(doc.imageUrl);
    if (Array.isArray(doc.images)) {
      for (const img of doc.images) {
        if (typeof img?.url === "string" && isBlobUrl(img.url)) urls.add(img.url);
      }
    }
  }
  return [...urls];
}

// Deletes Blob files that no character document references anymore. Call after the DB write.
export async function deleteUnreferencedBlobs(urls: string[]): Promise<void> {
  try {
    const candidates = [...new Set(urls)].filter(isBlobUrl);
    if (candidates.length === 0) return;

    const db = await getDb();
    if (!db) return;

    const referencing = await db.collection("characters").find(
      { $or: [{ "images.url": { $in: candidates } }, { imageUrl: { $in: candidates } }] },
      { projection: { images: 1, imageUrl: 1 } }
    ).toArray();

    const stillUsed = new Set(collectBlobUrls(referencing));
    const orphaned = candidates.filter((url) => !stillUsed.has(url));
    if (orphaned.length > 0) await del(orphaned);
  } catch (err) {
    console.error("Failed to delete orphaned character images from Blob:", err);
  }
}
