import { TraitOption } from "@shared/types/index.js";
import { getDb } from "./mongo.model.js";

export async function fetchAllTraits(): Promise<Record<string, TraitOption[]>> {
  const db = await getDb();
  if (!db) {
    console.log("MongoDB is not initialized. Cannot fetch traits.");
    return {};
  }

  try {
    const docs = await db.collection("traits").find({}).toArray();
    const traits: Record<string, TraitOption[]> = {};
    docs.forEach((doc: any) => {
      const rawValues = doc.values || [];
      traits[String(doc._id)] = rawValues.map((v: any) => {
        return {
          name: v.name || "",
          description: v.description || "",
        };
      });
    });
    return traits;
  } catch (err) {
    console.error("MongoDB read error for traits:", err);
    return {};
  }
}

export async function saveTraitsRecord(updatedTraits: Record<string, TraitOption[]>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("MongoDB is not initialized. Cannot save traits record.");
    return;
  }

  // Get current traits in MongoDB
  const existingDocs = await db.collection("traits").find({}, { projection: { _id: 1 } }).toArray();
  const existingKeys: string[] = existingDocs.map((d: any) => String(d._id));

  const bulkOps: any[] = [];

  // Set updated traits
  for (const [key, values] of Object.entries(updatedTraits)) {
    bulkOps.push({
      updateOne: {
        filter: { _id: key as any },
        update: { $set: { values } },
        upsert: true,
      },
    });
  }

  // Delete decommissioned traits
  for (const oldKey of existingKeys) {
    if (updatedTraits[oldKey] === undefined) {
      bulkOps.push({ deleteOne: { filter: { _id: oldKey as any } } });
    }
  }

  if (bulkOps.length > 0) {
    await db.collection("traits").bulkWrite(bulkOps);
  }
}

export async function removeTraitAndCleanCharacters(key: string): Promise<Record<string, TraitOption[]>> {
  const db = await getDb();
  const trimmedKey = key.trim();

  if (!db) {
    console.error("MongoDB is not initialized. Cannot remove trait and clean characters.");
    return {};
  }

  // Live MongoDB Delete & Clean Character records
  // 1. Delete trait doc
  await db.collection("traits").deleteOne({ _id: trimmedKey as any });

  // 2. Fetch characters and update
  const docs = await db.collection("characters").find({}).toArray();
  const bulkOps: any[] = [];

  docs.forEach((doc: any) => {
    if (doc.traits && doc.traits[trimmedKey] !== undefined) {
      const updatedTraitsMap = { ...doc.traits };
      delete updatedTraitsMap[trimmedKey];
      bulkOps.push({
        updateOne: { filter: { _id: doc._id }, update: { $set: { traits: updatedTraitsMap } } },
      });
    }
  });

  if (bulkOps.length > 0) {
    await db.collection("characters").bulkWrite(bulkOps);
  }

  return await fetchAllTraits();
}

export async function renameTraitKey(oldKey: string, newKey: string): Promise<Record<string, TraitOption[]>> {
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

  // Live MongoDB Rename
  // 1. Read old trait values
  const oldDoc = await db.collection("traits").findOne({ _id: trimmedOld as any });
  if (oldDoc) {
    const values = oldDoc.values || [];
    // Save to new key doc
    await db.collection("traits").replaceOne({ _id: trimmedNew as any }, { values }, { upsert: true });
    // Delete old key doc
    await db.collection("traits").deleteOne({ _id: trimmedOld as any });
  }

  // 2. Modify in characters
  const docs = await db.collection("characters").find({}).toArray();
  const bulkOps: any[] = [];

  docs.forEach((doc: any) => {
    if (doc.traits && doc.traits[trimmedOld] !== undefined) {
      const updatedTraitsMap = { ...doc.traits };
      updatedTraitsMap[trimmedNew] = updatedTraitsMap[trimmedOld];
      delete updatedTraitsMap[trimmedOld];
      bulkOps.push({
        updateOne: { filter: { _id: doc._id }, update: { $set: { traits: updatedTraitsMap } } },
      });
    }
  });

  if (bulkOps.length > 0) {
    await db.collection("characters").bulkWrite(bulkOps);
  }

  return await fetchAllTraits();
}

export async function updateTraitDefinition(
  key: string,
  newKey: string | null,
  values: TraitOption[]
): Promise<Record<string, TraitOption[]>> {
  const db = await getDb();
  const trimmedKey = key.trim();
  const trimmedNew = newKey ? newKey.trim() : trimmedKey;

  // Sanitize values
  const seenNames = new Set<string>();
  const sanitizedValues: TraitOption[] = [];
  for (const v of values) {
    const name = String(v.name || "").trim();
    if (name && !seenNames.has(name.toLowerCase())) {
      seenNames.add(name.toLowerCase());
      sanitizedValues.push({
        name,
        description: String(v.description || "").trim(),
      });
    }
  }

  const valueNames = sanitizedValues.map((v) => v.name);

  if (!db) {
    console.error("MongoDB is not initialized. Cannot update trait definition.");
    return {};
  }

  // Live MongoDB Update
  // 1. Write definitions
  if (trimmedNew !== trimmedKey) {
    await db.collection("traits").replaceOne({ _id: trimmedNew as any }, { values: sanitizedValues }, { upsert: true });
    await db.collection("traits").deleteOne({ _id: trimmedKey as any });
  } else {
    await db.collection("traits").replaceOne({ _id: trimmedKey as any }, { values: sanitizedValues }, { upsert: true });
  }

  // 2. Refresh values in all characters and swap key if changed
  const docs = await db.collection("characters").find({}).toArray();
  const bulkOps: any[] = [];

  docs.forEach((doc: any) => {
    if (doc.traits) {
      let charVal = doc.traits[trimmedKey];
      let hasKey = charVal !== undefined;

      if (hasKey) {
        let currentVals = Array.isArray(charVal)
          ? charVal
          : typeof charVal === "string"
          ? charVal.split(",").map((v) => v.trim()).filter(Boolean)
          : [];

        const filteredVals = currentVals.filter((v: string) => valueNames.includes(v));
        const updatedTraitsMap = { ...doc.traits };

        if (trimmedNew !== trimmedKey) {
          updatedTraitsMap[trimmedNew] = filteredVals;
          delete updatedTraitsMap[trimmedKey];
        } else {
          updatedTraitsMap[trimmedKey] = filteredVals;
        }

        bulkOps.push({
          updateOne: { filter: { _id: doc._id }, update: { $set: { traits: updatedTraitsMap } } },
        });
      }
    }
  });

  if (bulkOps.length > 0) {
    await db.collection("characters").bulkWrite(bulkOps);
  }

  return await fetchAllTraits();
}

export async function addTraitValue(
  key: string,
  value: string,
  description?: string
): Promise<Record<string, TraitOption[]>> {
  const db = await getDb();
  const trimmedKey = key.trim();
  const trimmedValue = value.trim();
  const desc = description ? description.trim() : "";

  if (!db) {
    console.error("MongoDB is not initialized. Cannot add trait value.");
    return {};
  }

  // Live MongoDB Appending
  const traitDoc = await db.collection("traits").findOne({ _id: trimmedKey as any });
  let values: TraitOption[] = [];

  if (traitDoc) {
    const rawValues = traitDoc.values || [];
    values = rawValues.map((v: any) => {
      if (typeof v === "string") {
        return { name: v, description: `${v} characteristic for ${trimmedKey}` };
      }
      return {
        name: v.name || "",
        description: v.description || "",
      };
    });
  }

  if (!values.some((v) => v.name.toLowerCase() === trimmedValue.toLowerCase())) {
    values.push({ name: trimmedValue, description: desc });
  }

  await db.collection("traits").replaceOne({ _id: trimmedKey as any }, { values }, { upsert: true });

  return await fetchAllTraits();
}