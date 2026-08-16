import { AnimeRegistry } from "@shared/types/anime.types.js";
import { db } from "./config.model.js";
import { getDBCollection } from "./mongodb.model.js";
import { throwErrorResponse } from "@shared/utils/index.js";

const ANIME_COL_NAME = "animes";

export async function fetchAnimes(malIDFilter?: number[]): Promise<AnimeRegistry[] | null> {
  const animesCollection = await getDBCollection(ANIME_COL_NAME);
  if (!animesCollection) {
    throw new Error("MongoDB error. Cannot fetch anime IDs.");
  }

  try {
    if (malIDFilter && malIDFilter.length > 0) {
      const filteredAnimes = await animesCollection.find({
        mal_id: { $in: malIDFilter }
      }).toArray();
      return filteredAnimes.map(anime => {
        const { _id, ...rest } = anime;
        return {
          id: _id.toHexString(),
          ...rest,
        }
      }) as AnimeRegistry[];
    } else {
      const animes = await animesCollection.find().toArray();
      return animes.map(anime => {
        const { _id, ...rest } = anime;
        return {
          id: _id.toHexString(),
          ...rest,
        }
      }) as AnimeRegistry[];
    }
  } catch (err) {
    throwErrorResponse("[Anime Model] MongoDB read error for animes:", err);
    return null;
  }
}

export async function fetchAnimeDetails(malId: number): Promise<AnimeRegistry | null> {
  const animesCollection = await getDBCollection(ANIME_COL_NAME);
  if (!animesCollection) {
    throw new Error("MongoDB error. Cannot fetch anime IDs.");
  }

  try {
    const anime = await animesCollection.findOne({
      mal_id: { $eq: malId },
    });
    if (!anime) throw new Error("Failed to find anime by MAL ID.");
    const { _id, ...rest } = anime;
    return {
      id: _id.toHexString(),
      ...rest,
    } as AnimeRegistry;
  } catch (err) {
    throwErrorResponse("[Anime Model] MongoDB read error for animes:", err);
    return null;
  }
}

export async function createAnime(newAnime: AnimeRegistry): Promise<AnimeRegistry | null> {
  const animesCollection = await getDBCollection(ANIME_COL_NAME);
  if (!animesCollection) {
    throw new Error("MongoDB error. Cannot create anime.");
  }

  try {
    const { id, registered_chars, ...animeToSave } = newAnime;
    const dateNow = new Date().toISOString();
    const savedTrait = await animesCollection.insertOne({
      ...animeToSave,
      registered_chars: registered_chars || 0,
      created_at: dateNow,
      updated_at: dateNow,
    });
    return {
      id: savedTrait.insertedId.toHexString(),
      ...animeToSave
    }
  } catch (err) {
    throwErrorResponse("[Anime Model] MongoDB write error for animes:", err);
    return null;
  }
}

// Old Anime DB Functions (connects to Firestore)
export async function fetchAllAnimes(): Promise<any[]> {
  if (!db) {
    console.error("Firestore is not initialized. Cannot fetch animes.");
    return [];
  }

  try {
    const snapshot = await db.collection("animes").get();
    const list: any[] = [];

    snapshot.forEach((doc) => {
      list.push({ ...doc.data() });
    });

    return list;
  } catch (err) {
    console.error("Firestore read error for animes:", err);
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
  if (!db) {
    console.error("Failed to write local animes file. Firestore is not initialized.");
    return;
  }

  try {
    const docId = String(anime.malId);
    const docRef = db.collection("animes").doc(docId);

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

    await docRef.set(updatePayload, { merge: true });
  } catch (err) {
    console.error("Firestore write error for anime record:", anime.malId, err);
  }
}

export async function deleteAnimeRecord(malId: number): Promise<void> {
  if (!db) {
    console.error("Firestore is not initialized. Cannot delete anime record:", malId);
    return;
  }

  try {
    const docRef = db.collection("animes").doc(String(malId));
    await docRef.delete();
  } catch (err) {
    console.error("Firestore delete error for anime record:", malId, err);
  }
}