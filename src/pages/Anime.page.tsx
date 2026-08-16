import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context";
import { animeSourceFormats } from "@shared/consts";
import { AnimeMediaType, AnimeRegistry, PaginatedResponse } from "@shared/types";
import { Database, Search } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { AnimeCatalog, ErrorDisplay, Pagination, Loading } from "../components";

const debounceTime = 450;

export default function AnimePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { animeCount, loadedData } = useApp();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [mediaTypeFilter, setMediaTypeFilter] = useState<AnimeMediaType | "">("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [showOnlyRegistered, setShowOnlyRegistered] = useState<boolean>(false);
    const [animePage, setAnimePage] = useState<PaginatedResponse<AnimeRegistry[]> | null>(null);
    const debouncedSearch = useDebounce<string>(searchQuery.trim(), debounceTime);
    const navigate = useNavigate();

    function selectMediaType(mediaType: AnimeMediaType) {
        if (mediaTypeFilter === mediaType) {
            setMediaTypeFilter("");
        } else {
            setMediaTypeFilter(mediaType);
        }
    }

    function isMediaTypeSelected(mediaType: AnimeMediaType): boolean {
        return mediaType === mediaTypeFilter;
    }

    function updateSearchQuery(query: string) {
        if (!query.trim()) {
            setSearchParams(searchParams => {
                searchParams.delete("query");
                return searchParams;
            });
        } else {
            setSearchParams(searchParams => {
                searchParams.set("query", query);
                return searchParams;
            });
        }
    }

    function toggleShowOnlyRegistered() {
        setShowOnlyRegistered(!showOnlyRegistered);
    }

    async function fetchMALAnime({ page, query, type }: { page: number, query: string | null, type: string | null }) {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch(`/api/mal/anime?page=${page}&type=${type || ""}&query=${query || ""}`);
            const paginatedAnime: PaginatedResponse<AnimeRegistry[]> = await res.json();
            setAnimePage(paginatedAnime);
        } catch (err) {
            console.error("Error fetching animes:", err);
            setError(true);
        } finally {
            setLoading(false);
        }

    }

    function navigateToAnimePage(anime: AnimeRegistry) {
        navigate(`${anime.mal_id}`);
    }

    useEffect(() => {
        const page = searchParams.get("page");
        const type = searchParams.get("mediaType");
        const query = searchParams.get("query");
        const dbOnly = searchParams.get("dbOnly");

        if (page) setCurrentPage(Number(page));
        if (type) setMediaTypeFilter(type as AnimeMediaType);
        if (query) setSearchQuery(query);
        if (dbOnly === "true") setShowOnlyRegistered(true);
    }, []);

    useEffect(() => {
        if (currentPage > 0) {
            setSearchParams(searchParams => {
                searchParams.set("page", String(currentPage));
                return searchParams;
            });
        } else {
            setSearchParams(searchParams => {
                searchParams.set("page", "1");
                return searchParams;
            });
        }
    }, [currentPage]);

    useEffect(() => {
        const page = searchParams.get("page");
        if (!page || !(/^\d+$/.test(page)) || Number(page) < 1) {
            setSearchParams(searchParams => {
                searchParams.set("page", "1");
                return searchParams;
            });
        } else {
            const page = Number(searchParams.get("page"));
            const type = searchParams.get("mediaType");
            const query = searchParams.get("query");

            const dbOnly = searchParams.get("dbOnly");
            if (dbOnly === "true") {
                console.warn("Skipping: Registered Anime search not implemented yet.");
                setAnimePage(null);
            } else {
                fetchMALAnime({ page, type, query });
            }
        }
    }, [searchParams]);

    useEffect(() => {
        setTimeout(() => {
            updateSearchQuery(encodeURI(debouncedSearch));
        }, debounceTime);
    }, [debouncedSearch]);

    useEffect(() => {
        searchParams.set("page", "1");
        if (showOnlyRegistered) {
            setSearchParams(searchParams => {
                searchParams.set("dbOnly", "true");
                return searchParams;
            });
        } else {
            setSearchParams(searchParams => {
                searchParams.delete("dbOnly");
                return searchParams;
            });
        }
    }, [showOnlyRegistered]);

    useEffect(() => {
        searchParams.set("page", "1");
        if (mediaTypeFilter !== "") {
            setSearchParams(searchParams => {
                searchParams.set("mediaType", mediaTypeFilter);
                return searchParams;
            });
        } else {
            setSearchParams(searchParams => {
                searchParams.delete("mediaType");
                return searchParams;
            });
        }
    }, [mediaTypeFilter]);

    if (!loadedData) return <Loading message="Loading data, please wait..." />;

    const dataLoadedOk = !loading && !error;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-white font-sans flex flex-wrap items-center gap-2">
                        <span>Browse Anime</span>
                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                            {animeCount} Registered
                        </span>
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Browse and manage anime, and register their characters.
                    </p>
                </div>

                {/* Media Type Selector Pills */}
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
                    {Object.keys(animeSourceFormats).map((key) => {
                        const mediaTypeKey = key as AnimeMediaType;
                        return (
                            <button
                                key={key}
                                onClick={() => selectMediaType(mediaTypeKey)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${isMediaTypeSelected(mediaTypeKey)
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                                    : "text-slate-400 hover:text-slate-200"
                                    }`}
                            >
                                {animeSourceFormats[mediaTypeKey]}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Search Input */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search anime by title (english or japanese)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-4 pl-10 text-sm placeholder-slate-550 text-slate-100 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                </div>

                {/* Show Only Registered Anime Toggle */}
                <button
                    onClick={toggleShowOnlyRegistered}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black tracking-wide transition-all duration-300 cursor-pointer select-none shrink-0 ${showOnlyRegistered
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                >
                    <Database className={`h-4 w-4 ${showOnlyRegistered ? "text-indigo-200 animate-pulse" : "text-slate-500"}`} />
                    <span>Show Only Registered</span>
                </button>
            </div>

            {/* Loading Skeleton Grid */}
            {loading && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {Array.from({ length: 15 }).map((_, idx) => (
                        <div
                            key={`skeleton-${idx}`}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-900 bg-slate-900/50 shadow-xs"
                        >
                            <div className="relative aspect-3/4 w-full animate-pulse bg-slate-800" />
                            <div className="flex flex-1 flex-col p-4 space-y-3">
                                <div className="h-4.5 w-3/4 animate-pulse rounded-lg bg-slate-800" />
                                <div className="h-3 w-1/2 animate-pulse rounded-lg bg-slate-800" />
                                <div className="mt-auto pt-3">
                                    <div className="h-9 w-full animate-pulse rounded-xl bg-slate-810" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {dataLoadedOk && !animePage?.data?.length && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-16 text-center">
                    <p className="text-slate-500 text-sm font-medium">
                        {"No animes found."}
                    </p>
                </div>
            )}

            {/* Anime Catalog Display */}
            {dataLoadedOk && animePage?.data && animePage?.data.length > 0 && (
                <>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                        <AnimeCatalog animes={animePage.data} onViewAnime={navigateToAnimePage} />
                    </div>
                    <Pagination
                        currentPage={animePage.pagination.current_page}
                        totalPages={animePage.pagination.last_visible_page}
                        totalItems={animePage.pagination.items.total}
                        itemsPerPage={animePage.pagination.items.per_page}
                        onGoToPage={(page) => setCurrentPage(page)}
                    />
                </>
            )}

            {/* Error State */}
            {!loading && error && (
                <ErrorDisplay title="Failed to browse Animes" />
            )}
        </div>
    );
}