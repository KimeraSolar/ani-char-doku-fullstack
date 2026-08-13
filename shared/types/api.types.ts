export type PaginatedResponse<T> = {
    pagination: {
        last_visible_page: number;
        current_page: number;
        items: {
            count: number;
            total: number;
            per_page: number;
        }
    };
    data: T;
};

export type MALAnimeResponse = {
    genres: Array<{ name: string }>;
    images: {
        jpg: {
            image_url: string;
        }
    };
    mal_id: number;
    score: number;
    source: string;
    title: string;
    title_english?: string;
    type: string;
    url: string;
    year: number;
}