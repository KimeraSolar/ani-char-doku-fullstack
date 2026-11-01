// server/index.ts
import express from "express";
import cors from "cors";

// server/mal-proxy/api.proxy.ts
var proxyCache = /* @__PURE__ */ new Map();
var CACHE_TTL = 10 * 60 * 1e3;
async function handleProxyResponse(res, cacheKey) {
  if (!res.ok) {
    if (res.status === 429) {
      const cached = proxyCache.get(cacheKey);
      if (cached) {
        console.log(`Rate limited! Serving stale cache for ${cacheKey}`);
        return cached.data;
      }
      throw new Error("API rate limit reached. Please wait a moment and try again.");
    }
    throw new Error(`API responded with status ${res.status}`);
  }
  return await res.json();
}
async function getCachedProxy(cacheKey, fetchFn) {
  const cached = proxyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  console.log(`Fetching from MAL Proxy API for key: ${cacheKey}`);
  try {
    const data = await fetchFn();
    proxyCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.error(`MAL Proxy API fetch failed for key "${cacheKey}". Error:`, err);
    if (cached) {
      console.log(`Serving stale cache for ${cacheKey}`);
      return cached.data;
    }
    throw err;
  }
}

// server/mal-proxy/anime.proxy.ts
var API_BASE_URL = process.env.MAL_PROXY_API_BASE_URL || "";
async function fetchTopAnime(page, cacheKey) {
  const res = await fetch(`${API_BASE_URL}/top/anime?page=${page}`);
  return handleProxyResponse(res, cacheKey);
}
async function fetchSearchAnime(q, page, type, cacheKey) {
  let url = `${API_BASE_URL}/anime?q=${encodeURIComponent(q)}&page=${page}`;
  if (type && type !== "All") {
    url += `&type=${type.toLowerCase()}`;
  }
  const res = await fetch(url);
  return handleProxyResponse(res, cacheKey);
}
async function fetchAnimeCharacters(animeId, cacheKey) {
  const res = await fetch(`${API_BASE_URL}/anime/${animeId}/characters`);
  return handleProxyResponse(res, cacheKey);
}
async function fetchAnimeDetails(animeId, cacheKey) {
  const res = await fetch(`${API_BASE_URL}/anime/${animeId}/full`);
  return handleProxyResponse(res, cacheKey);
}

// server/mal-proxy/character.proxy.ts
var API_BASE_URL2 = process.env.MAL_PROXY_API_BASE_URL || "";
async function fetchCharacterDetails(charId, cacheKey) {
  const res = await fetch(`${API_BASE_URL2}/characters/${charId}/full`);
  return handleProxyResponse(res, cacheKey);
}

// server/routes/api.route.ts
async function apiRoutes(app2) {
  app2.get("/api/proxy/top-anime", async (req, res) => {
    const pageVal = Number(req.query.page || "1");
    const cacheKey = `top-anime-${pageVal}`;
    try {
      const data = await getCachedProxy(cacheKey, () => fetchTopAnime(pageVal, cacheKey));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/proxy/search-anime", async (req, res) => {
    const q = req.query.q || "";
    const pageVal = Number(req.query.page || "1");
    const type = req.query.type || "";
    const cacheKey = `search-anime-${q}-${pageVal}-${type}`;
    try {
      const data = await getCachedProxy(cacheKey, () => fetchSearchAnime(String(q), pageVal, String(type), cacheKey));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/proxy/anime-characters/:id", async (req, res) => {
    const { id } = req.params;
    const animeId = Number(id);
    const cacheKey = `anime-characters-${animeId}`;
    try {
      const data = await getCachedProxy(cacheKey, () => fetchAnimeCharacters(animeId, cacheKey));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/proxy/anime/:id", async (req, res) => {
    const { id } = req.params;
    const animeId = Number(id);
    const cacheKey = `anime-${animeId}`;
    try {
      const data = await getCachedProxy(cacheKey, () => fetchAnimeDetails(animeId, cacheKey));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/proxy/character/:id", async (req, res) => {
    const { id } = req.params;
    const charId = Number(id);
    const cacheKey = `character-${charId}`;
    try {
      const data = await getCachedProxy(cacheKey, () => fetchCharacterDetails(charId, cacheKey));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// server/model/mongo.model.ts
import { MongoClient } from "mongodb";
var client = null;
var dbInstance = null;
var connectingPromise = null;
async function getDb() {
  if (dbInstance) return dbInstance;
  if (connectingPromise) return connectingPromise;
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE;
  if (!uri || !dbName) {
    console.warn("\u26A0\uFE0F MongoDB environment variables are not fully configured.");
    return null;
  }
  connectingPromise = (async () => {
    try {
      client = new MongoClient(uri, { maxPoolSize: 10 });
      await client.connect();
      dbInstance = client.db(dbName);
      console.log(`\u26A1 Successfully connected to MongoDB database "${dbName}".`);
      return dbInstance;
    } catch (err) {
      console.error("\u274C Failed to connect to MongoDB:", err);
      client = null;
      dbInstance = null;
      return null;
    } finally {
      connectingPromise = null;
    }
  })();
  return connectingPromise;
}
async function getDatabaseStatus() {
  const hasConfig = !!(process.env.MONGODB_URI && process.env.MONGODB_DATABASE);
  if (!hasConfig) {
    return {
      isConfigured: false,
      usingFallback: true
    };
  }
  try {
    const db = await getDb();
    return {
      isConfigured: !!db,
      usingFallback: !db
    };
  } catch (err) {
    return {
      isConfigured: false,
      usingFallback: true,
      error: err.message
    };
  }
}

// server/model/blob.model.ts
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
var DATA_URL_PATTERN = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/s;
var BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";
function isBlobUrl(url) {
  try {
    return new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}
async function uploadImageBuffer(buffer, contentType) {
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const blob = await put(`characters/${randomUUID()}.${ext}`, buffer, {
    access: "public",
    contentType
  });
  return blob.url;
}
async function externalizeImageUrl(url, cache = /* @__PURE__ */ new Map()) {
  if (!url.startsWith("data:")) return url;
  const cached = cache.get(url);
  if (cached) return cached;
  const match = DATA_URL_PATTERN.exec(url);
  if (!match) throw new Error("Invalid image data URL.");
  const blobUrl = await uploadImageBuffer(Buffer.from(match[2], "base64"), match[1]);
  cache.set(url, blobUrl);
  return blobUrl;
}
async function externalizeCharacterImages(char, cache = /* @__PURE__ */ new Map()) {
  const images = Array.isArray(char.images) ? await Promise.all(char.images.map(async (img) => ({ ...img, url: await externalizeImageUrl(img.url, cache) }))) : char.images;
  const imageUrl = char.imageUrl ? await externalizeImageUrl(char.imageUrl, cache) : char.imageUrl;
  return { ...char, images, imageUrl };
}
function collectBlobUrls(docs) {
  const urls = /* @__PURE__ */ new Set();
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
async function deleteUnreferencedBlobs(urls) {
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

// server/model/anime.model.ts
async function fetchAllAnimes() {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot fetch animes.");
    return [];
  }
  try {
    const docs = await db.collection("animes").find({}).toArray();
    return docs.map(({ _id, ...rest }) => rest);
  } catch (err) {
    console.error("MongoDB read error for animes:", err);
    return [];
  }
}
async function saveAnimeRecord(anime) {
  const db = await getDb();
  if (!db) {
    console.error("Failed to write local animes file. MongoDB is not initialized.");
    return;
  }
  try {
    const docId = String(anime.malId);
    const updatePayload = {
      malId: anime.malId
    };
    if (anime.title !== void 0) updatePayload.title = anime.title;
    if (anime.type !== void 0) updatePayload.type = anime.type;
    if (anime.source !== void 0) updatePayload.source = anime.source;
    if (anime.year !== void 0) updatePayload.year = anime.year;
    if (anime.studios !== void 0) updatePayload.studios = anime.studios;
    if (anime.genres !== void 0) updatePayload.genres = anime.genres;
    if (anime.images !== void 0) updatePayload.images = anime.images;
    if (anime.episodes !== void 0) updatePayload.episodes = anime.episodes;
    if (anime.score !== void 0) updatePayload.score = anime.score;
    if (anime.titles !== void 0) updatePayload.titles = anime.titles;
    await db.collection("animes").updateOne(
      { _id: docId },
      { $set: updatePayload },
      { upsert: true }
    );
  } catch (err) {
    console.error("MongoDB write error for anime record:", anime.malId, err);
  }
}
async function deleteAnimeWithCharacters(malId) {
  const db = await getDb();
  if (!db) {
    throw new Error("MongoDB is not initialized. Cannot delete anime.");
  }
  const id = Number(malId);
  const characters = db.collection("characters");
  const linkedDocs = await characters.find({ sources: { $in: [id, String(id)] } }).toArray();
  const idsToDelete = [];
  let updatedCharacters = 0;
  for (const doc of linkedDocs) {
    const remainingSources = (Array.isArray(doc.sources) ? doc.sources : []).filter((s) => Number(s) !== id);
    const hasOtherAnime = remainingSources.some((s) => Number(s) > 0);
    if (!hasOtherAnime) {
      idsToDelete.push(String(doc._id));
      continue;
    }
    const update = { sources: remainingSources, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (Number(doc.source) === id) {
      update.source = remainingSources[0] ?? null;
    }
    await characters.updateOne({ _id: doc._id }, { $set: update });
    updatedCharacters++;
  }
  if (idsToDelete.length > 0) {
    const removedDocs = await characters.find({ _id: { $in: idsToDelete } }, { projection: { images: 1, imageUrl: 1 } }).toArray();
    await characters.deleteMany({ _id: { $in: idsToDelete } });
    await deleteUnreferencedBlobs(collectBlobUrls(removedDocs));
  }
  await db.collection("animes").deleteOne({ _id: String(id) });
  return { deletedCharacters: idsToDelete.length, updatedCharacters };
}

// shared/utils/index.ts
function getEnglishTitle(anime) {
  const english = anime.title_english || anime.titles?.find((t) => t?.type === "English" && t.title)?.title;
  return String(english || anime.title || "").trim();
}
function parseMatchScoreNum(matchScore) {
  if (!matchScore) return 0;
  if (matchScore.includes("/")) {
    const parts = matchScore.split("/");
    const val2 = parseInt(parts[0], 10);
    return isNaN(val2) ? 0 : val2;
  }
  const val = parseInt(matchScore, 10);
  return isNaN(val) ? 0 : val;
}

// server/model/character.model.ts
async function fetchAllCharacters() {
  const db = await getDb();
  let rawList = [];
  if (!db) {
    console.error("MongoDB is not initialized. Cannot fetch characters.");
    return [];
  } else {
    try {
      const docs = await db.collection("characters").find({}).toArray();
      rawList = docs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest }));
    } catch (err) {
      console.error("MongoDB read error for characters:", err);
      rawList = [];
    }
  }
  const animes = await fetchAllAnimes();
  const animeMap = /* @__PURE__ */ new Map();
  animes.forEach((a) => animeMap.set(Number(a.malId), a.title));
  const resolvedList = rawList.map((char) => {
    let resolvedSources = [];
    let resolvedAnimeSourcesObj = [];
    if (Array.isArray(char.sources)) {
      char.sources.forEach((s) => {
        const mId = typeof s === "number" ? s : Number(s);
        if (!isNaN(mId)) {
          const title = animeMap.get(mId);
          if (title) {
            resolvedSources.push(title);
            resolvedAnimeSourcesObj.push({ malId: mId, title });
          } else {
            resolvedSources.push(`Anime MAL ID: ${mId}`);
            resolvedAnimeSourcesObj.push({ malId: mId, title: `Anime MAL ID: ${mId}` });
          }
        }
      });
    }
    const images = Array.isArray(char.images) && char.images.length > 0 ? char.images.map((img) => ({
      url: typeof img === "string" ? img : img.url || img.imageUrl || "",
      label: typeof img === "string" ? "Profile Image" : img.label || "Profile Image"
    })) : [{ url: char.imageUrl || "https://cdn.myanimelist.net/images/characters/failed_to_load.jpg", label: "Default Profile" }];
    return {
      ...char,
      variationTitle: char.variationTitle && String(char.variationTitle).trim().length > 0 ? String(char.variationTitle).trim() : "Default",
      sources: resolvedSources,
      animeSources: resolvedAnimeSourcesObj,
      // For RegisterForm edit mode
      images
    };
  });
  return resolvedList;
}
async function saveCharacterRecord(newChar) {
  const malIds = [];
  const registeredAnimes = await fetchAllAnimes();
  if (Array.isArray(newChar.sources)) {
    for (const src of newChar.sources) {
      if (typeof src === "string") {
        const trimmedSrc = src.trim();
        if (!trimmedSrc) continue;
        const lowered = trimmedSrc.toLowerCase();
        let foundMalId = null;
        let matchedAnime = null;
        if (Array.isArray(newChar.animeSources)) {
          matchedAnime = newChar.animeSources.find((as) => {
            if (!as) return false;
            if (as.title && as.title.trim().toLowerCase() === lowered) return true;
            if (Array.isArray(as.titles)) {
              return as.titles.some((t) => t?.title && String(t.title).trim().toLowerCase() === lowered);
            }
            return false;
          });
          if (matchedAnime && matchedAnime.malId) {
            foundMalId = Number(matchedAnime.malId);
          }
        }
        if (!foundMalId && Array.isArray(registeredAnimes)) {
          matchedAnime = registeredAnimes.find((a) => {
            if (!a) return false;
            if (a.title && a.title.trim().toLowerCase() === lowered) return true;
            if (a.englishTitle && a.englishTitle.trim().toLowerCase() === lowered) return true;
            if (a.japaneseTitle && a.japaneseTitle.trim().toLowerCase() === lowered) return true;
            if (a.title_japanese && String(a.title_japanese).trim().toLowerCase() === lowered) return true;
            if (Array.isArray(a.titles)) {
              if (a.titles.some((t) => t?.title && String(t.title).trim().toLowerCase() === lowered)) return true;
            }
            if (Array.isArray(a.synonyms)) {
              if (a.synonyms.some((s) => s && String(s).trim().toLowerCase() === lowered)) return true;
            }
            return false;
          });
          if (matchedAnime && matchedAnime.malId) {
            foundMalId = Number(matchedAnime.malId);
          }
        }
        if (!foundMalId && Array.isArray(registeredAnimes)) {
          matchedAnime = registeredAnimes.find((a) => {
            if (!a || !a.title) return false;
            const aTitle = a.title.trim().toLowerCase();
            return aTitle.length > 3 && lowered.length > 3 && (aTitle.includes(lowered) || lowered.includes(aTitle));
          });
          if (matchedAnime && matchedAnime.malId) {
            foundMalId = Number(matchedAnime.malId);
          }
        }
        const mId = foundMalId || 0;
        malIds.push(mId);
        const existingInDb = registeredAnimes.find((a) => Number(a.malId) === Number(mId));
        if (!existingInDb) {
          const animeToSave = {
            malId: mId,
            title: matchedAnime?.title || trimmedSrc,
            ...matchedAnime || {}
          };
          await saveAnimeRecord(animeToSave);
          registeredAnimes.push(animeToSave);
        }
      } else if (typeof src === "number") {
        malIds.push(src);
      }
    }
  }
  const charId = newChar.id || `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const variationTitle = newChar.variationTitle && String(newChar.variationTitle).trim().length > 0 ? String(newChar.variationTitle).trim() : "Default";
  const formattedImages = Array.isArray(newChar.images) && newChar.images.length > 0 ? newChar.images.map((img) => ({
    url: String(img.url || img.imageUrl || "").trim(),
    label: String(img.label || "Profile Image").trim()
  })) : [{ url: String(newChar.imageUrl || "").trim(), label: "Default Profile" }];
  const finalCharData = {
    ...newChar,
    id: charId,
    variationTitle,
    source: malIds[0] || null,
    sources: Array.from(new Set(malIds)),
    imageUrl: formattedImages[0]?.url || newChar.imageUrl || "",
    images: formattedImages,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  delete finalCharData.animeSources;
  if (!newChar.registeredAt) {
    finalCharData.registeredAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot save character record:", charId);
    return;
  }
  const storedCharData = await externalizeCharacterImages(finalCharData);
  const previous = await db.collection("characters").findOne(
    { _id: charId },
    { projection: { images: 1, imageUrl: 1 } }
  );
  try {
    await db.collection("characters").replaceOne({ _id: charId }, storedCharData, { upsert: true });
  } catch (err) {
    console.error("MongoDB save character error:", err);
    throw err;
  }
  await deleteUnreferencedBlobs(collectBlobUrls([previous]));
}
async function deleteCharacterRecord(id) {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot delete character record:", id);
    return;
  }
  const existing = await db.collection("characters").findOne(
    { _id: id },
    { projection: { images: 1, imageUrl: 1 } }
  );
  await db.collection("characters").deleteOne({ _id: id });
  await deleteUnreferencedBlobs(collectBlobUrls([existing]));
}
async function batchUpdateCharacterTraits(characterIds, newTraits, action = "add") {
  if (!characterIds || characterIds.length === 0 || !newTraits || Object.keys(newTraits).length === 0) {
    return { updatedCount: 0 };
  }
  const db = await getDb();
  const idSet = new Set(characterIds.map((id) => String(id)));
  let rawList = [];
  if (!db) {
    throw new Error("MongoDB is not initialized. Cannot update character traits.");
  } else {
    try {
      const docs = await db.collection("characters").find({}).toArray();
      rawList = docs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest }));
    } catch (err) {
      console.error("MongoDB read error for characters:", err);
    }
  }
  const bulkOps = [];
  let updatedCount = 0;
  for (const char of rawList) {
    const charIdStr = String(char.id);
    const charMalIdStr = char.malId ? String(char.malId) : "";
    if (idSet.has(charIdStr) || charMalIdStr && idSet.has(charMalIdStr)) {
      const existingTraits = char.traits && typeof char.traits === "object" ? char.traits : {};
      const updatedTraits = { ...existingTraits };
      Object.entries(newTraits).forEach(([traitKey, targetValues]) => {
        const targetArray = Array.isArray(targetValues) ? targetValues.map((v) => String(v).trim()).filter(Boolean) : [];
        if (action === "remove") {
          const existingVal = existingTraits[traitKey];
          if (existingVal === void 0 || existingVal === null) return;
          let existingArray = [];
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
          let existingArray = [];
          if (Array.isArray(existingVal)) {
            existingArray = existingVal.map((v) => String(v).trim()).filter(Boolean);
          } else if (typeof existingVal === "string" && existingVal.trim().length > 0) {
            existingArray = existingVal.split(",").map((v) => v.trim()).filter(Boolean);
          }
          const mergedSet = /* @__PURE__ */ new Set([
            ...existingArray,
            ...targetArray
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
      char.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      bulkOps.push({
        updateOne: {
          filter: { _id: char.id },
          update: { $set: { traits: updatedTraits, updatedAt: char.updatedAt } }
        }
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
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchAnimeFromMal(malId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const json = await fetchAnimeDetails(malId, `anime-full-${malId}`);
      const a = json?.data;
      if (!a) return null;
      return {
        malId,
        title: getEnglishTitle(a),
        type: a.type ?? null,
        source: a.source ?? null,
        year: a.year ?? (a.aired?.prop?.from?.year ?? null),
        studios: Array.isArray(a.studios) ? a.studios.map((x) => x.name) : [],
        genres: Array.isArray(a.genres) ? a.genres.map((x) => x.name) : [],
        images: a.images ?? null,
        episodes: a.episodes ?? null,
        score: a.score ?? null,
        titles: a.titles ?? null
      };
    } catch (err) {
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
async function ensureAnimesRegistered(entries) {
  if (entries.size === 0) return;
  const existing = new Set((await fetchAllAnimes()).map((a) => Number(a.malId)));
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
async function importCharactersBatch(importedChars, mode) {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot import characters batch.");
    return 0;
  }
  const registeredAnimes = await fetchAllAnimes();
  const titleToMalId = /* @__PURE__ */ new Map();
  registeredAnimes.forEach((a) => {
    const id = Number(a.malId);
    if (!id) return;
    if (a.title) titleToMalId.set(String(a.title).trim().toLowerCase(), id);
    if (Array.isArray(a.titles)) {
      a.titles.forEach((t) => t?.title && titleToMalId.set(String(t.title).trim().toLowerCase(), id));
    }
  });
  const animesToRegister = /* @__PURE__ */ new Map();
  const sanitizedImported = [];
  for (const char of importedChars) {
    if (!char || typeof char !== "object") continue;
    if (!char.name) continue;
    const id = char.id || `char-imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const malIds = [];
    const addAnime = (rawId, title) => {
      const mId = Number(rawId);
      if (!Number.isInteger(mId) || mId <= 0) return;
      if (!malIds.includes(mId)) malIds.push(mId);
      if (!animesToRegister.has(mId) || !animesToRegister.get(mId)) {
        animesToRegister.set(mId, title ? String(title).trim() : "");
      }
    };
    if (Array.isArray(char.animeSources)) {
      char.animeSources.forEach((as) => as && addAnime(as.malId, as.title));
    }
    if (Array.isArray(char.sources)) {
      char.sources.forEach((s) => {
        if (typeof s === "number" || typeof s === "string" && /^\d+$/.test(s.trim())) {
          addAnime(s);
        } else if (typeof s === "string") {
          const found = titleToMalId.get(s.trim().toLowerCase());
          if (found) addAnime(found, s);
        }
      });
    }
    if (char.source !== void 0 && char.source !== null) addAnime(char.source);
    const defaultImgUrl = char.imageUrl ? String(char.imageUrl).trim() : "https://cdn.myanimelist.net/images/characters/failed_to_load.jpg";
    const importedImages = Array.isArray(char.images) && char.images.length > 0 ? char.images.map((img) => ({
      url: String(img.url || img.imageUrl || defaultImgUrl).trim(),
      label: String(img.label || "Profile Image").trim()
    })) : [{ url: defaultImgUrl, label: "Default Profile" }];
    const variationTitle = char.variationTitle && String(char.variationTitle).trim().length > 0 ? String(char.variationTitle).trim() : "Default";
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
      traits: char.traits && typeof char.traits === "object" && !Array.isArray(char.traits) ? char.traits : {},
      nicknames: Array.isArray(char.nicknames) ? char.nicknames.map((n) => String(n).trim()) : [],
      registeredAt: char.registeredAt || now,
      updatedAt: char.updatedAt || char.registeredAt || now
    });
  }
  await ensureAnimesRegistered(animesToRegister);
  const imageCache = /* @__PURE__ */ new Map();
  for (let i = 0; i < sanitizedImported.length; i++) {
    sanitizedImported[i] = await externalizeCharacterImages(sanitizedImported[i], imageCache);
  }
  const previousDocs = await db.collection("characters").find(
    mode === "overwrite" ? {} : { _id: { $in: sanitizedImported.map((c) => c.id) } },
    { projection: { images: 1, imageUrl: 1 } }
  ).toArray();
  if (mode === "overwrite") {
    await db.collection("characters").deleteMany({});
    if (sanitizedImported.length > 0) {
      await db.collection("characters").insertMany(
        sanitizedImported.map((char) => ({ ...char, _id: char.id }))
      );
    }
  } else {
    if (sanitizedImported.length > 0) {
      const ops = sanitizedImported.map((char) => ({
        replaceOne: {
          filter: { _id: char.id },
          replacement: char,
          upsert: true
        }
      }));
      await db.collection("characters").bulkWrite(ops);
    }
  }
  await deleteUnreferencedBlobs(collectBlobUrls(previousDocs));
  return sanitizedImported.length;
}

// server/model/user.model.ts
async function fetchAllUsers() {
  const db = await getDb();
  let usersList = [];
  if (db) {
    try {
      const docs = await db.collection("users").find({}).toArray();
      docs.forEach((doc) => {
        const { _id, ...rest } = doc;
        if (rest && rest.uid) {
          usersList.push(rest);
        }
      });
    } catch (err) {
      console.error("Failed to fetch users from MongoDB:", err);
    }
  }
  const map = /* @__PURE__ */ new Map();
  usersList.forEach((u) => map.set(u.uid, u));
  const result = Array.from(map.values());
  result.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  return result;
}
async function syncUserRecord(input) {
  const allUsers = await fetchAllUsers();
  const existingIndex = allUsers.findIndex((u) => u.uid === input.uid);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let profile;
  if (existingIndex !== -1) {
    const existing = allUsers[existingIndex];
    profile = {
      ...existing,
      email: input.email || existing.email,
      displayName: input.displayName || existing.displayName || input.email.split("@")[0] || "User",
      photoURL: input.photoURL !== void 0 ? input.photoURL : existing.photoURL,
      lastLoginAt: now
    };
  } else {
    const role = allUsers.length === 0 ? "owner" : "user";
    profile = {
      uid: input.uid,
      email: input.email,
      displayName: input.displayName || input.email.split("@")[0] || "User",
      photoURL: input.photoURL || "",
      role,
      isBanned: false,
      banReason: "",
      createdAt: now,
      lastLoginAt: now
    };
  }
  const db = await getDb();
  if (db) {
    try {
      await db.collection("users").updateOne({ _id: profile.uid }, { $set: profile }, { upsert: true });
    } catch (err) {
      console.error("Failed to save user record to MongoDB:", err);
    }
  }
  return profile;
}
async function updateUserRole(uid, newRole) {
  const allUsers = await fetchAllUsers();
  const target = allUsers.find((u) => u.uid === uid);
  if (!target) {
    throw new Error(`User with UID ${uid} not found.`);
  }
  target.role = newRole;
  const db = await getDb();
  if (db) {
    try {
      await db.collection("users").updateOne({ _id: uid }, { $set: { role: newRole } }, { upsert: true });
    } catch (err) {
      console.error("Failed to update user role in MongoDB:", err);
    }
  }
  return target;
}
async function updateUserBanStatus(uid, isBanned, banReason) {
  const allUsers = await fetchAllUsers();
  const target = allUsers.find((u) => u.uid === uid);
  if (!target) {
    throw new Error(`User with UID ${uid} not found.`);
  }
  target.isBanned = isBanned;
  target.banReason = banReason || "";
  const db = await getDb();
  if (db) {
    try {
      await db.collection("users").updateOne({ _id: uid }, { $set: { isBanned, banReason: banReason || "" } }, { upsert: true });
    } catch (err) {
      console.error("Failed to update user ban status in MongoDB:", err);
    }
  }
  return target;
}

// server/model/puzzle.model.ts
async function savePuzzleHistoryRecord(record) {
  const db = await getDb();
  if (db) {
    try {
      await db.collection("puzzle_history").replaceOne({ _id: record.id }, record, { upsert: true });
      console.log(`\u{1F4BE} Saved puzzle history record ${record.id} to MongoDB.`);
    } catch (err) {
      console.error("Failed to save puzzle history record to MongoDB:", err);
    }
  }
  return record;
}
async function fetchUserPuzzleHistory(userId) {
  const db = await getDb();
  let items = [];
  if (db) {
    try {
      const docs = await db.collection("puzzle_history").find({ userId }).toArray();
      items = docs.map(({ _id, ...rest }) => rest);
    } catch (err) {
      console.error("Failed to fetch user puzzle history from MongoDB:", err);
    }
  }
  return items;
}
async function deletePuzzleHistoryRecord(id) {
  const db = await getDb();
  if (db) {
    try {
      await db.collection("puzzle_history").deleteOne({ _id: id });
    } catch (err) {
      console.error("Failed to delete puzzle history from MongoDB:", err);
    }
  }
  return true;
}
async function fetchDailyPuzzle(date) {
  const db = await getDb();
  if (db) {
    try {
      const doc = await db.collection("daily_puzzles").findOne({ _id: date });
      if (doc) {
        const { _id, ...rest } = doc;
        return rest;
      }
    } catch (err) {
      console.error(`Failed to fetch daily puzzle for ${date} from MongoDB:`, err);
    }
  }
  return null;
}
async function saveDailyPuzzle(date, puzzleCode, gameMode) {
  const record = {
    date,
    puzzleCode,
    gameMode,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const db = await getDb();
  if (db) {
    try {
      await db.collection("daily_puzzles").updateOne({ _id: date }, { $set: record }, { upsert: true });
    } catch (err) {
      console.error(`Failed to save daily puzzle for ${date} to MongoDB:`, err);
    }
  }
  return record;
}
async function fetchDailyLeaderboard(date) {
  const db = await getDb();
  let entriesMap = /* @__PURE__ */ new Map();
  let usersMap = /* @__PURE__ */ new Map();
  try {
    const allUsers = await fetchAllUsers();
    allUsers.forEach((u) => usersMap.set(u.uid, u));
  } catch (e) {
  }
  if (db) {
    try {
      const docs = await db.collection("daily_leaderboards").find({ date }).toArray();
      docs.forEach((doc) => {
        const { _id, ...rest } = doc;
        const data = rest;
        if (data && data.userId) {
          entriesMap.set(data.id || String(_id), { ...data, id: data.id || String(_id) });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch daily leaderboard for ${date} from MongoDB:`, err);
    }
  }
  let entries = Array.from(entriesMap.values());
  entries = entries.map((entry) => {
    const userProf = usersMap.get(entry.userId);
    return {
      ...entry,
      userDisplayName: userProf?.displayName || entry.userDisplayName || "Anonymous",
      userPhotoURL: userProf?.photoURL !== void 0 ? userProf.photoURL : entry.userPhotoURL
    };
  });
  entries.sort((a, b) => {
    if (b.pointsScore !== a.pointsScore) {
      return b.pointsScore - a.pointsScore;
    }
    const matchA = parseMatchScoreNum(a.matchScore);
    const matchB = parseMatchScoreNum(b.matchScore);
    return matchB - matchA;
  });
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1];
      const curr = entries[i];
      const prevMatch = parseMatchScoreNum(prev.matchScore);
      const currMatch = parseMatchScoreNum(curr.matchScore);
      if (curr.pointsScore === prev.pointsScore && currMatch === prevMatch) {
        curr.rank = prev.rank;
      } else {
        curr.rank = i + 1;
      }
    } else {
      entries[0].rank = 1;
    }
  }
  return entries;
}
async function saveDailyLeaderboardEntry(input) {
  const completionDateStr = input.completedAt ? input.completedAt.split("T")[0] : "";
  if (completionDateStr !== input.date) {
    return {
      success: false,
      reason: `Leaderboard entries are only recorded if finished on the puzzle date (${input.date}). Finished on: ${completionDateStr}`
    };
  }
  const id = `${input.date}_${input.userId}`;
  const fullEntry = {
    ...input,
    id
  };
  const db = await getDb();
  if (db) {
    try {
      const existing = await db.collection("daily_leaderboards").findOne({ _id: id });
      if (existing) {
        return {
          success: false,
          reason: `You already have a submitted score on the leaderboard for ${input.date}.`
        };
      }
      await db.collection("daily_leaderboards").insertOne({ ...fullEntry, _id: id });
    } catch (err) {
      console.error("Failed to save leaderboard entry to MongoDB:", err);
    }
  }
  return { success: true, entry: fullEntry };
}
async function deleteDailyLeaderboardEntry(id) {
  const db = await getDb();
  if (db) {
    try {
      await db.collection("daily_leaderboards").deleteOne({ _id: id });
    } catch (err) {
      console.error(`Failed to delete daily leaderboard entry ${id} from MongoDB:`, err);
    }
  }
  return true;
}

// server/model/trait.model.ts
async function fetchAllTraits() {
  const db = await getDb();
  if (!db) {
    console.log("MongoDB is not initialized. Cannot fetch traits.");
    return {};
  }
  try {
    const docs = await db.collection("traits").find({}).toArray();
    const traits = {};
    docs.forEach((doc) => {
      const rawValues = doc.values || [];
      traits[String(doc._id)] = rawValues.map((v) => {
        return {
          name: v.name || "",
          description: v.description || ""
        };
      });
    });
    return traits;
  } catch (err) {
    console.error("MongoDB read error for traits:", err);
    return {};
  }
}
async function saveTraitsRecord(updatedTraits) {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot save traits record.");
    return;
  }
  const existingDocs = await db.collection("traits").find({}, { projection: { _id: 1 } }).toArray();
  const existingKeys = existingDocs.map((d) => String(d._id));
  const bulkOps = [];
  for (const [key, values] of Object.entries(updatedTraits)) {
    bulkOps.push({
      updateOne: {
        filter: { _id: key },
        update: { $set: { values } },
        upsert: true
      }
    });
  }
  for (const oldKey of existingKeys) {
    if (updatedTraits[oldKey] === void 0) {
      bulkOps.push({ deleteOne: { filter: { _id: oldKey } } });
    }
  }
  if (bulkOps.length > 0) {
    await db.collection("traits").bulkWrite(bulkOps);
  }
}
async function removeTraitAndCleanCharacters(key) {
  const db = await getDb();
  const trimmedKey = key.trim();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot remove trait and clean characters.");
    return {};
  }
  await db.collection("traits").deleteOne({ _id: trimmedKey });
  const docs = await db.collection("characters").find({}).toArray();
  const bulkOps = [];
  docs.forEach((doc) => {
    if (doc.traits && doc.traits[trimmedKey] !== void 0) {
      const updatedTraitsMap = { ...doc.traits };
      delete updatedTraitsMap[trimmedKey];
      bulkOps.push({
        updateOne: { filter: { _id: doc._id }, update: { $set: { traits: updatedTraitsMap } } }
      });
    }
  });
  if (bulkOps.length > 0) {
    await db.collection("characters").bulkWrite(bulkOps);
  }
  return await fetchAllTraits();
}
async function renameTraitKey(oldKey, newKey) {
  const db = await getDb();
  const trimmedOld = oldKey.trim();
  const trimmedNew = newKey.trim();
  if (trimmedOld === trimmedNew) {
    return await fetchAllTraits();
  }
  if (!db) {
    console.error("MongoDB is not initialized. Cannot rename trait key.");
    return {};
  }
  const oldDoc = await db.collection("traits").findOne({ _id: trimmedOld });
  if (oldDoc) {
    const values = oldDoc.values || [];
    await db.collection("traits").replaceOne({ _id: trimmedNew }, { values }, { upsert: true });
    await db.collection("traits").deleteOne({ _id: trimmedOld });
  }
  const docs = await db.collection("characters").find({}).toArray();
  const bulkOps = [];
  docs.forEach((doc) => {
    if (doc.traits && doc.traits[trimmedOld] !== void 0) {
      const updatedTraitsMap = { ...doc.traits };
      updatedTraitsMap[trimmedNew] = updatedTraitsMap[trimmedOld];
      delete updatedTraitsMap[trimmedOld];
      bulkOps.push({
        updateOne: { filter: { _id: doc._id }, update: { $set: { traits: updatedTraitsMap } } }
      });
    }
  });
  if (bulkOps.length > 0) {
    await db.collection("characters").bulkWrite(bulkOps);
  }
  return await fetchAllTraits();
}
async function updateTraitDefinition(key, newKey, values) {
  const db = await getDb();
  const trimmedKey = key.trim();
  const trimmedNew = newKey ? newKey.trim() : trimmedKey;
  const seenNames = /* @__PURE__ */ new Set();
  const sanitizedValues = [];
  for (const v of values) {
    const name = String(v.name || "").trim();
    if (name && !seenNames.has(name.toLowerCase())) {
      seenNames.add(name.toLowerCase());
      sanitizedValues.push({
        name,
        description: String(v.description || "").trim()
      });
    }
  }
  const valueNames = sanitizedValues.map((v) => v.name);
  if (!db) {
    console.error("MongoDB is not initialized. Cannot update trait definition.");
    return {};
  }
  if (trimmedNew !== trimmedKey) {
    await db.collection("traits").replaceOne({ _id: trimmedNew }, { values: sanitizedValues }, { upsert: true });
    await db.collection("traits").deleteOne({ _id: trimmedKey });
  } else {
    await db.collection("traits").replaceOne({ _id: trimmedKey }, { values: sanitizedValues }, { upsert: true });
  }
  const docs = await db.collection("characters").find({}).toArray();
  const bulkOps = [];
  docs.forEach((doc) => {
    if (doc.traits) {
      let charVal = doc.traits[trimmedKey];
      let hasKey = charVal !== void 0;
      if (hasKey) {
        let currentVals = Array.isArray(charVal) ? charVal : typeof charVal === "string" ? charVal.split(",").map((v) => v.trim()).filter(Boolean) : [];
        const filteredVals = currentVals.filter((v) => valueNames.includes(v));
        const updatedTraitsMap = { ...doc.traits };
        if (trimmedNew !== trimmedKey) {
          updatedTraitsMap[trimmedNew] = filteredVals;
          delete updatedTraitsMap[trimmedKey];
        } else {
          updatedTraitsMap[trimmedKey] = filteredVals;
        }
        bulkOps.push({
          updateOne: { filter: { _id: doc._id }, update: { $set: { traits: updatedTraitsMap } } }
        });
      }
    }
  });
  if (bulkOps.length > 0) {
    await db.collection("characters").bulkWrite(bulkOps);
  }
  return await fetchAllTraits();
}
async function addTraitValue(key, value, description) {
  const db = await getDb();
  const trimmedKey = key.trim();
  const trimmedValue = value.trim();
  const desc = description ? description.trim() : "";
  if (!db) {
    console.error("MongoDB is not initialized. Cannot add trait value.");
    return {};
  }
  const traitDoc = await db.collection("traits").findOne({ _id: trimmedKey });
  let values = [];
  if (traitDoc) {
    const rawValues = traitDoc.values || [];
    values = rawValues.map((v) => {
      if (typeof v === "string") {
        return { name: v, description: `${v} characteristic for ${trimmedKey}` };
      }
      return {
        name: v.name || "",
        description: v.description || ""
      };
    });
  }
  if (!values.some((v) => v.name.toLowerCase() === trimmedValue.toLowerCase())) {
    values.push({ name: trimmedValue, description: desc });
  }
  await db.collection("traits").replaceOne({ _id: trimmedKey }, { values }, { upsert: true });
  return await fetchAllTraits();
}
async function importTraitsBatch(importedTraits, mode) {
  if (mode === "overwrite") {
    await saveTraitsRecord(importedTraits);
    return importedTraits;
  }
  const finalTraits = { ...await fetchAllTraits() };
  for (const [key, values] of Object.entries(importedTraits)) {
    const mergedList = [...finalTraits[key] || []];
    values.forEach((newOpt) => {
      if (!mergedList.some((v) => v.name.toLowerCase() === newOpt.name.toLowerCase())) {
        mergedList.push(newOpt);
      }
    });
    finalTraits[key] = mergedList;
  }
  await saveTraitsRecord(finalTraits);
  return finalTraits;
}

// server/routes/firebase.route.ts
async function firebaseRoutes(app2) {
  app2.get("/api/firebase-status", async (_, res) => {
    try {
      res.json(await getDatabaseStatus());
    } catch (err) {
      res.status(500).json({ error: "Failed to determine database status." });
    }
  });
}

// server/routes/image.route.ts
import multer from "multer";
var ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES }
});
function handleImageUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Image exceeds the 5 MB limit." });
    }
    if (err) return next(err);
    next();
  });
}
async function imageRoutes(app2) {
  app2.post("/api/images", handleImageUpload, async (req, res) => {
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

// server/routes/anime.route.ts
async function animeRoutes(app2) {
  app2.get("/api/database/animes", async (req, res) => {
    try {
      const animes = await fetchAllAnimes();
      res.json(animes);
    } catch (err) {
      console.error("Failed to read registered animes:", err);
      res.status(500).json({ error: "Failed to read registered animes." });
    }
  });
  app2.post("/api/database/animes", async (req, res) => {
    try {
      const anime = req.body;
      if (!anime || !anime.malId || !anime.title) {
        return res.status(400).json({ error: "Invalid anime data: malId and title are required." });
      }
      await saveAnimeRecord(anime);
      res.json({ success: true, message: "Anime successfully saved in the registry." });
    } catch (err) {
      console.error("Failed to save anime record:", err);
      res.status(500).json({ error: "Failed to save anime record." });
    }
  });
  app2.delete("/api/database/animes/:malId", async (req, res) => {
    try {
      const malId = Number(req.params.malId);
      if (!Number.isInteger(malId) || malId <= 0) {
        return res.status(400).json({ error: "Invalid anime malId." });
      }
      const result = await deleteAnimeWithCharacters(malId);
      res.json({
        success: true,
        ...result,
        message: `Anime removed from registry. ${result.deletedCharacters} characters deleted, ${result.updatedCharacters} characters updated.`
      });
    } catch (err) {
      console.error("Failed to delete anime record:", err);
      res.status(500).json({ error: "Failed to delete anime record." });
    }
  });
}

// server/routes/character.route.ts
import multer2 from "multer";
var upload2 = multer2({ storage: multer2.memoryStorage() });
async function characterRoutes(app2) {
  app2.get("/api/database", async (req, res) => {
    try {
      const characters = await fetchAllCharacters();
      res.json(characters);
    } catch (err) {
      console.error("Failed to read database:", err);
      res.status(500).json({ error: "Failed to read database." });
    }
  });
  app2.post("/api/database", async (req, res) => {
    try {
      const newChar = req.body;
      if (!newChar || !newChar.name) {
        return res.status(400).json({ error: "Invalid character data: Name is required." });
      }
      await saveCharacterRecord(newChar);
      res.json({ success: true, message: "Character successfully registered." });
    } catch (err) {
      console.error("Failed to save character:", err);
      res.status(500).json({ error: "Failed to save character data." });
    }
  });
  app2.delete("/api/database/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteCharacterRecord(id);
      res.json({ success: true, message: "Character removed from database." });
    } catch (err) {
      console.error("Failed to delete character:", err);
      res.status(500).json({ error: "Failed to delete character record." });
    }
  });
  app2.post("/api/database/batch-update-traits", async (req, res) => {
    try {
      const { characterIds, traits, action } = req.body;
      if (!Array.isArray(characterIds) || characterIds.length === 0) {
        return res.status(400).json({ error: "characterIds must be a non-empty array." });
      }
      if (!traits || typeof traits !== "object") {
        return res.status(400).json({ error: "traits must be an object with trait keys and values." });
      }
      const act = action === "remove" ? "remove" : "add";
      const result = await batchUpdateCharacterTraits(characterIds, traits, act);
      const msg = act === "remove" ? `Successfully removed configured traits from ${result.updatedCount} characters.` : `Successfully merged traits into ${result.updatedCount} characters.`;
      res.json({ success: true, updatedCount: result.updatedCount, message: msg });
    } catch (err) {
      console.error("Failed to batch update traits:", err);
      res.status(500).json({ error: "Failed to apply batch traits update to database." });
    }
  });
  app2.post("/api/database/import", upload2.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "A JSON file is required." });
      }
      let importedChars;
      try {
        importedChars = JSON.parse(req.file.buffer.toString("utf-8"));
      } catch {
        return res.status(400).json({ error: "The uploaded file is not a valid JSON file." });
      }
      if (!Array.isArray(importedChars)) {
        return res.status(400).json({ error: "Imported data must be an array of characters." });
      }
      const mode = req.body.mode === "overwrite" ? "overwrite" : "merge";
      const count = await importCharactersBatch(importedChars, mode);
      const allCharacters = await fetchAllCharacters();
      res.json({ success: true, count, total: allCharacters.length });
    } catch (err) {
      console.error("Failed to import database:", err);
      res.status(500).json({ error: "Failed to parse and import database record." });
    }
  });
}

// server/routes/puzzle.route.ts
async function puzzleRoutes(app2) {
  app2.post("/api/puzzle-history", async (req, res) => {
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
  app2.get("/api/puzzle-history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const history = await fetchUserPuzzleHistory(userId);
      res.json(history);
    } catch (err) {
      console.error("Failed to fetch puzzle history:", err);
      res.status(500).json({ error: "Failed to fetch puzzle history." });
    }
  });
  app2.delete("/api/puzzle-history/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deletePuzzleHistoryRecord(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete puzzle history entry:", err);
      res.status(500).json({ error: "Failed to delete puzzle history entry." });
    }
  });
  app2.get("/api/daily-puzzle", async (req, res) => {
    try {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
  app2.post("/api/daily-puzzle", async (req, res) => {
    try {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const { date, puzzleCode, gameMode } = req.body;
      if (!date || !puzzleCode || !gameMode) {
        return res.status(400).json({ error: "date, puzzleCode, and gameMode are required." });
      }
      if (date > todayStr) {
        return res.status(400).json({ error: "Cannot generate or save daily puzzle for future dates." });
      }
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
  app2.get("/api/daily-leaderboard", async (req, res) => {
    try {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
  app2.post("/api/daily-leaderboard", async (req, res) => {
    try {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const { date, userId, userDisplayName, userPhotoURL, matchScore, pointsScore, jokerFound, completedAt, placedCharacterIds, gameMode } = req.body;
      if (!date || !userId || pointsScore === void 0 || !completedAt) {
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
  app2.delete("/api/daily-leaderboard/:id", async (req, res) => {
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

// server/routes/trait.route.ts
import multer3 from "multer";
var upload3 = multer3({ storage: multer3.memoryStorage() });
function normalizeTraitsFile(json) {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const normalized = {};
  for (const [k, v] of Object.entries(json)) {
    if (!Array.isArray(v)) return null;
    normalized[k] = v.map((item) => {
      if (typeof item === "string") {
        return { name: item, description: `${item} characteristic for ${k.replace(/_/g, " ")}` };
      }
      return {
        name: String(item?.name || "").trim(),
        description: String(item?.description || "").trim()
      };
    });
  }
  return normalized;
}
async function traitRoutes(app2) {
  app2.get("/api/traits", async (req, res) => {
    try {
      const traits = await fetchAllTraits();
      res.json(traits);
    } catch (err) {
      console.error("Failed to read traits database:", err);
      res.status(500).json({ error: "Failed to read traits database." });
    }
  });
  app2.get("/api/traits/count", async (req, res) => {
    try {
      const traits = await fetchAllTraits();
      res.json({ count: Object.keys(traits).length });
    } catch (err) {
      console.error("Failed to read traits database:", err);
      res.status(500).json({ error: "Failed to read traits database." });
    }
  });
  app2.post("/api/traits", async (req, res) => {
    try {
      const updatedTraits = req.body;
      if (!updatedTraits || typeof updatedTraits !== "object" || Array.isArray(updatedTraits)) {
        return res.status(400).json({ error: "Invalid traits data object layout." });
      }
      await saveTraitsRecord(updatedTraits);
      res.json({ success: true, traits: updatedTraits });
    } catch (err) {
      console.error("Failed to save traits database:", err);
      res.status(500).json({ error: "Failed to save traits database." });
    }
  });
  app2.post("/api/traits/import", upload3.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "A traits JSON file is required." });
      }
      let parsed;
      try {
        parsed = JSON.parse(req.file.buffer.toString("utf-8"));
      } catch {
        return res.status(400).json({ error: "The uploaded file is not a valid JSON file." });
      }
      const normalized = normalizeTraitsFile(parsed);
      if (!normalized) {
        return res.status(400).json({ error: "Invalid format. The traits backup needs to be a JSON object whose values are arrays." });
      }
      const mode = req.body.mode === "overwrite" ? "overwrite" : "merge";
      const traits = await importTraitsBatch(normalized, mode);
      res.json({ success: true, traits });
    } catch (err) {
      console.error("Failed to import traits:", err);
      res.status(500).json({ error: "Failed to import traits database." });
    }
  });
  app2.post("/api/traits/delete", async (req, res) => {
    try {
      const { key } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Key is required to delete a trait." });
      }
      const traits = await removeTraitAndCleanCharacters(key);
      res.json({ success: true, traits });
    } catch (err) {
      console.error("Failed to delete trait:", err);
      res.status(500).json({ error: "Failed to delete trait from database system." });
    }
  });
  app2.post("/api/traits/rename", async (req, res) => {
    try {
      const { oldKey, newKey } = req.body;
      if (!oldKey || !newKey) {
        return res.status(400).json({ error: "Both oldKey and newKey are required." });
      }
      const traits = await renameTraitKey(oldKey, newKey);
      res.json({ success: true, traits });
    } catch (err) {
      console.error("Failed to rename trait key:", err);
      res.status(500).json({ error: "Failed to rename trait key." });
    }
  });
  app2.post("/api/traits/update-definition", async (req, res) => {
    try {
      const { key, newKey, values } = req.body;
      if (!key || !Array.isArray(values)) {
        return res.status(400).json({ error: "Key and values array are required." });
      }
      const traits = await updateTraitDefinition(key, newKey, values);
      res.json({ success: true, traits });
    } catch (err) {
      console.error("Failed to update trait definition:", err);
      res.status(500).json({ error: "Failed to update trait configuration." });
    }
  });
  app2.post("/api/traits/add-value", async (req, res) => {
    try {
      const { key, value, description } = req.body;
      if (!key || !value) {
        return res.status(400).json({ error: "Key and value are required." });
      }
      const traits = await addTraitValue(key, value, description);
      res.json({ success: true, traits });
    } catch (err) {
      console.error("Failed to append trait value:", err);
      res.status(500).json({ error: "Failed to append trait value." });
    }
  });
}

// server/routes/user.route.ts
async function userRoutes(app2) {
  app2.post("/api/users/sync", async (req, res) => {
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
  app2.get("/api/users", async (req, res) => {
    try {
      const users = await fetchAllUsers();
      res.json(users);
    } catch (err) {
      console.error("Failed to fetch registered users list:", err);
      res.status(500).json({ error: "Failed to fetch registered users list." });
    }
  });
  app2.patch("/api/users/:uid/role", async (req, res) => {
    try {
      const { uid } = req.params;
      const { role } = req.body;
      if (!role || !["user", "admin", "owner"].includes(role)) {
        return res.status(400).json({ error: "Role must be 'user', 'admin', or 'owner'." });
      }
      const updatedUser = await updateUserRole(uid, role);
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("Failed to update user role:", err);
      res.status(500).json({ error: err.message || "Failed to update user role." });
    }
  });
  app2.patch("/api/users/:uid/ban", async (req, res) => {
    try {
      const { uid } = req.params;
      const { isBanned, banReason } = req.body;
      if (typeof isBanned !== "boolean") {
        return res.status(400).json({ error: "isBanned must be a boolean." });
      }
      const updatedUser = await updateUserBanStatus(uid, isBanned, banReason);
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("Failed to update user ban status:", err);
      res.status(500).json({ error: err.message || "Failed to update user ban status." });
    }
  });
}

// server/index.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is running successfully!" });
});
await apiRoutes(app);
await firebaseRoutes(app);
await animeRoutes(app);
await characterRoutes(app);
await imageRoutes(app);
await traitRoutes(app);
await userRoutes(app);
await puzzleRoutes(app);
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[Dev] Server running on port: ${PORT}`);
  });
}
var index_default = app;
export {
  index_default as default
};
