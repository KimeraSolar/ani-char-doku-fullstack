import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context";
import { Loading } from "../components/Loading";
import { animeSourceFormats } from "@shared/consts";
import { AnimeMediaType } from "@shared/types";
import { Database, Search } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

export default function AnimePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { animeCount, loadedData } = useApp();
    const [loading, setLoading] = useState<boolean>(true);
    const [mediaTypeFilter, setMediaTypeFilter] = useState<AnimeMediaType | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [showOnlyRegistered, setShowOnlyRegistered] = useState<boolean>(false);
    const debouncedSearch = useDebounce<string>(searchQuery.trim(), 1000);

    function selectMediaType(mediaType: AnimeMediaType) {
        if (mediaTypeFilter === mediaType) {
            setMediaTypeFilter(null);
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

    useEffect(() => {
        const page = searchParams.get("page");
        if (!page) {
            setSearchParams(searchParams => {
                searchParams.set("page", "1");
                return searchParams;
            });
        }
    }, [searchParams]);

    useEffect(() => {
        setTimeout(() => {
            updateSearchQuery(encodeURI(debouncedSearch));
        }, 1000);
    }, [debouncedSearch]);

    useEffect(() => {
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
        if (mediaTypeFilter !== null) {
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
        </div>
    );
}