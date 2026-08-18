export interface TraitOption {
  name: string;
  description: string;
}

export interface TraitValue {
  key: string;
  name: string;
  description?: string;
}

export interface Trait {
  id?: string;
  name: string;
  values: Array<TraitValue>;
  created_at?: string;
  updated_at?: string;
}