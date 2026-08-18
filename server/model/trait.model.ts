import { ObjectId } from "mongodb";
import { Trait } from "@shared/types/index.js";
import { endSession, getDBCollection, startSession } from "./mongodb.model.js";
import { throwErrorResponse } from "@shared/utils/index.js";
import { deleteTraitFromCharacters, updateTraitOnCharacters } from "./character.model.js";

const TRAIT_COL_NAME = "traits";

export async function fetchTraitsCount(): Promise<number> {
  const traitsCollection = await getDBCollection(TRAIT_COL_NAME);
  if (!traitsCollection) {
    throw new Error("MongoDB error. Cannot fetch traits count.");
  }

  try {
    const docsCount = traitsCollection.countDocuments();
    return docsCount;
  } catch (err) {
    throwErrorResponse("[Traits Model] MongoDB read error for traits:", err);
    return -1;
  }
}

export async function fetchAllTraits(): Promise<Array<Trait>> {
  const traitsCollection = await getDBCollection(TRAIT_COL_NAME);
  if (!traitsCollection) {
    throw new Error("MongoDB error. Cannot fetch traits.");
  }

  try {
    const docs = await traitsCollection.find({}).sort("name").toArray();
    const traits: Array<Trait> = docs.map(doc => (
      {
        id: doc._id.toString(),
        name: doc.name,
        values: doc.values,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      }
    ));
    return traits;
  } catch (err) {
    throwErrorResponse("[Traits Model] MongoDB read error for traits:", err);
    return [];
  }
}

export async function createTrait(newTrait: Trait): Promise<Trait | null> {
  const traitsCollection = await getDBCollection(TRAIT_COL_NAME);
  if (!traitsCollection) {
    throw new Error("MongoDB error. Cannot create trait.");
  }

  try {
    const dateNow = new Date().toISOString();
    const traitToSave: Trait = {
      name: newTrait.name,
      values: newTrait.values,
      created_at: dateNow,
      updated_at: dateNow,
    }
    const savedTrait = await traitsCollection.insertOne(traitToSave);
    return {
      id: savedTrait.insertedId.toHexString(),
      ...traitToSave
    }
  } catch (err) {
    throwErrorResponse("[Traits Model] MongoDB write error for traits:", err);
    return null;
  }
}

export async function deleteTrait(trait: Trait): Promise<Trait | null> {
  const traitsCollection = await getDBCollection(TRAIT_COL_NAME);
  const newSession = await startSession();
  try {
    if (!traitsCollection) {
      throw new Error("MongoDB error. Cannot delete trait.");
    }

    if (!newSession) {
      throw new Error("MongoDB error. Failed to start session.");
    }

    const deletedTrait = await newSession.withTransaction(async () => {
      const result = await traitsCollection.findOneAndDelete({ _id: new ObjectId(trait.id) }, { session: newSession });
      if (result) {
        const deletedTrait: Trait = {
          id: result._id.toHexString(),
          name: result.name,
          values: result.values
        };

        const deletedFromCharacters = await deleteTraitFromCharacters(deletedTrait, newSession);
        if (!deletedFromCharacters) {
          throw new Error("Unable to delete trait from registered characters.");
        }

        return deletedTrait;
      }
      throw new Error("Unable to find and delete trait.");
    });
    return deletedTrait;
  } catch (err) {
    throwErrorResponse("[Traits Model] MongoDB write error for traits:", err);
    return null;
  } finally {
    if (newSession) endSession(newSession);
  }
}

export async function updateTrait(trait: Trait): Promise<Trait | null> {
  const traitsCollection = await getDBCollection(TRAIT_COL_NAME);
  const newSession = await startSession();
  try {
    if (!traitsCollection) {
      throw new Error("MongoDB error. Cannot update trait.");
    }

    if (!newSession) {
      throw new Error("MongoDB error. Failed to start session.");
    }

    const dateNow = new Date().toISOString();
    const traitToUpdate: Trait = {
      name: trait.name,
      values: trait.values,
      updated_at: dateNow,
    };
    const result = await traitsCollection.findOneAndUpdate({ _id: new ObjectId(trait.id) }, { $set: traitToUpdate }, { returnDocument: 'after', session: newSession,  });
    if (result) {
      const updatedTrait: Trait = {
        id: result._id.toHexString(),
        name: result.name,
        values: result.values
      };

      const updatedOnCharacters = await updateTraitOnCharacters(updatedTrait, newSession);
      if (!updatedOnCharacters) {
        throw new Error("Unable to update trait on registered characters.");
      }

      return updatedTrait;
    }
    throw new Error("Unable to find and update trait.");
  } catch (err) {
    throwErrorResponse("[Traits Model] MongoDB write error for traits:", err);
    return null;
  } finally {
    if (newSession) endSession(newSession);
  }
}