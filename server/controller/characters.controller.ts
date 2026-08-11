import { throwErrorResponse } from "@shared/utils";

export async function getRegisteredCharactersCount(): Promise<number | null> {
    try {
        console.warn("Skipping: getRegisteredCharactersCount not implemented yet.");
        const charactersCount = 3;
        return charactersCount;
    } catch (err) {
        throwErrorResponse("[Characters Controller] Error fetching registered characters count:", err);
        return null;
    }
}