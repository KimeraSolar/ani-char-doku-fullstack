export interface CharacterItem {
  character: {
    mal_id: number;
    name: string;
    images: {
      jpg: {
        image_url: string;
      };
    };
  };
  role: string;
}

export interface CharacterImage {
  url: string;
  label: string;
}

export interface RegisteredCharacter {
  id: string;      // Server-side ID
  malId: number;   // MAL ID
  name: string;
  variationTitle?: string; // e.g. "Default", "Timeskip", "Bankai"
  imageUrl: string;
  images?: CharacterImage[];
  sources: string[];
  role: string;
  traits: Record<string, string | string[]>;
  nicknames?: string[];
  registeredAt?: string;
  updatedAt?: string;
}