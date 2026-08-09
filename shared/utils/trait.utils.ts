import { TraitValue } from "@shared/types";

export function traitValueKeyExists(key: string, values: TraitValue[]): boolean {
    const valueKey = values.find(value => value.key === key);
    if (valueKey) return true;
    return false;
}