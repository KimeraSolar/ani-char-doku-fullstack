import React, { useState, useEffect, useMemo, useCallback } from "react";
import { RegisteredCharacter, TraitOption } from "@shared/types/index";
import { Search, Trash2, Calendar, BookOpen, Layers, Heart, AlertCircle, ShieldAlert, Code, Download, RefreshCw, Upload, Check, X, Pencil, ZoomIn, Sliders, Plus, ChevronLeft, ChevronRight, FileImage, CheckSquare, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context";
import TraitsForm from "./TraitsForm";

interface DatabaseViewProps {
  characters: RegisteredCharacter[];
  loading: boolean;
  firebaseStatus?: { isConfigured: boolean; usingFallback: boolean; error?: string } | null;
  onDeleteCharacter: (id: string) => void;
  onRefresh: () => void;
  onNavigateToAnime: () => void;
}

interface TraitFilter {
  key: string;
  value: string;
  isNegative?: boolean;
}

const parseTraitsParam = (traitsParam: string | null): TraitFilter[] => {
  if (!traitsParam) return [];
  return traitsParam
    .split(",")
    .map((p) => {
      let isNegative = false;
      let raw = p;
      if (raw.startsWith("NOT:")) {
        isNegative = true;
        raw = raw.substring(4);
      }
      const idx = raw.indexOf(":");
      return {
        key: idx !== -1 ? decodeURIComponent(raw.substring(0, idx)) : raw,
        value: idx !== -1 ? decodeURIComponent(raw.substring(idx + 1)) : "",
        isNegative,
      };
    })
    .filter((f) => f.key && f.value);
};

export default function DatabaseView({
  characters,
  loading,
  firebaseStatus,
  onDeleteCharacter,
  onRefresh,
  onNavigateToAnime,
}: DatabaseViewProps) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = searchParams.get("page");
  const currentPage = pageParam && !isNaN(parseInt(pageParam, 10)) ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get("role") || "All");
  const [sourceFilter, setSourceFilter] = useState(() => searchParams.get("source") || "All");
  const [pageInputVal, setPageInputVal] = useState("");

  // Stackable Traits Filters
  const [availableTraits, setAvailableTraits] = useState<Record<string, TraitOption[]>>({});
  const [selectedTraitFilters, setSelectedTraitFilters] = useState<TraitFilter[]>(() =>
    parseTraitsParam(searchParams.get("traits"))
  );
  const [filterMode, setFilterMode] = useState<"include" | "exclude">("include");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");

  // Group character variations toggle state
  const [groupVariations, setGroupVariations] = useState<boolean>(true);

  // Sync URL search params to component state (for direct loads, back/forward nav)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q !== searchQuery) {
      setSearchQuery(q);
    }

    const role = searchParams.get("role") || "All";
    if (role !== roleFilter) {
      setRoleFilter(role);
    }

    const source = searchParams.get("source") || "All";
    if (source !== sourceFilter) {
      setSourceFilter(source);
    }

    const parsedTraits = parseTraitsParam(searchParams.get("traits"));

    const isTraitsEqual =
      parsedTraits.length === selectedTraitFilters.length &&
      parsedTraits.every(
        (f, i) =>
          f.key === selectedTraitFilters[i]?.key &&
          f.value === selectedTraitFilters[i]?.value &&
          Boolean(f.isNegative) === Boolean(selectedTraitFilters[i]?.isNegative)
      );

    if (!isTraitsEqual) {
      setSelectedTraitFilters(parsedTraits);
    }
  }, [searchParams]);

  // Unified helper to push updated filter states to URL
  const updateFiltersUrl = (
    q: string,
    role: string,
    source: string,
    traits: TraitFilter[],
    resetPage: boolean = true
  ) => {
    const params = new URLSearchParams();
    if (!resetPage && pageParam) {
      params.set("page", pageParam);
    } else {
      params.set("page", "1");
    }

    if (q) params.set("q", q);
    if (role && role !== "All") params.set("role", role);
    if (source && source !== "All") params.set("source", source);
    if (traits.length > 0) {
      const traitsStr = traits
        .map((f) => {
          const prefix = f.isNegative ? "NOT:" : "";
          return `${prefix}${encodeURIComponent(f.key)}:${encodeURIComponent(f.value)}`;
        })
        .join(",");
      params.set("traits", traitsStr);
    }
    setSearchParams(params, { replace: true });
  };

  // Helper for pagination page changes preserving all search states
  const changePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
  };

  useEffect(() => {
    const fetchTraits = async () => {
      try {
        const res = await fetch("/api/traits");
        if (res.ok) {
          const data = await res.json();
          setAvailableTraits(data);
          
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const firstCat = keys[0];
            setSelectedCategory(firstCat);
            const vals = data[firstCat] || [];
            if (vals.length > 0) {
              setSelectedValue(vals[0].name);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch traits in DatabaseView:", err);
      }
    };
    fetchTraits();
  }, []);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const vals = availableTraits[cat] || [];
    if (vals.length > 0) {
      setSelectedValue(vals[0].name);
    } else {
      setSelectedValue("");
    }
  };

  const handleAddTraitFilter = (isNegativeOverride?: boolean) => {
    if (!selectedCategory || !selectedValue) return;
    const isNeg = isNegativeOverride !== undefined ? isNegativeOverride : filterMode === "exclude";
    const exists = selectedTraitFilters.some(
      (f) => f.key === selectedCategory && f.value === selectedValue && Boolean(f.isNegative) === isNeg
    );
    if (!exists) {
      const updated = [
        ...selectedTraitFilters,
        { key: selectedCategory, value: selectedValue, isNegative: isNeg },
      ];
      setSelectedTraitFilters(updated);
      updateFiltersUrl(searchQuery, roleFilter, sourceFilter, updated, true);
    }
  };

  const handleToggleFilterNegative = (idxToToggle: number) => {
    const updated = selectedTraitFilters.map((f, idx) => {
      if (idx === idxToToggle) {
        return { ...f, isNegative: !f.isNegative };
      }
      return f;
    });
    setSelectedTraitFilters(updated);
    updateFiltersUrl(searchQuery, roleFilter, sourceFilter, updated, true);
  };

  const handleRemoveTraitFilter = (idxToRemove: number) => {
    const updated = selectedTraitFilters.filter((_, idx) => idx !== idxToRemove);
    setSelectedTraitFilters(updated);
    updateFiltersUrl(searchQuery, roleFilter, sourceFilter, updated, true);
  };

  // Custom non-native character delete confirmation modal active reference
  const [deleteConfirmChar, setDeleteConfirmChar] = useState<RegisteredCharacter | null>(null);
  const [zoomedCharacter, setZoomedCharacter] = useState<{
    characterName: string;
    images: { url: string; label: string }[];
    activeIdx: number;
  } | null>(null);

  const openZoomModal = (char: RegisteredCharacter, initialIdx = 0) => {
    const imagesList: { url: string; label: string }[] = [];

    if (Array.isArray(char.images) && char.images.length > 0) {
      char.images.forEach((img, idx) => {
        if (img && img.url) {
          imagesList.push({
            url: img.url,
            label: img.label || (idx === 0 ? "Profile Image" : `Image ${idx + 1}`),
          });
        }
      });
    }

    if (imagesList.length === 0 && char.imageUrl) {
      imagesList.push({
        url: char.imageUrl,
        label: "Profile Image",
      });
    }

    if (imagesList.length === 0) return;

    setZoomedCharacter({
      characterName: char.name,
      images: imagesList,
      activeIdx: Math.min(initialIdx, imagesList.length - 1),
    });
  };

  useEffect(() => {
    if (!zoomedCharacter) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setZoomedCharacter((prev) => {
          if (!prev || prev.images.length <= 1) return prev;
          const newIdx = prev.activeIdx > 0 ? prev.activeIdx - 1 : prev.images.length - 1;
          return { ...prev, activeIdx: newIdx };
        });
      } else if (e.key === "ArrowRight") {
        setZoomedCharacter((prev) => {
          if (!prev || prev.images.length <= 1) return prev;
          const newIdx = prev.activeIdx < prev.images.length - 1 ? prev.activeIdx + 1 : 0;
          return { ...prev, activeIdx: newIdx };
        });
      } else if (e.key === "Escape") {
        setZoomedCharacter(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedCharacter]);
  
  // Show Raw JSON inspector toggle
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  // Batch Edit Mode state variables
  const [isBatchEditMode, setIsBatchEditMode] = useState(false);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [batchTraits, setBatchTraits] = useState<Record<string, string[]>>({});
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showBatchTraitsForm, setShowBatchTraitsForm] = useState(true);
  const [batchConfirmModal, setBatchConfirmModal] = useState<{
    isOpen: boolean;
    action: "add" | "remove";
  }>({
    isOpen: false,
    action: "add",
  });

  const handleBatchTraitsChange = useCallback((newTraits: Record<string, string[]>) => {
    setBatchTraits(newTraits);
  }, []);

  // Toggle selection of individual character in batch mode
  const toggleSelectCharacter = (id: string) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all filtered characters across pages
  const handleSelectAllFiltered = () => {
    const filteredIds = filtered.map((c) => c.id);
    const combined = new Set([...selectedCharacterIds, ...filteredIds]);
    setSelectedCharacterIds(Array.from(combined));
  };

  // Deselect all characters
  const handleDeselectAll = () => {
    setSelectedCharacterIds([]);
  };

  // Open confirmation modal for batch trait modifications
  const handleOpenBatchConfirmModal = (action: "add" | "remove" = "add") => {
    if (selectedCharacterIds.length === 0) {
      setBatchFeedback({
        type: "error",
        message: "Please select at least one character from the list below to apply batch updates.",
      });
      return;
    }

    if (Object.keys(batchTraits).length === 0) {
      setBatchFeedback({
        type: "error",
        message: `Please select at least one trait option in the Traits Form below before ${action === "remove" ? "removing" : "applying"}.`,
      });
      return;
    }

    setBatchFeedback(null);
    setBatchConfirmModal({ isOpen: true, action });
  };

  // Execute the batch update API call after modal confirmation
  const executeBatchUpdate = async () => {
    const action = batchConfirmModal.action;
    setIsApplyingBatch(true);
    setBatchFeedback(null);

    try {
      const res = await fetch("/api/database/batch-update-traits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterIds: selectedCharacterIds,
          traits: batchTraits,
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to apply batch update to selected characters.");
      }

      setBatchFeedback({
        type: "success",
        message: data.message || `Successfully ${action === "remove" ? "removed traits from" : "merged traits into"} ${data.updatedCount} selected characters!`,
      });

      setBatchConfirmModal({ isOpen: false, action: "add" });

      // Refresh database to reload character records
      onRefresh();
    } catch (err: any) {
      setBatchFeedback({
        type: "error",
        message: err.message || "An error occurred while applying the batch traits update.",
      });
      setBatchConfirmModal({ isOpen: false, action: "add" });
    } finally {
      setIsApplyingBatch(false);
    }
  };

  // File upload / DB import state variables
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importedJsonData, setImportedJsonData] = useState<any[] | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const [importingStatus, setImportingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importFeedback, setImportFeedback] = useState("");

  // Process selected file
  const processJsonFile = (file: File) => {
    setImportFeedback("");
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      setImportFeedback("Invalid file format. Please upload a standard JSON database file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          setImportFeedback("Uploaded JSON must be a top-level array of anime characters objects.");
          return;
        }
        setImportedJsonData(parsed);
      } catch (e) {
        setImportFeedback("Unable to parse file. Please verify it contains well-formed JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processJsonFile(e.target.files[0]);
    }
  };

  const handleJsonDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processJsonFile(e.dataTransfer.files[0]);
    }
  };

  // Submit parsed data to custom backend post API
  const handleTriggerImportCommit = async () => {
    if (!importedJsonData) return;
    setImportingStatus("loading");
    setImportFeedback("");
    try {
      const response = await fetch("/api/database/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characters: importedJsonData,
          mode: importMode,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed registration sync process.");
      }
      const resVal = await response.json();
      setImportingStatus("success");
      setImportFeedback(`Successfully imported ${resVal.count} character record(s). Database now active with ${resVal.total} total registrants.`);
      onRefresh(); // Trigger data refresh
    } catch (err: any) {
      console.error(err);
      setImportingStatus("error");
      setImportFeedback(err.message || "An unexpected issue occurred while uploading characters.");
    }
  };

  // Derive unique existing sources and count of registered characters per source
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    characters.forEach((c) => {
      if (Array.isArray(c.sources)) {
        c.sources.forEach((src) => {
          counts[src] = (counts[src] || 0) + 1;
        });
      }
    });
    return counts;
  }, [characters]);

  const uniqueSources = useMemo(() => {
    return Array.from(
      new Set(characters.flatMap((c) => c.sources || []))
    ).sort();
  }, [characters]);

  // Filter application
  const filtered = characters.filter((c) => {
    const nameMatches = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const roleMatches = roleFilter === "All" || c.role === roleFilter;
    const sourceMatches =
      sourceFilter === "All" || (c.sources && c.sources.includes(sourceFilter));

    // Stackable custom traits filters (AND combination of all active custom traits criteria)
    const traitsMatch = selectedTraitFilters.every((filter) => {
      let isTraitEmpty = false;
      let hasTraitValue = false;

      if (!c.traits) {
        isTraitEmpty = true;
      } else {
        const charVal = c.traits[filter.key];
        if (charVal === undefined || charVal === null) {
          isTraitEmpty = true;
        } else if (typeof charVal === "string") {
          isTraitEmpty = charVal.trim() === "";
        } else if (Array.isArray(charVal)) {
          isTraitEmpty = charVal.length === 0 || charVal.every((v) => !v || String(v).trim() === "");
        }

        if (!isTraitEmpty) {
          if (Array.isArray(charVal)) {
            hasTraitValue = charVal.includes(filter.value);
          } else {
            hasTraitValue = String(charVal) === filter.value;
          }
        }
      }

      if (filter.value === "__EMPTY__") {
        if (filter.isNegative) {
          return !isTraitEmpty;
        } else {
          return isTraitEmpty;
        }
      }

      if (filter.isNegative) {
        return !hasTraitValue;
      } else {
        return hasTraitValue;
      }
    });

    return nameMatches && roleMatches && sourceMatches && traitsMatch;
  });

  // Grouping logic for variations
  const displayCharacters = useMemo(() => {
    if (!groupVariations) {
      return filtered.map((c) => ({
        ...c,
        variationCount: 1,
        isGrouped: false,
      }));
    }

    const seenMalIds = new Set<number>();
    const result: (RegisteredCharacter & { variationCount: number; isGrouped: boolean })[] = [];

    for (const c of filtered) {
      const mId = Number(c.malId);
      if (!mId || mId <= 0) {
        result.push({ ...c, variationCount: 1, isGrouped: false });
      } else {
        if (!seenMalIds.has(mId)) {
          seenMalIds.add(mId);
          // Count total variations in full database sharing this MAL ID
          const totalVariations = characters.filter(
            (item) => Number(item.malId) === mId
          ).length;
          result.push({
            ...c,
            variationCount: totalVariations,
            isGrouped: totalVariations > 1,
          });
        }
      }
    }

    return result;
  }, [filtered, groupVariations, characters]);

  const ITEMS_PER_PAGE = 9;
  const totalItems = displayCharacters.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCharacters = displayCharacters.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setPageInputVal(String(validCurrentPage));
  }, [validCurrentPage]);

  useEffect(() => {
    if (isBatchEditMode) {
      setGroupVariations(false);
    }
  }, [isBatchEditMode]);

  const handleCustomPageSubmit = () => {
    const parsed = parseInt(pageInputVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      changePage(parsed);
    } else {
      setPageInputVal(String(validCurrentPage));
    }
  };

  // Export to local JSON file helper
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(characters, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "registered_characters_db.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      
      {firebaseStatus && !firebaseStatus.isConfigured && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 text-sm text-amber-200/90 leading-relaxed shadow-sm">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">Firebase Firestore is falling back to local database file</p>
            <p className="mt-0.5 text-xs text-amber-400/85">
              The application is currently running using local JSON storage. To connect with a cloud-hosted database, please configure your Firestore credentials inside your workspace's <code className="bg-amber-500/10 px-1 py-0.5 rounded font-mono text-amber-300">.env</code> file (keys: <code className="bg-amber-500/15 px-1 py-0.5 rounded font-mono text-amber-350">FIREBASE_PROJECT_ID</code>, <code className="bg-amber-500/15 px-1 py-0.5 rounded font-mono text-amber-350">FIREBASE_API_KEY</code>, etc.). Once defined, the applet will automatically synchronize over the Cloud!
            </p>
          </div>
        </div>
      )}

      {/* DB Overview Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white font-sans flex flex-wrap items-center gap-2">
            <span>Character Database</span>
            {characters.length > 0 && (
              <span className="rounded-xl bg-indigo-600/15 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-400">
                {characters.length} Registered
              </span>
            )}
            {!isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono border bg-slate-800/80 border-slate-700 text-slate-300">
                <Lock className="h-3 w-3 text-slate-400" />
                Read-Only (User Level)
              </span>
            )}
            {firebaseStatus && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono border ${
                firebaseStatus.isConfigured 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  firebaseStatus.isConfigured ? "bg-emerald-450 animate-pulse" : "bg-amber-400"
                }`} />
                {firebaseStatus.isConfigured ? "Cloud Firestore Live" : "Local Data Fallback"}
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isAdmin 
              ? "Audit, inspect, and export characters saved securely in our database."
              : "Inspect and view characters saved in our database."}
          </p>
        </div>

        {/* Database Management Controls */}
        <div className="flex flex-wrap gap-2">
          {/* Group Variations Toggle */}
          <button
            disabled={isBatchEditMode}
            onClick={() => setGroupVariations(!groupVariations)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              groupVariations
                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            title="Toggle grouping character variations with the same MAL ID"
          >
            <Layers className="h-4 w-4" />
            <span>{groupVariations ? "Group Variations: On" : "Group Variations: Off"}</span>
          </button>

          {/* Refresh Database */}
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
            title="Reload database"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Sync</span>
          </button>

          {/* Batch Edit Mode Toggle (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => {
                const next = !isBatchEditMode;
                setIsBatchEditMode(next);
                if (!next) {
                  setSelectedCharacterIds([]);
                  setBatchTraits({});
                  setBatchFeedback(null);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                isBatchEditMode
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/60"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title="Batch Edit Mode: Update traits across multiple selected characters"
            >
              <Sliders className="h-4 w-4 text-indigo-300" />
              <span>{isBatchEditMode ? "Exit Batch Edit" : "Batch Edit"}</span>
            </button>
          )}

          {/* Raw JSON View Toggle */}
          <button
            onClick={() => setShowJsonInspector(!showJsonInspector)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              showJsonInspector
                ? "bg-indigo-650 border-indigo-600 text-white shadow-md"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Code className="h-4 w-4" />
            <span>Raw JSON</span>
          </button>

          {/* Import JSON DB Button (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => {
                setShowImportDialog(!showImportDialog);
                setShowJsonInspector(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                showImportDialog
                  ? "bg-indigo-650 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Import DB</span>
            </button>
          )}

          {/* Export DB Button */}
          {characters.length > 0 && (
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export DB</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Edit Mode Banner & Traits Form Panel */}
      {isBatchEditMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-2xl border-2 border-indigo-500/80 bg-slate-950/90 p-5 shadow-2xl space-y-4 relative overflow-hidden"
        >
          {/* Top accent glow line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping" />
                <h3 className="text-base font-black text-white font-sans flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Batch Edit Traits Mode</span>
                </h3>
                <span className="rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-mono font-bold">
                  Batch Operations
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Select characters below and configure traits in the Traits Form. You can merge the selected trait values into all checked characters or remove the selected traits from them.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowBatchTraitsForm(!showBatchTraitsForm)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:bg-slate-850 transition-colors cursor-pointer"
              >
                {showBatchTraitsForm ? "Hide Traits Builder" : "Configure Traits"}
              </button>

              <button
                type="button"
                onClick={() => handleOpenBatchConfirmModal("add")}
                disabled={isApplyingBatch || selectedCharacterIds.length === 0 || Object.keys(batchTraits).length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Merge selected trait values into selected characters"
              >
                {isApplyingBatch ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Add / Merge Traits ({selectedCharacterIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenBatchConfirmModal("remove")}
                disabled={isApplyingBatch || selectedCharacterIds.length === 0 || Object.keys(batchTraits).length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Remove selected trait values from selected characters"
              >
                {isApplyingBatch ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Remove Traits ({selectedCharacterIds.length})</span>
              </button>
            </div>
          </div>

          {/* Selection Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-850 p-3 rounded-xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-slate-400 text-[11px]">Selection Tools:</span>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-bold text-indigo-300 hover:bg-slate-850 transition-colors cursor-pointer"
                title="Select all characters matching current search and filters"
              >
                <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                <span>Select All Filtered ({filtered.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const pageIds = paginatedCharacters.map((c) => c.id);
                  const combined = new Set([...selectedCharacterIds, ...pageIds]);
                  setSelectedCharacterIds(Array.from(combined));
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-slate-850 transition-colors cursor-pointer"
              >
                <span>Select Current Page ({paginatedCharacters.length})</span>
              </button>

              {selectedCharacterIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-900/40 bg-rose-950/20 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-900/40 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear Selection</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-slate-300">
                <strong className="text-indigo-400 font-bold">{selectedCharacterIds.length}</strong> of {characters.length} Selected
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">
                <strong className="text-indigo-400 font-bold">{Object.keys(batchTraits).length}</strong> Trait Fields Active
              </span>
            </div>
          </div>

          {/* Feedback Toast */}
          {batchFeedback && (
            <div
              className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-bold ${
                batchFeedback.type === "success"
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {batchFeedback.type === "success" ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                )}
                <span>{batchFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setBatchFeedback(null)}
                className="p-1 hover:opacity-80 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Active Configured Batch Traits Preview */}
          {Object.keys(batchTraits).length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900/80 border border-slate-800 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-slate-400 uppercase text-[10px] tracking-wider shrink-0">
                  Configured Batch Traits:
                </span>
                {Object.entries(batchTraits)
                  .sort(([a], [b]) => a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" }))
                  .map(([k, vals]) => (
                  <span
                    key={k}
                    className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                  >
                    <strong className="text-indigo-300 font-bold">{k.replace(/_/g, " ")}:</strong> {(Array.isArray(vals) ? vals : [String(vals)]).join(", ")}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenBatchConfirmModal("add")}
                  disabled={isApplyingBatch || selectedCharacterIds.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white px-2.5 py-1 text-[11px] font-bold text-indigo-300 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Merge into Selected ({selectedCharacterIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenBatchConfirmModal("remove")}
                  disabled={isApplyingBatch || selectedCharacterIds.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600 hover:text-white px-2.5 py-1 text-[11px] font-bold text-rose-300 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove from Selected ({selectedCharacterIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Embedded Registry TraitsForm */}
          {showBatchTraitsForm && (
            <div className="pt-2">
              <TraitsForm
                initialTraits={batchTraits}
                onClose={() => setShowBatchTraitsForm(false)}
                onChange={handleBatchTraitsChange}
                onSave={handleBatchTraitsChange}
                hideApplyButton={true}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Import Database Interface Panel */}
      {showImportDialog && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-5 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <h4 className="text-sm font-black text-white font-sans flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-400" />
                <span>Import Character JSON Database Backup</span>
              </h4>
              <p className="text-[11px] text-slate-450 mt-0.5 font-semibold">
                Provide a standard JSON character array database file to load up.
              </p>
            </div>
            <button
              onClick={() => {
                setShowImportDialog(false);
                setImportedJsonData(null);
                setImportingStatus("idle");
                setImportFeedback("");
              }}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-900 hover:text-slate-300 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {importingStatus === "success" ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-400">
                <Check className="h-5 w-5" />
              </div>
              <p className="text-xs font-black text-emerald-300">{importFeedback}</p>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportedJsonData(null);
                  setImportingStatus("idle");
                  setImportFeedback("");
                }}
                className="inline-flex rounded-lg bg-emerald-650 hover:bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                Close Uploader
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* File Dropzone Area */}
              {!importedJsonData ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleJsonDrop}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-slate-805 hover:border-slate-700 bg-slate-900/15"
                  }`}
                  onClick={() => document.getElementById("json-file-input")?.click()}
                >
                  <input
                    type="file"
                    id="json-file-input"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleJsonFileChange}
                  />
                  <Upload className="h-8 w-8 text-slate-500 mb-3" />
                  <p className="text-xs font-bold text-slate-300">
                    Drag and drop your JSON backup file here, or <span className="text-indigo-400 hover:underline">browse files</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1.5 leading-normal">
                    Accepts lists of characters with name, sources, role, traits metrics.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 font-mono">
                        Valid File Parsed
                      </span>
                      <h5 className="text-xs font-black text-white mt-0.5">
                        Found {importedJsonData.length} character registry record(s) to import.
                      </h5>
                    </div>
                    <button
                      onClick={() => setImportedJsonData(null)}
                      className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear / Choose Another
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-slate-900 pt-3">
                    <button
                      type="button"
                      onClick={() => setImportMode("merge")}
                      className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        importMode === "merge"
                          ? "bg-slate-900/60 border-indigo-500"
                          : "bg-transparent border-slate-850 hover:border-slate-800"
                      }`}
                    >
                      <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${importMode === "merge" ? "bg-indigo-400" : "bg-slate-600"}`} />
                        Merge & Update
                      </span>
                      <span className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                        Keep current registrants intact. Match duplicate records by name/MAL ID and add new ones.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportMode("overwrite")}
                      className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        importMode === "overwrite"
                          ? "bg-rose-950/20 border-rose-500/50"
                          : "bg-transparent border-slate-850 hover:border-slate-800"
                      }`}
                    >
                      <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${importMode === "overwrite" ? "bg-rose-500" : "bg-slate-600"}`} />
                        Wipe & Overwrite
                      </span>
                      <span className="text-[10px] text-slate-450 leading-relaxed font-semibold text-rose-100/60">
                        Delete all current characters first. The database will reflect <strong className="text-rose-400/80">strictly</strong> the imported JSON.
                      </span>
                    </button>
                  </div>

                  {/* Confirm Action CTA Button */}
                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-900">
                    <button
                      onClick={() => setImportedJsonData(null)}
                      className="rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTriggerImportCommit}
                      disabled={importingStatus === "loading"}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-extrabold text-white transition-colors cursor-pointer ${
                        importMode === "overwrite"
                          ? "bg-rose-600 hover:bg-rose-500"
                          : "bg-indigo-600 hover:bg-indigo-500"
                      }`}
                    >
                      {importingStatus === "loading" ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                          <span>Processing Import...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Import Data Now</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

              {/* Error messages */}
              {importFeedback && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-semibold text-rose-300">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400" />
                  <span>{importFeedback}</span>
                </div>
              )}

            </div>
          )}

        </motion.div>
      )}

      {/* Raw JSON Inspector Screen */}
      {showJsonInspector && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-slate-300 text-xs shadow-inner"
        >
          <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Raw File: characters_db.json
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(characters, null, 2));
                alert("Database JSON successfully copied to clipboard.");
              }}
              className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              Copy JSON
            </button>
          </div>
          <pre className="max-h-[350px] overflow-auto whitespace-pre h-auto leading-relaxed text-indigo-305">
            {JSON.stringify(characters, null, 2)}
          </pre>
        </motion.div>
      )}

      {/* Search & Collection Filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-550" />
          <input
            type="text"
            placeholder="Search saved character database..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              updateFiltersUrl(val, roleFilter, sourceFilter, selectedTraitFilters, true);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-4 pl-10 text-sm placeholder-slate-555 text-slate-100 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>

        {/* Filter selectors row */}
        <div className="flex flex-wrap gap-2.5">
          {/* Source Filter Select */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSourceFilter(val);
              updateFiltersUrl(searchQuery, roleFilter, val, selectedTraitFilters, true);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-205 focus:outline-hidden focus:border-indigo-500/50"
          >
            <option value="All" className="bg-slate-900 text-white">All Source Works ({characters.length})</option>
            {uniqueSources.map((src) => {
              const count = sourceCounts[src] || 0;
              return (
                <option key={src} value={src} className="bg-slate-900 text-white">
                  {src} ({count})
                </option>
              );
            })}
          </select>

          {/* Role Filter Select */}
          <select
            value={roleFilter}
            onChange={(e) => {
              const val = e.target.value;
              setRoleFilter(val);
              updateFiltersUrl(searchQuery, val, sourceFilter, selectedTraitFilters, true);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-205 focus:outline-hidden focus:border-indigo-500/50"
          >
            <option value="All" className="bg-slate-900 text-white">All Roles</option>
            <option value="Main" className="bg-slate-900 text-white">Main-Only</option>
            <option value="Supporting" className="bg-slate-900 text-white">Supporting-Only</option>
          </select>
        </div>
      </div>

      {/* Sourced Traits Filters Tray */}
      {Object.keys(availableTraits).length > 0 && (
        <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-4 space-y-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                <Sliders className="h-3.5 w-3.5" />
              </span>
              <div>
                <h4 className="text-xs font-black text-white font-sans uppercase tracking-wider">
                  Filter by Custom Traits
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Stack multiple characteristics to filter down your anime rosters.
                </p>
              </div>
            </div>
            
            {selectedTraitFilters.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTraitFilters([]);
                  updateFiltersUrl(searchQuery, roleFilter, sourceFilter, [], true);
                }}
                className="inline-flex self-start sm:self-center items-center gap-1.5 text-[10px] font-black text-rose-400 hover:text-rose-350 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Clear All Active Filters ({selectedTraitFilters.length})</span>
              </button>
            )}
          </div>

          {/* Input selectors */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-end sm:items-center">
            <div className="w-full sm:w-auto flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Filter Type</span>
              <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setFilterMode("include")}
                  className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filterMode === "include"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ✓ Include
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("exclude")}
                  className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filterMode === "exclude"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🚫 Exclude (NOT)
                </button>
              </div>
            </div>

            <div className="w-full sm:w-auto flex flex-col gap-1 flex-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Trait Category</span>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:border-indigo-500/50"
              >
                <option value="" disabled>Select Trait Category</option>
                {Object.keys(availableTraits)
                  .sort((a, b) => a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" }))
                  .map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto flex flex-col gap-1 flex-1">
              <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider font-mono">Trait Value</span>
              <select
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:border-indigo-500/50"
                disabled={!selectedCategory}
              >
                <option value="" disabled>Select Trait Value</option>
                <option value="__EMPTY__" className="bg-slate-900 text-amber-400 font-extrabold">
                  (Empty / No Value)
                </option>
                {(availableTraits[selectedCategory] || []).map((val) => (
                  <option key={val.name} value={val.name} className="bg-slate-900 text-white">
                    {val.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto sm:mt-[14px]">
              {filterMode === "include" ? (
                <button
                  type="button"
                  onClick={() => handleAddTraitFilter(false)}
                  disabled={!selectedCategory || !selectedValue}
                  className="w-full sm:w-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-650/20 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white disabled:opacity-40 px-4 text-xs font-extrabold text-indigo-300 cursor-pointer transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Filter</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddTraitFilter(true)}
                  disabled={!selectedCategory || !selectedValue}
                  className="w-full sm:w-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 hover:text-white disabled:opacity-40 px-4 text-xs font-extrabold text-rose-300 cursor-pointer transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Add Exclude Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Stacked List */}
          {selectedTraitFilters.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-850/60">
              {selectedTraitFilters.map((filter, idx) => (
                <span
                  key={`${filter.key}-${filter.value}-${filter.isNegative ? "neg" : "pos"}-${idx}`}
                  className={`inline-flex items-center gap-1.5 rounded-xl border py-1 pl-2 pr-1.5 text-xs font-bold transition-all ${
                    filter.isNegative
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-xs"
                      : "border-indigo-550/25 bg-indigo-600/10 text-indigo-400"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleFilterNegative(idx)}
                    title={filter.isNegative ? "Click to switch to Include filter" : "Click to switch to Exclude filter"}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      filter.isNegative
                        ? "bg-rose-600 text-white hover:bg-rose-500 border border-rose-400/50"
                        : "bg-indigo-600/40 text-indigo-200 hover:bg-indigo-600/60 border border-indigo-500/30"
                    }`}
                  >
                    {filter.isNegative ? "NOT" : "MATCH"}
                  </button>
                  <span className={filter.isNegative ? "text-rose-200 font-medium" : "text-indigo-300 font-medium"}>
                    {filter.key.replace(/_/g, " ")}:
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono border ${
                      filter.isNegative
                        ? "bg-rose-950/80 text-white border-rose-500/30"
                        : "bg-indigo-650/30 text-white border-indigo-505/10"
                    }`}
                  >
                    {filter.value === "__EMPTY__" ? "(Empty / No Value)" : filter.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTraitFilter(idx)}
                    className={`rounded-lg p-0.5 transition-colors cursor-pointer ${
                      filter.isNegative
                        ? "text-rose-400 hover:bg-rose-600/20 hover:text-white"
                        : "text-indigo-400 hover:bg-indigo-600/20 hover:text-white"
                    }`}
                    title="Remove Filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 italic font-semibold py-1">
              No active trait filters. All matching characters will be visible.
            </div>
          )}
        </div>
      )}

      {/* Loading state spinner */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-550" />
        </div>
      ) : characters.length === 0 ? (
        /* Empty Database State View */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-650/10 text-indigo-400 shadow-sm border border-indigo-550/10">
            <Heart className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-white font-sans">
            Database Empty
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-400 leading-relaxed font-semibold">
            There are currently no anime characters in your custom JSON repository. Explore our live top anime and register some characters!
          </p>
          <button
            onClick={onNavigateToAnime}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            Explore Anime Directory
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-16 text-center text-sm text-slate-400 space-y-4">
          <div>
            <p className="font-extrabold text-slate-350">No records match your exact filter combination:</p>
            <p className="text-xs text-slate-500 mt-1">
              Name: "{searchQuery || 'Any'}" • Source: "{sourceFilter}" • Role: "{roleFilter}"
            </p>
            {selectedTraitFilters.length > 0 && (
              <p className="text-xs text-indigo-400 mt-1.5 font-semibold">
                Traits: {selectedTraitFilters.map(f => `${f.key.replace(/_/g, ' ')} = ${f.value === "__EMPTY__" ? "(Empty / No Value)" : f.value}`).join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setSourceFilter("All");
              setRoleFilter("All");
              setSelectedTraitFilters([]);
              setSearchParams({ page: "1" });
            }}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 hover:border-slate-705 transition-colors cursor-pointer shadow-md"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {paginatedCharacters.map((char, index) => {
            const dateStr = char.registeredAt
              ? new Date(char.registeredAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Saved";

            return (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.45) }}
                onClick={() => {
                  if (isBatchEditMode) {
                    toggleSelectCharacter(char.id);
                  }
                }}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 ${
                  isBatchEditMode
                    ? selectedCharacterIds.includes(char.id)
                      ? "border-indigo-500 ring-2 ring-indigo-500/80 bg-indigo-950/30 shadow-lg shadow-indigo-500/20 cursor-pointer"
                      : "border-slate-800 bg-slate-905 hover:border-indigo-500/50 hover:bg-slate-900/80 cursor-pointer"
                    : "border-slate-850 bg-slate-905 hover:border-slate-700 hover:shadow-lg"
                }`}
              >
                {/* Batch Selection Checkbox Badge */}
                {isBatchEditMode && (
                  <div className="absolute top-3 left-3 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectCharacter(char.id);
                      }}
                      className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                        selectedCharacterIds.includes(char.id)
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/40"
                          : "border-slate-600 bg-slate-950/80 text-transparent hover:border-indigo-400"
                      }`}
                      title={selectedCharacterIds.includes(char.id) ? "Deselect character" : "Select character for batch update"}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </button>
                  </div>
                )}
                
                {/* Upper Details Panel: Avatar, Name, Role Tag, Delete option */}
                <div className={`flex space-x-4 ${isBatchEditMode ? "pl-6" : ""}`}>
                  {/* Avatar & Zoom Container */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        openZoomModal(char, 0);
                      }}
                      className="h-24 w-16 overflow-hidden rounded-xl bg-slate-950 border border-slate-800 relative group/img cursor-pointer"
                      title="Click to view & zoom images"
                    >
                      <img
                        src={char.imageUrl}
                        alt={char.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {Array.isArray(char.images) && char.images.length > 1 && (
                        <span className="absolute bottom-1 right-1 bg-slate-950/85 text-indigo-300 font-mono text-[9px] font-black px-1 py-0.5 rounded border border-indigo-500/40 backdrop-blur-xs">
                          {char.images.length}
                        </span>
                      )}
                    </div>
                    {(char.imageUrl || (Array.isArray(char.images) && char.images.length > 0)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openZoomModal(char, 0);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-3 w-3" />
                        <span>
                          Zoom {Array.isArray(char.images) && char.images.length > 1 ? `(${char.images.length})` : ""}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Identity text */}
                  <div className="min-w-0 flex-1 space-y-1 pr-16">
                    <h3 className="truncate text-base font-extrabold text-white font-sans leading-tight group-hover:text-indigo-400 transition-colors">
                      {char.name}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide ${
                          char.role === "Main"
                            ? "bg-rose-950/40 text-rose-300 border border-rose-900/50"
                            : "bg-slate-850 text-slate-400 border border-slate-800/60"
                        }`}
                      >
                        {char.role}
                      </span>

                      <span
                        className="rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-mono font-bold"
                        title="Variation Title"
                      >
                        {char.variationTitle || "Default"}
                      </span>

                      {(char as any).isGrouped && (char as any).variationCount > 1 && (
                        <span
                          className="rounded bg-violet-600/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 text-[10px] font-mono font-bold flex items-center gap-1"
                          title={`${(char as any).variationCount} total variations for this character. Click Edit to navigate variations.`}
                        >
                          <Layers className="h-3 w-3" />
                          +{(char as any).variationCount - 1} Variations
                        </span>
                      )}

                      <span className="text-xs font-bold text-slate-550 font-mono">
                        MAL ID: {char.malId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 font-mono">
                      <Calendar className="h-3 w-3" />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Card Actions (Edit & Delete - Admin Only) */}
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/database/edit/${char.id}`, { state: { character: char, fromPage: validCurrentPage } });
                        }}
                        className="rounded-xl p-2.5 text-slate-505 hover:bg-slate-800 hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Edit character details"
                      >
                        <Pencil className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmChar(char);
                        }}
                        className="rounded-xl p-2.5 text-slate-500 hover:bg-rose-950/20 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete character from JSON DB"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sourced Anime Works List */}
                <div className="mt-4 border-t border-slate-850 pt-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Selected Sources ({char.sources?.length || 0})</span>
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {char.sources && char.sources.length > 0 ? (
                      char.sources.map((src, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-slate-800 bg-slate-950/50 px-2.5 py-0.5 text-[10px] font-bold text-slate-400 leading-normal"
                        >
                          {src}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-550 italic">None selected</span>
                    )}
                  </div>
                </div>

                {/* Nicknames List */}
                {char.nicknames && char.nicknames.length > 0 && (
                  <div className="mt-4 border-t border-slate-850 pt-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" />
                      <span>Nicknames & Aliases ({char.nicknames.length})</span>
                    </h4>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {char.nicknames.map((nick, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-indigo-950/40 bg-indigo-950/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 leading-normal"
                        >
                          {nick}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Attributes / Stats Traits panel */}
                {char.traits && Object.keys(char.traits).length > 0 && (
                  <div className="mt-4 border-t border-slate-850 pt-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Custom Sourced Traits</span>
                    </h4>
                    
                    <div className="mt-2 space-y-1.5">
                      {Object.entries(char.traits)
                        .sort(([a], [b]) => a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" }))
                        .map(([key, value]) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) return null;
                        const displayVal = Array.isArray(value) ? value.join(", ") : value;
                        return (
                          <div key={key} className="text-xs text-slate-350 leading-normal">
                            <span className="font-extrabold text-indigo-400 font-sans">{key}: </span>
                            <span className="font-semibold">{displayVal}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </motion.div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-900 pt-6 mt-8">
            <div className="text-xs text-slate-500 font-semibold">
              Showing <span className="text-slate-350">{startIndex + 1}</span> to{" "}
              <span className="text-slate-350">
                {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}
              </span>{" "}
              of <span className="text-indigo-400">{totalItems}</span> characters
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                onClick={() => changePage(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                className="rounded-xl border border-slate-805 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Previous
              </button>
              
              {/* First 5 pages */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => {
                const isCurrent = p === validCurrentPage;
                return (
                  <button
                    key={p}
                    onClick={() => changePage(p)}
                    className={`h-8 w-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center border ${
                      isCurrent
                        ? "bg-indigo-650 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "border-slate-805 bg-slate-900/20 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              {/* Custom input in between */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-805 rounded-xl px-2.5 py-1 h-8">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">Go to:</span>
                <input
                  type="text"
                  value={pageInputVal}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPageInputVal(val);
                  }}
                  onBlur={handleCustomPageSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomPageSubmit();
                    }
                  }}
                  className="w-10 text-center text-xs font-black bg-transparent text-indigo-400 focus:outline-hidden focus:ring-0 p-0 border-b border-indigo-500/20"
                />
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">/ {totalPages}</span>
              </div>

              {/* Last 5 pages */}
              {totalPages > 5 && Array.from({ length: totalPages - Math.max(6, totalPages - 4) + 1 }, (_, i) => Math.max(6, totalPages - 4) + i).map((p) => {
                const isCurrent = p === validCurrentPage;
                return (
                  <button
                    key={p}
                    onClick={() => changePage(p)}
                    className={`h-8 w-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center border ${
                      isCurrent
                        ? "bg-indigo-650 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "border-slate-805 bg-slate-900/20 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => changePage(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                className="rounded-xl border border-slate-805 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Custom Non-Native Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmChar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmChar(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Content Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-start gap-4">
                {/* Character visual thumbnail */}
                <div className="h-18 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-slate-850">
                  <img
                    src={deleteConfirmChar.imageUrl}
                    alt={deleteConfirmChar.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top select-none"
                  />
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1">
                    <Trash2 className="h-3 w-3" />
                    <span>Delete Character</span>
                  </span>
                  <h4 className="text-sm font-black text-white truncate">
                    Confirm delete "{deleteConfirmChar.name}"?
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                    This will remove the record completely from the persistent JSON database. This cannot be undone.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-900 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmChar(null)}
                  className="rounded-lg bg-slate-905 hover:bg-slate-800 border border-slate-850 px-4 py-2 text-slate-350 hover:text-white cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCharacter(deleteConfirmChar.id);
                    setDeleteConfirmChar(null);
                  }}
                  className="rounded-lg bg-rose-650 hover:bg-rose-500 px-4 py-2 text-white cursor-pointer hover:shadow-lg hover:shadow-rose-500/10 transition-all font-extrabold"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zoomedCharacter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedCharacter(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-xl w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl flex flex-col items-center gap-3"
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
                    title="Previous Image (Left Arrow)"
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
                    title="Next Image (Right Arrow)"
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

      {/* Confirmation Modal for Batch Trait Modifications */}
      <AnimatePresence>
        {batchConfirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isApplyingBatch) {
                  setBatchConfirmModal({ isOpen: false, action: "add" });
                }
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Content Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-left z-10"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-3 rounded-xl border shrink-0 ${
                    batchConfirmModal.action === "remove"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  }`}
                >
                  {batchConfirmModal.action === "remove" ? (
                    <Trash2 className="h-6 w-6" />
                  ) : (
                    <ShieldAlert className="h-6 w-6" />
                  )}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="text-lg font-black text-white">
                    {batchConfirmModal.action === "remove"
                      ? "Confirm Trait Removal"
                      : "Confirm Trait Addition"}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    {batchConfirmModal.action === "remove"
                      ? `Are you sure you want to remove the selected traits from ${selectedCharacterIds.length} character${selectedCharacterIds.length === 1 ? "" : "s"}?`
                      : `Are you sure you want to merge the selected traits into ${selectedCharacterIds.length} character${selectedCharacterIds.length === 1 ? "" : "s"}?`}
                  </p>
                </div>
              </div>

              {/* Character count stat banner */}
              <div className="flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2">
                <span className="text-xs font-bold text-slate-400">Characters Affected:</span>
                <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {selectedCharacterIds.length} Character{selectedCharacterIds.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Traits to be modified preview box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Traits to be {batchConfirmModal.action === "remove" ? "removed" : "added / merged"}:
                </span>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl bg-slate-950 border border-slate-800 p-3">
                  {Object.entries(batchTraits)
                    .sort(([a], [b]) => a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" }))
                    .map(([key, values]) => {
                    const valArray = Array.isArray(values) ? values : [String(values)];
                    return (
                      <div key={key} className="space-y-1 border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                        <span className="text-xs font-extrabold text-slate-300 capitalize block">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {valArray.map((v, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                                batchConfirmModal.action === "remove"
                                  ? "bg-rose-950/60 text-rose-300 border-rose-500/30"
                                  : "bg-indigo-950/60 text-indigo-300 border-indigo-500/30"
                              }`}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isApplyingBatch}
                  onClick={() => setBatchConfirmModal({ isOpen: false, action: "add" })}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isApplyingBatch}
                  onClick={executeBatchUpdate}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                    batchConfirmModal.action === "remove"
                      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                      : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                  }`}
                >
                  {isApplyingBatch && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>
                    {isApplyingBatch
                      ? "Applying..."
                      : batchConfirmModal.action === "remove"
                      ? "Confirm & Remove"
                      : "Confirm & Merge"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
