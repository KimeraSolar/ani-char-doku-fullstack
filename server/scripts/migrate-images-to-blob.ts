// One-off migration: moves legacy base64 character images to Vercel Blob.
// Usage:
//   npx tsx --env-file=.env server/scripts/migrate-images-to-blob.ts --dry-run
//   npx tsx --env-file=.env server/scripts/migrate-images-to-blob.ts
import { externalizeCharacterImages, getDb } from "../model/index.js";

const dryRun = process.argv.includes("--dry-run");
const isDataUrl = (url: unknown) => typeof url === "string" && url.startsWith("data:");

function dataUrlBytes(url: string): number {
  const commaIndex = url.indexOf(",");
  return commaIndex === -1 ? 0 : Math.floor(((url.length - commaIndex - 1) * 3) / 4);
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("MongoDB is not configured. Check MONGODB_URI and MONGODB_DATABASE.");

  const characters = db.collection("characters");
  const docs = await characters.find(
    { $or: [{ "images.url": { $regex: "^data:" } }, { imageUrl: { $regex: "^data:" } }] },
    { projection: { images: 1, imageUrl: 1 } }
  ).toArray();

  console.log(`${docs.length} character(s) with base64 images found.${dryRun ? " (dry run, nothing will be changed)" : ""}`);

  const cache = new Map<string, string>();
  let migrated = 0;
  let bytesBefore = 0;

  for (const doc of docs) {
    const urls = [doc.imageUrl, ...(doc.images || []).map((img: any) => img?.url)].filter(isDataUrl);
    bytesBefore += urls.reduce((sum: number, url: string) => sum + dataUrlBytes(url), 0);

    if (dryRun) {
      migrated++;
      continue;
    }

    const updated = await externalizeCharacterImages(doc, cache);
    await characters.updateOne({ _id: doc._id }, { $set: { images: updated.images, imageUrl: updated.imageUrl } });
    migrated++;
    console.log(`Migrated ${String(doc._id)}`);
  }

  console.log(`${dryRun ? "Would migrate" : "Migrated"} ${migrated} character(s); base64 payload: ${(bytesBefore / 1024 / 1024).toFixed(2)} MB.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Image migration failed:", err);
  process.exit(1);
});
