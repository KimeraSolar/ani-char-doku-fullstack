import { Trait } from "@shared/types/trait.types.js";
import { createTrait, deleteTrait, fetchAllTraits, fetchTraitsCount, updateTrait } from "../model/index.js";
import { throwErrorResponse } from "@shared/utils";

export async function getRegisteredTraitsCount(): Promise<number | null> {
    try {
        const traitsCount = await fetchTraitsCount();
        return traitsCount;
    } catch (err) {
        throwErrorResponse("[Traits Controller] Error fetching registered traits count:", err);
        return null;
    }
}

export async function getRegisteredTraits(): Promise<Trait[]> {
    try {
        const traits = await fetchAllTraits();
        return traits;
    } catch (err) {
        throwErrorResponse("[Traits Controller] Error fetch registered traits:", err);
        return [];
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
        // TODO: Delete trait from registered characters as well
        const deletedTrait = await deleteTrait(trait);
        return deletedTrait;
    } catch (err) {
        throwErrorResponse("[Traits Controller] Error deleting trait:", err);
        return null;
    }
}

export async function updateRegisteredTrait(trait: Trait): Promise<Trait | null> {
    try {
        // TODO: Update trait in registered characters as well
        const updatedTrait = await updateTrait(trait);
        return updatedTrait;
    } catch (err) {
        throwErrorResponse("[Traits Controller] Error updating trait:", err);
        return null;
    }
}