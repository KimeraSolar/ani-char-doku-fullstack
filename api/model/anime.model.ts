import { db } from "./config.model";

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