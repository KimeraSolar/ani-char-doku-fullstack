import { AnimeRegistry } from "@shared/types";
import { Check, Database, Star } from "lucide-react";
import { motion } from "motion/react";

interface AnimeCatalogProps {
    animes: AnimeRegistry[];
    onViewAnime: (anime: AnimeRegistry) => void;
}

export default function AnimeCatalog({ animes, onViewAnime }: AnimeCatalogProps) {

    return (
        animes.map((anime) => {
            const { mal_id, image_url, title, score, id, type, registered_chars, source, year, genres } = anime;
            const dataColor = id ? "emerald" : "indigo"
            return (
            <motion.div
                key={`anime-mal-id-${mal_id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 shadow-xs hover:border-slate-750 transition-all duration-300 hover:shadow-black/40 hover:shadow-lg"
            >
                {/* Anime Thumbnail */}
                <div className="relative aspect-3/4 w-full overflow-hidden bg-slate-950/80">
                    <img
                        src={image_url}
                        alt={title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-103"
                    />
                    {/* Score badge */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        {score && (
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/80 px-2 py-1 text-[11px] font-bold text-white border border-slate-850 backdrop-blur-xs">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{score.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Registered badge */}
                    {id && (
                        <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/85 px-2 py-1 text-[11px] font-extrabold text-emerald-300 border border-emerald-900/60 backdrop-blur-xs shadow-md z-10">
                            <Database className="h-3 w-3 text-emerald-400 animate-pulse" />
                            <span>Added</span>
                        </div>
                    )}

                    <div className="absolute bottom-3 right-3">
                        {/* Format badge */}
                        {type && (
                            <div className="rounded-md bg-slate-950/90 border border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-350 shadow-xs backdrop-blur-xs">
                                {type}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Details */}
                <div className="flex flex-1 flex-col p-4 justify-between">
                    <div>
                        <h3 className="line-clamp-2 text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors font-sans" title={title}>
                            {title}
                        </h3>

                        <div className="mt-1 flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
                            <span>MAL ID: {mal_id}</span>
                        </div>

                        {/* Number of registered characters */}
                        {Number(registered_chars) > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-indigo-400">
                                <Check className="h-3.5 w-3.5" />
                                <span>{registered_chars} Registered</span>
                            </div>
                        )}
                    </div>

                    {/* Anime Data */}
                    <div>
                        <div className={`mt-2.5 space-y-1 rounded-xl bg-${dataColor}-950/15 border border-${dataColor}-900/30 p-2.5 text-[11px] text-${dataColor}-300 font-medium`}>
                            <div className={`grid grid-cols-1 gap-0.5 mt-1 text-${dataColor}-300/85`}>
                                {type && (
                                    <div><span className={`text-${dataColor}-500 font-semibold`}>Format:</span> {type}</div>
                                )}
                                {source && (
                                    <div><span className={`text-${dataColor}-500 font-semibold`}>Source:</span> {source}</div>
                                )}
                                {year && (
                                    <div><span className={`text-${dataColor}-500 font-semibold`}>Year:</span> {year}</div>
                                )}
                                {genres && genres.length > 0 && (
                                    <div className="truncate">
                                        <span className={`text-${dataColor}-500 font-semibold`}>Genres:</span> {genres.join(", ")}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* View Characters Action Button */}
                        <div className="mt-auto pt-4">
                            <button
                                onClick={() => { onViewAnime(anime) }}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-450 hover:text-white py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer"
                            >
                                View
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        )})
    );

}