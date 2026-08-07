import { Trait } from "@shared/types/trait.types.js";
import { createTrait, deleteTrait, fetchAllTraits, fetchTraitsCount } from "../model/index.js";
import { throwErrorResponse } from "@shared/utils";

export async function getRegisteredTraitsCount(): Promise<number | null> {
    try {
        const traitsCount = await fetchTraitsCount();
        if (traitsCount < 0) throw new Error("Failed to fetch traits count.");

        return traitsCount;
    } catch (err) {
        console.error("[Traits Controller] Error fetching registered traits count:", err);
        return null;
    }
}

export async function getRegisteredTraits(): Promise<Trait[] | null> {
    try {
        const traits = await fetchAllTraits();
        return traits;
    } catch (err) {
        console.error("[Traits Controller] Error fetch registered traits:", err);
        return null;
    }
}

export async function registerNewTrait(newTrait: Trait): Promise<Trait | null> {
    try {
        const savedTrait = await createTrait(newTrait);
        return savedTrait;
    } catch (err) {
        throwErrorResponse("[Traits Controller] Error registering new trait:", err);
        return null;
    }
}

export async function deleteRegisteredTrait(trait: Trait): Promise<Trait | null> {
    try {
        const deletedTrait = await deleteTrait(trait);
        return deletedTrait;
    } catch (err) {
        console.error("[Traits Controller] Error deleting trait:", err);
        return null;
    }
}