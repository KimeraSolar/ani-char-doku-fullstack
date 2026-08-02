import React, { useState, useEffect, useRef } from "react";
import { Plus, X, Sparkles, Check, Search, ShieldAlert } from "lucide-react";
import { TraitOption } from "@shared/types/index";

interface TraitsFormProps {
  initialTraits: Record<string, string | string[]>;
  onClose: () => void;
  onSave?: (traits: Record<string, string[]>) => void;
  onChange?: (traits: Record<string, string[]>) => void;
  hideApplyButton?: boolean;
}

export default function TraitsForm({ initialTraits, onClose, onSave, onChange, hideApplyButton }: TraitsFormProps) {
  // Load trait list from JSON database
  const [availableTraits, setAvailableTraits] = useState<Record<string, TraitOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  // Search filter for traits
  const [searchQuery, setSearchQuery] = useState("");

  // Track currently selected values for each trait for the character we are building/editing
  // This maps: traitName -> string[]
  const [selectedTraits, setSelectedTraits] = useState<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    Object.entries(initialTraits).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        result[key] = [...val];
      } else if (val) {
        // Fallback to splitting if it is a comma list or just placing it as single item
        result[key] = val.split(",").map(v => v.trim()).filter(Boolean);
      } else {
        result[key] = [];
      }
    });
    return result;
  });

  // Use ref for onChange to prevent infinite re-render loops
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Notify parent on selectedTraits change if onChange prop is provided
  useEffect(() => {
    if (onChangeRef.current) {
      const result: Record<string, string[]> = {};
      Object.keys(selectedTraits).forEach((k) => {
        const list = selectedTraits[k];
        if (list && list.length > 0) {
          result[k] = list;
        }
      });
      onChangeRef.current(result);
    }
  }, [selectedTraits]);

  // Track search queries per trait key
  const [traitSearchQueries, setTraitSearchQueries] = useState<Record<string, string>>({});

  // Track custom value per trait input fields
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});

  // Track fully new trait creation inputs
  const [newTraitKey, setNewTraitKey] = useState("");
  const [newTraitValue, setNewTraitValue] = useState("");

  // Fetch traits database
  useEffect(() => {
    fetch("/api/traits")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load traits database.");
        return res.json();
      })
      .then((data) => {
        setAvailableTraits(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorObj("Could not fetch the traits configuration from the server database.");
        setLoading(false);
      });
  }, []);

  // Toggle option selection
  const handleToggleOption = (traitKey: string, option: string) => {
    setSelectedTraits((prev) => {
      const current = prev[traitKey] || [];
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return {
        ...prev,
        [traitKey]: updated,
      };
    });
  };

  // Add a brand new value to an existing trait
  const handleAddInlineValue = async (traitKey: string) => {
    const valueToAdd = inlineInputs[traitKey]?.trim();
    if (!valueToAdd) return;

    const newOptObj: TraitOption = {
      name: valueToAdd,
      description: `Custom added choice for ${traitKey.replace(/_/g, " ")}`
    };

    // Fast local state update for excellent UX responsiveness
    setAvailableTraits((prev) => {
      const list = prev[traitKey] || [];
      if (list.some(opt => opt.name.toLowerCase() === valueToAdd.toLowerCase())) return prev;
      return {
        ...prev,
        [traitKey]: [...list, newOptObj],
      };
    });

    setSelectedTraits((prev) => {
      const list = prev[traitKey] || [];
      if (list.includes(valueToAdd)) return prev;
      return {
        ...prev,
        [traitKey]: [...list, valueToAdd],
      };
    });

    // Clear the input
    setInlineInputs((prev) => ({ ...prev, [traitKey]: "" }));

    // Send backend database sync asynchronously
    try {
      const response = await fetch("/api/traits/add-value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: traitKey, value: valueToAdd, description: newOptObj.description }),
      });
      if (!response.ok) {
        console.error("Failed to persist newly added trait value to database server.");
      } else {
        const data = await response.json();
        if (data && data.traits) {
          setAvailableTraits(data.traits);
        }
      }
    } catch (err) {
      console.error("Server synchronization failed:", err);
    }
  };

  // Create a brand new custom trait field entirely from scratch
  const handleCreateNewTraitHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = newTraitKey.trim();
    const val = newTraitValue.trim();
    if (!key || !val) return;

    // Sanitize Key to replace spaces with underscores, keeping in accordance with the pre-existing traits standard (e.g. Skin_marks)
    let sanitizedKey = key.replace(/\s+/g, "_");

    const newOptObj: TraitOption = {
      name: val,
      description: `Default option for newly registered trait ${sanitizedKey.replace(/_/g, " ")}`
    };

    // Local update
    setAvailableTraits((prev) => ({
      ...prev,
      [sanitizedKey]: [newOptObj],
    }));

    setSelectedTraits((prev) => ({
      ...prev,
      [sanitizedKey]: [val],
    }));

    setNewTraitKey("");
    setNewTraitValue("");

    // Persist to server
    try {
      const response = await fetch("/api/traits/add-value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sanitizedKey, value: val, description: newOptObj.description }),
      });
      if (!response.ok) {
        console.error("Failed to create new custom traits header in database.");
      } else {
        const data = await response.json();
        if (data && data.traits) {
          setAvailableTraits(data.traits);
        }
      }
    } catch (err) {
      console.error("Server registration error:", err);
    }
  };

  const handleSaveAll = () => {
    const result: Record<string, string[]> = {};
    Object.keys(selectedTraits).forEach((k) => {
      const list = selectedTraits[k];
      if (list && list.length > 0) {
        result[k] = list;
      }
    });
    if (onSave) {
      onSave(result);
    }
  };

  // Sort traits list to keep original pre-defined order, followed by any custom traits at the bottom
  const originalOrder = [
    "Gender", "Race", "Size", "Age", "Skin_tone", "Skin_marks", "Fur_color", "Hair_color",
    "Hair_length", "Hair_traits", "Head_traits", "Head_accessories", "Ear_type", "Eye_color",
    "Eye_accessories", "Mouth_traits", "Clothes_color"
  ];

  const sortedTraitKeys = Object.keys(availableTraits).sort((a, b) => {
    return a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" });
  });

  // Filter keys based on search query matching either the trait name or an existing option within it
  const filteredTraitKeys = sortedTraitKeys.filter((key) =>
    key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (availableTraits[key] && availableTraits[key].some((val) => 
      val.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      val.description.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  );

  return (
    <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-6 shadow-xl space-y-5">
      
      {/* Header and Details */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-4">
        <div>
          <h3 className="text-lg font-black text-white font-sans flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span>Interactive Traits Multiselect</span>
          </h3>
          <p className="text-xs text-slate-400">
            Pulling directly from live server JSON database. Click multiple pills, or add persistent values.
          </p>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-850 hover:text-slate-200 cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          <p className="text-xs font-semibold leading-relaxed">Loading live Traits database options...</p>
        </div>
      ) : errorObj ? (
        <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-300">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-rose-400" />
          <span>{errorObj}</span>
        </div>
      ) : (
        <>
          {/* Controls: Search and Dynamic Trait Creation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Search filter input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search traits (e.g. Hair, Gender)..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 pl-9 pr-3.5 text-xs text-white placeholder-slate-550 focus:outline-hidden focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Fast Dynamic Trait Creator */}
            <form onSubmit={handleCreateNewTraitHeader} className="flex gap-2">
              <input
                type="text"
                placeholder="New Trait: e.g. Weapon"
                value={newTraitKey}
                onChange={(e) => setNewTraitKey(e.target.value)}
                className="flex-1 min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 py-2 px-3 text-xs text-indigo-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-bold"
              />
              <input
                type="text"
                placeholder="Value: e.g. Sword"
                value={newTraitValue}
                onChange={(e) => setNewTraitValue(e.target.value)}
                className="flex-1 min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 py-2 px-3 text-xs text-slate-205 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newTraitKey.trim() || !newTraitValue.trim()}
                className="rounded-xl bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/20 px-3 py-2 text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer"
              >
                Create Trait
              </button>
            </form>

          </div>

          {/* Traits Multiselect Canvas list */}
          <div className="max-h-[440px] overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredTraitKeys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-850 p-10 text-center">
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">No trait keys met your search filter.</p>
              </div>
            ) : (
              filteredTraitKeys.map((key) => {
                const options = [...(availableTraits[key] || [])].sort((a, b) =>
                  a.name.localeCompare(b.name)
                );
                const localSearch = traitSearchQueries[key] || "";
                const filteredOptions = options.filter((opt) =>
                  opt.name.toLowerCase().includes(localSearch.toLowerCase())
                );
                const selected = selectedTraits[key] || [];
                const inlineVal = inlineInputs[key] || "";

                return (
                  <div
                    key={key}
                    id={`trait-section-${key}`}
                    className="rounded-xl border border-slate-850 bg-slate-950/20 p-4 space-y-3.5 hover:border-slate-800/80 transition-all duration-150"
                  >
                    
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900/50 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white font-sans tracking-tight">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold">
                          ({selected.length} active)
                        </span>
                      </div>
                    </div>

                    {/* Controls Row: Search existing options & Add custom option */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950/15 p-2 rounded-xl border border-slate-900/40">
                      
                      {/* Search / Filter Input */}
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                          <Search className="h-3.5 w-3.5 text-slate-500" />
                        </span>
                        <input
                          type="text"
                          value={localSearch}
                          onChange={(e) =>
                            setTraitSearchQueries((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={`Search ${key.replace(/_/g, " ").toLowerCase()} options...`}
                          className="w-full rounded-lg border border-slate-850 bg-slate-950/70 py-1.5 pl-8 pr-2.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-semibold"
                        />
                      </div>

                      {/* Add new reusable value */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={inlineVal}
                          onChange={(e) =>
                            setInlineInputs((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddInlineValue(key);
                            }
                          }}
                          placeholder={`Add reusable value...`}
                          className="flex-1 rounded-lg border border-slate-850 bg-slate-950/70 py-1.5 px-2.5 text-[11px] text-slate-205 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddInlineValue(key)}
                          disabled={!inlineVal.trim()}
                          className="rounded-lg bg-indigo-650 p-2 text-slate-200 hover:bg-indigo-550 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                    </div>

                    {/* Multiselect tag badge options */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {filteredOptions.length === 0 ? (
                        <p className="text-[11px] text-slate-600 font-bold">
                          {options.length === 0 
                            ? "No values available. Enter a value above to register one."
                            : "No matching options found."}
                        </p>
                      ) : (
                        filteredOptions.map((opt) => {
                          const isSelected = selected.includes(opt.name);
                          return (
                            <button
                              type="button"
                              key={opt.name}
                              onClick={() => handleToggleOption(key, opt.name)}
                              title={opt.description}
                              className={`group/badge relative inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-600/95 border-indigo-500 text-white shadow-xs shadow-indigo-600/10"
                                  : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-indigo-200" />}
                              <span>{opt.name}</span>
                              {opt.description && (
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/badge:block w-44 bg-slate-950 text-slate-200 text-[9px] font-semibold rounded p-1.5 shadow-xl border border-slate-800 text-center z-20">
                                  {opt.description}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Bottom active traits specification breakdown review */}
          <div className="rounded-xl border border-slate-850 bg-slate-950/40 p-3 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mr-1">Active Selections:</span>
            {Object.keys(selectedTraits).filter((k) => selectedTraits[k] && selectedTraits[k].length > 0).length === 0 ? (
              <span className="text-xs text-slate-550 italic">None selected yet. Make selections above.</span>
            ) : (
              Object.keys(selectedTraits)
                .filter((k) => selectedTraits[k] && selectedTraits[k].length > 0)
                .sort((a, b) => a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" }))
                .map((k) => {
                  const list = selectedTraits[k];
                  return (
                    <span key={k} className="text-[11px] text-slate-350">
                      <strong className="text-indigo-400 font-semibold">{k.replace(/_/g, " ")}</strong>: {list.join(", ")}
                    </span>
                  );
                })
            )}
          </div>
        </>
      )}

      {/* Footer operations buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-850">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
        >
          {hideApplyButton ? "Close Traits Builder" : "Cancel"}
        </button>
        {!hideApplyButton && (
          <button
            type="button"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/25 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Apply Multiselect Traits</span>
          </button>
        )}
      </div>

    </div>
  );
}
