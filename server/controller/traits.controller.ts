import { Trait } from "@shared/types/trait.types.js";
import { fetchAllTraits, fetchTraitsCount } from "../model/index.js";

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