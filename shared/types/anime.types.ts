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
  type?: string;
  episodes?: number;
  source?: string;
  year?: number | null;
  studios?: { name: string }[];
  genres?: { name: string }[];
}