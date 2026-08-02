import React, { useState, useEffect } from "react";
import { RegisteredCharacter, TraitOption } from "@shared/types/index";
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Upload, 
  Download, 
  Check, 
  X, 
  AlertCircle, 
  Sliders, 
  Search, 
  Info,
  RefreshCw,
  Sparkles,
  FileText
} from "lucide-react";
import { motion } from "motion/react";

interface TraitsConfigViewProps {
  characters: RegisteredCharacter[];
  onRefreshCharacters: () => void;
  firebaseStatus?: { isConfigured: boolean; usingFallback: boolean; error?: string } | null;
}

export default function TraitsConfigView({ characters, onRefreshCharacters, firebaseStatus }: TraitsConfigViewProps) {
  const [traits, setTraits] = useState<Record<string, TraitOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  
  // Search query for traits
  const [searchQuery, setSearchQuery] = useState("");

  // New Trait state
  const [newTraitName, setNewTraitName] = useState("");
  const [newTraitValues, setNewTraitValues] = useState<TraitOption[]>([]);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionDesc, setNewOptionDesc] = useState("");
  const [newTraitError, setNewTraitError] = useState("");
  const [addingNew, setAddingNew] = useState(false);

  // Edit Trait state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTraitName, setEditTraitName] = useState("");
  const [editTraitValues, setEditTraitValues] = useState<TraitOption[]>([]);
  const [newValueInput, setNewValueInput] = useState("");
  const [newDescInput, setNewDescInput] = useState("");

  // Delete Confirmation state
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);

  // Import State
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const [importedJson, setImportedJson] = useState<Record<string, TraitOption[]> | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importFeedback, setImportFeedback] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Load traits from backend
  const fetchTraits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/traits");
      if (!res.ok) throw new Error("Failed to fetch traits config.");
      const data = await res.json();
      setTraits(data);
    } catch (err: any) {
      console.error(err);
      setErrorObj("Could not load traits configuration from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraits();
  }, []);

  // Calculate character usage
  const getUsageCount = (traitKey: string) => {
    return characters.filter((char) => {
      if (!char.traits) return false;
      const val = char.traits[traitKey];
      if (val === undefined || val === null) return false;
      if (Array.isArray(val)) return val.length > 0;
      return val !== "";
    }).length;
  };

  // Add a brand new trait
  const handleAddTrait = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewTraitError("");

    const key = newTraitName.trim().replace(/\s+/g, "_");
    if (!key) {
      setNewTraitError("Please enter a trait name.");
      return;
    }

    if (traits[key] !== undefined) {
      setNewTraitError("A trait with this name already exists.");
      return;
    }

    if (newTraitValues.length === 0) {
      setNewTraitError("Please add at least one option name and description.");
      return;
    }

    try {
      const updated = { ...traits, [key]: newTraitValues };
      const res = await fetch("/api/traits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setTraits(data.traits);
      setNewTraitName("");
      setNewTraitValues([]);
      setNewOptionName("");
      setNewOptionDesc("");
      setAddingNew(false);
    } catch (err) {
      setNewTraitError("Failed to save the new trait to the server.");
    }
  };

  // Trigger edit session
  const startEditing = (key: string) => {
    setEditingKey(key);
    setEditTraitName(key);
    setEditTraitValues([...(traits[key] || [])]);
    setNewValueInput("");
    setNewDescInput("");
  };

  // Handle Edit Save
  const handleSaveEdit = async () => {
    if (!editingKey) return;
    
    const formattedNewName = editTraitName.trim().replace(/\s+/g, "_");
    if (!formattedNewName) {
      alert("Trait name cannot be empty.");
      return;
    }

    try {
      const res = await fetch("/api/traits/update-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editingKey,
          newKey: formattedNewName,
          values: editTraitValues,
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setTraits(data.traits);
      setEditingKey(null);
      onRefreshCharacters(); // Refresh character traits in app state too!
    } catch (err) {
      console.error(err);
      alert("Failed to update trait.");
    }
  };

  // Remove option from working edits
  const handleRemoveOptionFromEdit = (indexToRemove: number) => {
    setEditTraitValues((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateOptionInEdit = (index: number, field: "name" | "description", val: string) => {
    setEditTraitValues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Add option to working edits inline
  const handleAddOptionToEdit = () => {
    const valueToAdd = newValueInput.trim();
    const descToAdd = newDescInput.trim();
    if (!valueToAdd) return;
    if (editTraitValues.some(opt => opt.name.toLowerCase() === valueToAdd.toLowerCase())) {
      alert("Option name already exists in this trait.");
      return;
    }
    setEditTraitValues((prev) => [...prev, { name: valueToAdd, description: descToAdd }]);
    setNewValueInput("");
    setNewDescInput("");
  };

  // Handle deletion of whole trait
  const handleDeleteTrait = async () => {
    if (!deleteConfirmKey) return;

    try {
      const res = await fetch("/api/traits/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: deleteConfirmKey }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setTraits(data.traits);
      setDeleteConfirmKey(null);
      onRefreshCharacters(); // Reload character list because references were deleted
    } catch (err) {
      console.error(err);
      alert("Failed to delete trait.");
    }
  };

  // Export to local JSON file
  const handleExportTraits = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(traits, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "traits_config_db.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Drop / File upload parsers
  const handleFileParse = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (typeof json !== "object" || Array.isArray(json)) {
          setImportStatus("error");
          setImportFeedback("Invalid format. The traits backup needs to be a JSON object.");
          return;
        }
        
        // Validate traits schema and normalize to TraitOption[]
        const normalized: Record<string, TraitOption[]> = {};
        for (const [k, v] of Object.entries(json)) {
          if (!Array.isArray(v)) {
            setImportStatus("error");
            setImportFeedback(`The value associated with the key "${k}" is not an array. Please check the file.`);
            return;
          }
          normalized[k] = v.map((item: any) => {
            if (typeof item === "string") {
              return { name: item, description: `${item} characteristic for ${k.replace(/_/g, " ")}` };
            }
            return {
              name: String(item.name || "").trim(),
              description: String(item.description || "").trim()
            };
          });
        }

        setImportedJson(normalized);
        setImportStatus("idle");
        setImportFeedback(`File read successfully! Contains ${Object.keys(normalized).length} traits ready for import.`);
      } catch (err) {
        setImportStatus("error");
        setImportFeedback("The uploaded file is not a valid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileParse(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileParse(e.target.files[0]);
    }
  };

  // Save imported traits list
  const handleSaveImported = async () => {
    if (!importedJson) return;

    try {
      let finalTraits = {};
      if (importMode === "overwrite") {
        finalTraits = importedJson;
      } else {
        // Merge mode - union keys and unique merge array values
        finalTraits = { ...traits };
        for (const [key, values] of Object.entries(importedJson as Record<string, TraitOption[]>)) {
          const currentValues = (finalTraits as any)[key] || [];
          const mergedList = [...currentValues];
          values.forEach((newOpt) => {
            if (!mergedList.some(v => v.name.toLowerCase() === newOpt.name.toLowerCase())) {
              mergedList.push(newOpt);
            }
          });
          (finalTraits as any)[key] = mergedList;
        }
      }

      const res = await fetch("/api/traits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalTraits),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setTraits(data.traits);
      setImportStatus("success");
      setImportFeedback("Traits configuration imported successfully!");
      setTimeout(() => {
        setShowImportDialog(false);
        setImportedJson(null);
        setImportStatus("idle");
        setImportFeedback("");
      }, 1500);
    } catch (err) {
      setImportStatus("error");
      setImportFeedback("Error saving new traits configurations in the database.");
    }
  };

  // Filter keys based on search box
  const filteredKeys = Object.keys(traits)
    .filter((key) => {
      const matchesKey = key.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesValue = traits[key].some((val) => 
        val.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        val.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchesKey || matchesValue;
    })
    .sort((a, b) => a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" }));

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Stats info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white font-sans flex flex-wrap items-center gap-2">
            <span>Traits Configuration</span>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              {Object.keys(traits).length} Registered
            </span>
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
            Manage characteristics (traits) that characters can possess, and import or export structural configurations.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAddingNew(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Trait</span>
          </button>

          <button
            onClick={() => setShowImportDialog(!showImportDialog)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <Upload className="h-4 w-4 text-indigo-400" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExportTraits}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Export</span>
          </button>

          <button
            onClick={fetchTraits}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-850 hover:text-white cursor-pointer"
            title="Reload data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Import / Restore Panel */}
      {showImportDialog && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-5 shadow-2xl backdrop-blur-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <h4 className="text-sm font-black text-white font-sans flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-400" />
                <span>Import Traits Configuration (JSON)</span>
              </h4>
              <p className="text-[11px] text-slate-455 mt-0.5 font-semibold">
                Upload or drop a structured backup of your registered traits configurations.
              </p>
            </div>
            <button
              onClick={() => {
                setShowImportDialog(false);
                setImportedJson(null);
                setImportStatus("idle");
                setImportFeedback("");
              }}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60"
                }`}
              >
                <input
                  type="file"
                  id="traits-file-upload"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileText className="h-8 w-8 text-indigo-450 mb-2" />
                <p className="text-xs font-bold text-slate-350">
                  Drag and drop <code className="text-indigo-400">traits_config_db.json</code> here
                </p>
                <p className="text-[10px] text-slate-550 mt-1 font-mono">Or click below to open file dialog</p>
                <label
                  htmlFor="traits-file-upload"
                  className="mt-4 rounded-lg bg-indigo-600/35 hover:bg-indigo-600 border border-indigo-500/30 px-3.5 py-1.5 text-xs font-black text-white transition-colors cursor-pointer shadow-xs"
                >
                  Browse File...
                </label>
              </div>

              {importFeedback && (
                <div
                  className={`flex items-start gap-2 rounded-xl border p-4 text-[11px] font-bold ${
                    importStatus === "error"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      : importStatus === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-indigo-500/5 border-indigo-500/10 text-indigo-300"
                  }`}
                >
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{importFeedback}</span>
                </div>
              )}
            </div>

            {/* Config & Action Columns */}
            <div className="space-y-4 rounded-xl bg-slate-950/60 p-4 border border-slate-850">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Import Strategy</h5>
              
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setImportMode("merge")}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all cursor-pointer ${
                    importMode === "merge"
                      ? "border-indigo-500 bg-indigo-500/5 text-slate-200"
                      : "border-slate-855 hover:bg-slate-900/30 text-slate-450"
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-black">Merge Conflicts (Merge)</p>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-semibold">Unites new values with existing ones in the database.</p>
                  </div>
                  <span className={`inline-block h-2 w-2 rounded-full ${importMode === "merge" ? "bg-indigo-400 animate-pulse" : "bg-slate-600"}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode("overwrite")}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all cursor-pointer ${
                    importMode === "overwrite"
                      ? "border-rose-500/60 bg-rose-500/5 text-slate-205"
                      : "border-slate-855 hover:bg-slate-900/30 text-slate-450"
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-black text-rose-450">Overwrite Existing</p>
                    <p className="text-[9px] text-slate-505 mt-0.5 font-semibold">Discards all current definitions and replaces them with the file.</p>
                  </div>
                  <span className={`inline-block h-2 w-2 rounded-full ${importMode === "overwrite" ? "bg-rose-500 animate-pulse" : "bg-slate-600"}`} />
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveImported}
                  disabled={!importedJson}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 px-4 py-2.5 text-xs font-black text-white transition-colors disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                  <span>Apply Import</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add New Trait Box */}
      {addingNew && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-2xl border border-slate-850 bg-slate-900/40 p-6 space-y-4 shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white font-sans flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <span>Register New Trait</span>
            </h3>
            <button
              onClick={() => {
                setAddingNew(false);
                setNewTraitError("");
                setNewTraitValues([]);
              }}
              className="text-slate-505 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleAddTrait} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Trait Name</label>
                <input
                  type="text"
                  value={newTraitName}
                  onChange={(e) => setNewTraitName(e.target.value)}
                  placeholder="e.g. Weapon_Type, Fur_Traits"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-850/50 pt-3">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono block">Trait Options / Choices ({newTraitValues.length})</span>
              
              {/* Option List Table */}
              <div className="rounded-xl border border-slate-850 bg-slate-950/40 p-1.5 max-h-48 overflow-y-auto space-y-2">
                {newTraitValues.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center italic font-semibold">No options added yet. Register options below.</p>
                ) : (
                  newTraitValues.map((opt, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-850/65 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-indigo-300 truncate">{opt.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{opt.description || "No description"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewTraitValues(prev => prev.filter((_, i) => i !== idx))}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Option Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end pt-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Option Name</label>
                  <input
                    type="text"
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    placeholder="e.g. giant"
                    className="w-full rounded-lg border border-slate-850 bg-slate-955 py-1.5 px-2.5 text-[11px] text-slate-205 placeholder-slate-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Option Description</label>
                  <input
                    type="text"
                    value={newOptionDesc}
                    onChange={(e) => setNewOptionDesc(e.target.value)}
                    placeholder="e.g. Characters that exceeds human heights"
                    className="w-full rounded-lg border border-slate-850 bg-slate-955 py-1.5 px-2.5 text-[11px] text-slate-205 placeholder-slate-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const name = newOptionName.trim();
                    const desc = newOptionDesc.trim();
                    if (!name) return;
                    if (newTraitValues.some(opt => opt.name.toLowerCase() === name.toLowerCase())) {
                      alert("Option with this name already exists.");
                      return;
                    }
                    setNewTraitValues(prev => [...prev, { name, description: desc }]);
                    setNewOptionName("");
                    setNewOptionDesc("");
                  }}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-black text-white cursor-pointer"
                >
                  Add Option
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end border-t border-slate-850/50 pt-3">
              <button
                type="submit"
                disabled={newTraitValues.length === 0}
                className="rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-45 border border-indigo-500/20 px-5 py-2 text-xs font-black text-white transition-all cursor-pointer shadow-md"
              >
                Save Trait
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingNew(false);
                  setNewTraitError("");
                  setNewTraitValues([]);
                }}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4.5 py-2 text-xs font-bold text-slate-450 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>

          {newTraitError && (
            <p className="text-[11px] font-bold text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{newTraitError}</span>
            </p>
          )}
        </motion.div>
      )}

      {/* Main Grid View */}
      <div className="rounded-2xl border border-slate-855 bg-slate-900/25 p-6 space-y-6">
        
        {/* Search header bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-850/60 pb-5">
          <div className="relative w-full sm:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-500" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter traits by name or value..."
              className="w-full rounded-xl border border-slate-800 bg-slate-955/75 py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-550 focus:outline-hidden focus:border-indigo-500 font-semibold"
            />
          </div>

          <div className="text-[11px] font-semibold text-slate-455 mr-2 flex items-center gap-1">
            <Info className="h-4 w-4 text-slate-500" />
            <span>Underscored keys like <code className="text-indigo-400">Hair_Color</code> preserve formatting in character registration.</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
            <p className="text-xs text-slate-450 font-bold leading-relaxed">Loading traits definitions from server...</p>
          </div>
        ) : errorObj ? (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-5 text-sm text-rose-300">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{errorObj}</span>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-850 rounded-2xl">
            <Sliders className="h-8 w-8 text-slate-700 mx-auto mb-3" />
            <p className="text-xs text-slate-450 font-extrabold leading-relaxed">No traits match your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredKeys.map((key) => {
              const isEditingThis = editingKey === key;
              const values = traits[key] || [];
              const usageCount = getUsageCount(key);

              return (
                <div
                  key={key}
                  id={`trait-card-${key}`}
                  className="group flex flex-col rounded-xl border border-slate-850 bg-slate-955/20 p-5 hover:bg-slate-900/25 hover:border-slate-800 shadow-xs transition-all duration-150"
                >
                  
                  {isEditingThis ? (
                    /* EDITING SUB-FORM MODE */
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Trait Name</label>
                        <input
                          type="text"
                          value={editTraitName}
                          onChange={(e) => setEditTraitName(e.target.value)}
                          className="w-full rounded-xl border border-slate-850 bg-slate-950 p-2 text-xs text-white font-black"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono block">Trait Values & Descriptions</label>
                        
                        {/* Scrollable list of structured options with inline inputs */}
                        <div className="space-y-2.5 max-h-48 overflow-y-auto p-1.5 rounded-lg bg-slate-950/40 border border-slate-900">
                          {editTraitValues.length === 0 ? (
                            <span className="text-[10px] text-slate-600 py-2 px-2 italic block text-center">No values registered. Add one below.</span>
                          ) : (
                            editTraitValues.map((v, idx) => (
                              <div
                                key={`edit-opt-${idx}`}
                                className="flex flex-col sm:flex-row gap-2 bg-slate-900/50 p-2 border border-slate-850/60 rounded-lg items-stretch sm:items-center justify-between"
                              >
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={v.name}
                                    onChange={(e) => handleUpdateOptionInEdit(idx, "name", e.target.value)}
                                    placeholder="Option Name"
                                    className="w-full rounded bg-slate-950 px-2 py-0.5 text-[11px] font-bold text-indigo-300 focus:outline-hidden"
                                  />
                                  <input
                                    type="text"
                                    value={v.description}
                                    onChange={(e) => handleUpdateOptionInEdit(idx, "description", e.target.value)}
                                    placeholder="Option Description"
                                    className="w-full rounded bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400 focus:outline-hidden"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionFromEdit(idx)}
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-750 hover:text-red-450 self-end sm:self-center cursor-pointer"
                                  title="Remove value"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Input line to append option inside working definition */}
                        <div className="bg-slate-900/30 border border-slate-850/50 p-2 rounded-lg space-y-2">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase font-mono">Create New Option</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newValueInput}
                              onChange={(e) => setNewValueInput(e.target.value)}
                              placeholder="Name: e.g. giant"
                              className="rounded bg-slate-950 border border-slate-850 py-1 px-2 text-[10px] text-white"
                            />
                            <input
                              type="text"
                              value={newDescInput}
                              onChange={(e) => setNewDescInput(e.target.value)}
                              placeholder="Description: e.g. Exceeds heights"
                              className="rounded bg-slate-950 border border-slate-850 py-1 px-2 text-[10px] text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddOptionToEdit}
                            disabled={!newValueInput.trim()}
                            className="w-full rounded bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 py-1 text-[11px] font-black text-white cursor-pointer"
                          >
                            Add to List
                          </button>
                        </div>
                      </div>

                      {/* Operation Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
                        <button
                          type="button"
                          onClick={() => setEditingKey(null)}
                          className="rounded-lg border border-slate-850 bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-205"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4.5 py-1.5 text-xs font-black text-white shadow-md shadow-indigo-600/10 cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW DETAILED CARD MODE */
                    <div className="flex flex-col h-full justify-between space-y-4">
                      
                      {/* Top metadata actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-white tracking-tight font-sans">
                            {key.replace(/_/g, " ")}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono tracking-tight font-bold">
                            Technical key: <code className="text-indigo-400">{key}</code>
                          </span>
                        </div>

                        {/* Actions group */}
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          
                          <div className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-lg border border-slate-850 bg-slate-950 text-indigo-400 font-sans shadow-inner mr-1">
                            {usageCount} {usageCount === 1 ? "character" : "characters"}
                          </div>

                          <button
                            onClick={() => startEditing(key)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
                            title="Edit trait"
                          >
                            <Pencil className="h-3.5 w-3.5 text-amber-500" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmKey(key)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-805 hover:text-red-405 cursor-pointer"
                            title="Delete trait"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          </button>
                        </div>
                      </div>

                      {/* Displayed pills options */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {values.length === 0 ? (
                          <span className="text-[10px] text-slate-500 italic">No values registered for this trait.</span>
                        ) : (
                          values.slice(0, 15).map((v) => (
                            <div
                              key={v.name}
                              title={v.description}
                              className="group/pill relative rounded-lg border border-slate-850 bg-slate-950/40 px-2.5 py-1 text-[11px] font-bold text-slate-350 cursor-help hover:border-indigo-500/35 hover:text-white transition-all"
                            >
                              <span>{v.name}</span>
                              {v.description && (
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/pill:block w-48 bg-slate-950 text-slate-200 text-[9px] font-semibold rounded p-1.5 shadow-xl border border-slate-800 text-center z-20">
                                  {v.description}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                        {values.length > 15 && (
                          <span className="rounded-lg border border-slate-855 bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-indigo-400">
                            +{values.length - 15} more
                          </span>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal Overlay */}
      {deleteConfirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Trash2 className="h-5 w-5" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-white font-sans">Delete Registered Trait?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are about to delete the trait <strong className="text-red-450">"{deleteConfirmKey.replace(/_/g, " ")}"</strong> from the database.
              </p>
              <div className="rounded-xl bg-red-950/30 border border-red-900/40 p-3 text-[11px] font-bold text-red-300 leading-relaxed">
                ⚠️ This will remove this property from all{" "}
                <span className="text-white font-extrabold underline">{getUsageCount(deleteConfirmKey)}</span> registered characters currently using it. This action is irreversible.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmKey(null)}
                className="flex-1 rounded-xl border border-slate-805 bg-slate-900 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleDeleteTrait}
                className="flex-1 rounded-xl bg-red-650 hover:bg-red-650/90 py-2.5 text-xs font-black text-white shadow-lg shadow-red-650/15 cursor-pointer"
              >
                Confirm Deletion
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
