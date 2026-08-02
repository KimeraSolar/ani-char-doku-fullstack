import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Anime } from "@shared/types/index";
import { ArrowLeft, Save, Sparkles, ShieldAlert, Sliders, Check, ZoomIn, X, Upload, Plus, Trash2, ChevronLeft, ChevronRight, FileImage } from "lucide-react";
import TraitsForm from "./TraitsForm";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

interface RegisterFormProps {
  chromeAnime?: Anime;
  character: any;
  role?: string;
  isEdit?: boolean;
  dbAnimes?: any[];
  onBack: (page?: number) => void;
  onRegisterSuccess: (stayInBrowse: boolean, page?: number) => void;
}

export default function RegisterForm(props: Partial<RegisterFormProps>) {
  const { animeId, charId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isEdit = location.pathname.includes("/edit/") || props.isEdit || false;

  const [chromeAnime, setChromeAnime] = useState<Anime | null>(props.chromeAnime || location.state?.anime || null);
  const [character, setCharacter] = useState<any>(props.character || location.state?.character || null);
  const [role, setRole] = useState<string | undefined>(props.role || location.state?.role);
  const [dbAnimes, setDbAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch registered database animes to canonicalize source titles
        try {
          const dbAnimesRes = await fetch("/api/database/animes");
          if (dbAnimesRes.ok) {
            const list = await dbAnimesRes.json();
            if (active) setDbAnimes(list);
          }
        } catch (e) {
          console.warn("Failed to fetch registered database animes:", e);
        }

        let loadedChar = character;
        let loadedAnime = chromeAnime;

        if (isEdit) {
          // Edit mode: fetch from local DB
          const res = await fetch("/api/database");
          if (!res.ok) throw new Error("Failed to load database characters.");
          const dbChars = await res.json();
          const found = dbChars.find((c: any) => c.id === charId || c.malId?.toString() === charId);
          if (!found) throw new Error("Character not found in database.");
          loadedChar = found;
          loadedAnime = null; // In edit mode, we don't strictly need chromeAnime

          // Fetch full character details from Tenrai to get potential nicknames & source works
          if (found.malId) {
            try {
              const jRes = await fetch(`/api/proxy/character/${found.malId}`);
              if (jRes.ok) {
                const jData = await jRes.json();
                if (jData.data) {
                  const apiNicknames = jData.data.nicknames || [];
                  const apiSources = jData.data.anime 
                    ? jData.data.anime.map((a: any) => a.anime?.title)
                    : [];
                  
                  loadedChar = {
                    ...loadedChar,
                    apiNicknames,
                    apiSources,
                  };
                } else {
                  loadedChar = {
                    ...loadedChar,
                    apiNicknames: [],
                    apiSources: [],
                  };
                }
              } else {
                loadedChar = {
                  ...loadedChar,
                  apiNicknames: [],
                  apiSources: [],
                };
              }
            } catch (err) {
              console.warn("Failed to load Tenrai character details in edit mode:", err);
              loadedChar = {
                ...loadedChar,
                apiNicknames: [],
                apiSources: [],
              };
            }
          } else {
            loadedChar = {
              ...loadedChar,
              apiNicknames: [],
              apiSources: [],
            };
          }
        } else {
          // Register mode: fetch character and anime from Tenrai
          const targetCharId = charId || character?.malId || character?.mal_id;
          if (targetCharId) {
            const res = await fetch(`/api/proxy/character/${targetCharId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.data) {
                const apiNicknames = data.data.nicknames || [];
                const apiSources = data.data.anime 
                  ? data.data.anime.map((a: any) => a.anime?.title)
                  : [];
                loadedChar = {
                  ...character,
                  ...data.data,
                  apiNicknames,
                  apiSources,
                };
              }
            }
          }
          const targetAnimeId = animeId || chromeAnime?.mal_id;
          if (targetAnimeId) {
            try {
              const res = await fetch(`/api/proxy/anime/${targetAnimeId}`);
              if (res.ok) {
                const data = await res.json();
                loadedAnime = data.data;
              } else {
                // Try to find the anime in the registered database
                const dbRes = await fetch("/api/database/animes");
                if (dbRes.ok) {
                  const fetchedDbAnimes = await dbRes.json();
                  const registeredAnime = fetchedDbAnimes.find((a: any) => a.malId === Number(targetAnimeId));
                  if (registeredAnime) {
                    loadedAnime = {
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
                  }
                }
              }
            } catch (err) {
              console.warn("Failed to load anime details from API or Database:", err);
            }
          }
        }

        if (active) {
          if (loadedChar) setCharacter(loadedChar);
          if (loadedAnime) setChromeAnime(loadedAnime);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "An error occurred while loading form data.");
          setLoading(false);
        }
      }
    };

    loadData();
    return () => { active = false; };
  }, [animeId, charId, isEdit]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-4" />
        <p className="text-sm font-semibold animate-pulse">Loading character details...</p>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="rounded-2xl border border-rose-900/40 bg-rose-950/15 p-6 text-center max-w-lg mx-auto mt-12">
        <p className="text-sm font-bold text-rose-400 mb-4">{error || "Character details could not be loaded."}</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <RegisterFormInner
      chromeAnime={chromeAnime || undefined}
      character={character}
      role={role}
      isEdit={isEdit}
      dbAnimes={dbAnimes}
      onBack={(page) => {
        if (props.onBack) {
          props.onBack(page);
        } else {
          navigate(-1);
        }
      }}
      onRegisterSuccess={(stay, page) => {
        if (props.onRegisterSuccess) {
          props.onRegisterSuccess(stay, page);
        } else {
          if (!stay) {
            navigate(page ? `/database?page=${page}` : "/database");
          }
        }
      }}
    />
  );
}

function RegisterFormInner({
  chromeAnime,
  character,
  role,
  isEdit = false,
  dbAnimes = [],
  onBack,
  onRegisterSuccess,
}: RegisterFormProps) {
  const location = useLocation();
  
  // Variation and editing state
  const [editingId, setEditingId] = useState<string | undefined>(character.id);
  const [variationTitle, setVariationTitle] = useState<string>(character.variationTitle || "Default");
  const [siblingVariations, setSiblingVariations] = useState<any[]>([]);
  const [draftVariations, setDraftVariations] = useState<any[]>([]);
  const [variationNotification, setVariationNotification] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [savingVariation, setSavingVariation] = useState<boolean>(false);
  const [deletingVariation, setDeletingVariation] = useState<boolean>(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    onConfirm: () => {},
  });

  // 1. Text Field: Name
  const [name, setName] = useState(character.name || "");
  const [isZoomed, setIsZoomed] = useState(false);
  
  // 2. Image Field: Image Gallery State
  const [images, setImages] = useState<any[]>(() => {
    if (Array.isArray(character.images) && character.images.length > 0) {
      return character.images.map((img: any) => ({
        url: typeof img === 'string' ? img : (img.url || img.imageUrl || ""),
        label: typeof img === 'string' ? "Profile Image" : (img.label || "Profile Image")
      }));
    }
    const initialUrl = character.images?.jpg?.image_url || character.imageUrl || "";
    if (initialUrl) {
      return [{ url: initialUrl, label: "Default Profile" }];
    }
    return [];
  });
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!isZoomed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      } else if (e.key === "Escape") {
        setIsZoomed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomed, images.length]);

  // Refs & State for Cropper Modal
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>("");
  const [cropLabel, setCropLabel] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [imgDisplaySize, setImgDisplaySize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState("");

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropImageSrc(event.target.result as string);
        const defaultLabel = "Default Profile";
        setCropLabel(defaultLabel);
        setCropZoom(1);
        setCropPan({ x: 0, y: 0 });
        setImgDisplaySize({ width: 0, height: 0 });
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadUrlForCropping = () => {
    const url = manualUrlInput.trim();
    if (!url) return;
    setCropImageSrc(url);
    setCropLabel("MAL Image Source");
    setCropZoom(1);
    setCropPan({ x: 0, y: 0 });
    setImgDisplaySize({ width: 0, height: 0 });
    setShowCropModal(true);
    setManualUrlInput("");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - cropPan.x, 
        y: e.touches[0].clientY - cropPan.y 
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setCropPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageFile(files[0]);
    }
  };

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (showCropModal) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [showCropModal]);

  const handleCropAndSave = () => {
    if (!cropImageSrc) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, 400, 600);

    const viewport = viewportRef.current;
    const imgObj = imgRef.current;

    if (viewport && imgObj) {
      const vWidth = viewport.clientWidth;
      const vHeight = viewport.clientHeight;

      let drawW = imgDisplaySize.width;
      let drawH = imgDisplaySize.height;
      if (drawW === 0 || drawH === 0) {
        const scaleX = vWidth / (imgObj.naturalWidth || vWidth);
        const scaleY = vHeight / (imgObj.naturalHeight || vHeight);
        const containScale = Math.min(scaleX, scaleY);
        drawW = (imgObj.naturalWidth || vWidth) * containScale;
        drawH = (imgObj.naturalHeight || vHeight) * containScale;
      }

      ctx.translate(200, 300);
      const screenToCanvasScale = 400 / vWidth;
      ctx.scale(screenToCanvasScale * cropZoom, screenToCanvasScale * cropZoom);
      ctx.translate(cropPan.x / cropZoom, cropPan.y / cropZoom);

      try {
        ctx.drawImage(imgObj, -drawW / 2, -drawH / 2, drawW, drawH);
        const base64Data = canvas.toDataURL("image/jpeg", 0.75);
        
        const newImageItem = {
          url: base64Data,
          label: cropLabel.trim() || "Registry Image",
        };

        setImages((prev) => {
          const updated = [...prev, newImageItem];
          setActiveImageIndex(updated.length - 1);
          return updated;
        });
        setIsDirty(true);

        setShowCropModal(false);
        setCropImageSrc("");
        setCropLabel("");
      } catch (err) {
        console.error("Cropping error:", err);
        alert("Could not crop image. Download the image and upload the file.");
      }
    }
  };
  
  // 3. Select Field: Role
  const [charRole, setCharRole] = useState(role || character.role || "Supporting");

  // 3b. Nicknames field setup
  const initialNicknames = Array.from(new Set([
    ...(character.nicknames || []),
    ...(character.apiNicknames || []),
  ])).filter(Boolean) as string[];

  const [allAvailableNicknames, setAllAvailableNicknames] = useState<string[]>(initialNicknames);
  const [selectedNicknames, setSelectedNicknames] = useState<string[]>(() => {
    if (isEdit && character.nicknames !== undefined) {
      return character.nicknames;
    }
    return initialNicknames; // Comes with all values selected
  });
  const [customNicknameInput, setCustomNicknameInput] = useState("");

  // Sync state if character prop is updated asynchronously
  useEffect(() => {
    const freshNicknames = Array.from(new Set([
      ...(character.nicknames || []),
      ...(character.apiNicknames || []),
    ])).filter(Boolean) as string[];

    setAllAvailableNicknames(freshNicknames);
    if (isEdit && character.nicknames !== undefined) {
      setSelectedNicknames(character.nicknames);
    } else {
      setSelectedNicknames(freshNicknames);
    }
  }, [character, isEdit]);

  const handleNicknameToggle = (nick: string) => {
    setIsDirty(true);
    if (selectedNicknames.includes(nick)) {
      setSelectedNicknames(selectedNicknames.filter((n) => n !== nick));
    } else {
      setSelectedNicknames([...selectedNicknames, nick]);
    }
  };

  const handleAddCustomNickname = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customNicknameInput.trim();
    if (!val) return;
    setIsDirty(true);
    if (!allAvailableNicknames.includes(val)) {
      setAllAvailableNicknames([...allAvailableNicknames, val]);
    }
    if (!selectedNicknames.includes(val)) {
      setSelectedNicknames([...selectedNicknames, val]);
    }
    setCustomNicknameInput("");
  };

  // Derive MAL ID
  const displayMalId = character.malId !== undefined ? character.malId : character.mal_id;

  // Combined variations list (saved DB siblings + unsaved drafts in current session)
  const allVariations = useMemo(() => {
    const list: any[] = [...siblingVariations];

    for (const draft of draftVariations) {
      if (!list.some((item) => item.id === draft.id)) {
        list.push(draft);
      }
    }

    if (list.length === 0 && character) {
      list.push({
        id: editingId || "initial-default",
        variationTitle: variationTitle || "Default",
        name: name || character.name || "",
        isDraft: !editingId || editingId.startsWith("draft-"),
      });
    }

    return list;
  }, [siblingVariations, draftVariations, editingId, variationTitle, name, character]);

  // Fetch sibling variations sharing the same MAL ID
  const refreshSiblingVariations = useCallback(async () => {
    if (!displayMalId) return;
    try {
      const res = await fetch("/api/database");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const matches = data.filter((c: any) => Number(c.malId) === Number(displayMalId) && Number(c.malId) > 0);
          setSiblingVariations(matches);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch sibling variations:", e);
    }
  }, [displayMalId]);

  useEffect(() => {
    refreshSiblingVariations();
  }, [refreshSiblingVariations]);

  const doSwitchVariation = (targetVar: any) => {
    setEditingId(targetVar.id);
    setName(targetVar.name || character.name || "");
    setVariationTitle(targetVar.variationTitle || "Default");
    setCharRole(targetVar.role || "Supporting");

    if (Array.isArray(targetVar.images) && targetVar.images.length > 0) {
      setImages(
        targetVar.images.map((img: any) => ({
          url: typeof img === 'string' ? img : (img.url || img.imageUrl || ""),
          label: typeof img === 'string' ? "Profile Image" : (img.label || "Profile Image")
        }))
      );
    } else if (targetVar.imageUrl) {
      setImages([{ url: targetVar.imageUrl, label: "Default Profile" }]);
    } else {
      setImages([]);
    }

    if (Array.isArray(targetVar.sources)) {
      setSelectedSources(targetVar.sources);
    }
    if (targetVar.traits) {
      setTraits(targetVar.traits);
    }
    if (targetVar.nicknames) {
      setSelectedNicknames(targetVar.nicknames);
    }

    setActiveImageIndex(0);
    setIsDirty(false);
    setVariationNotification(
      `Switched to variation "${targetVar.variationTitle || "Default"}"${
        targetVar.isDraft || targetVar.id?.startsWith("draft-") ? " (Unsaved Draft)" : ""
      }`
    );
    setTimeout(() => setVariationNotification(null), 4000);
  };

  const handleSwitchVariation = (targetVar: any) => {
    if (targetVar.id === editingId) return;

    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: "Unsaved Changes",
        message: `You have unsaved changes in variation "${variationTitle || "Default"}". Are you sure you want to switch? Unsaved data for this variation will be lost.`,
        confirmText: "Discard & Switch",
        cancelText: "Cancel",
        isDanger: true,
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          doSwitchVariation(targetVar);
        },
      });
      return;
    }

    doSwitchVariation(targetVar);
  };

  const doAddNewVariation = () => {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nextCount = allVariations.length + 1;
    const newTitle = `Variation ${nextCount}`;

    const newDraft = {
      id: draftId,
      isDraft: true,
      malId: displayMalId,
      name: name.trim() || character.name || "",
      variationTitle: newTitle,
      role: charRole || "Supporting",
      images: images.length > 0 ? [...images] : [],
      sources: selectedSources.length > 0 ? [...selectedSources] : [],
      traits: { ...traits },
      nicknames: [...selectedNicknames],
    };

    setDraftVariations((prev) => [...prev, newDraft]);
    setEditingId(draftId);
    setVariationTitle(newTitle);
    setIsDirty(false);

    setVariationNotification(`New variation "${newTitle}" created! Edit fields and click "Update Variation" to save.`);
    setTimeout(() => setVariationNotification(null), 5000);
  };

  const handleAddNewVariation = () => {
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: "Unsaved Changes",
        message: `You have unsaved changes in variation "${variationTitle || "Default"}". Are you sure you want to create a new variation? Unsaved data will be lost.`,
        confirmText: "Create New Variation",
        cancelText: "Cancel",
        isDanger: true,
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          doAddNewVariation();
        },
      });
      return;
    }

    doAddNewVariation();
  };

  const handleUpdateVariation = async () => {
    if (!name.trim()) {
      setVariationNotification("Character name is required to update variation.");
      return;
    }

    setSavingVariation(true);
    setSubmitError(null);

    const targetId = (editingId && !editingId.startsWith("draft-")) ? editingId : undefined;

    const knownAnimeSources: any[] = [];
    if (Array.isArray(character.animeSources)) {
      knownAnimeSources.push(...character.animeSources);
    }
    if (Array.isArray(dbAnimes)) {
      dbAnimes.forEach((a: any) => {
        if (a.malId && a.title) {
          knownAnimeSources.push({
            malId: Number(a.malId),
            title: a.title,
            titles: a.titles || null,
            type: a.type || null,
            source: a.source || null,
            year: a.year || null,
            studios: a.studios || null,
            genres: a.genres || null,
            images: a.images || null,
            episodes: a.episodes || null,
            score: a.score || null
          });
        }
      });
    }

    const payload = {
      id: targetId,
      malId: displayMalId,
      name: name.trim(),
      variationTitle: variationTitle.trim() || "Default",
      imageUrl: images[0]?.url || "",
      images: images,
      sources: selectedSources,
      role: charRole,
      traits: traits,
      nicknames: selectedNicknames,
      animeSources: knownAnimeSources,
    };

    try {
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update variation.");
      }

      // Refetch sibling variations from database
      const dbRes = await fetch("/api/database");
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (Array.isArray(dbData)) {
          const matches = dbData.filter(
            (c: any) => Number(c.malId) === Number(displayMalId) && Number(c.malId) > 0
          );
          setSiblingVariations(matches);

          if (editingId && editingId.startsWith("draft-")) {
            setDraftVariations((prev) => prev.filter((d) => d.id !== editingId));
            const newlySaved = matches.find(
              (m: any) => m.variationTitle === (variationTitle.trim() || "Default")
            ) || matches[matches.length - 1];
            if (newlySaved) {
              setEditingId(newlySaved.id);
            }
          }
        }
      }

      setIsDirty(false);
      setSavingVariation(false);
      setVariationNotification(`Variation "${variationTitle.trim() || "Default"}" saved successfully!`);
      setTimeout(() => setVariationNotification(null), 4000);
    } catch (err: any) {
      console.error("Failed to update variation:", err);
      setSubmitError(err.message || "Failed to update variation.");
      setSavingVariation(false);
    }
  };

  const doDeleteVariation = async () => {
    const titleToDelete = variationTitle.trim() || "Default";
    setDeletingVariation(true);

    // If it's an unsaved draft variation
    if (editingId && editingId.startsWith("draft-")) {
      const remainingDrafts = draftVariations.filter((d) => d.id !== editingId);
      setDraftVariations(remainingDrafts);

      const remainingAll = allVariations.filter((v) => v.id !== editingId);

      if (remainingAll.length > 0) {
        const prevVar = remainingAll[remainingAll.length - 1];
        setEditingId(prevVar.id);
        setName(prevVar.name || character.name || "");
        setVariationTitle(prevVar.variationTitle || "Default");
        setCharRole(prevVar.role || "Supporting");
        setImages(prevVar.images || []);
        setSelectedSources(prevVar.sources || []);
        setTraits(prevVar.traits || {});
        setSelectedNicknames(prevVar.nicknames || []);
        setIsDirty(false);
        setDeletingVariation(false);
        setVariationNotification(`Removed draft. Switched to variation "${prevVar.variationTitle || "Default"}"`);
        setTimeout(() => setVariationNotification(null), 4000);
      } else {
        setDeletingVariation(false);
        onBack(location.state?.fromPage);
      }
      return;
    }

    // It's a saved DB variation
    if (!editingId) {
      setDeletingVariation(false);
      onBack(location.state?.fromPage);
      return;
    }

    try {
      const res = await fetch(`/api/database/${editingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete variation.");
      }

      // Refetch remaining sibling variations
      const dbRes = await fetch("/api/database");
      let remainingMatches: any[] = [];
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (Array.isArray(dbData)) {
          remainingMatches = dbData.filter(
            (c: any) => Number(c.malId) === Number(displayMalId) && Number(c.malId) > 0 && c.id !== editingId
          );
          setSiblingVariations(remainingMatches);
        }
      }

      const remainingAll = [...remainingMatches, ...draftVariations.filter((d) => d.id !== editingId)];

      if (remainingAll.length > 0) {
        const prevVar = remainingAll[remainingAll.length - 1];
        setEditingId(prevVar.id);
        setName(prevVar.name || character.name || "");
        setVariationTitle(prevVar.variationTitle || "Default");
        setCharRole(prevVar.role || "Supporting");
        setImages(prevVar.images || []);
        setSelectedSources(prevVar.sources || []);
        setTraits(prevVar.traits || {});
        setSelectedNicknames(prevVar.nicknames || []);
        setIsDirty(false);
        setDeletingVariation(false);
        setVariationNotification(`Deleted variation "${titleToDelete}". Switched to "${prevVar.variationTitle || "Default"}"`);
        setTimeout(() => setVariationNotification(null), 4000);
      } else {
        setDeletingVariation(false);
        // No variations left! Go back to database.
        onBack(location.state?.fromPage);
      }
    } catch (err: any) {
      console.error("Delete variation error:", err);
      setSubmitError(err.message || "Failed to delete variation.");
      setDeletingVariation(false);
    }
  };

  const handleDeleteVariation = () => {
    const titleToDelete = variationTitle.trim() || "Default";
    setConfirmModal({
      isOpen: true,
      title: "Delete Variation",
      message: `Are you sure you want to delete the variation "${titleToDelete}"?${
        editingId && !editingId.startsWith("draft-")
          ? " This action will permanently remove it from the database."
          : ""
      }`,
      confirmText: "Delete Variation",
      cancelText: "Cancel",
      isDanger: true,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        doDeleteVariation();
      },
    });
  };

  const handleCancelAndBack = () => {
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: "Discard Unsaved Changes",
        message: "You have unsaved changes in this form. Are you sure you want to cancel and go back?",
        confirmText: "Discard & Go Back",
        cancelText: "Keep Editing",
        isDanger: true,
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          onBack(location.state?.fromPage);
        },
      });
      return;
    }
    onBack(location.state?.fromPage);
  };

  // Helper to resolve raw source title to registered DB title if present
  const getCanonicalTitle = useCallback((rawTitle: string): string => {
    if (!rawTitle) return "";
    const trimmed = rawTitle.trim();
    if (!trimmed) return "";
    const lowered = trimmed.toLowerCase();

    // 1. Check if rawTitle matches a registered DB anime title or alternative title
    for (const a of dbAnimes) {
      if (!a.title) continue;
      if (a.title.trim().toLowerCase() === lowered) {
        return a.title;
      }
      if (Array.isArray(a.titles)) {
        for (const t of a.titles) {
          if (t?.title && String(t.title).trim().toLowerCase() === lowered) {
            return a.title;
          }
        }
      }
      if (a.title_english && String(a.title_english).trim().toLowerCase() === lowered) {
        return a.title;
      }
      if (a.title_japanese && String(a.title_japanese).trim().toLowerCase() === lowered) {
        return a.title;
      }
      if (Array.isArray(a.synonyms)) {
        for (const syn of a.synonyms) {
          if (syn && String(syn).trim().toLowerCase() === lowered) {
            return a.title;
          }
        }
      }
    }

    // 2. Check if rawTitle maps to a malId from known source objects (chromeAnime, character.anime, character.animeSources)
    let matchedMalId: number | null = null;

    if (chromeAnime) {
      const cId = chromeAnime.mal_id || (chromeAnime as any).malId;
      if (cId) {
        if (chromeAnime.title && chromeAnime.title.trim().toLowerCase() === lowered) {
          matchedMalId = Number(cId);
        } else if (Array.isArray(chromeAnime.titles)) {
          for (const t of chromeAnime.titles) {
            if (t?.title && String(t.title).trim().toLowerCase() === lowered) {
              matchedMalId = Number(cId);
              break;
            }
          }
        }
      }
    }

    if (!matchedMalId && Array.isArray(character?.anime)) {
      for (const item of character.anime) {
        const mId = Number(item.anime?.mal_id || item.anime?.malId);
        if (mId) {
          if (item.anime?.title && item.anime.title.trim().toLowerCase() === lowered) {
            matchedMalId = mId;
            break;
          }
          if (Array.isArray(item.anime?.titles)) {
            for (const t of item.anime.titles) {
              if (t?.title && String(t.title).trim().toLowerCase() === lowered) {
                matchedMalId = mId;
                break;
              }
            }
            if (matchedMalId) break;
          }
        }
      }
    }

    if (!matchedMalId && Array.isArray(character?.animeSources)) {
      for (const item of character.animeSources) {
        const mId = Number(item.malId || item.mal_id);
        if (mId) {
          if (item.title && item.title.trim().toLowerCase() === lowered) {
            matchedMalId = mId;
            break;
          }
          if (Array.isArray(item.titles)) {
            for (const t of item.titles) {
              if (t?.title && String(t.title).trim().toLowerCase() === lowered) {
                matchedMalId = mId;
                break;
              }
            }
            if (matchedMalId) break;
          }
        }
      }
    }

    // 3. If matchedMalId found, check if an anime with this malId is in dbAnimes
    if (matchedMalId) {
      const dbMatch = dbAnimes.find((a: any) => Number(a.malId) === matchedMalId);
      if (dbMatch && dbMatch.title) {
        return dbMatch.title;
      }
    }

    return trimmed;
  }, [dbAnimes, character, chromeAnime]);

  // 4. Source multiselect: Default populated with union of database sources, API sources, chromeAnime title, and registered DB animes
  const rawInitialSources = Array.from(new Set([
    ...(character?.sources || []),
    ...(character?.apiSources || []),
    ...(chromeAnime?.title ? [chromeAnime.title] : []),
    ...(Array.isArray(dbAnimes) ? dbAnimes.map((a: any) => a.title) : []),
  ])).filter(Boolean) as string[];

  const initialSources = Array.from(new Set(rawInitialSources.map((s) => getCanonicalTitle(s)))).filter(Boolean);

  const [allAvailableSources, setAllAvailableSources] = useState<string[]>(initialSources);
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    let rawSelected: string[] = [];
    if (isEdit && character?.sources !== undefined) {
      rawSelected = character.sources;
    } else if (character?.sources && character.sources.length > 0) {
      rawSelected = character.sources;
    } else if (chromeAnime?.title) {
      rawSelected = [chromeAnime.title];
    } else {
      rawSelected = rawInitialSources;
    }
    return Array.from(new Set(rawSelected.map((s) => getCanonicalTitle(s)))).filter(Boolean);
  });
  const [customSourceInput, setCustomSourceInput] = useState("");

  // Sync state if character, chromeAnime, or dbAnimes is updated asynchronously
  useEffect(() => {
    const freshRawSources = Array.from(new Set([
      ...(character?.sources || []),
      ...(character?.apiSources || []),
      ...(chromeAnime?.title ? [chromeAnime.title] : []),
      ...(Array.isArray(dbAnimes) ? dbAnimes.map((a: any) => a.title) : []),
    ])).filter(Boolean) as string[];

    const canonicalSources = Array.from(
      new Set(freshRawSources.map((s) => getCanonicalTitle(s)))
    ).filter(Boolean);

    setAllAvailableSources(canonicalSources);

    let freshSelectedRaw: string[] = [];
    if (isEdit && character?.sources !== undefined) {
      freshSelectedRaw = character.sources;
    } else if (character?.sources && character.sources.length > 0) {
      freshSelectedRaw = character.sources;
    } else if (chromeAnime?.title) {
      freshSelectedRaw = [chromeAnime.title];
    } else {
      freshSelectedRaw = freshRawSources;
    }

    const canonicalSelected = Array.from(
      new Set(freshSelectedRaw.map((s) => getCanonicalTitle(s)))
    ).filter(Boolean);

    setSelectedSources(canonicalSelected);
  }, [character, chromeAnime, isEdit, dbAnimes, getCanonicalTitle]);

  // 5. Custom Traits fields: start with some fun defaults
  const [traits, setTraits] = useState<Record<string, string | string[]>>(
    character.traits && Object.keys(character.traits).length > 0
      ? character.traits
      : { "Special Ability": "" }
  );

  // Modal toggle state for Traits Builder Form
  const [showTraitsBuilder, setShowTraitsBuilder] = useState(false);

  // Loading/feedback state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle source checkbox changes
  const handleSourceToggle = (title: string) => {
    setIsDirty(true);
    if (selectedSources.includes(title)) {
      setSelectedSources(selectedSources.filter((t) => t !== title));
    } else {
      setSelectedSources([...selectedSources, title]);
    }
  };

  const handleAddCustomSource = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customSourceInput.trim();
    if (!val) return;
    setIsDirty(true);
    const canonical = getCanonicalTitle(val);
    if (!allAvailableSources.includes(canonical)) {
      setAllAvailableSources([...allAvailableSources, canonical]);
    }
    if (!selectedSources.includes(canonical)) {
      setSelectedSources([...selectedSources, canonical]);
    }
    setCustomSourceInput("");
  };

  const handleSubmit = async (e: React.FormEvent, stayInBrowse: boolean) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError("Character name is required");
      return;
    }
    if (selectedSources.length === 0) {
      setSubmitError("Please select at least one source anime title");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Gather all known anime sources mapping (title -> malId) to help server save relational links
    const knownAnimeSources: any[] = [];
    if (Array.isArray(character.animeSources)) {
      knownAnimeSources.push(...character.animeSources);
    }
    if (Array.isArray(dbAnimes)) {
      dbAnimes.forEach((a: any) => {
        if (a.malId && a.title) {
          knownAnimeSources.push({
            malId: Number(a.malId),
            title: a.title,
            titles: a.titles || null,
            type: a.type || null,
            source: a.source || null,
            year: a.year || null,
            studios: a.studios || null,
            genres: a.genres || null,
            images: a.images || null,
            episodes: a.episodes || null,
            score: a.score || null
          });
        }
      });
    }
    if (chromeAnime) {
      const cId = chromeAnime.mal_id || (chromeAnime as any).malId;
      if (cId && chromeAnime.title) {
        const canonical = getCanonicalTitle(chromeAnime.title);
        knownAnimeSources.push({ 
          malId: Number(cId), 
          title: canonical,
          rawTitle: chromeAnime.title,
          images: chromeAnime.images || null,
          type: chromeAnime.type || null,
          source: chromeAnime.source || null,
          year: chromeAnime.year || null,
          studios: chromeAnime.studios?.map((s: any) => typeof s === "string" ? s : s.name) || [],
          genres: chromeAnime.genres?.map((g: any) => typeof g === "string" ? g : g.name) || [],
          episodes: chromeAnime.episodes || null,
          score: chromeAnime.score || null,
          titles: chromeAnime.titles || null
        });
      }
    }
    if (Array.isArray(character.anime)) {
      character.anime.forEach((a: any) => {
        if (a.anime?.mal_id && a.anime?.title) {
          const canonical = getCanonicalTitle(a.anime.title);
          knownAnimeSources.push({ 
            malId: Number(a.anime.mal_id), 
            title: canonical,
            rawTitle: a.anime.title,
            images: a.anime.images || null,
            type: a.anime.type || null,
            source: a.anime.source || null,
            year: a.anime.year || null,
            studios: a.anime.studios?.map((s: any) => typeof s === "string" ? s : s.name) || [],
            genres: a.anime.genres?.map((g: any) => typeof g === "string" ? g : g.name) || [],
            episodes: a.anime.episodes || null,
            score: a.anime.score || null,
            titles: a.anime.titles || null
          });
        }
      });
    }

    const targetId = (editingId && !editingId.startsWith("draft-")) ? editingId : undefined;

    const payload = {
      id: targetId,
      malId: displayMalId,
      name: name.trim(),
      variationTitle: variationTitle.trim() || "Default",
      imageUrl: images[0]?.url || "",
      images: images,
      sources: selectedSources,
      role: charRole,
      traits: traits,
      nicknames: selectedNicknames,
      animeSources: knownAnimeSources, // Provided to map legacy/relational database properly
    };

    try {
      const response = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to register character in database.");
      }

      setSubmitting(false);
      setIsDirty(false);
      if (stayInBrowse) {
        setVariationNotification(isEdit ? "Character updated successfully!" : "Character registered successfully!");
        setTimeout(() => setVariationNotification(null), 4000);
      }
      onRegisterSuccess(stayInBrowse, location.state?.fromPage);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong saving the character record.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Back to characters listing */}
      <button
        onClick={handleCancelAndBack}
        disabled={submitting || savingVariation || deletingVariation}
        className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-400 transition-colors hover:text-indigo-400 disabled:opacity-50 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Cancel & Back</span>
      </button>

      {/* Intro Context Card */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-white font-sans">
          {isEdit ? "Edit Character Details" : "Character Registration"}
        </h2>
        <p className="text-sm text-slate-400">
          {isEdit 
            ? `Modify character bio, sources, roles, and characteristics (MAL ID: ${displayMalId || "None"}).`
            : `Refine character stats, roles, and traits fetched from MyAnimeList (MAL ID: ${displayMalId || "None"}).`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: Quick Profile Preview & Thumbnail */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-850 bg-slate-900/40 p-5 text-center shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Live Preview
            </span>
            
            <div className="mx-auto mt-4 flex items-center justify-center gap-2.5">
              <div className="aspect-[2/3] h-52 overflow-hidden rounded-2xl border-4 border-slate-800 bg-slate-950 shadow-inner relative group/carousel flex flex-col justify-between">
                {images.length > 0 ? (
                  <>
                    <div className="relative flex-1 w-full overflow-hidden min-h-0">
                      <img
                        src={images[activeImageIndex]?.url}
                        alt={`${name || "Preview"} - ${images[activeImageIndex]?.label}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    
                    {/* Separated Solid Footer at Bottom */}
                    <div className="w-full bg-slate-900 border-t border-slate-800 h-9 shrink-0 flex items-center justify-between px-1.5 select-none z-10">
                      {images.length > 1 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                            className="p-1 rounded bg-slate-950/40 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Previous Image"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          
                          <div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1 text-center">
                            <p className="text-[9px] font-black text-slate-200 truncate w-full" title={images[activeImageIndex]?.label || "Profile Image"}>
                              {images[activeImageIndex]?.label || "Profile Image"}
                            </p>
                            <span className="text-[7.5px] font-mono font-bold text-indigo-400 mt-0.5 leading-none">
                              {activeImageIndex + 1}/{images.length}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                            className="p-1 rounded bg-slate-950/40 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Next Image"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <p className="text-[9px] font-black text-slate-200 truncate text-center w-full px-1">
                          {images[activeImageIndex]?.label || "Profile Image"}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-600 flex-1">
                    No Image Added
                  </div>
                )}
              </div>
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/80 hover:bg-slate-700 text-indigo-400 hover:text-white hover:border-indigo-500/50 transition-all cursor-pointer shadow-md"
                  title="Zoom In Image"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
              )}
            </div>

            <h3 className="mt-4 text-base font-extrabold text-white truncate text-center px-2">
              {name || "Untitled Character"}
            </h3>
            
            <div className="mt-1-5 flex items-center justify-center space-x-1.5 text-xs font-semibold">
              <span className="rounded bg-indigo-600/15 border border-indigo-500/20 px-2 py-0.5 text-indigo-400">
                {charRole}
              </span>
              <span className="text-slate-700">•</span>
              <span className="text-slate-450 font-mono">MAL ID {displayMalId || "None"}</span>
            </div>

            <div className="mt-5 border-t border-slate-850 pt-4 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Assigned Traits Preview ({Object.keys(traits).length})
              </span>
              <div className="mt-2 space-y-1.5">
                {Object.entries(traits)
                  .sort(([a], [b]) => a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" }))
                  .map(([k, v]) => {
                  const displayValue = Array.isArray(v) ? v.join(", ") : v;
                  return (
                    <p key={k} className="text-xs text-slate-300 break-words">
                      <strong className="text-indigo-400 font-sans">{k}:</strong> {displayValue || "—"}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Manage Traits builder button */}
          <div className="rounded-2xl border border-slate-850 bg-indigo-650/5 p-5">
            <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Sliders className="h-4 w-4" />
              <span>Traits Sourced From Separate Form</span>
            </h4>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed font-semibold">
              Click the builder below to open a dedicated traits template configurator. This satisfies the requirement where custom traits come from another form.
            </p>
            <button
              type="button"
              onClick={() => setShowTraitsBuilder(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Configure Traits Builder Form</span>
            </button>
          </div>
        </div>

        {/* Right Columns: The actual form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Character Variations Navigation & Actions Bar */}
          <div className="rounded-2xl border border-slate-850 bg-slate-900/60 p-4 space-y-3 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 font-mono">
                    Character Variations (MAL ID: {displayMalId || "None"})
                  </span>
                  {isDirty && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Unsaved Changes
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-black text-white">
                  Alternate Forms & Outfits
                </h4>
              </div>

              {/* Variation Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleUpdateVariation}
                  disabled={savingVariation || submitting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-600/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Save changes to this variation without leaving page"
                >
                  <Save className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{savingVariation ? "Updating..." : "Update Variation"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddNewVariation}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Variation</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteVariation}
                  disabled={deletingVariation || submitting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-600/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-600/20 hover:text-rose-100 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Delete this variation record"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  <span>{deletingVariation ? "Deleting..." : "Delete Variation"}</span>
                </button>
              </div>
            </div>

            {/* Sibling & Draft variation tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {allVariations.map((v) => {
                const isActive = editingId === v.id;
                const title = v.variationTitle || "Default";
                const isDraft = v.isDraft || v.id?.startsWith("draft-");
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSwitchVariation(v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      isActive
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>{title}</span>
                    {isDraft && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/30 text-amber-200 font-mono font-bold">
                        New
                      </span>
                    )}
                    {isActive && <Check className="h-3.5 w-3.5 text-indigo-200" />}
                  </button>
                );
              })}
            </div>

            {variationNotification && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-xs font-semibold text-indigo-300 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 animate-pulse" />
                <span>{variationNotification}</span>
              </motion.div>
            )}
          </div>

          {showTraitsBuilder ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <TraitsForm
                initialTraits={traits}
                onClose={() => setShowTraitsBuilder(false)}
                onSave={(newTraits) => {
                  setTraits(newTraits);
                  setIsDirty(true);
                  setShowTraitsBuilder(false);
                }}
              />
            </motion.div>
          ) : (
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 rounded-2xl border border-slate-850 bg-slate-900/40 p-6 shadow-md">
              
              {/* Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Character Name"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 px-3.5 text-sm font-semibold text-white outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Variation Title Field */}
              <div className="space-y-1.5 border-t border-slate-850 pt-4">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                  <span>Variation Title</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-400">Default: "Default"</span>
                </label>
                <input
                  type="text"
                  value={variationTitle}
                  onChange={(e) => {
                    setVariationTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Default"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 px-3.5 text-sm font-semibold text-white outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-slate-400 font-medium">
                  Set a form or outfit label for this variation (e.g., "Default", "Timeskip", "Bankai", "Kid", "S2 Outfit").
                </p>
              </div>

              {/* Nicknames Field */}
              <div className="space-y-1.5 border-t border-slate-850 pt-4">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                  <span>Nicknames (Multiselect)</span>
                  <span className="text-[10px] font-semibold text-slate-550">Checkbox selection</span>
                </label>
                <p className="text-xs text-slate-400 font-semibold">
                  Select nicknames and aliases for this character, or add your own:
                </p>

                {/* Checklist options */}
                <div className="mt-2.5 max-h-[140px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
                  {allAvailableNicknames.length > 0 ? (
                    allAvailableNicknames.map((nick) => {
                      const isSelected = selectedNicknames.includes(nick);
                      return (
                        <label
                          key={nick}
                          className="flex items-start space-x-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleNicknameToggle(nick)}
                            className="mt-0.5 h-4 w-4 rounded-sm border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="font-semibold leading-normal">{nick}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 font-medium italic py-1 text-center">
                      No available nicknames. Use the input below to add some.
                    </p>
                  )}
                </div>

                {/* Additional custom nickname adder */}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={customNicknameInput}
                    onChange={(e) => setCustomNicknameInput(e.target.value)}
                    placeholder="Add custom nickname or alias..."
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-1.5 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomNickname}
                    className="rounded-xl border border-slate-800 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-755 hover:text-white cursor-pointer"
                  >
                    Add Alias
                  </button>
                </div>
              </div>

              {/* Image Gallery Manager */}
              <div className="space-y-4 border-t border-slate-850 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-350 uppercase tracking-wide">
                      Registry Image Gallery <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      Upload, crop, and label images. The first image is the default profile image.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-550 bg-slate-950/50 border border-slate-850 px-2 py-0.5 rounded-md">
                    {images.length} Images
                  </span>
                </div>

                {/* Thumbnails list */}
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div 
                        key={idx} 
                        className={`group/thumb relative rounded-xl overflow-hidden border bg-slate-950/40 p-1.5 flex flex-col justify-between h-auto pb-2 transition-all ${
                          idx === 0 ? "border-indigo-500/50 shadow-md shadow-indigo-600/5" : "border-slate-800"
                        }`}
                      >
                        {/* Image Thumbnail */}
                        <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-slate-900 relative">
                          <img 
                            src={img.url} 
                            alt={img.label} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-indigo-600 text-[8px] font-black uppercase text-indigo-100 px-1.5 py-0.5 rounded shadow-sm tracking-wider font-mono">
                              Primary
                            </span>
                          )}
                          <div className="absolute top-1 right-1 flex gap-1 group-hover/thumb:opacity-100">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDirty(true);
                                  setImages(prev => {
                                    const next = [...prev];
                                    const item = next.splice(idx, 1)[0];
                                    next.unshift(item); // Move to primary
                                    setActiveImageIndex(0);
                                    return next;
                                  });
                                }}
                                title="Make Primary"
                                className="h-5 w-5 rounded bg-slate-950/90 text-indigo-400 hover:text-white hover:bg-indigo-600 flex items-center justify-center cursor-pointer transition-colors border border-slate-800"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setIsDirty(true);
                                setImages(prev => prev.filter((_, i) => i !== idx));
                                setActiveImageIndex(0);
                              }}
                              title="Delete Image"
                              className="h-5 w-5 rounded bg-slate-950/90 text-rose-400 hover:text-white hover:bg-rose-600 flex items-center justify-center cursor-pointer transition-colors border border-slate-800"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Label & Index indicator */}
                        <div className="mt-1.5 flex items-center justify-between gap-1 min-w-0 px-0.5">
                          <input
                            type="text"
                            value={img.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setImages(prev => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], label: val };
                                return next;
                              });
                            }}
                            placeholder="Enter image label..."
                            className="bg-transparent border-none text-[10px] text-slate-200 font-extrabold p-0 focus:ring-0 focus:outline-hidden min-w-0 w-full hover:bg-slate-900/30 rounded px-1 transition-colors"
                            title="Click to rename label"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500 font-semibold italic">
                    No images registered. Please upload or load an image below.
                  </div>
                )}

                {/* Upload & Add Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Local Upload / Drag & Drop Dropzone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none transition-all ${
                      isDragOver
                        ? "border-indigo-500 bg-indigo-500/5 text-indigo-400"
                        : "border-slate-800 hover:border-slate-700 bg-slate-950/20 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleImageFile(e.target.files[0]);
                          e.target.value = ""; // Reset
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                    <Upload className="h-5 w-5 text-indigo-400" />
                    <div className="text-center">
                      <p className="text-[11px] font-black">
                        Upload or Drag & Drop Image
                      </p>
                      <p className="text-[9px] text-slate-500 font-bold mt-0.5">
                        Supports Paste (Ctrl+V) from clipboard
                      </p>
                    </div>
                  </div>

                  {/* Load from Remote URL */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4 flex flex-col justify-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider flex items-center gap-1">
                      <FileImage className="h-3 w-3 text-indigo-400" />
                      <span>Load Image from URL</span>
                    </span>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={manualUrlInput}
                        onChange={(e) => setManualUrlInput(e.target.value)}
                        placeholder="Paste image source URL..."
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-900 py-1.5 px-2.5 text-xs text-white placeholder-slate-550 focus:outline-hidden focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleLoadUrlForCropping}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-black text-white transition-colors cursor-pointer shrink-0"
                      >
                        Load
                      </button>
                    </div>
                    <p className="text-[8px] text-slate-500 font-bold">
                      Enter MyAnimeList or any web image URL to crop and import.
                    </p>
                  </div>
                </div>
              </div>

              {/* Role Select Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Character Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={charRole}
                  onChange={(e) => {
                    setCharRole(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 px-3.5 text-sm font-medium text-slate-205 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-550/25"
                >
                  <option value="Main" className="bg-slate-900 text-white">Main Character</option>
                  <option value="Supporting" className="bg-slate-900 text-white">Supporting Character</option>
                </select>
              </div>

              {/* Source Multiselect from API titles */}
              <div className="space-y-1.5 border-t border-slate-850 pt-5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                  <span>Source Works Titles (Multiselect)</span>
                  <span className="text-[10px] font-semibold text-slate-550">Checkbox selection</span>
                </label>
                <p className="text-xs text-slate-400 font-semibold">
                  Select anime versions/titles where this character appears, sourced from MAL's titles:
                </p>

                {/* Checklist options */}
                <div className="mt-2.5 max-h-[140px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
                  {allAvailableSources.length > 0 ? (
                    allAvailableSources.map((title) => {
                      const isSelected = selectedSources.includes(title);
                      return (
                        <label
                          key={title}
                          className="flex items-start space-x-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSourceToggle(title)}
                            className="mt-0.5 h-4 w-4 rounded-sm border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="font-semibold leading-normal">{title}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 font-medium italic py-1 text-center">
                      No available works. Use the input below to add some.
                    </p>
                  )}
                </div>

                {/* Additional custom source adder */}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={customSourceInput}
                    onChange={(e) => setCustomSourceInput(e.target.value)}
                    placeholder="Add custom anime franchise source..."
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-1.5 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSource}
                    className="rounded-xl border border-slate-800 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-755 hover:text-white cursor-pointer"
                  >
                    Add Title
                  </button>
                </div>
              </div>

              {/* Error messages if any */}
              {submitError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-300">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-rose-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit / Cancel Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-slate-850 pt-5">
                <button
                  type="button"
                  onClick={handleCancelAndBack}
                  disabled={submitting || savingVariation || deletingVariation}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                
                {/* Stay in Browse button */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => handleSubmit(e, true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-750 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : (
                    <>
                      <Check className="h-4 w-4 text-indigo-400" />
                      <span>{isEdit ? "Save & Stay" : "Register & Stay"}</span>
                    </>
                  )}
                </button>

                {/* Main Submit & Go to Database button */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => handleSubmit(e, false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/25 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {submitting ? "Saving Entry..." : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{isEdit ? "Save & View DB" : "Register & View DB"}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {isZoomed && images[activeImageIndex]?.url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsZoomed(false)}
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
                    {name || "Character"}
                  </span>
                  {images.length > 1 && (
                    <span className="text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded shrink-0">
                      {activeImageIndex + 1} / {images.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsZoomed(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Close Zoom"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Large Image Frame with Next/Prev Floating Controls */}
              <div className="relative w-full h-auto max-h-[60vh] rounded-xl overflow-hidden bg-slate-900 flex justify-center items-center border border-slate-850 group min-h-[220px]">
                <img
                  key={images[activeImageIndex]?.url}
                  src={images[activeImageIndex]?.url}
                  alt={`${name || "Zoomed Preview"} - ${images[activeImageIndex]?.label}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-[60vh] object-contain rounded-xl select-none transition-all duration-200"
                />

                {/* Prev Button */}
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 text-slate-200 hover:bg-indigo-600 hover:text-white border border-slate-700/80 shadow-lg transition-all cursor-pointer z-10"
                    title="Previous Image (Left Arrow)"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                {/* Next Button */}
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
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
                  {images[activeImageIndex]?.label || "Profile Image"}
                </span>
              </div>

              {/* Thumbnail Selector Strip for Navigation */}
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 w-full overflow-x-auto pt-1 pb-1">
                  {images.map((img, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
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

      {/* Visual Cropping & Labeling Modal Dialog */}
      <AnimatePresence>
        {showCropModal && cropImageSrc && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCropModal(false);
                setCropImageSrc("");
              }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl flex flex-col gap-4 z-10 max-h-[90vh] overflow-y-auto"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-indigo-400 font-mono tracking-wider">
                    Adjust & Label Registry Image
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Drag/touch to position. Adjust zoom to crop cleanly into a 4:3 aspect ratio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCropModal(false);
                    setCropImageSrc("");
                  }}
                  className="rounded-lg p-1 text-slate-550 hover:bg-slate-900 hover:text-slate-300 transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Crop Viewport */}
              <div className="flex flex-col items-center justify-center">
                <div 
                  ref={viewportRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                  className="w-full max-w-[280px] aspect-[2/3] bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden select-none cursor-move mx-auto"
                >
                  <img
                    ref={imgRef}
                    src={cropImageSrc}
                    alt="To Crop"
                    className="absolute pointer-events-none max-w-none origin-center"
                    style={{
                      width: imgDisplaySize.width ? `${imgDisplaySize.width}px` : "100%",
                      height: imgDisplaySize.height ? `${imgDisplaySize.height}px` : "100%",
                      left: imgDisplaySize.width ? `calc(50% - ${imgDisplaySize.width / 2}px)` : "0px",
                      top: imgDisplaySize.height ? `calc(50% - ${imgDisplaySize.height / 2}px)` : "0px",
                      transform: `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`,
                    }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const vWidth = viewportRef.current?.clientWidth || 280;
                      const vHeight = viewportRef.current?.clientHeight || 420;
                      const scaleX = vWidth / (img.naturalWidth || vWidth);
                      const scaleY = vHeight / (img.naturalHeight || vHeight);
                      const containScale = Math.min(scaleX, scaleY);
                      setImgDisplaySize({
                        width: (img.naturalWidth || vWidth) * containScale,
                        height: (img.naturalHeight || vHeight) * containScale,
                      });
                      setCropPan({ x: 0, y: 0 });
                    }}
                  />
                  
                  {/* Full-box 2:3 guideline framing & center crosshair */}
                  <div className="absolute inset-0 pointer-events-none border border-indigo-500/30 rounded-xl flex items-center justify-center">
                    <div className="w-full h-full border border-dashed border-indigo-500/20 rounded-xl" />
                  </div>

                  {/* Centered target framing guide inside the 2:3 crop viewport */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 bg-amber-500/[0.01]">
                    {/* Centered crosshair indicator to pinpoint the middle of the image */}
                    <div className="absolute h-5 w-5 flex items-center justify-center">
                      <div className="absolute h-0.5 w-5 bg-amber-500/90 rounded-full" />
                      <div className="absolute h-5 w-0.5 bg-amber-500/90 rounded-full" />
                      <div className="absolute h-2 w-2 rounded-full border border-amber-500/90" />
                    </div>
                    {/* Small badge to clearly indicate the 3:2 vertical portrait area */}
                    <span className="absolute bottom-3 bg-amber-500/95 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-md tracking-wider font-mono">
                      3:2 Crop Target
                    </span>
                  </div>
                </div>
              </div>

              {/* Crop Controls */}
              <div className="space-y-4">
                {/* Zoom range slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>Adjust Crop Zoom</span>
                    <span className="font-mono text-[10px] text-indigo-400">{(cropZoom * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                  />
                </div>

                {/* Label Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-350 uppercase tracking-wide">
                    Image Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cropLabel}
                    onChange={(e) => setCropLabel(e.target.value)}
                    placeholder="E.g., Season 1 Profile, Alternate Outfit, Super Saiyan"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 px-3.5 text-xs text-white outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-900 pt-3 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCropModal(false);
                    setCropImageSrc("");
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-350 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropAndSave}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-black text-white transition-all shadow-md cursor-pointer"
                >
                  Crop & Save Image
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-xl border ${confirmModal.isDanger ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"}`}>
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{confirmModal.title}</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed font-medium">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                {confirmModal.cancelText || "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-colors cursor-pointer ${
                  confirmModal.isDanger
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
