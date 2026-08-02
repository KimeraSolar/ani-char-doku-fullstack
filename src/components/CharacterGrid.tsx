import React, { useState, useEffect, useRef, useMemo } from "react";
import { Anime, CharacterItem, RegisteredCharacter } from "@shared/types/index";
import { ArrowLeft, AlertCircle, ChevronLeft, ChevronRight, CheckCircle, Pencil, Database, Check, ChevronDown, Zap, Sliders, X, ZoomIn, FileImage, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";

interface CharacterGridProps {
  dbCharacters: RegisteredCharacter[];
  dbAnimes?: any[];
  onRefresh?: () => void;
}

export default function CharacterGrid({ dbCharacters, dbAnimes = [], onRefresh }: CharacterGridProps) {
  const navigate = useNavigate();
  const { animeId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = searchParams.get("page");
  const searchParam = searchParams.get("search") || "";
  const currentPage = pageParam && !isNaN(parseInt(pageParam, 10)) ? Math.max(1, parseInt(pageParam, 10)) : 1;
  const itemsPerPage = 25;

  const [anime, setAnime] = useState<Anime | null>(location.state?.anime || null);
  const [animeLoading, setAnimeLoading] = useState(!anime);
  const [apiCharacters, setApiCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick add state
  const [quickAddingId, setQuickAddingId] = useState<number | null>(null);
  const [quickAddFeedback, setQuickAddFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Zoom character image modal state
  const [zoomedCharacter, setZoomedCharacter] = useState<{
    characterName: string;
    images: { url: string; label: string }[];
    activeIdx: number;
  } | null>(null);

  const openZoomModal = (char: CharacterItem, dbChar?: RegisteredCharacter) => {
    const imagesList: { url: string; label: string }[] = [];

    // If registered character exists in DB and has images array, include those
    if (dbChar && Array.isArray(dbChar.images) && dbChar.images.length > 0) {
      dbChar.images.forEach((img, idx) => {
        if (img && img.url) {
          imagesList.push({
            url: img.url,
            label: img.label || (idx === 0 ? "Profile Image" : `Image ${idx + 1}`),
          });
        }
      });
    }

    // Include the main API image if present and not already added
    const charImg = char.character?.images?.jpg?.image_url;
    if (charImg && !imagesList.some(i => i.url === charImg)) {
      imagesList.unshift({
        url: charImg,
        label: "Default Image",
      });
    }

    if (imagesList.length === 0) return;

    setZoomedCharacter({
      characterName: char.character?.name || dbChar?.name || "Character Image",
      images: imagesList,
      activeIdx: 0,
    });
  };

  // Search filter
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [roleFilter, setRoleFilter] = useState<string>("All");

  const registeredAnime = dbAnimes?.find(a => a.malId === Number(animeId));
  const isRegistered = !!registeredAnime;

  const [formTitle, setFormTitle] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get unique title options from API/details
  const getTitleOptions = (): { title: string; type: string }[] => {
    if (!anime) return [];
    const options: { title: string; type: string }[] = [];
    
    // Add default title first if it exists
    if (anime.title) {
      options.push({ title: anime.title, type: "Default" });
    }
    
    // Add other titles if they exist
    if (anime.titles && Array.isArray(anime.titles)) {
      anime.titles.forEach((t) => {
        if (t && t.title && !options.some(o => o.title.toLowerCase() === t.title.toLowerCase())) {
          options.push({ title: t.title, type: t.type || "Alternative" });
        }
      });
    }
    
    return options;
  };

  const selectTitleOption = (title: string) => {
    setFormTitle(title);
    setDropdownOpen(false);
  };
  const [includeType, setIncludeType] = useState(true);
  const [typeValue, setTypeValue] = useState("");
  const [includeSource, setIncludeSource] = useState(true);
  const [sourceValue, setSourceValue] = useState("");
  const [includeYear, setIncludeYear] = useState(true);
  const [yearValue, setYearValue] = useState<number | null>(null);
  const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [savingAnime, setSavingAnime] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (anime) {
      if (isRegistered && registeredAnime) {
        setFormTitle(registeredAnime.title || anime.title || "");
        setIncludeType(registeredAnime.type !== undefined && registeredAnime.type !== null);
        setTypeValue(registeredAnime.type || anime.type || "");
        setIncludeSource(registeredAnime.source !== undefined && registeredAnime.source !== null);
        setSourceValue(registeredAnime.source || anime.source || "");
        setIncludeYear(registeredAnime.year !== undefined && registeredAnime.year !== null);
        setYearValue(registeredAnime.year !== undefined && registeredAnime.year !== null ? registeredAnime.year : (anime.year || null));
        setSelectedStudios(registeredAnime.studios || []);
        setSelectedGenres(registeredAnime.genres || []);
      } else {
        setFormTitle(anime.title || "");
        setIncludeType(!!anime.type);
        setTypeValue(anime.type || "");
        setIncludeSource(!!anime.source);
        setSourceValue(anime.source || "");
        setIncludeYear(!!anime.year);
        setYearValue(anime.year || null);
        
        const apiStudios = anime.studios?.map((s: any) => s.name) || [];
        setSelectedStudios(apiStudios);
        
        const apiGenres = anime.genres?.map((g: any) => g.name) || [];
        setSelectedGenres(apiGenres);
      }
    }
  }, [anime, isRegistered, registeredAnime]);

  const handleSaveAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anime) return;
    setSavingAnime(true);
    setSaveSuccess(false);
    setSaveError(null);

    const payload = {
      malId: anime.mal_id,
      title: formTitle || anime.title,
      type: includeType ? typeValue : null,
      source: includeSource ? sourceValue : null,
      year: includeYear ? yearValue : null,
      studios: selectedStudios,
      genres: selectedGenres,
      images: anime.images || null,
      episodes: anime.episodes || null,
      score: anime.score || null,
      titles: anime.titles || null
    };

    try {
      const response = await fetch("/api/database/animes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save anime registry.");
      }

      setSaveSuccess(true);
      if (onRefresh) {
        onRefresh();
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save anime registry error:", err);
      setSaveError(err.message || "An error occurred.");
    } finally {
      setSavingAnime(false);
    }
  };

  // Keep state in sync if URL search param changes
  useEffect(() => {
    setSearchQuery(searchParam);
  }, [searchParam]);

  // Fetch anime details if we don't have full details (like studios or genres) or if we want to refresh
  useEffect(() => {
    let active = true;
    const fetchAnimeDetails = async () => {
      // If we already have studios/genres, we probably don't need to fetch
      if (anime && anime.studios && anime.genres) return;
      
      setAnimeLoading(true);
      try {
        const response = await fetch(`/api/proxy/anime/${animeId}`);
        if (response.ok) {
          const result = await response.json();
          if (active && result.data) {
            setAnime(result.data);
          }
        } else {
          console.warn(`Anime Jikan/Tenrai API returned non-200: ${response.status}`);
          // If the API failed (e.g. 404 for custom anime), fallback to registered dbAnime
          if (active && isRegistered && registeredAnime) {
            // Map registeredAnime properties to match Anime Jikan structure
            const fallbackAnime: Anime = {
              mal_id: registeredAnime.malId,
              title: registeredAnime.title,
              type: registeredAnime.type || "TV",
              source: registeredAnime.source || "Unknown",
              year: registeredAnime.year || null,
              studios: registeredAnime.studios?.map((s: string) => ({ name: s })) || [],
              genres: registeredAnime.genres?.map((g: string) => ({ name: g })) || [],
              images: registeredAnime.images || {
                jpg: {
                  image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500",
                  large_image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500"
                }
              },
              episodes: registeredAnime.episodes || null,
              score: registeredAnime.score || null,
              titles: registeredAnime.titles || [{ type: "Default", title: registeredAnime.title }]
            };
            setAnime(fallbackAnime);
          }
        }
      } catch (err: any) {
        console.error("Error fetching anime details:", err);
      } finally {
        if (active) {
          setAnimeLoading(false);
        }
      }
    };
    
    fetchAnimeDetails();
    return () => {
      active = false;
    };
  }, [animeId, isRegistered, registeredAnime]);

  useEffect(() => {
    let active = true;
    const fetchAnimeCharacters = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/proxy/anime-characters/${animeId}`);
        if (response.ok) {
          const result = await response.json();
          if (active) {
            setApiCharacters(result.data || []);
          }
        } else {
          console.warn(`Tenrai anime-characters API returned non-200: ${response.status}`);
          if (active) {
            setApiCharacters([]);
          }
        }
      } catch (apiErr: any) {
        console.error("Failed to fetch characters from API:", apiErr);
        if (active) {
          setError(apiErr.message || "Failed to fetch characters from API.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (animeId) {
      fetchAnimeCharacters();
    }

    return () => {
      active = false;
    };
  }, [animeId]);

  // Registered characters specifically associated with this anime
  const dbCharsForAnime = useMemo(() => {
    const animeTitleLower = anime?.title?.toLowerCase() || registeredAnime?.title?.toLowerCase();
    return dbCharacters.filter(c => {
      if (Array.isArray((c as any).animeSources)) {
        if ((c as any).animeSources.some((as: any) => Number(as.malId) === Number(animeId))) return true;
      }
      if (Array.isArray(c.sources)) {
        return c.sources.some(s => {
          const mId = typeof s === "number" ? s : Number(s);
          if (!isNaN(mId) && mId === Number(animeId)) return true;
          if (typeof s === "string" && animeTitleLower && s.toLowerCase().trim() === animeTitleLower) return true;
          return false;
        });
      }
      return false;
    });
  }, [dbCharacters, anime, registeredAnime, animeId]);

  // Compute merged character list from API characters and local DB characters
  const characters = useMemo(() => {
    // Map registered characters to the API format so they can be merged or displayed
    const mappedDbChars: CharacterItem[] = dbCharsForAnime.map(c => ({
      character: {
        mal_id: c.malId || 0,
        name: c.name,
        images: {
          jpg: {
            image_url: c.imageUrl || (c.images?.[0]?.url) || "https://cdn.myanimelist.net/images/characters/failed_to_load.jpg"
          }
        }
      },
      role: c.role || "Supporting"
    }));

    // Merge API characters and DB characters
    // Keep the natural order of apiCharacters first so added characters do not jump to the front
    const merged: CharacterItem[] = [...apiCharacters];

    // Append any DB characters that are not present in apiCharacters (e.g. custom characters)
    mappedDbChars.forEach(dbChar => {
      if (!dbChar.character) return;
      const dbMalId = dbChar.character.mal_id ? Number(dbChar.character.mal_id) : 0;
      const dbName = dbChar.character.name.toLowerCase().trim();

      const existsInApi = merged.some(m => {
        const mMalId = m.character?.mal_id ? Number(m.character.mal_id) : 0;
        const mName = m.character?.name?.toLowerCase().trim();
        if (dbMalId > 0 && mMalId > 0) {
          return dbMalId === mMalId;
        }
        if (dbName && mName && dbName === mName) return true;
        return false;
      });

      if (!existsInApi) {
        merged.push(dbChar);
      }
    });

    // De-duplicate any multiple entries in merged
    const finalUnique: CharacterItem[] = [];
    const seenIds = new Set<number>();
    const seenNames = new Set<string>();

    merged.forEach(item => {
      const malId = item.character?.mal_id;
      const name = item.character?.name?.toLowerCase().trim();

      if (malId && malId !== 0) {
        if (!seenIds.has(malId)) {
          seenIds.add(malId);
          finalUnique.push(item);
        }
      } else if (name) {
        if (!seenNames.has(name)) {
          seenNames.add(name);
          finalUnique.push(item);
        }
      } else {
        finalUnique.push(item);
      }
    });

    return finalUnique;
  }, [apiCharacters, dbCharsForAnime]);

  // Find matching registered database character for a given card item
  const findMatchingDbChar = (char: CharacterItem) => {
    const targetMalId = char.character?.mal_id ? Number(char.character.mal_id) : 0;
    const targetName = char.character?.name ? char.character.name.toLowerCase().trim() : "";

    // 1. If target character has a valid non-zero MAL ID, check if exact MAL ID exists in dbCharacters
    if (targetMalId > 0) {
      const exactMalMatch = dbCharacters.find(c => c.malId && Number(c.malId) === targetMalId);
      if (exactMalMatch) return exactMalMatch;
    }

    // 2. Otherwise (or for custom characters), check dbCharsForAnime for name match ONLY if c has no conflicting MAL ID
    if (targetName) {
      const nameMatch = dbCharsForAnime.find(c => {
        const cMalId = c.malId ? Number(c.malId) : 0;
        // Do not match by name if both have different non-zero MAL IDs (they are distinct characters)
        if (cMalId > 0 && targetMalId > 0 && cMalId !== targetMalId) {
          return false;
        }
        return c.name && c.name.toLowerCase().trim() === targetName;
      });
      if (nameMatch) return nameMatch;
    }

    return undefined;
  };

  // Quick Add Character Handler
  const handleQuickAdd = async (char: CharacterItem) => {
    if (!char.character) return;
    const malId = char.character.mal_id;
    setQuickAddingId(malId);
    setQuickAddFeedback(null);

    const animeTitle = anime?.title || registeredAnime?.title || "";
    const animeSourcesList: any[] = [];

    if (anime) {
      animeSourcesList.push({
        malId: Number(anime.mal_id),
        title: anime.title,
        titles: anime.titles || null,
        type: anime.type || null,
        source: anime.source || null,
        year: anime.year || null,
        studios: anime.studios?.map((s: any) => (typeof s === "string" ? s : s.name)) || null,
        genres: anime.genres?.map((g: any) => (typeof g === "string" ? g : g.name)) || null,
        images: anime.images || null,
        episodes: anime.episodes || null,
        score: anime.score || null,
      });
    } else if (registeredAnime) {
      animeSourcesList.push(registeredAnime);
    }

    const imageUrl = char.character.images?.jpg?.image_url || "";

    const payload = {
      malId: malId,
      name: char.character.name,
      variationTitle: "Default",
      imageUrl: imageUrl,
      images: imageUrl ? [{ url: imageUrl, label: "Default Profile" }] : [],
      sources: animeTitle ? [animeTitle] : [],
      role: char.role || "Supporting",
      traits: {},
      nicknames: [],
      animeSources: animeSourcesList,
    };

    try {
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to quick add character.");
      }

      setQuickAddFeedback({
        type: "success",
        message: `"${char.character.name}" quick-added with default info!`,
      });

      if (onRefresh) {
        onRefresh();
      }

      setTimeout(() => {
        setQuickAddFeedback(null);
      }, 4000);
    } catch (err: any) {
      console.error("Quick add character error:", err);
      setQuickAddFeedback({
        type: "error",
        message: err.message || "Failed to quick add character.",
      });
    } finally {
      setQuickAddingId(null);
    }
  };

  // Apply filters
  const filteredCharacters = characters.filter((char) => {
    const name = char.character?.name || "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || char.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate paginated slice
  const totalItems = filteredCharacters.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCharacters = filteredCharacters.slice(startIndex, startIndex + itemsPerPage);

  // Handle page resets when filters change
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams);
    if (val.trim() !== "") {
      params.set("search", val);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      
      {/* Back button */}
      <button
        onClick={() => navigate("/browse")}
        className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-400 transition-colors hover:text-indigo-400 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Anime List</span>
      </button>

      {/* Selected Anime Context Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-850 bg-slate-900/40 p-5 lg:p-6 shadow-md">
        {animeLoading || !anime ? (
          <div className="flex items-center space-x-4 animate-pulse">
            <div className="h-24 w-18 rounded-xl bg-slate-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-slate-800 rounded-lg" />
              <div className="h-6 w-2/3 bg-slate-800 rounded-lg" />
              <div className="h-3 w-1/4 bg-slate-800 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Anime thumbnail thumbnail image icon */}
            <div className="h-24 w-18 shrink-0 overflow-hidden rounded-xl bg-slate-950 shadow-md border border-slate-800">
              <img
                src={anime.images.jpg.image_url}
                alt={anime.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            
            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600/15 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                Selected Anime
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl font-sans">
                {anime.title}
              </h2>
              <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <span>MAL ID: <strong className="text-indigo-400">{anime.mal_id}</strong></span>
                <span>•</span>
                <span>Format: <strong className="text-slate-300">{anime.type || "TV"}</strong></span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Database Registry Settings Section */}
      {anime && !animeLoading && (
        <div className="rounded-2xl border border-slate-850 bg-slate-900/30 p-5 lg:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="text-base font-extrabold text-slate-100 font-sans">
                  {isRegistered ? "Edit Anime in Database" : "Add Anime to Database"}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Configure anime metadata properties to store in your registry.
              </p>
            </div>
            {isRegistered && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                <Check className="h-3 w-3" />
                <span>Registered in DB</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveAnime} className="space-y-5">
            {/* Title field */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">
                Anime Title (in Database)
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Enter or select anime title..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-4 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 shadow-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${dropdownOpen ? "transform rotate-180" : ""}`} />
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {dropdownOpen && (
                <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/95 p-1.5 shadow-xl max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 backdrop-blur-md">
                  {getTitleOptions().length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 italic">
                      No matching titles found.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Select a Title Option
                      </div>
                      {getTitleOptions().map((opt, idx) => {
                        const isSelected = formTitle.toLowerCase() === opt.title.toLowerCase();
                        return (
                          <button
                            key={`${opt.title}-${idx}`}
                            type="button"
                            onClick={() => selectTitleOption(opt.title)}
                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600/20 text-indigo-300 font-bold"
                                : "text-slate-300 hover:bg-slate-900"
                            }`}
                          >
                            <span className="truncate pr-4">{opt.title}</span>
                            <span className="shrink-0 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-400 border border-slate-800/60 font-mono">
                              {opt.type}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grid of basic traits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Media Type */}
              <div className={`p-4 rounded-xl border transition-all duration-200 ${
                includeType 
                  ? "bg-slate-900/80 border-indigo-500/40" 
                  : "bg-slate-950/30 border-slate-850 opacity-60 hover:opacity-85"
              }`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeType}
                    onChange={(e) => setIncludeType(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800 h-4 w-4 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Media Type</span>
                    <span className="text-sm font-semibold text-slate-200">{typeValue || "None available"}</span>
                  </div>
                </label>
              </div>

              {/* Source */}
              <div className={`p-4 rounded-xl border transition-all duration-200 ${
                includeSource 
                  ? "bg-slate-900/80 border-indigo-500/40" 
                  : "bg-slate-950/30 border-slate-850 opacity-60 hover:opacity-85"
              }`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSource}
                    onChange={(e) => setIncludeSource(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800 h-4 w-4 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Source</span>
                    <span className="text-sm font-semibold text-slate-200">{sourceValue || "None available"}</span>
                  </div>
                </label>
              </div>

              {/* Year */}
              <div className={`p-4 rounded-xl border transition-all duration-200 ${
                includeYear 
                  ? "bg-slate-900/80 border-indigo-500/40" 
                  : "bg-slate-950/30 border-slate-850 opacity-60 hover:opacity-85"
              }`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeYear}
                    onChange={(e) => setIncludeYear(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800 h-4 w-4 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Release Year</span>
                    <span className="text-sm font-semibold text-slate-200">{yearValue || "None available"}</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Studios */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">
                Studios Options
              </span>
              {(!anime.studios || anime.studios.length === 0) ? (
                <p className="text-xs text-slate-500 italic">No studios returned by API.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {anime.studios.map((studioObj: any) => {
                    const studio = studioObj.name;
                    const isSelected = selectedStudios.includes(studio);
                    return (
                      <button
                        key={studio}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStudios(selectedStudios.filter((s) => s !== studio));
                          } else {
                            setSelectedStudios([...selectedStudios, studio]);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer select-none ${
                          isSelected
                            ? "bg-indigo-600/25 text-indigo-300 border-indigo-500/40 shadow-xs"
                            : "bg-slate-950/40 text-slate-450 border-slate-850 hover:border-slate-800 hover:text-slate-300"
                        }`}
                      >
                        <span>{studio}</span>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Genres */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">
                Genres Options
              </span>
              {(!anime.genres || anime.genres.length === 0) ? (
                <p className="text-xs text-slate-500 italic">No genres returned by API.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {anime.genres.map((genreObj: any) => {
                    const genre = genreObj.name;
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGenres(selectedGenres.filter((g) => g !== genre));
                          } else {
                            setSelectedGenres([...selectedGenres, genre]);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer select-none ${
                          isSelected
                            ? "bg-indigo-600/25 text-indigo-300 border-indigo-500/40 shadow-xs"
                            : "bg-slate-950/40 text-slate-450 border-slate-850 hover:border-slate-800 hover:text-slate-300"
                        }`}
                      >
                        <span>{genre}</span>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Action Block */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={savingAnime}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 shadow-sm transition-all duration-200 cursor-pointer"
              >
                {savingAnime ? "Saving..." : isRegistered ? "Update Properties" : "Register Anime"}
              </button>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                  <CheckCircle className="h-4 w-4" />
                  <span>Registry updated successfully!</span>
                </span>
              )}
              {saveError && (
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{saveError}</span>
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Quick Add Feedback Banner */}
      <AnimatePresence>
        {quickAddFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-bold border shadow-md ${
              quickAddFeedback.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/80 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {quickAddFeedback.type === "success" ? (
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{quickAddFeedback.message}</span>
            </div>
            <button
              onClick={() => setQuickAddFeedback(null)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded-lg hover:bg-slate-800/50"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Database Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search character name..."
            value={searchQuery}
            onChange={handleQueryChange}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-4 pl-4 text-sm placeholder-slate-550 text-slate-100 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-1 self-start sm:self-center">
          {["All", "Main", "Supporting"].map((role) => (
            <button
              key={role}
              onClick={() => handleRoleFilterChange(role)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                roleFilter === role
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Shimmer screen */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center space-x-4 rounded-2xl border border-slate-900 bg-slate-900/40 p-4 shadow-xs animate-pulse"
            >
              <div className="h-16 w-16 rounded-xl bg-slate-800 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 bg-slate-800 rounded-lg" />
                <div className="h-3 w-1/2 bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-200">Failed to Retrieve Characters</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            {error || "Could not retrieve character definitions for this franchise."}
          </p>
        </div>
      ) : paginatedCharacters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-16 text-center">
          <p className="text-slate-500 text-sm font-medium">
            No characters match "{searchQuery}" under Role: {roleFilter}.
          </p>
        </div>
      ) : (
        <>
          {/* Grid of Characters */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedCharacters.map((char, index) => {
              if (!char.character) return null;
              
              const isMain = char.role === "Main";
              const originalName = char.character.name;
              
              // Find matching registered character
              const dbChar = findMatchingDbChar(char);
              const isAlreadyAdded = !!dbChar;
              
              return (
                <motion.div
                  key={char.character.mal_id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
                  className="group relative flex items-center space-x-4 rounded-2xl border border-slate-850 bg-slate-905 p-3.5 shadow-md hover:border-slate-700 transition-all duration-200"
                >
                  {/* Thumbnail Avatar Column */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      openZoomModal(char, dbChar);
                    }}
                    className="group/img relative h-18 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-950 border border-slate-800 cursor-pointer shadow-xs"
                    title="Click to zoom character image"
                  >
                    <img
                      src={char.character.images?.jpg?.image_url}
                      alt={originalName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                    />
                    <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  </div>

                  {/* Character Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-3 text-sm font-bold text-slate-100 font-sans group-hover:text-indigo-400 transition-colors" title={originalName}>
                      {originalName}
                    </h3>
                    
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                      {isAlreadyAdded && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-950/45 border border-emerald-900/60 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-400">
                          <CheckCircle className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                          <span>ADDED</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Register action button or Edit button */}
                  <div className="shrink-0">
                    {isAlreadyAdded && dbChar ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/database/edit/${dbChar.id}`, { state: { character: dbChar, anime } })}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-550/15 text-amber-500 hover:bg-amber-550 hover:text-white transition-all cursor-pointer shadow-inner border border-amber-500/20"
                        title="Edit registered character"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(char)}
                          disabled={quickAddingId === char.character?.mal_id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          title="Quick add to database with default info (no traits form)"
                        >
                          {quickAddingId === char.character?.mal_id ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/browse/register/${animeId}/${char.character?.mal_id}`, { state: { character: char.character, role: char.role, anime } })}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-650/15 text-indigo-400 transition-all hover:bg-indigo-600 hover:text-white border border-indigo-500/20 cursor-pointer shadow-inner shrink-0"
                          title="Register & configure traits in form"
                        >
                          <Sliders className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex h-16 items-center justify-between border-t border-slate-850 pt-4">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("page", String(Math.max(1, currentPage - 1)));
                  setSearchParams(params);
                }}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/20 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-900 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev Page</span>
              </button>

              <span className="text-xs font-bold font-mono text-slate-500">
                PAGE {currentPage} OF {totalPages} ({totalItems} CHARACTERS)
              </span>

              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("page", String(Math.min(totalPages, currentPage + 1)));
                  setSearchParams(params);
                }}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/20 px-3.5 py-2 text-xs font-semibold text-slate-400 transition-all hover:bg-slate-900 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <span>Next Page</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomedCharacter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedCharacter(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-xl w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl flex flex-col items-center gap-3 z-10"
            >
              {/* Header bar / Close */}
              <div className="flex w-full items-center justify-between pb-1 border-b border-slate-800/80">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-xs font-black text-indigo-400 font-mono tracking-wider uppercase truncate">
                    {zoomedCharacter.characterName}
                  </span>
                  {zoomedCharacter.images.length > 1 && (
                    <span className="text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded shrink-0">
                      {zoomedCharacter.activeIdx + 1} / {zoomedCharacter.images.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setZoomedCharacter(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Close Zoom"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Large Image Frame with Next/Prev Floating Controls */}
              <div className="relative w-full h-auto max-h-[60vh] rounded-xl overflow-hidden bg-slate-900 flex justify-center items-center border border-slate-850 group min-h-[220px]">
                <img
                  key={zoomedCharacter.images[zoomedCharacter.activeIdx]?.url}
                  src={zoomedCharacter.images[zoomedCharacter.activeIdx]?.url}
                  alt={`${zoomedCharacter.characterName} - ${zoomedCharacter.images[zoomedCharacter.activeIdx]?.label}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-[60vh] object-contain rounded-xl select-none transition-all duration-200"
                />

                {/* Prev Button */}
                {zoomedCharacter.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setZoomedCharacter((prev) =>
                        prev
                          ? {
                              ...prev,
                              activeIdx:
                                prev.activeIdx > 0
                                  ? prev.activeIdx - 1
                                  : prev.images.length - 1,
                            }
                          : null
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 text-slate-200 hover:bg-indigo-600 hover:text-white border border-slate-700/80 shadow-lg transition-all cursor-pointer z-10"
                    title="Previous Image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                {/* Next Button */}
                {zoomedCharacter.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setZoomedCharacter((prev) =>
                        prev
                          ? {
                              ...prev,
                              activeIdx:
                                prev.activeIdx < prev.images.length - 1
                                  ? prev.activeIdx + 1
                                  : 0,
                            }
                          : null
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 text-slate-200 hover:bg-indigo-600 hover:text-white border border-slate-700/80 shadow-lg transition-all cursor-pointer z-10"
                    title="Next Image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Current Image Label */}
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl w-full justify-center">
                <FileImage className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200 truncate">
                  {zoomedCharacter.images[zoomedCharacter.activeIdx]?.label || "Profile Image"}
                </span>
              </div>

              {/* Thumbnail Selector Strip for Navigation */}
              {zoomedCharacter.images.length > 1 && (
                <div className="flex items-center justify-center gap-2 w-full overflow-x-auto pt-1 pb-1">
                  {zoomedCharacter.images.map((img, idx) => {
                    const isActive = idx === zoomedCharacter.activeIdx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setZoomedCharacter((prev) =>
                            prev ? { ...prev, activeIdx: idx } : null
                          )
                        }
                        className={`relative shrink-0 h-14 w-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          isActive
                            ? "border-indigo-500 scale-105 shadow-md shadow-indigo-500/20"
                            : "border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600"
                        }`}
                        title={img.label}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-indigo-500/10" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
