import { Trait, TraitOption } from "@shared/types/index.js";
import { getFirestoreDb } from "./firebase.model.js";
import { getMongoClient } from "./mongodb.model.js";

const TRAIT_COL_NAME = "traits";
const DATABASE_NAME = process.env.MONGODB_DATABASE;

// export async function fetchAllTraits(): Promise<Record<string, TraitOption[]>> {
//   const db = getFirestoreDb();
//   if (!db) {
//     console.log("Firestore is not initialized. Cannot fetch traits.");
//     return {};
//   }

//   try {
//     const snapshot = await db.collection("traits").get();
//     const traits: Record<string, TraitOption[]> = {};
//     snapshot.forEach((docSnap) => {
//       const data = docSnap.data();
//       const rawValues = data.values || [];
//       traits[docSnap.id] = rawValues.map((v: any) => {
//         return {
//           name: v.name || "",
//           description: v.description || "",
//         };
//       });
//     });
//     return traits;
//   } catch (err) {
//     console.error("Firestore read error for traits:", err);
//     return {};
//   }
// }

export async function fetchTraitsCount(): Promise<number> {
  const client = await getMongoClient();
  if (!client) {
    throw new Error("MongoDB is not initialized. Cannot fetch traits");
  }

  try {
    const db = client.db(DATABASE_NAME);
    const traitsCollection = db.collection(TRAIT_COL_NAME);

    const docsCount = traitsCollection.countDocuments();

    return docsCount;
  } catch (err) {
    console.error("[Traits Model] MongoDB read error for traits:", err);
    return -1;
  }
}

export async function fetchAllTraits(): Promise<Array<Trait>> {
  const client = await getMongoClient();
  if (!client) {
    throw new Error("MongoDB is not initialized. Cannot fetch traits.");
  }

  try {
    const db = client.db(DATABASE_NAME);
    const traitsCollection = db.collection(TRAIT_COL_NAME);
    
    const docs = await traitsCollection.find({}).toArray();
    const traits: Array<Trait> = docs.map(doc => (
      {
        id: doc._id.toString(),
        name: doc.name,
        values: doc.values
      }
    ))

    return traits;
  } catch (err) {
    console.error("[Traits Model] MongoDB read error for traits:", err);
    return [];
  }
}

// export async function saveTraitsRecord(updatedTraits: Record<string, TraitOption[]>): Promise<void> {
//   const db = getFirestoreDb();
//   if (!db) {
//     console.error("Firestore is not initialized. Cannot save traits record.");
//     return;
//   }

//   // Get current traits in Firestore
//   const snapshot = await db.collection("traits").get();
//   const existingKeys: string[] = [];
//   snapshot.forEach((docSnap) => {
//     existingKeys.push(docSnap.id);
//   });

//   const batch = db.batch();

//   // Set updated traits
//   for (const [key, values] of Object.entries(updatedTraits)) {
//     const docRef = db.collection("traits").doc(key);
//     batch.set(docRef, { values });
//   }

//   // Delete decommissioned traits
//   for (const oldKey of existingKeys) {
//     if (updatedTraits[oldKey] === undefined) {
//       const docRef = db.collection("traits").doc(oldKey);
//       batch.delete(docRef);
//     }
//   }

//   await batch.commit();
// }

// export async function removeTraitAndCleanCharacters(key: string): Promise<Record<string, TraitOption[]>> {
//   const db = getFirestoreDb();
//   const trimmedKey = key.trim();

//   if (!db) {
//     console.error("Firestore is not initialized. Cannot remove trait and clean characters.");
//     return {};
//   }

//   // Live Firestore Delete & Clean Character records
//   // 1. Delete trait doc
//   const traitRef = db.collection("traits").doc(trimmedKey);
//   await traitRef.delete();

//   // 2. Fetch characters and update
//   const snapshot = await db.collection("characters").get();
//   const batch = db.batch();
//   let counter = 0;

//   snapshot.forEach((docSnap) => {
//     const data = docSnap.data();
//     if (data.traits && data.traits[trimmedKey] !== undefined) {
//       const updatedTraitsMap = { ...data.traits };
//       delete updatedTraitsMap[trimmedKey];
//       batch.update(docSnap.ref, { traits: updatedTraitsMap });
//       counter++;
//     }
//   });

//   if (counter > 0) {
//     await batch.commit();
//   }

//   return await fetchAllTraits();
// }

// export async function renameTraitKey(oldKey: string, newKey: string): Promise<Record<string, TraitOption[]>> {
//   const db = getFirestoreDb();
//   const trimmedOld = oldKey.trim();
//   const trimmedNew = newKey.trim();

//   if (trimmedOld === trimmedNew) {
//     return await fetchAllTraits();
//   }

//   if (!db) {
//     console.error("Firestore is not initialized. Cannot rename trait key.");
//     return {};
//   }

//   // Live Firestore Rename
//   // 1. Read old trait values
//   const oldDocRef = db.collection("traits").doc(trimmedOld);
//   const oldDocSnap = await oldDocRef.get();
//   // No firebase-admin: .exists é uma propriedade booleana
//   if (oldDocSnap.exists) {
//     const values = oldDocSnap.data()?.values || [];
//     // Save to new key doc
//     await db.collection("traits").doc(trimmedNew).set({ values });
//     // Delete old key doc
//     await oldDocRef.delete();
//   }

//   // 2. Modify in characters
//   const snapshot = await db.collection("characters").get();
//   const batch = db.batch();
//   let counter = 0;

//   snapshot.forEach((docSnap) => {
//     const data = docSnap.data();
//     if (data.traits && data.traits[trimmedOld] !== undefined) {
//       const updatedTraitsMap = { ...data.traits };
//       updatedTraitsMap[trimmedNew] = updatedTraitsMap[trimmedOld];
//       delete updatedTraitsMap[trimmedOld];
//       batch.update(docSnap.ref, { traits: updatedTraitsMap });
//       counter++;
//     }
//   });

//   if (counter > 0) {
//     await batch.commit();
//   }

//   return await fetchAllTraits();
// }

// export async function updateTraitDefinition(
//   key: string,
//   newKey: string | null,
//   values: TraitOption[]
// ): Promise<Record<string, TraitOption[]>> {
//   const db = getFirestoreDb();
//   const trimmedKey = key.trim();
//   const trimmedNew = newKey ? newKey.trim() : trimmedKey;

//   // Sanitize values
//   const seenNames = new Set<string>();
//   const sanitizedValues: TraitOption[] = [];
//   for (const v of values) {
//     const name = String(v.name || "").trim();
//     if (name && !seenNames.has(name.toLowerCase())) {
//       seenNames.add(name.toLowerCase());
//       sanitizedValues.push({
//         name,
//         description: String(v.description || "").trim(),
//       });
//     }
//   }

//   const valueNames = sanitizedValues.map((v) => v.name);

//   if (!db) {
//     console.error("Firestore is not initialized. Cannot update trait definition.");
//     return {};
//   }

//   // Live Firestore Update
//   // 1. Write definitions
//   if (trimmedNew !== trimmedKey) {
//     await db.collection("traits").doc(trimmedNew).set({ values: sanitizedValues });
//     await db.collection("traits").doc(trimmedKey).delete();
//   } else {
//     await db.collection("traits").doc(trimmedKey).set({ values: sanitizedValues });
//   }

//   // 2. Refresh values in all characters and swap key if changed
//   const snapshot = await db.collection("characters").get();
//   const batch = db.batch();
//   let counter = 0;

//   snapshot.forEach((docSnap) => {
//     const data = docSnap.data();
//     if (data.traits) {
//       let charVal = data.traits[trimmedKey];
//       let hasKey = charVal !== undefined;

//       if (hasKey) {
//         let currentVals = Array.isArray(charVal)
//           ? charVal
//           : typeof charVal === "string"
//           ? charVal.split(",").map((v) => v.trim()).filter(Boolean)
//           : [];

//         const filteredVals = currentVals.filter((v: string) => valueNames.includes(v));
//         const updatedTraitsMap = { ...data.traits };

//         if (trimmedNew !== trimmedKey) {
//           updatedTraitsMap[trimmedNew] = filteredVals;
//           delete updatedTraitsMap[trimmedKey];
//         } else {
//           updatedTraitsMap[trimmedKey] = filteredVals;
//         }

//         batch.update(docSnap.ref, { traits: updatedTraitsMap });
//         counter++;
//       }
//     }
//   });

//   if (counter > 0) {
//     await batch.commit();
//   }

//   return await fetchAllTraits();
// }

// export async function addTraitValue(
//   key: string,
//   value: string,
//   description?: string
// ): Promise<Record<string, TraitOption[]>> {
//   const db = getFirestoreDb();
//   const trimmedKey = key.trim();
//   const trimmedValue = value.trim();
//   const desc = description ? description.trim() : "";

//   if (!db) {
//     console.error("Firestore is not initialized. Cannot add trait value.");
//     return {};
//   }

//   // Live Firestore Appending
//   const traitRef = db.collection("traits").doc(trimmedKey);
//   const traitSnap = await traitRef.get();
//   let values: TraitOption[] = [];

//   if (traitSnap.exists) {
//     const rawValues = traitSnap.data()?.values || [];
//     values = rawValues.map((v: any) => {
//       if (typeof v === "string") {
//         return { name: v, description: `${v} characteristic for ${trimmedKey}` };
//       }
//       return {
//         name: v.name || "",
//         description: v.description || "",
//       };
//     });
//   }

//   if (!values.some((v) => v.name.toLowerCase() === trimmedValue.toLowerCase())) {
//     values.push({ name: trimmedValue, description: desc });
//   }

//   await traitRef.set({ values });

//   return await fetchAllTraits();
// }