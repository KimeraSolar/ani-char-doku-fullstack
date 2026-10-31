import { getDb } from "./mongo.model.js";

export async function fetchAllAnimes(): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot fetch animes.");
    return [];
  }

  try {
    const docs = await db.collection("animes").find({}).toArray();
    return docs.map(({ _id, ...rest }: any) => rest);
  } catch (err) {
    console.error("MongoDB read error for animes:", err);
    return [];
  }
}

export async function saveAnimeRecord(anime: { 
  malId: number; 
  title: string;
  type?: string | null;
  source?: string | null;
  year?: number | null;
  studios?: string[] | null;
  genres?: string[] | null;
  images?: any | null;
  episodes?: number | null;
  score?: number | null;
  titles?: any[] | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("Failed to write local animes file. MongoDB is not initialized.");
    return;
  }

  try {
    const docId = String(anime.malId);

    const updatePayload: any = {
      malId: anime.malId,
    };
    if (anime.title !== undefined) updatePayload.title = anime.title;
    if (anime.type !== undefined) updatePayload.type = anime.type;
    if (anime.source !== undefined) updatePayload.source = anime.source;
    if (anime.year !== undefined) updatePayload.year = anime.year;
    if (anime.studios !== undefined) updatePayload.studios = anime.studios;
    if (anime.genres !== undefined) updatePayload.genres = anime.genres;
    if (anime.images !== undefined) updatePayload.images = anime.images;
    if (anime.episodes !== undefined) updatePayload.episodes = anime.episodes;
    if (anime.score !== undefined) updatePayload.score = anime.score;
    if (anime.titles !== undefined) updatePayload.titles = anime.titles;

    await db.collection("animes").updateOne(
      { _id: docId as any },
      { $set: updatePayload },
      { upsert: true }
    );
  } catch (err) {
    console.error("MongoDB write error for anime record:", anime.malId, err);
  }
}

export async function deleteAnimeRecord(malId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot delete anime record:", malId);
    return;
  }

  try {
    await db.collection("animes").deleteOne({ _id: String(malId) as any });
  } catch (err) {
    console.error("MongoDB delete error for anime record:", malId, err);
  }
}

// Removes the anime and cascades to its characters: characters only linked to this anime are deleted,
// while characters linked to other animes keep their record and just lose this anime from `sources`.
export async function deleteAnimeWithCharacters(malId: number): Promise<{ deletedCharacters: number; updatedCharacters: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("MongoDB is not initialized. Cannot delete anime.");
  }

  const id = Number(malId);
  const characters = db.collection("characters");
  const linkedDocs = await characters.find({ sources: { $in: [id, String(id)] } }).toArray();

  const idsToDelete: string[] = [];
  let updatedCharacters = 0;

  for (const doc of linkedDocs) {
    const remainingSources = (Array.isArray(doc.sources) ? doc.sources : []).filter((s: any) => Number(s) !== id);
    const hasOtherAnime = remainingSources.some((s: any) => Number(s) > 0);

    if (!hasOtherAnime) {
      idsToDelete.push(String(doc._id));
      continue;
    }

    const update: any = { sources: remainingSources, updatedAt: new Date().toISOString() };
    if (Number(doc.source) === id) {
      update.source = remainingSources[0] ?? null;
    }
    await characters.updateOne({ _id: doc._id }, { $set: update });
    updatedCharacters++;
  }

  if (idsToDelete.length > 0) {
    await characters.deleteMany({ _id: { $in: idsToDelete as any[] } });
  }

  await db.collection("animes").deleteOne({ _id: String(id) as any });

  return { deletedCharacters: idsToDelete.length, updatedCharacters };
}