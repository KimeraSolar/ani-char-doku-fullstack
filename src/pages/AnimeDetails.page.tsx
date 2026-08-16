import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { ErrorDisplay, Loading } from "../components";
import { AnimeRegistry } from "@shared/types";
import { AlertCircle, ArrowLeft, Check, CheckCircle, Database, Loader2, Star } from "lucide-react";
import { useApp } from "../context";

export default function AnimeDetailsPage() {
    const { animeId } = useParams();
    const navigate = useNavigate();
    const { animeCount, updateAnimeCount } = useApp();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);
    const [animeRegistry, setAnimeRegistry] = useState<AnimeRegistry>();
    const [saving, setSaving] = useState<boolean>(false);
    const [saveFeedback, setSaveFeedback] = useState<{ success: boolean } | null>(null);

    async function fetchAnimeDetails(animeId: string) {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch(`/api/anime/${animeId}`);
            const anime: AnimeRegistry = await res.json();
            setAnimeRegistry(anime);
        } catch (err) {
            console.error("Error fetching animes:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    function backToAnimesPage() {
        navigate("/browse-new?page=1");
    }

    function handleAddOrUpdateAnime(malId: number, id?: string) {
        if (id) {
            console.info("Skipping: Update Anime feature not implemented yet.");
        } else {
            addAnimeToDatabase(malId);
        }
    }

    async function addAnimeToDatabase(malId: number): Promise<boolean> {
        setSaving(true);
        let success = false;
        try {
            const res = await fetch("/api/anime", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(animeRegistry)
            });
            const json = await res.json();
            const savedAnime = json.savedAnime;
            success = json.success;
            
            setAnimeRegistry(savedAnime);
            updateAnimeCount(animeCount + 1);
            setSaveFeedback({ success });
        } catch (err) {
            console.error("Failed to add Anime to database:", err);
            setSaveFeedback({ success });
        } finally {
            setSaving(false);
            return success;
        }
    }

    useEffect(() => {
        if (animeId) {
            fetchAnimeDetails(animeId);
        }
    }, [animeId]);

    if (loading) {
        return (
            <Loading message="Loading Anime details, please wait..." />
        );
    } else if (error) {
        return (
            <ErrorDisplay title="Failed to load Anime details" />
        );
    } else if (animeRegistry) {
        const { mal_id, title, image_url, type, year, genres, score, source, id } = animeRegistry;

        return (
            <div className="space-y-6">
                {/* Back button */}
                <button
                    onClick={backToAnimesPage}
                    className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-400 transition-colors hover:text-indigo-400 cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Animes</span>
                </button>

                {/* Anime Header Data Section */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-850 bg-slate-900/40 p-5 lg:p-6 shadow-md">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="h-24 w-18 shrink-0 overflow-hidden rounded-xl bg-slate-950 shadow-md border border-slate-800">
                            <img
                                src={image_url}
                                alt={title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <div className="space-y-1.5 flex-1">
                            {score && <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600/15 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                                {score.toFixed(2)}
                            </div>}
                            <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl font-sans">
                                {title}
                            </h2>
                            <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                                <span>MAL ID: <strong className="text-indigo-400">{mal_id}</strong></span>
                                <span>•</span>
                                {type && <span>Format: <strong className="text-slate-300">{type}</strong></span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Anime Registry Data Section */}
                <div className="rounded-2xl border border-slate-850 bg-slate-900/30 p-5 lg:p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Database className="h-4.5 w-4.5 text-indigo-400" />
                                <h3 className="text-base font-extrabold text-slate-100 font-sans">
                                    {id ? "Added Anime data" : "Add Anime data"}
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400">
                                Anime data to be stored in the database.
                            </p>
                        </div>
                        {id && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                                <Check className="h-3 w-3" />
                                <span>Added</span>
                            </span>
                        )}
                    </div>

                    {/* Title field */}
                    <div className="space-y-1.5 relative">
                        <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">
                            Anime Title
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={title}
                                disabled
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-4 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 shadow-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-200"
                                required
                            />
                        </div>
                    </div>

                    {/* Media type, source and release year cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Media Type */}
                        {type && <div className="p-4 rounded-xl border transition-all duration-200 bg-slate-900/80 border-indigo-500/40">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Media Type</span>
                                    <span className="text-sm font-semibold text-slate-200">{type}</span>
                                </div>
                            </label>
                        </div>}

                        {/* Source */}
                        {source && <div className="p-4 rounded-xl border transition-all duration-200 bg-slate-900/80 border-indigo-500/40">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Source</span>
                                    <span className="text-sm font-semibold text-slate-200">{source}</span>
                                </div>
                            </label>
                        </div>}

                        {/* Year */}
                        {year && <div className="p-4 rounded-xl border transition-all duration-200 bg-slate-900/80 border-indigo-500/40">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Release Year</span>
                                    <span className="text-sm font-semibold text-slate-200">{year}</span>
                                </div>
                            </label>
                        </div>}
                    </div>

                    {/* Genres */}
                    {genres?.length && genres?.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                                {genres.map((genre) => {
                                    return (
                                        <button
                                            key={`genre-${genre}`}
                                            type="button"
                                            disabled
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer select-none bg-indigo-600/25 text-indigo-300 border-indigo-500/40 shadow-xs"
                                        >
                                            <span>{genre}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Submit Action Block */}
                    <div className="flex items-center gap-4 pt-2">
                        {!saving && <button
                            disabled={Boolean(id)}
                            onClick={() => { handleAddOrUpdateAnime(mal_id, id) }}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 shadow-sm transition-all duration-200 cursor-pointer"
                        >
                            {id ? "Added to Database" : "Add Anime"}
                        </button>}
                        {saving && <button
                            disabled
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 shadow-sm transition-all duration-200 cursor-pointer"
                        >
                            <div className="flex"><Loader2 className="h-4 w-4 animate-spin text-indigo-400 mr-2" /> Saving...</div>
                        </button>}
                        {saveFeedback !== null && saveFeedback.success && (
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                                <CheckCircle className="h-4 w-4" />
                                <span>{`Anime data ${id ? "updated" : "added"} successfully!`}</span>
                            </span>
                        )}
                        {saveFeedback !== null && !saveFeedback.success && (
                            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                <span>{`Failed to ${id ? "update" : "add"} Anime data.`}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}