
export type AnimeMediaType = "tv" | "movie" | "ova" | "special";

// New Anime Interface
export interface AnimeRegistry {
  id?: number;
  mal_id: number;
  title: string;
  image_url: string;
  score?: number;
  type: AnimeMediaType;
  source?: string;
  year: number | null;
  genres?: string[];
  registered_chars?: number;
}


// Old Anime Interface
export interface AnimeTitle {
  type: string;
  title: string;
}
export interface Anime {
  mal_id: number;
  title: string;
  titles?: AnimeTitle[];
  images: {
    jpg: {
      image_url: string;
      large_image_url?: string;
    };
  };
  score?: number;
  synopsis?: string;
  type?: AnimeMediaType;
  episodes?: number;
  source?: string;
  year?: number | null;
  studios?: { name: string }[];
  genres?: { name: string }[];
}