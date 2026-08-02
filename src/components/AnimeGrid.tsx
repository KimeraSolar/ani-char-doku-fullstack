import { useState, useEffect } from "react";
import { Anime, RegisteredCharacter } from "@shared/types/index";
import { ArrowLeft, ArrowRight, Star, Disc, Search, AlertCircle, Check, Database } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface AnimeGridProps {
  dbCharacters: RegisteredCharacter[];
  dbAnimes?: any[];
}

export default function AnimeGrid({ dbCharacters, dbAnimes = [] }: AnimeGridProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = searchParams.get("page");
  const searchParam = searchParams.get("search") || "";
  const onlyDb = searchParams.get("onlyDb") === "true";
  const currentPage = pageParam && !isNaN(parseInt(pageParam, 10)) ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  
  // Dynamic global search and format filter state
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [selectedFormat, setSelectedFormat] = useState<string>("All");

  // Keep input in sync if URL search param changes externally (e.g. back navigation)
  useEffect(() => {
    setSearchQuery(searchParam);
    setDebouncedSearch(searchParam);
  }, [searchParam]);

  // Debounce the search input to update the URL query params
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearch !== searchQuery) {
        setDebouncedSearch(searchQuery);
        const params = new URLSearchParams(searchParams);
        if (searchQuery.trim() !== "") {
          params.set("search", searchQuery);
        } else {
          params.delete("search");
        }
        params.set("page", "1"); // reset to page 1 on new search query
        setSearchParams(params);
      }
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery, debouncedSearch, searchParams, setSearchParams]);

  // Format change handler
  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    setSearchParams(params);
  };

  useEffect(() => {
    if (onlyDb) {
      setLoading(true);
      setError(null);
      
      const filtered = dbAnimes.filter((dbAnime) => {
        if (debouncedSearch.trim() !== "") {
          const searchLower = debouncedSearch.toLowerCase().trim();
          const titleMatch = dbAnime.title.toLowerCase().includes(searchLower);
          const altMatch = dbAnime.titles?.some((t: any) => t.title.toLowerCase().includes(searchLower)) || false;
          if (!titleMatch && !altMatch) return false;
        }
        if (selectedFormat !== "All") {
          if (dbAnime.type !== selectedFormat) return false;
        }
        return true;
      });

      const itemsPerPage = 20;
      const totalPages = Math.ceil(filtered.length / itemsPerPage);
      const sliced = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

      const mapped: Anime[] = sliced.map((dbAnime) => ({
        mal_id: dbAnime.malId,
        title: dbAnime.title,
        titles: dbAnime.titles || [{ type: "Default", title: dbAnime.title }],
        images: dbAnime.images || {
          jpg: {
            image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500",
            large_image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500"
          }
        },
        score: dbAnime.score || undefined,
        type: dbAnime.type || undefined,
        episodes: dbAnime.episodes || undefined,
        source: dbAnime.source || undefined,
        year: dbAnime.year || undefined,
        studios: dbAnime.studios?.map((s: string) => ({ name: s })) || undefined,
        genres: dbAnime.genres?.map((g: string) => ({ name: g })) || undefined
      }));

      setAnimes(mapped);
      setHasNextPage(currentPage < totalPages);
      setLoading(false);
      return;
    }

    let active = true;
    const fetchAnime = async () => {
      setLoading(true);
      setError(null);
      try {
        const trimmed = debouncedSearch.trim();
        let endpoint = `/api/proxy/top-anime?page=${currentPage}`;
        
        if (trimmed) {
          endpoint = `/api/proxy/search-anime?q=${encodeURIComponent(trimmed)}&page=${currentPage}&type=${selectedFormat}`;
        }
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to retrieve Tenrai data.");
        }
        const result = await response.json();
        
        if (active) {
          const rawData = result.data || [];
          const seen = new Set<number>();
          const uniqueData = rawData.filter((item: any) => {
            const malId = item.mal_id;
            if (malId === undefined || seen.has(malId)) {
              return false;
            }
            seen.add(malId);
            return true;
          });
          setAnimes(uniqueData);
          setHasNextPage(result.pagination?.has_next_page ?? false);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "An unexpected error occurred while fetching.");
          setLoading(false);
        }
      }
    };

    fetchAnime();

    return () => {
      active = false;
    };
  }, [currentPage, debouncedSearch, selectedFormat, onlyDb, dbAnimes]);

  // Handle local searching/filtering fallback or display direct server search results
  const filteredAnimes = onlyDb
    ? animes
    : (debouncedSearch.trim() !== ""
        ? animes
        : animes.filter((anime) => {
            const matchesFormat = selectedFormat === "All" || anime.type === selectedFormat;
            return matchesFormat;
          })
      );

  const formats = ["All", "TV", "Movie", "OVA", "Special"];

  return (
    <div className="space-y-6">
      {/* Intro section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white font-sans">
            Explore Top Anime
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse top-rated franchises and series to select and register their characters.
          </p>
        </div>

        {/* Format Selector Pills */}
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
          {formats.map((format) => (
            <button
              key={format}
              onClick={() => handleFormatChange(format)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                selectedFormat === format
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      {/* Database Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={onlyDb ? "Search inside your database registry..." : "Search any anime globally, e.g. Naruto, Bleach, Ghibli..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-4 pl-10 text-sm placeholder-slate-550 text-slate-100 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>

        {/* Show Only DB Anime Toggle */}
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            if (!onlyDb) {
              params.set("onlyDb", "true");
            } else {
              params.delete("onlyDb");
            }
            params.set("page", "1"); // Reset pagination on filter toggle
            setSearchParams(params);
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black tracking-wide transition-all duration-300 cursor-pointer select-none shrink-0 ${
            onlyDb
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <Database className={`h-4 w-4 ${onlyDb ? "text-indigo-200 animate-pulse" : "text-slate-500"}`} />
          <span>Show Only Registered ({dbAnimes.length})</span>
        </button>
      </div>

      {/* Loading Skeleton Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
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
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-200">Failed to Retrieve Content</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            {error || "We ran into issues loading top anime from MyAnimeList. Please retry."}
          </p>
          <button
            onClick={() => navigate(0)}
            className="mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      ) : filteredAnimes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-16 text-center">
          <p className="text-slate-500 text-sm font-medium">
            {onlyDb
              ? (dbAnimes.length === 0
                  ? "Your database registry is currently empty. Browse globally and register some anime!"
                  : `No registered anime found matching "${searchQuery}" for the selected format.`)
              : `No anime found matching "${searchQuery}" in our global search. Feel free to search another term or clear the filter.`
            }
          </p>
        </div>
      ) : (
        <>
          {/* Real Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filteredAnimes.map((anime, index) => {
              // Count registered characters from this anime
              const registeredCount = dbCharacters.filter((char) => {
                if (!char.sources) return false;
                return char.sources.some((src) => {
                  const normSrc = src.toLowerCase().trim();
                  const normTitle = anime.title.toLowerCase().trim();
                  if (normSrc === normTitle) return true;
                  if (anime.titles && anime.titles.some((t) => t.title.toLowerCase().trim() === normSrc)) return true;
                  return false;
                });
              }).length;

              const registeredAnime = dbAnimes.find((a) => a.malId === anime.mal_id);
              const isAnimeInDb = !!registeredAnime;

              return (
                <motion.div
                  key={anime.mal_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.4) }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 shadow-xs hover:border-slate-750 transition-all duration-300 hover:shadow-black/40 hover:shadow-lg"
                >
                  {/* Thumbnail Column image */}
                  <div className="relative aspect-3/4 w-full overflow-hidden bg-slate-950/80">
                    <img
                      src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                      alt={anime.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-103"
                    />
                    {/* Absolute BADGES */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      {/* Score badge */}
                      {anime.score && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/80 px-2 py-1 text-[11px] font-bold text-white border border-slate-850 backdrop-blur-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{anime.score.toFixed(2)}</span>
                        </div>
                      )}
                      {/* Registered badge */}
                      {registeredCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-950/85 px-2 py-1 text-[11px] font-extrabold text-indigo-300 border border-indigo-900/60 backdrop-blur-xs shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          <span>{registeredCount} {registeredCount === 1 ? "char" : "chars"}</span>
                        </div>
                      )}
                    </div>

                    {isAnimeInDb && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/85 px-2 py-1 text-[11px] font-extrabold text-emerald-300 border border-emerald-900/60 backdrop-blur-xs shadow-md z-10">
                        <Database className="h-3 w-3 text-emerald-400 animate-pulse" />
                        <span>In DB</span>
                      </div>
                    )}
                    
                    <div className="absolute bottom-3 right-3">
                      {/* Format badge */}
                      {anime.type && (
                        <div className="rounded-md bg-slate-950/90 border border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-350 shadow-xs backdrop-blur-xs">
                          {anime.type}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Details */}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors font-sans" title={anime.title}>
                      {anime.title}
                    </h3>
                    
                    <div className="mt-1 flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Disc className="h-3 w-3 text-slate-500" />
                        {anime.episodes ? `${anime.episodes} eps` : "Ongoing"}
                      </span>
                      <span>•</span>
                      <span>ID: {anime.mal_id}</span>
                    </div>

                    {registeredCount > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-indigo-400">
                        <Check className="h-3.5 w-3.5" />
                        <span>{registeredCount} Registered</span>
                      </div>
                    )}

                    {isAnimeInDb && (
                      <div className="mt-2.5 space-y-1 rounded-xl bg-emerald-950/15 border border-emerald-900/30 p-2.5 text-[11px] text-emerald-300 font-medium">
                        <div className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                          <Database className="h-3 w-3" />
                          <span>Database Traits</span>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5 mt-1 text-emerald-300/85">
                          {registeredAnime.type && (
                            <div><span className="text-emerald-500 font-semibold">Format:</span> {registeredAnime.type}</div>
                          )}
                          {registeredAnime.source && (
                            <div><span className="text-emerald-500 font-semibold">Source:</span> {registeredAnime.source}</div>
                          )}
                          {registeredAnime.year && (
                            <div><span className="text-emerald-500 font-semibold">Year:</span> {registeredAnime.year}</div>
                          )}
                          {registeredAnime.studios && registeredAnime.studios.length > 0 && (
                            <div className="truncate">
                              <span className="text-emerald-500 font-semibold">Studios:</span> {registeredAnime.studios.join(", ")}
                            </div>
                          )}
                          {registeredAnime.genres && registeredAnime.genres.length > 0 && (
                            <div className="truncate">
                              <span className="text-emerald-500 font-semibold">Genres:</span> {registeredAnime.genres.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* View Characters Action Button */}
                    <div className="mt-auto pt-4">
                      <button
                        onClick={() => navigate(`/anime/${anime.mal_id}`, { state: { anime } })}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-450 hover:text-white py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer"
                      >
                        View Characters
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Elegant Pagination Bar */}
          <div className="flex h-16 items-center justify-between border-t border-slate-850 pt-4">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("page", String(Math.max(1, currentPage - 1)));
                setSearchParams(params);
              }}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-900 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <span className="text-sm font-bold text-slate-300">
              Page {currentPage}
            </span>

            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("page", String(currentPage + 1));
                setSearchParams(params);
              }}
              disabled={!hasNextPage}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-900 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
