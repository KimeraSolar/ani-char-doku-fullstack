import { AnimeMediaType } from "./types";

export const animeSourceFormats: {[key in AnimeMediaType]: string} = {
    "tv": "TV",
    "movie": "Movie",
    "ova": "OVA",
    "special": "Special",
};