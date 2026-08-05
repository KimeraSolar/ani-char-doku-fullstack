export interface TraitOption {
  name: string;
  description: string;
}

export interface TraitDefinition {
  label: string; // Friendly name, like "Special Ability"
  placeholder?: string;
}

export interface TraitValue {
  key: string;
  name: string;
  description?: string;
}

export interface Trait {
  id: string;
  name: string;
  values: Array<TraitValue>;
}