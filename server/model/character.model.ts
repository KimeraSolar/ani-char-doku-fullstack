import { getDb } from "./mongo.model.js";
import { collectBlobUrls, deleteUnreferencedBlobs, externalizeCharacterImages } from "./blob.model.js";
import { fetchAllAnimes, saveAnimeRecord } from "./anime.model.js";
import { fetchAnimeDetails } from "../mal-proxy/index.js";
import { getEnglishTitle } from "@shared/utils/index.js";

export async function saveCharacterRecordDirect(char: any): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot save character record:", char.id);
    return;
  }
  try {
    await db.collection("characters").replaceOne({ _id: char.id as any }, char, { upsert: true });
  } catch (e) {
    console.error("MongoDB write error in saveCharacterRecordDirect:", char.id, e);
  }
}

export async function fetchAllCharacters(): Promise<any[]> {
  const db = await getDb();
  let rawList: any[] = [];

  if (!db) {
    console.error("MongoDB is not initialized. Cannot fetch characters.");
    return [];
  } else {
    try {
      const docs = await db.collection("characters").find({}).toArray();
      rawList = docs.map(({ _id, ...rest }: any) => ({ id: String(_id), ...rest }));
    } catch (err) {
      console.error("MongoDB read error for characters:", err);
      rawList = [];
    }
  }

  // Fetch all registered animes to map MAL IDs to titles
  const animes = await fetchAllAnimes();
  const animeMap = new Map<number, string>();
  animes.forEach((a: any) => animeMap.set(Number(a.malId), a.title));

  // Resolve characters' sources for the client (preserving visual experience)
  const resolvedList = rawList.map((char) => {
    let resolvedSources: string[] = [];
    let resolvedAnimeSourcesObj: any[] = [];

    if (Array.isArray(char.sources)) {
      char.sources.forEach((s: any) => {
        const mId = typeof s === "number" ? s : Number(s);
        if (!isNaN(mId)) {
          const title = animeMap.get(mId);
          if (title) {
            resolvedSources.push(title);
            resolvedAnimeSourcesObj.push({ malId: mId, title });
          } else {
            // Fallback just in case
            resolvedSources.push(`Anime MAL ID: ${mId}`);
            resolvedAnimeSourcesObj.push({ malId: mId, title: `Anime MAL ID: ${mId}` });
          }
        }
      });
    }

    // Ensure images array is present and populated
    const images = Array.isArray(char.images) && char.images.length > 0
      ? char.images.map((img: any) => ({
          url: typeof img === 'string' ? img : (img.url || img.imageUrl || ""),
          label: typeof img === 'string' ? "Profile Image" : (img.label || "Profile Image")
        }))
      : [{ url: char.imageUrl || "https://cdn.myanimelist.net/images/characters/failed_to_load.jpg", label: "Default Profile" }];

    return {
      ...char,
      variationTitle: (char.variationTitle && String(char.variationTitle).trim().length > 0)
        ? String(char.variationTitle).trim()
        : "Default",
      sources: resolvedSources,
      animeSources: resolvedAnimeSourcesObj, // For RegisterForm edit mode
      images,
    };
  });

  return resolvedList;
}

export async function saveCharacterRecord(newChar: any): Promise<void> {
  // Translate string sources to MAL IDs and save/ensure anime registrations
  const malIds: number[] = [];

  const registeredAnimes = await fetchAllAnimes();

  // 1. Resolve sources list
  if (Array.isArray(newChar.sources)) {
    for (const src of newChar.sources) {
      if (typeof src === "string") {
        const trimmedSrc = src.trim();
        if (!trimmedSrc) continue;
        const lowered = trimmedSrc.toLowerCase();
        let foundMalId: number | null = null;
        let matchedAnime: any = null;

        // Check newChar.animeSources passed in payload
        if (Array.isArray(newChar.animeSources)) {
          matchedAnime = newChar.animeSources.find((as: any) => {
            if (!as) return false;
            if (as.title && as.title.trim().toLowerCase() === lowered) return true;
            if (Array.isArray(as.titles)) {
              return as.titles.some((t: any) => t?.title && String(t.title).trim().toLowerCase() === lowered);
            }
            return false;
          });
          if (matchedAnime && matchedAnime.malId) {
            foundMalId = Number(matchedAnime.malId);
          }
        }

        // Check registeredAnimes in DB
        if (!foundMalId && Array.isArray(registeredAnimes)) {
          matchedAnime = registeredAnimes.find((a: any) => {
            if (!a) return false;
            if (a.title && a.title.trim().toLowerCase() === lowered) return true;
            if (a.englishTitle && a.englishTitle.trim().toLowerCase() === lowered) return true;
            if (a.japaneseTitle && a.japaneseTitle.trim().toLowerCase() === lowered) return true;
            if (a.title_japanese && String(a.title_japanese).trim().toLowerCase() === lowered) return true;
            if (Array.isArray(a.titles)) {
              if (a.titles.some((t: any) => t?.title && String(t.title).trim().toLowerCase() === lowered)) return true;
            }
            if (Array.isArray(a.synonyms)) {
              if (a.synonyms.some((s: any) => s && String(s).trim().toLowerCase() === lowered)) return true;
            }
            return false;
          });
          if (matchedAnime && matchedAnime.malId) {
            foundMalId = Number(matchedAnime.malId);
          }
        }

        // Substring / franchise title match against registeredAnimes
        if (!foundMalId && Array.isArray(registeredAnimes)) {
          matchedAnime = registeredAnimes.find((a: any) => {
            if (!a || !a.title) return false;
            const aTitle = a.title.trim().toLowerCase();
            return (aTitle.length > 3 && lowered.length > 3) && (aTitle.includes(lowered) || lowered.includes(aTitle));
          });
          if (matchedAnime && matchedAnime.malId) {
            foundMalId = Number(matchedAnime.malId);
          }
        }

        const mId = foundMalId || 0;
        malIds.push(mId);

        // Ensure this anime record is saved in DB if not already present
        const existingInDb = registeredAnimes.find((a: any) => Number(a.malId) === Number(mId));
        if (!existingInDb) {
          const animeToSave = {
            malId: mId,
            title: matchedAnime?.title || trimmedSrc,
            ...(matchedAnime || {})
          };
          await saveAnimeRecord(animeToSave);
          registeredAnimes.push(animeToSave);
        }
      } else if (typeof src === "number") {
        malIds.push(src);
      }
    }
  }

  // 3. Prepare raw data for DB saving
  const charId = newChar.id || `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const variationTitle = (newChar.variationTitle && String(newChar.variationTitle).trim().length > 0)
    ? String(newChar.variationTitle).trim()
    : "Default";
  
  // Ensure images are formatted properly
  const formattedImages = Array.isArray(newChar.images) && newChar.images.length > 0
    ? newChar.images.map((img: any) => ({
        url: String(img.url || img.imageUrl || "").trim(),
        label: String(img.label || "Profile Image").trim()
      }))
    : [{ url: String(newChar.imageUrl || "").trim(), label: "Default Profile" }];

  const finalCharData = {
    ...newChar,
    id: charId,
    variationTitle,
    source: malIds[0] || null,
    sources: Array.from(new Set(malIds)),
    imageUrl: formattedImages[0]?.url || newChar.imageUrl || "",
    images: formattedImages,
    updatedAt: new Date().toISOString(),
  };

  // Strip temporary fields so we don't bloat the document in DB
  delete finalCharData.animeSources;

  if (!newChar.registeredAt) {
    finalCharData.registeredAt = new Date().toISOString();
  }

  // 4. Save
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot save character record:", charId);
    return;
  }

  // Base64 images are uploaded to Vercel Blob; the document keeps only their URLs
  const storedCharData = await externalizeCharacterImages(finalCharData);
  const previous = await db.collection("characters").findOne(
    { _id: charId as any },
    { projection: { images: 1, imageUrl: 1 } }
  );

  // Live MongoDB Write
  try {
    await db.collection("characters").replaceOne({ _id: charId as any }, storedCharData, { upsert: true });
  } catch (err) {
    console.error("MongoDB save character error:", err);
    throw err;
  }

  await deleteUnreferencedBlobs(collectBlobUrls([previous]));
}

export async function deleteCharacterRecord(id: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot delete character record:", id);
    return;
  }

  const existing = await db.collection("characters").findOne(
    { _id: id as any },
    { projection: { images: 1, imageUrl: 1 } }
  );

  // Live MongoDB Delete
  await db.collection("characters").deleteOne({ _id: id as any });

  await deleteUnreferencedBlobs(collectBlobUrls([existing]));
}

export async function batchUpdateCharacterTraits(
  characterIds: string[],
  newTraits: Record<string, string[]>,
  action: "add" | "remove" = "add"
): Promise<{ updatedCount: number }> {
  if (!characterIds || characterIds.length === 0 || !newTraits || Object.keys(newTraits).length === 0) {
    return { updatedCount: 0 };
  }

  const db = await getDb();
  const idSet = new Set(characterIds.map((id) => String(id)));

  let rawList: any[] = [];
  if (!db) {
    throw new Error("MongoDB is not initialized. Cannot update character traits.");
  } else {
    try {
      const docs = await db.collection("characters").find({}).toArray();
      rawList = docs.map(({ _id, ...rest }: any) => ({ id: String(_id), ...rest }));
    } catch (err) {
      console.error("MongoDB read error for characters:", err);
    }
  }

  const bulkOps: any[] = [];
  let updatedCount = 0;
  for (const char of rawList) {
    const charIdStr = String(char.id);
    const charMalIdStr = char.malId ? String(char.malId) : "";

    if (idSet.has(charIdStr) || (charMalIdStr && idSet.has(charMalIdStr))) {
      const existingTraits = char.traits && typeof char.traits === "object" ? char.traits : {};
      const updatedTraits = { ...existingTraits };

      Object.entries(newTraits).forEach(([traitKey, targetValues]) => {
        const targetArray = Array.isArray(targetValues)
          ? targetValues.map((v) => String(v).trim()).filter(Boolean)
          : [];

        if (action === "remove") {
          const existingVal = existingTraits[traitKey];
          if (existingVal === undefined || existingVal === null) return;

          let existingArray: string[] = [];
          if (Array.isArray(existingVal)) {
            existingArray = existingVal.map((v) => String(v).trim()).filter(Boolean);
          } else if (typeof existingVal === "string" && existingVal.trim().length > 0) {
            existingArray = existingVal.split(",").map((v) => v.trim()).filter(Boolean);
          }

          if (targetArray.length === 0) {
            delete updatedTraits[traitKey];
          } else {
            const targetSetLower = new Set(targetArray.map((v) => v.toLowerCase()));
            const remaining = existingArray.filter((v) => !targetSetLower.has(v.toLowerCase()));

            if (remaining.length === 0) {
              delete updatedTraits[traitKey];
            } else if (remaining.length === 1) {
              updatedTraits[traitKey] = remaining[0];
            } else {
              updatedTraits[traitKey] = remaining;
            }
          }
        } else {
          if (targetArray.length === 0) return;

          const existingVal = existingTraits[traitKey];
          let existingArray: string[] = [];

          if (Array.isArray(existingVal)) {
            existingArray = existingVal.map((v) => String(v).trim()).filter(Boolean);
          } else if (typeof existingVal === "string" && existingVal.trim().length > 0) {
            existingArray = existingVal.split(",").map((v) => v.trim()).filter(Boolean);
          }

          const mergedSet = new Set([
            ...existingArray,
            ...targetArray,
          ]);
          const mergedArray = Array.from(mergedSet);

          if (mergedArray.length === 1) {
            updatedTraits[traitKey] = mergedArray[0];
          } else if (mergedArray.length > 1) {
            updatedTraits[traitKey] = mergedArray;
          }
        }
      });

      char.traits = updatedTraits;
      char.updatedAt = new Date().toISOString();

      bulkOps.push({
        updateOne: {
          filter: { _id: char.id },
          update: { $set: { traits: updatedTraits, updatedAt: char.updatedAt } },
        },
      });
      updatedCount++;
    }
  }

  if (db && bulkOps.length > 0) {
    try {
      await db.collection("characters").bulkWrite(bulkOps);
    } catch (err) {
      console.error("Failed to update character traits in MongoDB:", err);
    }
  }

  return { updatedCount };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAnimeFromMal(malId: number): Promise<any | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const json: any = await fetchAnimeDetails(malId, `anime-full-${malId}`);
      const a = json?.data;
      if (!a) return null;
      return {
        malId,
        title: getEnglishTitle(a),
        type: a.type ?? null,
        source: a.source ?? null,
        year: a.year ?? (a.aired?.prop?.from?.year ?? null),
        studios: Array.isArray(a.studios) ? a.studios.map((x: any) => x.name) : [],
        genres: Array.isArray(a.genres) ? a.genres.map((x: any) => x.name) : [],
        images: a.images ?? null,
        episodes: a.episodes ?? null,
        score: a.score ?? null,
        titles: a.titles ?? null,
      };
    } catch (err: any) {
      if (/rate limit|429/i.test(String(err?.message))) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      console.error(`Failed to fetch anime ${malId} from MAL:`, err?.message || err);
      return null;
    }
  }
  return null;
}

// Resolves each imported character's anime MAL IDs and registers missing animes.
async function ensureAnimesRegistered(entries: Map<number, string>): Promise<void> {
  if (entries.size === 0) return;
  const existing = new Set((await fetchAllAnimes()).map((a: any) => Number(a.malId)));
  for (const [malId, fallbackTitle] of entries) {
    if (existing.has(malId)) continue;
    const details = await fetchAnimeFromMal(malId);
    if (details) {
      await saveAnimeRecord(details);
      await sleep(400);
    } else if (fallbackTitle) {
      await saveAnimeRecord({ malId, title: fallbackTitle });
    } else {
      continue;
    }
    existing.add(malId);
  }
}

export async function importCharactersBatch(importedChars: any[], mode: "merge" | "overwrite"): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot import characters batch.");
    return 0;
  }

  const registeredAnimes = await fetchAllAnimes();
  const titleToMalId = new Map<string, number>();
  registeredAnimes.forEach((a: any) => {
    const id = Number(a.malId);
    if (!id) return;
    if (a.title) titleToMalId.set(String(a.title).trim().toLowerCase(), id);
    if (Array.isArray(a.titles)) {
      a.titles.forEach((t: any) => t?.title && titleToMalId.set(String(t.title).trim().toLowerCase(), id));
    }
  });

  const animesToRegister = new Map<number, string>();
  const sanitizedImported: any[] = [];
  for (const char of importedChars) {
    if (!char || typeof char !== "object") continue;
    if (!char.name) continue;

    const id = char.id || `char-imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Anime MAL IDs: animeSources first, then numeric sources, then legacy "source", then title lookup
    const malIds: number[] = [];
    const addAnime = (rawId: any, title?: any) => {
      const mId = Number(rawId);
      if (!Number.isInteger(mId) || mId <= 0) return;
      if (!malIds.includes(mId)) malIds.push(mId);
      if (!animesToRegister.has(mId) || !animesToRegister.get(mId)) {
        animesToRegister.set(mId, title ? String(title).trim() : "");
      }
    };

    if (Array.isArray(char.animeSources)) {
      char.animeSources.forEach((as: any) => as && addAnime(as.malId, as.title));
    }
    if (Array.isArray(char.sources)) {
      char.sources.forEach((s: any) => {
        if (typeof s === "number" || (typeof s === "string" && /^\d+$/.test(s.trim()))) {
          addAnime(s);
        } else if (typeof s === "string") {
          const found = titleToMalId.get(s.trim().toLowerCase());
          if (found) addAnime(found, s);
        }
      });
    }
    if (char.source !== undefined && char.source !== null) addAnime(char.source);

    const defaultImgUrl = char.imageUrl ? String(char.imageUrl).trim() : "https://cdn.myanimelist.net/images/characters/failed_to_load.jpg";
    const importedImages = Array.isArray(char.images) && char.images.length > 0
      ? char.images.map((img: any) => ({
          url: String(img.url || img.imageUrl || defaultImgUrl).trim(),
          label: String(img.label || "Profile Image").trim()
        }))
      : [{ url: defaultImgUrl, label: "Default Profile" }];

    const variationTitle = (char.variationTitle && String(char.variationTitle).trim().length > 0)
      ? String(char.variationTitle).trim()
      : "Default";

    const now = new Date().toISOString();
    sanitizedImported.push({
      id,
      malId: Number(char.malId) || 0,
      name: String(char.name).trim(),
      variationTitle,
      imageUrl: importedImages[0]?.url || defaultImgUrl,
      images: importedImages,
      source: malIds[0] || null,
      sources: malIds,
      role: char.role ? String(char.role).trim() : "Supporting",
      traits: (char.traits && typeof char.traits === "object" && !Array.isArray(char.traits)) ? char.traits : {},
      nicknames: Array.isArray(char.nicknames) ? char.nicknames.map((n: any) => String(n).trim()) : [],
      registeredAt: char.registeredAt || now,
      updatedAt: char.updatedAt || char.registeredAt || now
    });
  }

  await ensureAnimesRegistered(animesToRegister);

  const imageCache = new Map<string, string>();
  for (let i = 0; i < sanitizedImported.length; i++) {
    sanitizedImported[i] = await externalizeCharacterImages(sanitizedImported[i], imageCache);
  }

  const previousDocs = await db.collection("characters").find(
    mode === "overwrite" ? {} : { _id: { $in: sanitizedImported.map((c) => c.id) as any[] } },
    { projection: { images: 1, imageUrl: 1 } }
  ).toArray();

  // Live MongoDB Write (Overwrite or Merge)
  if (mode === "overwrite") {
    await db.collection("characters").deleteMany({});

    if (sanitizedImported.length > 0) {
      await db.collection("characters").insertMany(
        sanitizedImported.map((char) => ({ ...char, _id: char.id as any }))
      );
    }
  } else {
    // Mode is merge - write all documents, keeping any not included in the import untouched.
    if (sanitizedImported.length > 0) {
      const ops = sanitizedImported.map((char) => ({
        replaceOne: {
          filter: { _id: char.id as any },
          replacement: char,
          upsert: true,
        },
      }));
      await db.collection("characters").bulkWrite(ops);
    }
  }

  await deleteUnreferencedBlobs(collectBlobUrls(previousDocs));

  return sanitizedImported.length;
}