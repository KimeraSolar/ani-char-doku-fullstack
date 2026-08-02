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

// server/model/firebase.model.ts
import { getApps as getApps2, initializeApp as initializeApp2 } from "firebase-admin/app";
import { getFirestore as getFirestore2 } from "firebase-admin/firestore";

// server/model/config.model.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    })
  });
}
var db = getFirestore();

// server/model/firebase.model.ts
var appInstance = null;
var dbInstance = null;
var triedInitialization = false;
function getFirebaseStatus() {
  const hasConfig = !!(process.env.FIRESTORE_PROJECT_ID && process.env.FIRESTORE_API_KEY);
  if (!hasConfig) {
    return {
      isConfigured: false,
      usingFallback: true
    };
  }
  try {
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
function getFirestoreDb() {
  if (dbInstance) return dbInstance;
  if (triedInitialization && !appInstance) return null;
  triedInitialization = true;
  const apiKey = process.env.FIRESTORE_API_KEY;
  const authDomain = process.env.FIRESTORE_AUTH_DOMAIN;
  const projectId = process.env.FIRESTORE_PROJECT_ID;
  const storageBucket = process.env.FIRESTORE_STORAGE_BUCKET;
  const messagingSenderId = process.env.FIRESTORE_MESSAGING_SENDER_ID;
  const appId = process.env.FIRESTORE_APP_ID;
  const measurementId = process.env.FIRESTORE_MEASUREMENT_ID;
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID;
  if (!projectId || !apiKey) {
    console.warn("\u26A0\uFE0F Firebase environment variables are not fully configured.");
    return null;
  }
  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId
  };
  try {
    if (getApps2().length === 0) {
      appInstance = initializeApp2(firebaseConfig);
    } else {
      appInstance = getApps2()[0];
    }
    if (firestoreDatabaseId) {
      dbInstance = getFirestore2(appInstance, firestoreDatabaseId);
    } else {
      dbInstance = getFirestore2(appInstance);
    }
    console.log(`\u26A1 Successfully initialized Cloud Firestore database "${firestoreDatabaseId || "(default)"}" with live connection.`);
    return dbInstance;
  } catch (err) {
    console.error("\u274C Failed to initialize Firebase SDK:", err);
    return null;
  }
}

// server/model/anime.model.ts
async function fetchAllAnimes() {
  if (!db) {
    console.error("Firestore is not initialized. Cannot fetch animes.");
    return [];
  }
  try {
    const snapshot = await db.collection("animes").get();
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ ...doc.data() });
    });
    return list;
  } catch (err) {
    console.error("Firestore read error for animes:", err);
    return [];
  }
}
async function saveAnimeRecord(anime) {
  if (!db) {
    console.error("Failed to write local animes file. Firestore is not initialized.");
    return;
  }
  try {
    const docId = String(anime.malId);
    const docRef = db.collection("animes").doc(docId);
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
    await docRef.set(updatePayload, { merge: true });
  } catch (err) {
    console.error("Firestore write error for anime record:", anime.malId, err);
  }
}

// server/model/character.model.ts
async function fetchAllCharacters() {
  const db2 = getFirestoreDb();
  let rawList = [];
  if (!db2) {
    console.error("Firestore is not initialized. Cannot fetch characters.");
    return [];
  } else {
    try {
      const snapshot = await db2.collection("characters").get();
      snapshot.forEach((doc) => {
        rawList.push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.error("Firestore read error for characters:", err);
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
  const db2 = getFirestoreDb();
  if (!db2) {
    console.error("Firestore is not initialized. Cannot save character record:", charId);
    return;
  }
  try {
    const docRef = db2.collection("characters").doc(charId);
    await docRef.set(finalCharData);
  } catch (err) {
    console.error("Firestore save character error:", err);
    throw err;
  }
}
async function deleteCharacterRecord(id) {
  const db2 = getFirestoreDb();
  if (!db2) {
    console.error("Firestore is not initialized. Cannot delete character record:", id);
    return;
  }
  const docRef = db2.collection("characters").doc(id);
  await docRef.delete();
}
async function batchUpdateCharacterTraits(characterIds, newTraits, action = "add") {
  if (!characterIds || characterIds.length === 0 || !newTraits || Object.keys(newTraits).length === 0) {
    return { updatedCount: 0 };
  }
  const db2 = getFirestoreDb();
  const idSet = new Set(characterIds.map((id) => String(id)));
  let rawList = [];
  if (!db2) {
    throw new Error("Firestore is not initialized. Cannot update character traits.");
  } else {
    try {
      const snapshot = await db2.collection("characters").get();
      snapshot.forEach((doc) => {
        rawList.push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.error("Firestore read error for characters:", err);
    }
  }
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
      if (db2) {
        try {
          const docRef = db2.collection("characters").doc(char.id);
          await docRef.set(char);
        } catch (err) {
          console.error("Failed to update character traits in Firestore:", err);
        }
      }
      updatedCount++;
    }
  }
  return { updatedCount };
}
async function importCharactersBatch(importedChars, mode) {
  const db2 = getFirestoreDb();
  const sanitizedImported = [];
  for (const char of importedChars) {
    if (!char || typeof char !== "object") continue;
    if (!char.name) continue;
    const id = char.id || `char-imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const rawSources = Array.isArray(char.sources) ? char.sources.map((s) => String(s).trim()) : [];
    const malIds = [];
    for (const src of rawSources) {
      if (!src) continue;
      malIds.push(0);
    }
    const defaultImgUrl = char.imageUrl ? String(char.imageUrl).trim() : "https://cdn.myanimelist.net/images/characters/failed_to_load.jpg";
    const importedImages = Array.isArray(char.images) && char.images.length > 0 ? char.images.map((img) => ({
      url: String(img.url || img.imageUrl || defaultImgUrl).trim(),
      label: String(img.label || "Profile Image").trim()
    })) : [{ url: defaultImgUrl, label: "Default Profile" }];
    sanitizedImported.push({
      id,
      malId: typeof char.malId === "number" ? char.malId : 0,
      name: String(char.name).trim(),
      imageUrl: importedImages[0]?.url || defaultImgUrl,
      images: importedImages,
      source: malIds[0] || null,
      sources: malIds,
      role: char.role ? String(char.role).trim() : "Supporting",
      traits: char.traits && typeof char.traits === "object" && !Array.isArray(char.traits) ? char.traits : {},
      nicknames: Array.isArray(char.nicknames) ? char.nicknames.map((n) => String(n).trim()) : [],
      registeredAt: char.registeredAt || (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (!db2) {
    console.error("Firestore is not initialized. Cannot import characters batch.");
    return 0;
  }
  if (mode === "overwrite") {
    const snapshot = await db2.collection("characters").get();
    const batch = db2.batch();
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    const batchWrite = db2.batch();
    for (const char of sanitizedImported) {
      const docRef = db2.collection("characters").doc(char.id);
      batchWrite.set(docRef, char);
    }
    await batchWrite.commit();
  } else {
    const batchWrite = db2.batch();
    for (const char of sanitizedImported) {
      const docRef = db2.collection("characters").doc(char.id);
      batchWrite.set(docRef, char);
    }
    await batchWrite.commit();
  }
  return sanitizedImported.length;
}

// server/model/user.model.ts
async function fetchAllUsers() {
  const db2 = getFirestoreDb();
  let usersList = [];
  if (db2) {
    try {
      const snapshot = await db2.collection("users").get();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.uid) {
          usersList.push(data);
        }
      });
    } catch (err) {
      console.error("Failed to fetch users from Firestore:", err);
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
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const userRef = db2.collection("users").doc(profile.uid);
      await userRef.set(profile, { merge: true });
    } catch (err) {
      console.error("Failed to save user record to Firestore:", err);
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
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const userRef = db2.collection("users").doc(uid);
      await userRef.set({ role: newRole }, { merge: true });
    } catch (err) {
      console.error("Failed to update user role in Firestore:", err);
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
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const userRef = db2.collection("users").doc(uid);
      await userRef.set({ isBanned, banReason: banReason || "" }, { merge: true });
    } catch (err) {
      console.error("Failed to update user ban status in Firestore:", err);
    }
  }
  return target;
}

// shared/utils/index.ts
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

// server/model/puzzle.model.ts
async function savePuzzleHistoryRecord(record) {
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const docRef = db2.collection("puzzle_history").doc(record.id);
      await docRef.set(record);
      console.log(`\u{1F4BE} Saved puzzle history record ${record.id} to Firestore.`);
    } catch (err) {
      console.error("Failed to save puzzle history record to Firestore:", err);
    }
  }
  return record;
}
async function fetchUserPuzzleHistory(userId) {
  const db2 = getFirestoreDb();
  let firestoreItems = [];
  if (db2) {
    try {
      const snapshot = await db2.collection("puzzle_history").get();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.userId === userId) {
          firestoreItems.push(data);
        }
      });
    } catch (err) {
      console.error("Failed to fetch user puzzle history from Firestore:", err);
    }
  }
  return firestoreItems;
}
async function deletePuzzleHistoryRecord(id) {
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const docRef = db2.collection("puzzle_history").doc(id);
      await docRef.delete();
    } catch (err) {
      console.error("Failed to delete puzzle history from Firestore:", err);
    }
  }
  return true;
}
async function fetchDailyPuzzle(date) {
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const docRef = db2.collection("daily_puzzles").doc(date);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return docSnap.data();
      }
    } catch (err) {
      console.error(`Failed to fetch daily puzzle for ${date} from Firestore:`, err);
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
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const docRef = db2.collection("daily_puzzles").doc(date);
      await docRef.set(record, { merge: true });
    } catch (err) {
      console.error(`Failed to save daily puzzle for ${date} to Firestore:`, err);
    }
  }
  return record;
}
async function fetchDailyLeaderboard(date) {
  const db2 = getFirestoreDb();
  let entriesMap = /* @__PURE__ */ new Map();
  let usersMap = /* @__PURE__ */ new Map();
  try {
    const allUsers = await fetchAllUsers();
    allUsers.forEach((u) => usersMap.set(u.uid, u));
  } catch (e) {
  }
  if (db2) {
    try {
      const snapshot = await db2.collection("daily_leaderboards").where("date", "==", date).get();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.userId) {
          entriesMap.set(data.id || docSnap.id, { ...data, id: data.id || docSnap.id });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch daily leaderboard for ${date} from Firestore:`, err);
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
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const docRef = db2.collection("daily_leaderboards").doc(id);
      const existingSnap = await docRef.get();
      if (existingSnap.exists) {
        return {
          success: false,
          reason: `You already have a submitted score on the leaderboard for ${input.date}.`
        };
      }
      await docRef.set(fullEntry);
    } catch (err) {
      console.error("Failed to save leaderboard entry to Firestore:", err);
    }
  }
  return { success: true, entry: fullEntry };
}
async function deleteDailyLeaderboardEntry(id) {
  const db2 = getFirestoreDb();
  if (db2) {
    try {
      const docRef = db2.collection("daily_leaderboards").doc(id);
      await docRef.delete();
    } catch (err) {
      console.error(`Failed to delete daily leaderboard entry ${id} from Firestore:`, err);
    }
  }
  return true;
}

// server/model/trait.model.ts
async function fetchAllTraits() {
  const db2 = getFirestoreDb();
  if (!db2) {
    console.log("Firestore is not initialized. Cannot fetch traits.");
    return {};
  }
  try {
    const snapshot = await db2.collection("traits").get();
    const traits = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawValues = data.values || [];
      traits[docSnap.id] = rawValues.map((v) => {
        return {
          name: v.name || "",
          description: v.description || ""
        };
      });
    });
    return traits;
  } catch (err) {
    console.error("Firestore read error for traits:", err);
    return {};
  }
}
async function saveTraitsRecord(updatedTraits) {
  const db2 = getFirestoreDb();
  if (!db2) {
    console.error("Firestore is not initialized. Cannot save traits record.");
    return;
  }
  const snapshot = await db2.collection("traits").get();
  const existingKeys = [];
  snapshot.forEach((docSnap) => {
    existingKeys.push(docSnap.id);
  });
  const batch = db2.batch();
  for (const [key, values] of Object.entries(updatedTraits)) {
    const docRef = db2.collection("traits").doc(key);
    batch.set(docRef, { values });
  }
  for (const oldKey of existingKeys) {
    if (updatedTraits[oldKey] === void 0) {
      const docRef = db2.collection("traits").doc(oldKey);
      batch.delete(docRef);
    }
  }
  await batch.commit();
}
async function removeTraitAndCleanCharacters(key) {
  const db2 = getFirestoreDb();
  const trimmedKey = key.trim();
  if (!db2) {
    console.error("Firestore is not initialized. Cannot remove trait and clean characters.");
    return {};
  }
  const traitRef = db2.collection("traits").doc(trimmedKey);
  await traitRef.delete();
  const snapshot = await db2.collection("characters").get();
  const batch = db2.batch();
  let counter = 0;
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.traits && data.traits[trimmedKey] !== void 0) {
      const updatedTraitsMap = { ...data.traits };
      delete updatedTraitsMap[trimmedKey];
      batch.update(docSnap.ref, { traits: updatedTraitsMap });
      counter++;
    }
  });
  if (counter > 0) {
    await batch.commit();
  }
  return await fetchAllTraits();
}
async function renameTraitKey(oldKey, newKey) {
  const db2 = getFirestoreDb();
  const trimmedOld = oldKey.trim();
  const trimmedNew = newKey.trim();
  if (trimmedOld === trimmedNew) {
    return await fetchAllTraits();
  }
  if (!db2) {
    console.error("Firestore is not initialized. Cannot rename trait key.");
    return {};
  }
  const oldDocRef = db2.collection("traits").doc(trimmedOld);
  const oldDocSnap = await oldDocRef.get();
  if (oldDocSnap.exists) {
    const values = oldDocSnap.data()?.values || [];
    await db2.collection("traits").doc(trimmedNew).set({ values });
    await oldDocRef.delete();
  }
  const snapshot = await db2.collection("characters").get();
  const batch = db2.batch();
  let counter = 0;
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.traits && data.traits[trimmedOld] !== void 0) {
      const updatedTraitsMap = { ...data.traits };
      updatedTraitsMap[trimmedNew] = updatedTraitsMap[trimmedOld];
      delete updatedTraitsMap[trimmedOld];
      batch.update(docSnap.ref, { traits: updatedTraitsMap });
      counter++;
    }
  });
  if (counter > 0) {
    await batch.commit();
  }
  return await fetchAllTraits();
}
async function updateTraitDefinition(key, newKey, values) {
  const db2 = getFirestoreDb();
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
  if (!db2) {
    console.error("Firestore is not initialized. Cannot update trait definition.");
    return {};
  }
  if (trimmedNew !== trimmedKey) {
    await db2.collection("traits").doc(trimmedNew).set({ values: sanitizedValues });
    await db2.collection("traits").doc(trimmedKey).delete();
  } else {
    await db2.collection("traits").doc(trimmedKey).set({ values: sanitizedValues });
  }
  const snapshot = await db2.collection("characters").get();
  const batch = db2.batch();
  let counter = 0;
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.traits) {
      let charVal = data.traits[trimmedKey];
      let hasKey = charVal !== void 0;
      if (hasKey) {
        let currentVals = Array.isArray(charVal) ? charVal : typeof charVal === "string" ? charVal.split(",").map((v) => v.trim()).filter(Boolean) : [];
        const filteredVals = currentVals.filter((v) => valueNames.includes(v));
        const updatedTraitsMap = { ...data.traits };
        if (trimmedNew !== trimmedKey) {
          updatedTraitsMap[trimmedNew] = filteredVals;
          delete updatedTraitsMap[trimmedKey];
        } else {
          updatedTraitsMap[trimmedKey] = filteredVals;
        }
        batch.update(docSnap.ref, { traits: updatedTraitsMap });
        counter++;
      }
    }
  });
  if (counter > 0) {
    await batch.commit();
  }
  return await fetchAllTraits();
}
async function addTraitValue(key, value, description) {
  const db2 = getFirestoreDb();
  const trimmedKey = key.trim();
  const trimmedValue = value.trim();
  const desc = description ? description.trim() : "";
  if (!db2) {
    console.error("Firestore is not initialized. Cannot add trait value.");
    return {};
  }
  const traitRef = db2.collection("traits").doc(trimmedKey);
  const traitSnap = await traitRef.get();
  let values = [];
  if (traitSnap.exists) {
    const rawValues = traitSnap.data()?.values || [];
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
  await traitRef.set({ values });
  return await fetchAllTraits();
}

// server/routes/firebase.route.ts
async function firebaseRoutes(app2) {
  app2.get("/api/firebase-status", (_, res) => {
    try {
      res.json(getFirebaseStatus());
    } catch (err) {
      res.status(500).json({ error: "Failed to determine Firebase status." });
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
}

// server/routes/character.route.ts
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
  app2.post("/api/database/import", async (req, res) => {
    try {
      const { characters: importedChars, mode } = req.body;
      if (!Array.isArray(importedChars)) {
        return res.status(400).json({ error: "Imported data must be an array of characters." });
      }
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
