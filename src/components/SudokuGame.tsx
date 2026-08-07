import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { RegisteredCharacter, TraitOption, PuzzleHistoryRecord, Anime } from "@shared/types/index";
import PuzzleHistoryView from "./PuzzleHistoryView";
import DailyLeaderboardView from "./DailyLeaderboardView";
import { 
  RefreshCw, Search, Award, HelpCircle, Trophy, Sparkles, PlusCircle, Check, X, AlertCircle, AlertTriangle, Loader2, Copy, Play, ArrowLeft, ExternalLink, ChevronLeft, ChevronRight, Shuffle, Eye, EyeOff, Globe, Lock, LogIn, History, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context";

interface TraitRequirement {
  key: string;
  value: string;
  description?: string;
}

export interface GameModeCompatibility {
  classic: boolean;
  traitScoring: boolean;
  sameTrait: boolean;
  multiverse: boolean;
}

export interface ValidationResult {
  supportedModes: GameModeCompatibility;
  resolvedBonusTrait: TraitRequirement | null;
}

interface SudokuBoard {
  rowTraits: TraitRequirement[];
  colTraits: TraitRequirement[];
  jokerId: string | null;
  bonusTrait?: TraitRequirement | null;
  isCustom?: boolean;
  supportedModes?: GameModeCompatibility;
}

interface SudokuGameProps {
  characters: RegisteredCharacter[];
  animes?: any[];
  onRefreshCharacters: () => Promise<void>;
  onNavigateToBrowse: () => void;
}

export const FIXED_TRAITS = [
  "Name Starts With",
  "Name Word Count",
  "Last Name",
  "Source Starts With",
  "Source Word Count",
  "Source Format",
  "Source Material",
  "Source Decade",
  "Source Genre"
];

export function getAnimeForChar(char: RegisteredCharacter, animes: any[]): any | null {
  if (!char || !animes || animes.length === 0) return null;
  
  // Try using animeSources first
  if (Array.isArray((char as any).animeSources) && (char as any).animeSources.length > 0) {
    const matches = (char as any).animeSources.map((animeSrc: any) => animes.find(a => Number(a.malId) === Number(animeSrc.malId))).filter(Boolean);
    return matches;
  }

  return null;
}

export function getFixedTraitValue(char: RegisteredCharacter, traitKey: string, animes: any[] = []): string {
  if (!char) return "";
  
  
  if (traitKey === "Name Starts With") {
    const firstName = char.name.trim().split(/\s+/)[0];
    return firstName ? firstName.charAt(0).toUpperCase() : "";
  }
  
  if (traitKey === "Name Word Count") {
    const words = char.name.trim().split(/\s+/).filter(Boolean);
    return words.length % 2 === 1 ? "Odd" : "Even";
  }
  
  if (traitKey === "Last Name") {
    const words = char.name.trim().split(/\s+/).filter(Boolean);
    return words.length > 1 ? "Has Last Name" : "No Last Name";
  }
  
  if (traitKey === "Source Starts With") {
    const sourceName = char.sources && char.sources.length > 0 ? char.sources[0].trim() : "";
    return sourceName ? sourceName.charAt(0).toUpperCase() : "";
  }
  
  if (traitKey === "Source Word Count") {
    const sourceName = char.sources && char.sources.length > 0 ? char.sources[0].trim() : "";
    const words = sourceName.split(/\s+/).filter(Boolean);
    return words.length % 2 === 1 ? "Odd" : "Even";
  }

  if (traitKey === "Source Format") {
    const anime = getAnimeForChar(char, animes);
    return anime && anime.type ? anime.type : "";
  }

  if (traitKey === "Source Material") {
    const anime = getAnimeForChar(char, animes);
    return anime && anime.source ? anime.source : "";
  }

  if (traitKey === "Source Decade") {
    const animeArray: any[] = getAnimeForChar(char, animes);
    if (animeArray && animeArray.some(anime => anime.year)) {
      const decadeStart = animeArray.map(anime => Math.floor(anime.year / 10) * 10);
      return `${decadeStart[0]}`;
    }
    return "";
  }

  if (traitKey === "Source Genre") {
    const anime = getAnimeForChar(char, animes);
    if (anime && Array.isArray(anime.genres) && anime.genres.length > 0) {
      const genres = anime.genres.map((g: any) => typeof g === "string" ? g : (g.name || String(g))).filter(Boolean);
      return genres.length > 0 ? genres[0] : "";
    }
    return "";
  }
  
  return "";
}

export function isTraitDefinedForChar(char: RegisteredCharacter, key: string, animes: any[] = []): boolean {
  if (FIXED_TRAITS.includes(key)) {
    if (key.startsWith("Source")) {
      if (["Source Format", "Source Material", "Source Decade", "Source Genre"].includes(key)) {
        const animeArray = getAnimeForChar(char, animes) as any[];
        if (!animeArray) return false;
        if (key === "Source Format") return animeArray.some(anime => !!anime.type);
        if (key === "Source Material") return animeArray.some(anime => !!anime.source);
        if (key === "Source Decade") return animeArray.some(anime => !!anime.year);
        if (key === "Source Genre") return animeArray.some(anime => (Array.isArray(anime.genres) && anime.genres.length > 0));
      }
      return !!(char.sources && char.sources.length > 0);
    }
    return !!char.name;
  }
  if (!char || !char.traits) return false;
  const val = char.traits[key];
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  return String(val).trim() !== "";
}

export function getCharTraitValue(char: RegisteredCharacter, key: string, animes: any[] = []): string {
  if (FIXED_TRAITS.includes(key)) {
    return getFixedTraitValue(char, key, animes);
  }
  const val = char.traits?.[key];
  if (val === undefined || val === null) return "";
  if (Array.isArray(val)) {
    return val.length > 0 ? String(val[Math.floor(Math.random() * val.length)]) : "";
  }
  return String(val);
}

export function getAvailableValuesForTrait(char: RegisteredCharacter, key: string, animes: any[] = []): string[] {
  if (!char) return [];
  
  if (FIXED_TRAITS.includes(key)) {
    if (key === "Name Starts With") {
      const words = char.name.trim().split(/\s+/).filter(Boolean);
      const initials = Array.from(new Set(words.map(w => w.charAt(0).toUpperCase())));
      return initials.filter(Boolean).length > 0 ? initials.filter(Boolean) : [""];
    }
    if (key === "Name Word Count") {
      const words = char.name.trim().split(/\s+/).filter(Boolean);
      const parity = words.length % 2 === 1 ? "Odd" : "Even";
      return [parity];
    }
    if (key === "Last Name") {
      const words = char.name.trim().split(/\s+/).filter(Boolean);
      const hasLastName = words.length > 1 ? "Has Last Name" : "No Last Name";
      return [hasLastName];
    }
    if (key === "Source Starts With") {
      if (!char.sources || char.sources.length === 0) return [""];
      const initials = char.sources.map(src => {
        const trimmed = src.trim();
        return trimmed ? trimmed.charAt(0).toUpperCase() : "";
      }).filter(Boolean);
      const uniqueInitials = Array.from(new Set(initials));
      return uniqueInitials.length > 0 ? uniqueInitials : [""];
    }
    if (key === "Source Word Count") {
      if (!char.sources || char.sources.length === 0) return [""];
      const parities = char.sources.map(src => {
        const words = src.trim().split(/\s+/).filter(Boolean);
        return words.length % 2 === 1 ? "Odd" : "Even";
      });
      const uniqueParities = Array.from(new Set(parities));
      return uniqueParities.length > 0 ? uniqueParities : [""];
    }
    if (key === "Source Format") {
      const anime = getAnimeForChar(char, animes);
      return anime && anime.type ? [anime.type] : [""];
    }
    if (key === "Source Material") {
      const anime = getAnimeForChar(char, animes);
      return anime && anime.source ? [anime.source] : [""];
    }
    if (key === "Source Decade") {
      const anime: any[] = getAnimeForChar(char, animes);
      if (anime && anime.some(anime => anime.year)) {
        const decades = anime.map(anime => `${Math.floor(anime.year / 10) * 10}s`);
        return [...new Set(decades)];
      }
      return [""];
    }
    if (key === "Source Genre") {
      const anime = getAnimeForChar(char, animes);
      if (anime && Array.isArray(anime.genres)) {
        const genres = anime.genres.map((g: any) => typeof g === "string" ? g : (g.name || String(g))).filter(Boolean);
        return genres.length > 0 ? genres : [""];
      }
      return [""];
    }
  }

  // Regular trait from character traits field
  const val = char.traits?.[key];
  if (val === undefined || val === null) return [""];
  if (Array.isArray(val)) {
    const list = val.map(v => String(v).trim()).filter(Boolean);
    return list.length > 0 ? list : [""];
  }
  const strVal = String(val).trim();
  if (strVal.includes(",")) {
    const list = strVal.split(",").map(v => v.trim()).filter(Boolean);
    return list.length > 0 ? list : [""];
  }
  return strVal ? [strVal] : [""];
}

// Check if a character has a specific trait
export function matchesTrait(char: RegisteredCharacter, traitKey: string, expectedValue: string, animes: any[] = []): boolean {
  if (!char) return false;
  
  const trimmedExpected = expectedValue.trim().toLowerCase();

  // Handle FIXED_TRAITS dynamically
  if (FIXED_TRAITS.includes(traitKey)) {
    if (traitKey === "Name Starts With") {
      const words = char.name.trim().split(/\s+/).filter(Boolean);
      return words.some(w => {
        const initial = w.charAt(0).toUpperCase();
        return initial.toLowerCase() === trimmedExpected;
      });
    }
    if (traitKey === "Name Word Count") {
      const val = getFixedTraitValue(char, "Name Word Count", animes);
      return val.toLowerCase() === trimmedExpected;
    }
    if (traitKey === "Last Name") {
      const val = getFixedTraitValue(char, "Last Name", animes);
      return val.toLowerCase() === trimmedExpected;
    }
    if (traitKey === "Source Starts With") {
      if (!char.sources || char.sources.length === 0) return false;
      return char.sources.some(src => {
        const trimmed = src.trim();
        const initial = trimmed ? trimmed.charAt(0).toUpperCase() : "";
        return initial.toLowerCase() === trimmedExpected;
      });
    }
    if (traitKey === "Source Word Count") {
      if (!char.sources || char.sources.length === 0) return false;
      return char.sources.some(src => {
        const words = src.trim().split(/\s+/).filter(Boolean);
        const parity = words.length % 2 === 1 ? "Odd" : "Even";
        return parity.toLowerCase() === trimmedExpected;
      });
    }
    if (traitKey === "Source Format") {
      const anime = getAnimeForChar(char, animes);
      if (anime && anime.type) {
        return anime.type.trim().toLowerCase() === trimmedExpected;
      }
      return false;
    }
    if (traitKey === "Source Material") {
      const anime = getAnimeForChar(char, animes);
      if (anime && anime.source) {
        return anime.source.trim().toLowerCase() === trimmedExpected;
      }
      return false;
    }
    if (traitKey === "Source Decade") {
      const animeArray: any[] = getAnimeForChar(char, animes);
      if (animeArray && animeArray.some(anime => anime.year)) {
        const decadeStarts = animeArray.map(anime => `${Math.floor(anime.year / 10) * 10}s`);
        return decadeStarts.some(decade => decade === trimmedExpected);
      }
      return false;
    }
    if (traitKey === "Source Genre") {
      const anime = getAnimeForChar(char, animes);
      if (anime && Array.isArray(anime.genres)) {
        return anime.genres.some((g: any) => {
          const gName = typeof g === "string" ? g : (g.name || String(g));
          return gName.trim().toLowerCase() === trimmedExpected;
        });
      }
      return false;
    }
  }

  // Handle regular traits
  if (!char.traits) return false;
  const charVal = char.traits[traitKey];
  if (charVal === undefined || charVal === null) return false;

  if (Array.isArray(charVal)) {
    return charVal.some(v => String(v).trim().toLowerCase() === trimmedExpected);
  }

  const trimmedCharVal = String(charVal).trim().toLowerCase();
  if (trimmedCharVal === trimmedExpected) return true;

  // Split comma lists if any
  const parts = trimmedCharVal.split(",").map(p => p.trim());
  return parts.includes(trimmedExpected);
}

// Bipartite/backtracking search helper to find a matching of 9 distinct characters
function findUniqueAssignment(
  cellIndex: number,
  cellCompatibleChars: string[][],
  chosenIds: string[]
): boolean {
  if (cellIndex === 9) {
    return true; // Successfully matched all cells
  }

  const candidates = cellCompatibleChars[cellIndex];
  for (const cid of candidates) {
    if (!chosenIds.includes(cid)) {
      chosenIds.push(cid);
      if (findUniqueAssignment(cellIndex + 1, cellCompatibleChars, chosenIds)) {
        return true;
      }
      chosenIds.pop(); // Backtrack
    }
  }
  return false;
}

// Encode/Encrypt custom puzzle into a URL-safe base64 string
export function encodePuzzle(jokerId: string, rowTraits: TraitRequirement[], colTraits: TraitRequirement[], bonusTrait?: TraitRequirement | null): string {
  const payload = {
    j: jokerId,
    r: rowTraits.map(t => ({ k: t.key, v: t.value })),
    c: colTraits.map(t => ({ k: t.key, v: t.value })),
    b: bonusTrait ? { k: bonusTrait.key, v: bonusTrait.value } : undefined
  };
  const jsonStr = JSON.stringify(payload);
  const key = 42; // simple symmetric key for obfuscation/encryption
  let xorStr = "";
  for (let i = 0; i < jsonStr.length; i++) {
    xorStr += String.fromCharCode(jsonStr.charCodeAt(i) ^ key);
  }
  // Base64 encode
  return btoa(unescape(encodeURIComponent(xorStr)));
}

// Decode/Decrypt custom puzzle code
export function decodePuzzle(code: string): { jokerId: string; rowTraits: TraitRequirement[]; colTraits: TraitRequirement[]; bonusTrait?: TraitRequirement | null } | null {
  try {
    const xorStr = decodeURIComponent(escape(atob(code)));
    const key = 42;
    let jsonStr = "";
    for (let i = 0; i < xorStr.length; i++) {
      jsonStr += String.fromCharCode(xorStr.charCodeAt(i) ^ key);
    }
    const payload = JSON.parse(jsonStr);
    return {
      jokerId: payload.j,
      rowTraits: payload.r.map((t: any) => ({ key: t.k, value: t.v })),
      colTraits: payload.c.map((t: any) => ({ key: t.k, value: t.v })),
      bonusTrait: payload.b ? { key: payload.b.k, value: payload.b.v } : null
    };
  } catch (e) {
    console.error("Failed to decode custom puzzle code:", e);
    return null;
  }
}

// Validate custom puzzle logic layout using the actual solver
export function validatePuzzleWithChars(
  rowT: TraitRequirement[], 
  colT: TraitRequirement[], 
  characters: RegisteredCharacter[],
  animes: any[] = []
): boolean {
  const cellCompatibleChars: string[][] = [];
  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    const rt = rowT[r];
    const ct = colT[c];

    const compat = characters.filter(char => 
      matchesTrait(char, rt.key, rt.value, animes) && 
      matchesTrait(char, ct.key, ct.value, animes)
    );

    if (compat.length === 0) {
      return false;
    }
    cellCompatibleChars.push(compat.map(char => char.id));
  }

  const chosenIds: string[] = [];
  return findUniqueAssignment(0, cellCompatibleChars, chosenIds);
}

// Helper: Check if two characters share any source anime
export function shareAnySource(charA: RegisteredCharacter, charB: RegisteredCharacter): boolean {
  if (!charA || !charB || !charA.sources || !charB.sources) return false;
  return charA.sources.some(sA => 
    charB.sources.some(sB => sA.trim().toLowerCase() === sB.trim().toLowerCase())
  );
}

// Validate compatibility for all game modes before finishing or launching a puzzle
export function validatePuzzleModes(
  rowTraits: TraitRequirement[],
  colTraits: TraitRequirement[],
  jokerId: string | null,
  bonusTrait: TraitRequirement | null | undefined,
  characters: RegisteredCharacter[],
  traits: Record<string, TraitOption[]> = {},
  animes: any[] = []
): ValidationResult {
  // 1. Classic Mode ("none")
  const classic = validatePuzzleWithChars(rowTraits, colTraits, characters, animes);

  // 2. Trait Scoring Mode ("trait_scoring")
  const joker = jokerId ? characters.find(c => c.id === jokerId) : null;
  const traitScoring = classic && !!joker;

  // 3. Same Trait Mode ("same_trait")
  let sameTrait = false;
  let resolvedBonusTrait: TraitRequirement | null = bonusTrait || null;

  if (classic) {
    if (bonusTrait && bonusTrait.key && bonusTrait.value) {
      const sameTraitCells: string[][] = [];
      let sameTraitPossible = true;

      for (let i = 0; i < 9; i++) {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const rt = rowTraits[r];
        const ct = colTraits[c];

        const compat = characters.filter(char =>
          matchesTrait(char, rt.key, rt.value, animes) &&
          matchesTrait(char, ct.key, ct.value, animes) &&
          matchesTrait(char, bonusTrait.key, bonusTrait.value, animes)
        );

        if (compat.length === 0) {
          sameTraitPossible = false;
          break;
        }
        sameTraitCells.push(compat.map(c => c.id));
      }

      if (sameTraitPossible) {
        const chosenIds: string[] = [];
        sameTrait = findUniqueAssignment(0, sameTraitCells, chosenIds);
      }
    } else if (joker) {
      const boardTraitKeys = new Set([
        ...rowTraits.map(t => t.key),
        ...colTraits.map(t => t.key)
      ]);
      const allKeys = Array.from(new Set([...Object.keys(traits), ...FIXED_TRAITS]));

      for (const key of allKeys) {
        if (boardTraitKeys.has(key)) continue;
        if (isTraitDefinedForChar(joker, key, animes)) {
          const val = getCharTraitValue(joker, key, animes);
          if (val && val.trim() !== "") {
            const matchedOption = FIXED_TRAITS.includes(key)
              ? undefined
              : (traits[key] || []).find(t => t.name === val);
            const candidate: TraitRequirement = {
              key,
              value: val,
              description: matchedOption ? matchedOption.description : ""
            };

            const sameTraitCells: string[][] = [];
            let possible = true;

            for (let i = 0; i < 9; i++) {
              const r = Math.floor(i / 3);
              const c = i % 3;
              const rt = rowTraits[r];
              const ct = colTraits[c];

              const compat = characters.filter(char =>
                matchesTrait(char, rt.key, rt.value, animes) &&
                matchesTrait(char, ct.key, ct.value, animes) &&
                matchesTrait(char, candidate.key, candidate.value, animes)
              );

              if (compat.length === 0) {
                possible = false;
                break;
              }
              sameTraitCells.push(compat.map(c => c.id));
            }

            if (possible) {
              const chosenIds: string[] = [];
              if (findUniqueAssignment(0, sameTraitCells, chosenIds)) {
                sameTrait = true;
                resolvedBonusTrait = candidate;
                break;
              }
            }
          }
        }
      }
    }
  }

  // 4. Multiverse Mode ("multiverse")
  let multiverse = false;
  if (classic) {
    const cellCompatCharObjs: RegisteredCharacter[][] = [];
    let multiversePossible = true;

    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      const rt = rowTraits[r];
      const ct = colTraits[c];

      const compat = characters.filter(char =>
        matchesTrait(char, rt.key, rt.value, animes) &&
        matchesTrait(char, ct.key, ct.value, animes)
      );

      if (compat.length === 0) {
        multiversePossible = false;
        break;
      }
      cellCompatCharObjs.push(compat);
    }

    if (multiversePossible) {
      function findMultiverseAssignment(cellIndex: number, chosenChars: RegisteredCharacter[]): boolean {
        if (cellIndex === 9) {
          return true;
        }

        const candidates = cellCompatCharObjs[cellIndex];
        for (const char of candidates) {
          const alreadyChosen = chosenChars.some(c => c.id === char.id);
          if (alreadyChosen) continue;

          const hasConflict = chosenChars.some(c => shareAnySource(char, c));
          if (!hasConflict) {
            chosenChars.push(char);
            if (findMultiverseAssignment(cellIndex + 1, chosenChars)) {
              return true;
            }
            chosenChars.pop();
          }
        }
        return false;
      }

      multiverse = findMultiverseAssignment(0, []);
    }
  }

  return {
    supportedModes: {
      classic,
      traitScoring,
      sameTrait,
      multiverse
    },
    resolvedBonusTrait
  };
}

export default function SudokuGame({ characters, animes = [], onRefreshCharacters, onNavigateToBrowse }: SudokuGameProps) {
  const { user, openLoginModal } = useAuth();
  const { code, dateParam } = useParams<{ code?: string; dateParam?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Daily Puzzle & Leaderboard State
  const [isDailyPuzzleMode, setIsDailyPuzzleMode] = useState<boolean>(false);
  const [isDailyCompletedForUser, setIsDailyCompletedForUser] = useState<boolean>(false);
  const [savedDailyScore, setSavedDailyScore] = useState<number | null>(null);
  const [dailyPuzzleDate, setDailyPuzzleDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [showDailyLeaderboardModal, setShowDailyLeaderboardModal] = useState<boolean>(false);
  const [dailyNotice, setDailyNotice] = useState<string | null>(null);
  const [loadingDaily, setLoadingDaily] = useState<boolean>(false);

  // Custom puzzle building state
  const [customBuild, setCustomBuild] = useState<{
    active: boolean;
    step: "joker_select" | "editing" | "finished";
    joker: RegisteredCharacter | null;
    customRowTraits: TraitRequirement[];
    customColTraits: TraitRequirement[];
    isValidating: boolean;
    isValidated: boolean;
    validationError: string | null;
    customURL: string | null;
    supportedModes?: GameModeCompatibility | null;
    bonusTrait?: TraitRequirement | null;
  } | null>(null);

  const [jokerSearch, setJokerSearch] = useState("");
  const [jokerPage, setJokerPage] = useState(1);

  const [traits, setTraits] = useState<Record<string, TraitOption[]>>({});
  const [traitsLoading, setTraitsLoading] = useState(true);
  const [board, setBoard] = useState<SudokuBoard | null>(null);
  const [selectedCells, setSelectedCells] = useState<Record<number, RegisteredCharacter | null>>({
    0: null, 1: null, 2: null,
    3: null, 4: null, 5: null,
    6: null, 7: null, 8: null
  });

  // Modal selector variables
  const [activeCellIndex, setActiveCellIndex] = useState<number | null>(null);
  const [viewingCharacterDetail, setViewingCharacterDetail] = useState<{ char: RegisteredCharacter; cellIdx: number } | null>(null);
  const [detailActiveImageIndex, setDetailActiveImageIndex] = useState(0);

  useEffect(() => {
    setDetailActiveImageIndex(0);
  }, [viewingCharacterDetail]);
  const [searchQuery, setSearchQuery] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [showJokerTraits, setShowJokerTraits] = useState(false);
  const [showScoringRules, setShowScoringRules] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [customURLCopied, setCustomURLCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Point-based scoring system state
  const [usedCharacterIds, setUsedCharacterIds] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<"none" | "trait_scoring" | "same_trait" | "multiverse">("none");

  // Reset points and used characters when a new board is generated or loaded.
  useEffect(() => {
    setUsedCharacterIds([]);
    setShowScoringRules(false);
  }, [board]);

  const handleStartOver = () => {
    if (isDailyPuzzleMode && isDailyCompletedForUser) {
      setDailyNotice("You have already completed this daily puzzle and cannot clear your registered board.");
      return;
    }
    setSelectedCells({
      0: null, 1: null, 2: null,
      3: null, 4: null, 5: null,
      6: null, 7: null, 8: null
    });
    setHintText(null);
    setShowJokerTraits(false);
    setShowScoringRules(false);
    setUsedCharacterIds([]);
  };

  const checkUserDailyCompletion = useCallback(async (dateStr: string, charsList: RegisteredCharacter[]) => {
    if (!user || !user.uid) {
      setIsDailyCompletedForUser(false);
      setSavedDailyScore(null);
      return false;
    }
    try {
      const lbRes = await fetch(`/api/daily-leaderboard?date=${dateStr}`);
      const lbData = await lbRes.json();
      if (lbData && Array.isArray(lbData.leaderboard)) {
        const userEntry = lbData.leaderboard.find((e: any) => e.userId === user.uid);
        if (userEntry && Array.isArray(userEntry.placedCharacterIds) && userEntry.placedCharacterIds.length === 9) {
          setIsDailyCompletedForUser(true);
          const scoreNum = typeof userEntry.pointsScore === "number" ? userEntry.pointsScore : (Number(userEntry.pointsScore) || 0);
          setSavedDailyScore(scoreNum);

          const registeredCells: Record<number, RegisteredCharacter | null> = {};
          userEntry.placedCharacterIds.forEach((charId: string, idx: number) => {
            const found = charsList.find(c => c.id === charId);
            registeredCells[idx] = found || null;
          });
          if (userEntry.gameMode) {
            setGameMode(userEntry.gameMode as any);
          }
          setSelectedCells(registeredCells);
          setDailyNotice(`🔒 You have already completed the daily puzzle for ${dateStr}! Your registered answers are displayed below.`);
          return true;
        }
      }
    } catch (err) {
      console.error("Error checking user daily completion:", err);
    }
    setIsDailyCompletedForUser(false);
    setSavedDailyScore(null);
    return false;
  }, [user]);

  useEffect(() => {
    if (isDailyPuzzleMode && user && characters.length > 0) {
      checkUserDailyCompletion(dailyPuzzleDate, characters);
    } else if (!isDailyPuzzleMode) {
      setIsDailyCompletedForUser(false);
      setSavedDailyScore(null);
    }
  }, [user, dailyPuzzleDate, isDailyPuzzleMode, characters, checkUserDailyCompletion]);

  const handleShareBoard = () => {
    if (!board) return;
    const currentCode = encodePuzzle(board.jokerId || "", board.rowTraits, board.colTraits, board.bonusTrait);
    const fullShareURL = `${window.location.origin}/sudoku/${currentCode}`;
    navigator.clipboard.writeText(fullShareURL);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  useEffect(() => {
    setHintText(null);
  }, [activeCellIndex]);

  const handleGetHint = () => {
    if (activeCellIndex === null || !board) return;

    // Get IDs of characters already selected on the current sudoku board
    const selectedCharIds = (Object.values(selectedCells).filter(Boolean) as RegisteredCharacter[]).map(c => c.id);

    // Search for compatible characters (filtering out already selected characters)
    const matchingChars = characters.filter(
      (char) => isCompatibleWithCell(char, activeCellIndex) && !selectedCharIds.includes(char.id)
    );

    if (matchingChars.length === 0) {
      setHintText("No other characters matching this logic grid position registered or available (all matching options might already be selected).");
      return;
    }

    // Pick a random matching character
    const randomChar = matchingChars[Math.floor(Math.random() * matchingChars.length)];

    const hintOptions: { type: string; value: string }[] = [];

    // Initials option (ex.: Naruto Uzumaki = N, U)
    const initials = randomChar.name
      .split(/\s+/)
      .map(word => {
        const cleaned = word.replace(/[^a-zA-Z]/g, "");
        return cleaned ? cleaned.charAt(0).toUpperCase() : "";
      })
      .filter(Boolean)
      .join(", ");
    if (initials) {
      hintOptions.push({
        type: "initials",
        value: `Initials = ${initials}`
      });
    }

    // Sources option (ex.: Naruto, Naruto Shippuden)
    if (randomChar.sources && randomChar.sources.length > 0) {
      hintOptions.push({
        type: "sources",
        value: `Source Anime = ${randomChar.sources.join(", ")}`
      });
    }

    // Trait option: not rowTrait nor colTrait of this cell (ex.: Hair length = Short)
    const rIdx = Math.floor(activeCellIndex / 3);
    const cIdx = activeCellIndex % 3;
    const rowTraitKey = board.rowTraits[rIdx].key;
    const colTraitKey = board.colTraits[cIdx].key;

    const otherTraits: { key: string; value: string }[] = [];
    if (randomChar.traits) {
      Object.entries(randomChar.traits).forEach(([key, val]) => {
        if (key !== rowTraitKey && key !== colTraitKey && val !== undefined && val !== null) {
          let formattedValue = "";
          if (Array.isArray(val)) {
            formattedValue = val.join(", ");
          } else {
            formattedValue = String(val);
          }
          if (formattedValue.trim()) {
            otherTraits.push({
              key: key.replace(/_/g, " "),
              value: formattedValue
            });
          }
        }
      });
    }

    if (otherTraits.length > 0) {
      const randomTrait = otherTraits[Math.floor(Math.random() * otherTraits.length)];
      // Format as "Hair length = Short"
      const formattedKey = randomTrait.key.charAt(0).toUpperCase() + randomTrait.key.slice(1);
      hintOptions.push({
        type: "trait",
        value: `${formattedKey} = ${randomTrait.value}`
      });
    }

    if (hintOptions.length > 0) {
      const selectedHint = hintOptions[Math.floor(Math.random() * hintOptions.length)];
      setHintText(selectedHint.value);
    } else {
      setHintText(`Name hint: starts with "${randomChar.name.charAt(0)}"`);
    }
  };

  // Load traits from API first
  const fetchTraits = async () => {
    setTraitsLoading(true);
    try {
      const response = await fetch("/api/traits");
      if (response.ok) {
        const data = await response.json();
        setTraits(data);
      }
    } catch (e) {
      console.error("Failed to load traits:", e);
    } finally {
      setTraitsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraits();
  }, []);

  // Find joker character for current board
  const jokerChar = board?.jokerId ? characters.find(c => c.id === board.jokerId) : null;

  // Derive active bonus trait for Same Trait Mode
  const sameTraitBonus = useMemo<TraitRequirement | null>(() => {
    if (!board) return null;
    if (board.bonusTrait) return board.bonusTrait;
    if (!jokerChar) return null;

    const boardTraitKeys = new Set([
      ...board.rowTraits.map(t => t.key),
      ...board.colTraits.map(t => t.key)
    ]);
    const allKeys = Array.from(new Set([...Object.keys(traits), ...FIXED_TRAITS]));
    const candidates: TraitRequirement[] = [];

    for (const key of allKeys) {
      if (boardTraitKeys.has(key)) continue;
      if (isTraitDefinedForChar(jokerChar, key, animes)) {
        const val = getCharTraitValue(jokerChar, key, animes);
        if (val && val.trim() !== "") {
          const matchedOption = FIXED_TRAITS.includes(key)
            ? undefined
            : (traits[key] || []).find(t => t.name === val);
          candidates.push({
            key,
            value: val,
            description: matchedOption ? matchedOption.description : ""
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    let seed = 0;
    if (board.jokerId) {
      for (let i = 0; i < board.jokerId.length; i++) {
        seed += board.jokerId.charCodeAt(i);
      }
    }
    return candidates[seed % candidates.length];
  }, [board, jokerChar, traits, animes]);

  // Helper: Check if two characters share any source anime
  const shareAnySource = (charA: RegisteredCharacter, charB: RegisteredCharacter): boolean => {
    if (!charA || !charB || !charA.sources || !charB.sources) return false;
    return charA.sources.some(sA => 
      charB.sources.some(sB => sA.trim().toLowerCase() === sB.trim().toLowerCase())
    );
  };

  // Helper: Check if character shares source with any other character entered on the rest of the board
  const hasSourceConflictOnBoard = (
    char: RegisteredCharacter,
    cellIndex: number,
    cells: Record<number, RegisteredCharacter | null>
  ): boolean => {
    if (!char) return false;
    for (let idx = 0; idx < 9; idx++) {
      if (idx === cellIndex) continue;
      const existing = cells[idx];
      if (existing && shareAnySource(char, existing)) {
        return true;
      }
    }
    return false;
  };

  // Helper: Get list of source conflicts with other characters on the board
  const getSourceConflicts = (
    char: RegisteredCharacter,
    cellIndex: number,
    cells: Record<number, RegisteredCharacter | null>
  ): { conflictingChar: RegisteredCharacter; conflictingSource: string }[] => {
    const conflicts: { conflictingChar: RegisteredCharacter; conflictingSource: string }[] = [];
    if (!char || !char.sources) return conflicts;

    for (let idx = 0; idx < 9; idx++) {
      if (idx === cellIndex) continue;
      const existing = cells[idx];
      if (!existing || !existing.sources) continue;

      for (const sA of char.sources) {
        const trimmedA = sA.trim().toLowerCase();
        for (const sB of existing.sources) {
          if (trimmedA === sB.trim().toLowerCase()) {
            conflicts.push({ conflictingChar: existing, conflictingSource: sA });
          }
        }
      }
    }
    return conflicts;
  };

  // Check if character is compatible with cell coordinates
  const isCompatibleWithCell = (char: RegisteredCharacter, cellIndex: number) => {
    if (!board) return false;
    const r = Math.floor(cellIndex / 3);
    const c = cellIndex % 3;
    const rowT = board.rowTraits[r];
    const colT = board.colTraits[c];

    let matches = matchesTrait(char, rowT.key, rowT.value, animes) && matchesTrait(char, colT.key, colT.value, animes);

    if (gameMode === "same_trait" && sameTraitBonus) {
      matches = matches && matchesTrait(char, sameTraitBonus.key, sameTraitBonus.value, animes);
    }

    if (gameMode === "multiverse") {
      const hasConflict = hasSourceConflictOnBoard(char, cellIndex, selectedCells);
      if (hasConflict) {
        return false;
      }
    }

    return matches;
  };

  // Check if character is searchable for cell coordinates (must have non-fixed traits registered, ignoring fixed traits)
  const isSearchableForCell = (char: RegisteredCharacter, cellIndex: number) => {
    if (!board) return false;
    const r = Math.floor(cellIndex / 3);
    const c = cellIndex % 3;
    const rowT = board.rowTraits[r];
    const colT = board.colTraits[c];

    const matchesRow = FIXED_TRAITS.includes(rowT.key)
      ? true
      : isTraitDefinedForChar(char, rowT.key, animes);

    const matchesCol = FIXED_TRAITS.includes(colT.key)
      ? true
      : isTraitDefinedForChar(char, colT.key, animes);

    return matchesRow && matchesCol;
  };

  // Automatically recalculate base score points and used character IDs whenever selectedCells, board, or gameMode changes
  useEffect(() => {
    if (!board) {
      setUsedCharacterIds([]);
      return;
    }

    if (isDailyPuzzleMode && isDailyCompletedForUser) {
      return;
    }

    let calculatedPoints = 0;
    const usedIds: string[] = [];

    for (let idx = 0; idx < 9; idx++) {
      const char = selectedCells[idx];
      if (char) {
        const hasConflict = gameMode === "multiverse" && hasSourceConflictOnBoard(char, idx, selectedCells);
        const isJoker = board.jokerId === char.id && !hasConflict;
        const isCompat = isCompatibleWithCell(char, idx);

        if ((isCompat || isJoker) && !usedIds.includes(char.id)) {
          const pointsToGrant = isJoker ? 200 : 100;
          calculatedPoints += pointsToGrant;
          usedIds.push(char.id);
        }
      }
    }

    setUsedCharacterIds(usedIds);
  }, [board, selectedCells, gameMode, sameTraitBonus, animes, isDailyPuzzleMode, isDailyCompletedForUser]);

  const calculateBaseScorePoints = (selectedCells: Record<number, RegisteredCharacter | null>, board: SudokuBoard) => {
    let calculatedPoints = 0;
    const usedIds: string[] = [];

    for (let idx = 0; idx < 9; idx++) {
      const char = selectedCells[idx];
      if (char) {
        const hasConflict = gameMode === "multiverse" && hasSourceConflictOnBoard(char, idx, selectedCells);
        const isJoker = board.jokerId === char.id && !hasConflict;
        const isCompat = isCompatibleWithCell(char, idx);

        if ((isCompat || isJoker) && !usedIds.includes(char.id)) {
          const pointsToGrant = isJoker ? 200 : 100;
          calculatedPoints += pointsToGrant;
          usedIds.push(char.id);
        }
      }
    }

    return calculatedPoints;
  }

  // Generate Sudoku board matching database constraints
  const generateNewSudoku = () => {
    if (characters.length < 9) {
      setGenerationError("You need at least 9 registered characters in the database to play.");
      return;
    }

    setGenerating(true);
    setGenerationError(null);

    // Let traitsKeys be all keys with values
    const allTraitKeys = [...Object.keys(traits).filter(k => traits[k] && traits[k].length > 0), ...FIXED_TRAITS];
    if (allTraitKeys.length < 6) {
      setGenerationError("Not enough distinct traits available. Add at least 6 categories in traits DB.");
      setGenerating(false);
      return;
    }

    // Try finding a valid game board (limit validation retries to 5 after each joker candidate selection)
    let totalAttempts = 0;
    let foundBoard: SudokuBoard | null = null;

    // Filter characters that can act as a Joker (having at least 6 traits defined)
    const jokerCandidates = characters.filter(char => {
      let count = 0;
      for (const key of allTraitKeys) {
        if (isTraitDefinedForChar(char, key, animes)) {
          count++;
        }
      }
      return count >= 6;
    });

    const maxJokerSelections = 100;
    let jokerSelections = 0;

    while (jokerSelections < maxJokerSelections && !foundBoard) {
      jokerSelections++;

      if (jokerCandidates.length === 0) break;

      // STEP 1: Joker Selection
      const candidateJoker = jokerCandidates[Math.floor(Math.random() * jokerCandidates.length)];

      // Gather all available traits for this candidate
      const jokerAvailableTraits: TraitRequirement[] = [];
      for (const key of allTraitKeys) {
        if (isTraitDefinedForChar(candidateJoker, key, animes)) {
          const chosenVal = getCharTraitValue(candidateJoker, key, animes);
          if (chosenVal.trim() !== "") {
            const matchedOption = FIXED_TRAITS.includes(key)
              ? undefined
              : (traits[key] || []).find(t => t.name === chosenVal);
            jokerAvailableTraits.push({ 
              key, 
              value: chosenVal,
              description: matchedOption ? matchedOption.description : ""
            });
          }
        }
      }

      if (jokerAvailableTraits.length < 6) continue;

      // STEP 2: Limit validation retries to 5 after joker selection
      let validationRetries = 0;
      const maxValidationRetries = 5;

      while (validationRetries < maxValidationRetries) {
        validationRetries++;
        totalAttempts++;

        let rowTraits: TraitRequirement[] = [];
        let colTraits: TraitRequirement[] = [];

        // Shuffle and pick 6 distinct traits, limiting source-related fixed traits to at most 2, and name-related to at most 1 (total fixed <= 2)
        const shuffledCandidateTraits = [...jokerAvailableTraits].sort(() => 0.5 - Math.random());
        const selectedTraits6: TraitRequirement[] = [];
        let sourceFixedCount = 0;
        let nameFixedCount = 0;
        let totalFixedCount = 0;

        for (const trait of shuffledCandidateTraits) {
          if (selectedTraits6.length >= 6) break;
          const isFixed = FIXED_TRAITS.includes(trait.key);
          const isSourceFixed = isFixed && trait.key.startsWith("Source");
          const isNameFixed = isFixed && (trait.key.startsWith("Name") || trait.key === "Last Name");

          if (isSourceFixed) {
            if (sourceFixedCount < 2 && totalFixedCount < 2) {
              selectedTraits6.push(trait);
              sourceFixedCount++;
              totalFixedCount++;
            }
          } else if (isNameFixed) {
            if (nameFixedCount < 1 && totalFixedCount < 2) {
              selectedTraits6.push(trait);
              nameFixedCount++;
              totalFixedCount++;
            }
          } else {
            selectedTraits6.push(trait);
          }
        }

        // Backfill if we need more to reach 6 traits while still respecting the soft limits
        if (selectedTraits6.length < 6) {
          for (const trait of shuffledCandidateTraits) {
            if (selectedTraits6.length >= 6) break;
            if (selectedTraits6.some(t => t.key === trait.key)) continue;

            const isFixed = FIXED_TRAITS.includes(trait.key);
            const isSourceFixed = isFixed && trait.key.startsWith("Source");
            const isNameFixed = isFixed && (trait.key.startsWith("Name") || trait.key === "Last Name");

            if (isSourceFixed) {
              if (sourceFixedCount < 2 && totalFixedCount < 2) {
                selectedTraits6.push(trait);
                sourceFixedCount++;
                totalFixedCount++;
              }
            } else if (isNameFixed) {
              if (nameFixedCount < 1 && totalFixedCount < 2) {
                selectedTraits6.push(trait);
                nameFixedCount++;
                totalFixedCount++;
              }
            } else {
              selectedTraits6.push(trait);
            }
          }
        }

        // Final backfill relaxing constraints if we still have under 6 traits
        if (selectedTraits6.length < 6) {
          for (const trait of shuffledCandidateTraits) {
            if (selectedTraits6.length >= 6) break;
            if (!selectedTraits6.some(t => t.key === trait.key)) {
              selectedTraits6.push(trait);
            }
          }
        }

        if (selectedTraits6.length < 6) continue;

        rowTraits = [selectedTraits6[0], selectedTraits6[1], selectedTraits6[2]];
        colTraits = [selectedTraits6[3], selectedTraits6[4], selectedTraits6[5]];

        // Map each of the 9 cells to all compatible characters in current database
        const cellCompatibleChars: string[][] = [];
        let impossible = false;

        for (let i = 0; i < 9; i++) {
          const r = Math.floor(i / 3);
          const c = i % 3;
          const rowT = rowTraits[r];
          const colT = colTraits[c];

          const compat = characters.filter(char => 
            matchesTrait(char, rowT.key, rowT.value, animes) && 
            matchesTrait(char, colT.key, colT.value, animes)
          );

          if (compat.length === 0) {
            impossible = true;
            break;
          }
          cellCompatibleChars.push(compat.map(char => char.id));
        }

        if (impossible) {
          continue; // Try next validation retry for this joker candidate
        }

        // Check if we can assign a unique character for each cell
        const chosenIds: string[] = [];
        const solved = findUniqueAssignment(0, cellCompatibleChars, chosenIds);

        if (solved) {
          // Find if there's any character in the database that has ALL 6 traits (Joker)
          const joker = characters.find(char => {
            return rowTraits.every(rt => matchesTrait(char, rt.key, rt.value, animes)) &&
                   colTraits.every(ct => matchesTrait(char, ct.key, ct.value, animes));
          });

          // Ensure we always have a joker character
          if (!joker) {
            continue;
          }

          // Pick a random bonus trait from Joker that's not already on the board (fixed traits also count)
          const boardTraitKeys = new Set([
            ...rowTraits.map(t => t.key),
            ...colTraits.map(t => t.key)
          ]);

          const jokerAvailableBonusTraits: TraitRequirement[] = [];
          for (const key of allTraitKeys) {
            if (boardTraitKeys.has(key)) continue;
            if (isTraitDefinedForChar(joker, key, animes)) {
              const chosenVal = getCharTraitValue(joker, key, animes);
              if (chosenVal && chosenVal.trim() !== "") {
                const matchedOption = FIXED_TRAITS.includes(key)
                  ? undefined
                  : (traits[key] || []).find(t => t.name === chosenVal);
                jokerAvailableBonusTraits.push({
                  key,
                  value: chosenVal,
                  description: matchedOption ? matchedOption.description : ""
                });
              }
            }
          }

          const chosenBonusTrait = jokerAvailableBonusTraits.length > 0
            ? jokerAvailableBonusTraits[Math.floor(Math.random() * jokerAvailableBonusTraits.length)]
            : null;

          const validationRes = validatePuzzleModes(
            rowTraits,
            colTraits,
            joker.id,
            chosenBonusTrait,
            characters,
            traits,
            animes
          );

          foundBoard = {
            rowTraits,
            colTraits,
            jokerId: joker.id,
            bonusTrait: validationRes.resolvedBonusTrait || chosenBonusTrait,
            supportedModes: validationRes.supportedModes
          };
          break; // Found valid board! Exit validation loop.
        }
      }
      // If after 5 validation retries no valid sudoku generated, go back to selecting a new joker!
    }

    // Fallback if no board found with joker candidates
    if (!foundBoard && jokerCandidates.length === 0) {
      let fallbackAttempts = 0;
      while (fallbackAttempts < 20) {
        fallbackAttempts++;
        totalAttempts++;
        const shuffledKeys = [...allTraitKeys].sort(() => 0.5 - Math.random());
        const selectedKeys6: string[] = [];
        let sourceFixedCountKeys = 0;
        let nameFixedCountKeys = 0;
        let totalFixedCountKeys = 0;

        for (const key of shuffledKeys) {
          if (selectedKeys6.length >= 6) break;
          const isFixed = FIXED_TRAITS.includes(key);
          const isSourceFixed = isFixed && key.startsWith("Source");
          const isNameFixed = isFixed && (key.startsWith("Name") || key === "Last Name");

          if (isSourceFixed) {
            if (sourceFixedCountKeys < 2 && totalFixedCountKeys < 2) {
              selectedKeys6.push(key);
              sourceFixedCountKeys++;
              totalFixedCountKeys++;
            }
          } else if (isNameFixed) {
            if (nameFixedCountKeys < 1 && totalFixedCountKeys < 2) {
              selectedKeys6.push(key);
              nameFixedCountKeys++;
              totalFixedCountKeys++;
            }
          } else {
            selectedKeys6.push(key);
          }
        }

        if (selectedKeys6.length < 6) continue;

        const rowKeys = [selectedKeys6[0], selectedKeys6[1], selectedKeys6[2]];
        const colKeys = [selectedKeys6[3], selectedKeys6[4], selectedKeys6[5]];

        const pickFixedTraitVal = (key: string): string => {
          let possibleVals: string[] = [];
          if (key === "Name Starts With" || key === "Source Starts With") {
            const setOfInitials = new Set<string>();
            characters.forEach(c => {
              const val = getFixedTraitValue(c, key, animes);
              if (val) setOfInitials.add(val);
            });
            possibleVals = Array.from(setOfInitials);
            if (possibleVals.length === 0) possibleVals = ["A"];
          } else if (key === "Name Word Count" || key === "Source Word Count") {
            possibleVals = ["Odd", "Even"];
          } else if (key === "Last Name") {
            possibleVals = ["Has Last Name", "No Last Name"];
          } else if (key === "Source Format") {
            const setOfFormats = new Set<string>();
            characters.forEach(c => {
              const val = getFixedTraitValue(c, key, animes);
              if (val) setOfFormats.add(val);
            });
            possibleVals = Array.from(setOfFormats);
            if (possibleVals.length === 0) possibleVals = ["TV"];
          } else if (key === "Source Material") {
            const setOfMaterials = new Set<string>();
            characters.forEach(c => {
              const val = getFixedTraitValue(c, key, animes);
              if (val) setOfMaterials.add(val);
            });
            possibleVals = Array.from(setOfMaterials);
            if (possibleVals.length === 0) possibleVals = ["Manga"];
          } else if (key === "Source Decade") {
            const setOfDecades = new Set<string>();
            characters.forEach(c => {
              const val = getFixedTraitValue(c, key, animes);
              if (val) setOfDecades.add(val);
            });
            possibleVals = Array.from(setOfDecades);
            if (possibleVals.length === 0) possibleVals = ["2010s"];
          } else if (key === "Source Genre") {
            const setOfGenres = new Set<string>();
            characters.forEach(c => {
              const val = getFixedTraitValue(c, key, animes);
              if (val) setOfGenres.add(val);
            });
            possibleVals = Array.from(setOfGenres);
            if (possibleVals.length === 0) possibleVals = ["Action"];
          }
          return possibleVals[Math.floor(Math.random() * possibleVals.length)] || "";
        };

        const rowTraits: TraitRequirement[] = rowKeys.map(key => {
          if (FIXED_TRAITS.includes(key)) {
            const val = pickFixedTraitVal(key);
            return { key, value: val, description: "" };
          }
          const vals = traits[key] || [];
          const val = vals[Math.floor(Math.random() * vals.length)];
          return { key, value: val ? val.name : "", description: val ? val.description : "" };
        });

        const colTraits: TraitRequirement[] = colKeys.map(key => {
          if (FIXED_TRAITS.includes(key)) {
            const val = pickFixedTraitVal(key);
            return { key, value: val, description: "" };
          }
          const vals = traits[key] || [];
          const val = vals[Math.floor(Math.random() * vals.length)];
          return { key, value: val ? val.name : "", description: val ? val.description : "" };
        });

        const cellCompatibleChars: string[][] = [];
        let impossible = false;

        for (let i = 0; i < 9; i++) {
          const r = Math.floor(i / 3);
          const c = i % 3;
          const rowT = rowTraits[r];
          const colT = colTraits[c];

          const compat = characters.filter(char => 
            matchesTrait(char, rowT.key, rowT.value, animes) && 
            matchesTrait(char, colT.key, colT.value, animes)
          );

          if (compat.length === 0) {
            impossible = true;
            break;
          }
          cellCompatibleChars.push(compat.map(char => char.id));
        }

        if (impossible) continue;

        const chosenIds: string[] = [];
        const solved = findUniqueAssignment(0, cellCompatibleChars, chosenIds);

        if (solved) {
          const joker = characters.find(char => {
            return rowTraits.every(rt => matchesTrait(char, rt.key, rt.value, animes)) &&
                   colTraits.every(ct => matchesTrait(char, ct.key, ct.value, animes));
          });

          if (!joker) continue;

          const validationRes = validatePuzzleModes(
            rowTraits,
            colTraits,
            joker.id,
            null,
            characters,
            traits,
            animes
          );

          foundBoard = {
            rowTraits,
            colTraits,
            jokerId: joker.id,
            bonusTrait: validationRes.resolvedBonusTrait,
            supportedModes: validationRes.supportedModes
          };
          break;
        }
      }
    }

    if (foundBoard) {
      setBoard(foundBoard);
      // Reset active selections
      setSelectedCells({
        0: null, 1: null, 2: null,
        3: null, 4: null, 5: null,
        6: null, 7: null, 8: null
      });
      setShowJokerTraits(false);
      const nextCode = encodePuzzle(foundBoard.jokerId || "", foundBoard.rowTraits, foundBoard.colTraits, foundBoard.bonusTrait);
      navigate(`/sudoku/${nextCode}`, { replace: true });
    } else {
      setGenerationError(
        `Failed to generate a solvable 3x3 layout after ${totalAttempts} combinations. Try adding more characters with varied traits, or seed the database reference.`
      );
    }
    setGenerating(false);
  };

  // Decode custom puzzle from code if present in the URL
  useEffect(() => {
    if (code && characters.length > 0 && Object.keys(traits).length > 0) {
      const decoded = decodePuzzle(code);
      if (decoded) {
        // Find matching descriptions from the loaded configuration
        const rowTraitsWithDesc = decoded.rowTraits.map(rt => {
          const matchedOpt = FIXED_TRAITS.includes(rt.key)
            ? undefined
            : (traits[rt.key] || []).find(t => t.name === rt.value);
          return {
            ...rt,
            description: matchedOpt ? matchedOpt.description : ""
          };
        });
        const colTraitsWithDesc = decoded.colTraits.map(ct => {
          const matchedOpt = FIXED_TRAITS.includes(ct.key)
            ? undefined
            : (traits[ct.key] || []).find(t => t.name === ct.value);
          return {
            ...ct,
            description: matchedOpt ? matchedOpt.description : ""
          };
        });

        const bonusTraitWithDesc = decoded.bonusTrait ? {
          ...decoded.bonusTrait,
          description: FIXED_TRAITS.includes(decoded.bonusTrait.key)
            ? ""
            : ((traits[decoded.bonusTrait.key] || []).find(t => t.name === decoded.bonusTrait?.value)?.description || "")
        } : null;

        const validationRes = validatePuzzleModes(
          rowTraitsWithDesc,
          colTraitsWithDesc,
          decoded.jokerId,
          bonusTraitWithDesc,
          characters,
          traits,
          animes
        );

        setBoard({
          rowTraits: rowTraitsWithDesc,
          colTraits: colTraitsWithDesc,
          jokerId: decoded.jokerId,
          bonusTrait: validationRes.resolvedBonusTrait || bonusTraitWithDesc,
          supportedModes: validationRes.supportedModes
        });
        // Clear custom build state so we focus on playing the loaded puzzle
        setCustomBuild(null);
        // Reset selections
        setSelectedCells({
          0: null, 1: null, 2: null,
          3: null, 4: null, 5: null,
          6: null, 7: null, 8: null
        });
        setShowJokerTraits(false);
      } else {
        setGenerationError("Invalid or corrupted custom puzzle URL.");
      }
    }
  }, [code, characters, traits]);

  // Load or generate Daily Puzzle for specified date
  const loadDailyPuzzle = async (targetDate?: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    let dateStr = targetDate || dailyPuzzleDate || todayStr;
    if (dateStr > todayStr) {
      dateStr = todayStr;
    }
    setDailyPuzzleDate(dateStr);
    setIsDailyPuzzleMode(true);
    setLoadingDaily(true);
    setGenerationError(null);
    setDailyNotice(null);

    try {
      // 1. Check if puzzle already exists in database
      const res = await fetch(`/api/daily-puzzle?date=${dateStr}`);
      const data = await res.json();

      if (data.exists && data.puzzle) {
        const decoded = decodePuzzle(data.puzzle.puzzleCode);
        if (decoded) {
          const rowTraitsWithDesc = decoded.rowTraits.map(rt => {
            const matchedOpt = FIXED_TRAITS.includes(rt.key)
              ? undefined
              : (traits[rt.key] || []).find(t => t.name === rt.value);
            return {
              ...rt,
              description: matchedOpt ? matchedOpt.description : ""
            };
          });
          const colTraitsWithDesc = decoded.colTraits.map(ct => {
            const matchedOpt = FIXED_TRAITS.includes(ct.key)
              ? undefined
              : (traits[ct.key] || []).find(t => t.name === ct.value);
            return {
              ...ct,
              description: matchedOpt ? matchedOpt.description : ""
            };
          });

          const bonusTraitWithDesc = decoded.bonusTrait ? {
            ...decoded.bonusTrait,
            description: FIXED_TRAITS.includes(decoded.bonusTrait.key)
              ? ""
              : ((traits[decoded.bonusTrait.key] || []).find(t => t.name === decoded.bonusTrait?.value)?.description || "")
          } : null;

          const validationRes = validatePuzzleModes(
            rowTraitsWithDesc,
            colTraitsWithDesc,
            decoded.jokerId,
            bonusTraitWithDesc,
            characters,
            traits,
            animes
          );

          setBoard({
            rowTraits: rowTraitsWithDesc,
            colTraits: colTraitsWithDesc,
            jokerId: decoded.jokerId,
            bonusTrait: validationRes.resolvedBonusTrait || bonusTraitWithDesc,
            supportedModes: validationRes.supportedModes
          });

          // Set locked game mode for this daily puzzle (always trait_scoring)
          const savedMode = data.puzzle.gameMode || "trait_scoring";
          setGameMode((savedMode === "none" ? "trait_scoring" : savedMode) as any);

          const isCompleted = await checkUserDailyCompletion(dateStr, characters);
          if (!isCompleted) {
            setSelectedCells({
              0: null, 1: null, 2: null,
              3: null, 4: null, 5: null,
              6: null, 7: null, 8: null
            });
          }
          setShowJokerTraits(false);
          setCustomBuild(null);
        } else {
          setGenerationError("Invalid or corrupted daily puzzle code.");
        }
      } else {
        // Daily puzzle does not exist yet for this date -> generate and save it!
        if (characters.length < 9) {
          setGenerationError("You need at least 9 registered characters in the database to generate a daily puzzle.");
          return;
        }

        const allTraitKeys = [...Object.keys(traits).filter(k => traits[k] && traits[k].length > 0), ...FIXED_TRAITS];
        if (allTraitKeys.length < 6) {
          setGenerationError("Not enough distinct traits available. Add at least 6 categories in traits DB.");
          return;
        }

        let totalAttempts = 0;
        let foundBoard: SudokuBoard | null = null;
        let foundSupportedModes: GameModeCompatibility | null = null;

        const jokerCandidates = characters.filter(char => {
          let count = 0;
          for (const key of allTraitKeys) {
            if (isTraitDefinedForChar(char, key, animes)) {
              count++;
            }
          }
          return count >= 6;
        });

        const maxJokerSelections = 100;
        let jokerSelections = 0;

        while (jokerSelections < maxJokerSelections && !foundBoard) {
          jokerSelections++;
          if (jokerCandidates.length === 0) break;

          const candidateJoker = jokerCandidates[Math.floor(Math.random() * jokerCandidates.length)];
          const jokerAvailableTraits: TraitRequirement[] = [];
          for (const key of allTraitKeys) {
            if (isTraitDefinedForChar(candidateJoker, key, animes)) {
              const chosenVal = getCharTraitValue(candidateJoker, key, animes);
              if (chosenVal.trim() !== "") {
                const matchedOption = FIXED_TRAITS.includes(key)
                  ? undefined
                  : (traits[key] || []).find(t => t.name === chosenVal);
                jokerAvailableTraits.push({
                  key,
                  value: chosenVal,
                  description: matchedOption ? matchedOption.description : ""
                });
              }
            }
          }

          if (jokerAvailableTraits.length < 6) continue;

          let validationRetries = 0;
          const maxValidationRetries = 5;

          while (validationRetries < maxValidationRetries) {
            validationRetries++;
            totalAttempts++;

            const shuffledCandidateTraits = [...jokerAvailableTraits].sort(() => 0.5 - Math.random());
            const selectedTraits6: TraitRequirement[] = [];
            let sourceFixedCount = 0;
            let nameFixedCount = 0;
            let totalFixedCount = 0;

            for (const trait of shuffledCandidateTraits) {
              if (selectedTraits6.length >= 6) break;
              const isFixed = FIXED_TRAITS.includes(trait.key);
              const isSourceFixed = isFixed && trait.key.startsWith("Source");
              const isNameFixed = isFixed && (trait.key.startsWith("Initial") || trait.key.startsWith("Name"));

              if (isFixed) {
                if (totalFixedCount >= 2) continue;
                if (isSourceFixed && sourceFixedCount >= 2) continue;
                if (isNameFixed && nameFixedCount >= 1) continue;
              }

              selectedTraits6.push(trait);
              if (isFixed) {
                totalFixedCount++;
                if (isSourceFixed) sourceFixedCount++;
                if (isNameFixed) nameFixedCount++;
              }
            }

            if (selectedTraits6.length < 6) continue;

            const rowTraits = [selectedTraits6[0], selectedTraits6[1], selectedTraits6[2]];
            const colTraits = [selectedTraits6[3], selectedTraits6[4], selectedTraits6[5]];

            const validationRes = validatePuzzleModes(
              rowTraits,
              colTraits,
              candidateJoker.id,
              null,
              characters,
              traits,
              animes
            );

            if (validationRes.supportedModes.traitScoring) {
              foundBoard = {
                rowTraits,
                colTraits,
                jokerId: candidateJoker.id,
                bonusTrait: validationRes.resolvedBonusTrait,
                supportedModes: validationRes.supportedModes
              };
              foundSupportedModes = validationRes.supportedModes;
              break;
            }
          }
        }

        if (foundBoard && foundSupportedModes) {
          // Daily puzzles are always set to trait_scoring mode
          const chosenMode = "trait_scoring";

          const puzzleCode = encodePuzzle(
            foundBoard.jokerId || "",
            foundBoard.rowTraits,
            foundBoard.colTraits,
            foundBoard.bonusTrait
          );

          // Save new daily puzzle hash and chosen mode to database
          await fetch("/api/daily-puzzle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: dateStr,
              puzzleCode,
              gameMode: chosenMode
            })
          });

          setBoard(foundBoard);
          setGameMode("trait_scoring");
          const isCompleted = await checkUserDailyCompletion(dateStr, characters);
          if (!isCompleted) {
            setSelectedCells({
              0: null, 1: null, 2: null,
              3: null, 4: null, 5: null,
              6: null, 7: null, 8: null
            });
          }
          setShowJokerTraits(false);
          setCustomBuild(null);
        } else {
          setGenerationError(`Failed to generate a solvable daily puzzle after ${totalAttempts} attempts.`);
        }
      }
    } catch (err) {
      console.error("Failed loading daily puzzle:", err);
      setGenerationError("Failed loading daily puzzle from server.");
    } finally {
      setLoadingDaily(false);
    }
  };

  // Route check for Daily Puzzle mode
  useEffect(() => {
    if (location.pathname.startsWith("/sudoku/daily")) {
      const todayStr = new Date().toISOString().split("T")[0];
      let targetDate = dateParam || todayStr;
      if (targetDate > todayStr) {
        targetDate = todayStr;
        navigate(`/sudoku/daily/${todayStr}`, { replace: true });
      }
      if (characters.length >= 9 && Object.keys(traits).length >= 6) {
        loadDailyPuzzle(targetDate);
      }
    }
  }, [location.pathname, dateParam, characters.length, Object.keys(traits).length]);

  // Run automatically when characters and traits are ready, if we don't have a board yet
  useEffect(() => {
    if (code) return; // Wait for URL custom board decoding
    if (location.pathname.startsWith("/sudoku/daily")) return; // Daily mode handles board loading
    if (customBuild?.active) return; // Do not auto-generate while user is building a custom puzzle
    if (characters.length >= 9 && Object.keys(traits).length >= 6 && !board) {
      generateNewSudoku();
    }
  }, [characters, traits, code, location.pathname, customBuild?.active]);

  // Handlers for Custom Puzzle Creation
  const handleStartCustomPuzzleCreation = () => {
    if (!user) {
      openLoginModal("Log in with Google to create custom Sudoku puzzles.");
      return;
    }
    setJokerSearch("");
    setJokerPage(1);
    setCustomBuild({
      active: true,
      step: "joker_select",
      joker: null,
      customRowTraits: [],
      customColTraits: [],
      isValidating: false,
      isValidated: false,
      validationError: null,
      customURL: null
    });
  };

  const handleSelectJoker = (joker: RegisteredCharacter) => {
    // Collect all valid filled traits of the joker character
    const jokerTraits: TraitRequirement[] = [];
    const allTraitKeys = [...Object.keys(traits), ...FIXED_TRAITS];
    for (const key of allTraitKeys) {
      if (isTraitDefinedForChar(joker, key, animes)) {
        const strVal = getCharTraitValue(joker, key, animes);
        if (strVal.trim() !== "") {
          const matchedOpt = FIXED_TRAITS.includes(key)
            ? undefined
            : (traits[key] || []).find(t => t.name === strVal);
          jokerTraits.push({
            key,
            value: strVal,
            description: matchedOpt ? matchedOpt.description : ""
          });
        }
      }
    }

    if (jokerTraits.length < 6) {
      alert("This character does not have at least 6 filled traits.");
      return;
    }

    // Auto build layout using the first 6 traits of the joker
    const customRowTraits = [jokerTraits[0], jokerTraits[1], jokerTraits[2]];
    const customColTraits = [jokerTraits[3], jokerTraits[4], jokerTraits[5]];

    setCustomBuild({
      active: true,
      step: "editing",
      joker,
      customRowTraits,
      customColTraits,
      isValidating: false,
      isValidated: false,
      validationError: null,
      customURL: null
    });
  };

  const handlePickRandomJoker = () => {
    const jokerCandidates = characters.filter(char => {
      let count = 0;
      const allTraitKeys = [...Object.keys(traits), ...FIXED_TRAITS];
      for (const key of allTraitKeys) {
        if (isTraitDefinedForChar(char, key, animes)) {
          count++;
        }
      }
      return count >= 6;
    });

    if (jokerCandidates.length === 0) {
      alert("No eligible joker characters with at least 6 filled traits found in database.");
      return;
    }

    const randomJoker = jokerCandidates[Math.floor(Math.random() * jokerCandidates.length)];
    handleSelectJoker(randomJoker);
  };

  const handleRandomizeBoard = () => {
    if (!customBuild || !customBuild.joker) return;
    const joker = customBuild.joker;

    // Build list of all filled traits of this joker
    const jokerTraits: TraitRequirement[] = [];
    const allTraitKeys = [...Object.keys(traits), ...FIXED_TRAITS];
    for (const key of allTraitKeys) {
      if (isTraitDefinedForChar(joker, key, animes)) {
        const strVal = getCharTraitValue(joker, key, animes);
        if (strVal.trim() !== "") {
          const matchedOpt = FIXED_TRAITS.includes(key)
            ? undefined
            : (traits[key] || []).find(t => t.name === strVal);
          jokerTraits.push({
            key,
            value: strVal,
            description: matchedOpt ? matchedOpt.description : ""
          });
        }
      }
    }

    if (jokerTraits.length < 6) return;

    // Shuffle jokerTraits to get a random layout of 6 unique categories
    const shuffled = [...jokerTraits].sort(() => 0.5 - Math.random());
    const selected6 = shuffled.slice(0, 6);

    // For each of the 6, pick a random value from getAvailableValuesForTrait(joker, key)
    const newRowTraits = selected6.slice(0, 3).map(trait => {
      const vals = getAvailableValuesForTrait(joker, trait.key, animes);
      const randomVal = vals[Math.floor(Math.random() * vals.length)] || "";
      const matchedOpt = FIXED_TRAITS.includes(trait.key)
        ? undefined
        : (traits[trait.key] || []).find(t => t.name === randomVal);
      return {
        key: trait.key,
        value: randomVal,
        description: matchedOpt ? matchedOpt.description : ""
      };
    });

    const newColTraits = selected6.slice(3, 6).map(trait => {
      const vals = getAvailableValuesForTrait(joker, trait.key, animes);
      const randomVal = vals[Math.floor(Math.random() * vals.length)] || "";
      const matchedOpt = FIXED_TRAITS.includes(trait.key)
        ? undefined
        : (traits[trait.key] || []).find(t => t.name === randomVal);
      return {
        key: trait.key,
        value: randomVal,
        description: matchedOpt ? matchedOpt.description : ""
      };
    });

    setCustomBuild(prev => {
      if (!prev) return null;
      return {
        ...prev,
        customRowTraits: newRowTraits,
        customColTraits: newColTraits,
        isValidated: false,
        validationError: null
      };
    });
  };

  const handleRandomizeSlot = (isRow: boolean, index: number) => {
    if (!customBuild || !customBuild.joker) return;
    const joker = customBuild.joker;

    const trait = isRow ? customBuild.customRowTraits[index] : customBuild.customColTraits[index];
    const available = getAvailableTraitsForSlot(isRow, index);
    const options = [trait, ...available];
    const uniqueOptions = options.filter((v, i, a) => a.findIndex(t => t.key === v.key) === i);

    if (uniqueOptions.length === 0) return;

    const randomTraitOpt = uniqueOptions[Math.floor(Math.random() * uniqueOptions.length)];
    const vals = getAvailableValuesForTrait(joker, randomTraitOpt.key, animes);
    const randomVal = vals[Math.floor(Math.random() * vals.length)] || "";

    const matchedOpt = FIXED_TRAITS.includes(randomTraitOpt.key)
      ? undefined
      : (traits[randomTraitOpt.key] || []).find(t => t.name === randomVal);

    const newTrait: TraitRequirement = {
      key: randomTraitOpt.key,
      value: randomVal,
      description: matchedOpt ? matchedOpt.description : ""
    };

    const nextRow = [...customBuild.customRowTraits];
    const nextCol = [...customBuild.customColTraits];
    if (isRow) {
      nextRow[index] = newTrait;
    } else {
      nextCol[index] = newTrait;
    }

    setCustomBuild(prev => {
      if (!prev) return null;
      return {
        ...prev,
        customRowTraits: nextRow,
        customColTraits: nextCol,
        isValidated: false,
        validationError: null
      };
    });
  };

  const handleRandomizeSlotValue = (isRow: boolean, index: number) => {
    if (!customBuild || !customBuild.joker) return;
    const joker = customBuild.joker;

    const nextRow = [...customBuild.customRowTraits];
    const nextCol = [...customBuild.customColTraits];
    const targetTrait = isRow ? nextRow[index] : nextCol[index];
    if (!targetTrait) return;

    const vals = getAvailableValuesForTrait(joker, targetTrait.key, animes);
    if (vals.length === 0) return;

    const randomVal = vals[Math.floor(Math.random() * vals.length)] || "";
    const matchedOpt = FIXED_TRAITS.includes(targetTrait.key)
      ? undefined
      : (traits[targetTrait.key] || []).find(t => t.name === randomVal);

    const updatedTrait: TraitRequirement = {
      ...targetTrait,
      value: randomVal,
      description: matchedOpt ? matchedOpt.description : ""
    };

    if (isRow) {
      nextRow[index] = updatedTrait;
    } else {
      nextCol[index] = updatedTrait;
    }

    setCustomBuild(prev => {
      if (!prev) return null;
      return {
        ...prev,
        customRowTraits: nextRow,
        customColTraits: nextCol,
        isValidated: false,
        validationError: null
      };
    });
  };

  const getAvailableTraitsForSlot = (isRow: boolean, index: number) => {
    if (!customBuild || !customBuild.joker) return [];
    const joker = customBuild.joker;

    // Build list of all filled traits of this joker
    const jokerTraits: TraitRequirement[] = [];
    const allTraitKeys = [...Object.keys(traits), ...FIXED_TRAITS];
    for (const key of allTraitKeys) {
      if (isTraitDefinedForChar(joker, key, animes)) {
        const strVal = getCharTraitValue(joker, key, animes);
        if (strVal.trim() !== "") {
          const matchedOpt = FIXED_TRAITS.includes(key)
            ? undefined
            : (traits[key] || []).find(t => t.name === strVal);
          jokerTraits.push({
            key,
            value: strVal,
            description: matchedOpt ? matchedOpt.description : ""
          });
        }
      }
    }

    // Find keys used in other slots
    const otherUsedKeys: string[] = [];
    customBuild.customRowTraits.forEach((t, idx) => {
      if (!(isRow && idx === index)) {
        otherUsedKeys.push(t.key);
      }
    });
    customBuild.customColTraits.forEach((t, idx) => {
      if (!(!isRow && idx === index)) {
        otherUsedKeys.push(t.key);
      }
    });

    return jokerTraits.filter(t => !otherUsedKeys.includes(t.key));
  };

  const handleUpdateSlot = (isRow: boolean, index: number, key: string) => {
    if (!customBuild || !customBuild.joker) return;
    const joker = customBuild.joker;
    const vals = getAvailableValuesForTrait(joker, key, animes);
    const strVal = vals[0] || "";
    const matchedOpt = FIXED_TRAITS.includes(key)
      ? undefined
      : (traits[key] || []).find(t => t.name === strVal);
    const newTrait: TraitRequirement = {
      key,
      value: strVal,
      description: matchedOpt ? matchedOpt.description : ""
    };

    const nextRow = [...customBuild.customRowTraits];
    const nextCol = [...customBuild.customColTraits];
    if (isRow) {
      nextRow[index] = newTrait;
    } else {
      nextCol[index] = newTrait;
    }

    setCustomBuild(prev => {
      if (!prev) return null;
      return {
        ...prev,
        customRowTraits: nextRow,
        customColTraits: nextCol,
        isValidated: false,
        validationError: null
      };
    });
  };

  const handleUpdateSlotValue = (isRow: boolean, index: number, value: string) => {
    if (!customBuild || !customBuild.joker) return;
    const joker = customBuild.joker;
    
    const nextRow = [...customBuild.customRowTraits];
    const nextCol = [...customBuild.customColTraits];
    
    const targetTrait = isRow ? nextRow[index] : nextCol[index];
    if (!targetTrait) return;
    
    const matchedOpt = FIXED_TRAITS.includes(targetTrait.key)
      ? undefined
      : (traits[targetTrait.key] || []).find(t => t.name === value);
      
    const updatedTrait: TraitRequirement = {
      ...targetTrait,
      value: value,
      description: matchedOpt ? matchedOpt.description : ""
    };
    
    if (isRow) {
      nextRow[index] = updatedTrait;
    } else {
      nextCol[index] = updatedTrait;
    }
    
    setCustomBuild(prev => {
      if (!prev) return null;
      return {
        ...prev,
        customRowTraits: nextRow,
        customColTraits: nextCol,
        isValidated: false,
        validationError: null
      };
    });
  };

  const handleValidateCustomPuzzle = () => {
    if (!customBuild || !customBuild.joker) return;
    const { customRowTraits, customColTraits, joker } = customBuild;

    setCustomBuild(prev => prev ? { ...prev, isValidating: true, validationError: null } : null);

    const validationRes = validatePuzzleModes(
      customRowTraits,
      customColTraits,
      joker.id,
      null,
      characters,
      traits,
      animes
    );

    const isValid = validationRes.supportedModes.classic;

    setCustomBuild(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isValidating: false,
        isValidated: isValid,
        supportedModes: validationRes.supportedModes,
        bonusTrait: validationRes.resolvedBonusTrait,
        validationError: isValid 
          ? null 
          : "Invalid combination: No valid 3x3 distinct matching of 9 characters can solve this layout. Please adjust the traits."
      };
    });
  };

  const handleFinishCustomPuzzle = () => {
    if (!customBuild || !customBuild.joker) return;
    const { joker, customRowTraits, customColTraits, bonusTrait, supportedModes } = customBuild;

    const validationRes = supportedModes ? { supportedModes, resolvedBonusTrait: bonusTrait || null } : validatePuzzleModes(
      customRowTraits,
      customColTraits,
      joker.id,
      bonusTrait,
      characters,
      traits,
      animes
    );

    const finalBonusTrait = validationRes.resolvedBonusTrait || bonusTrait;
    const finalModes = validationRes.supportedModes;

    const customCode = encodePuzzle(joker.id, customRowTraits, customColTraits, finalBonusTrait);
    const customURL = `${window.location.origin}/sudoku/${customCode}`;

    setCustomBuild(prev => {
      if (!prev) return null;
      return {
        ...prev,
        step: "finished",
        customURL,
        supportedModes: finalModes,
        bonusTrait: finalBonusTrait
      };
    });

    setBoard({
      rowTraits: customRowTraits,
      colTraits: customColTraits,
      jokerId: joker.id,
      bonusTrait: finalBonusTrait,
      isCustom: true,
      supportedModes: finalModes
    });
  };

  // Auto-fallback gameMode if current mode is unsupported for active board
  useEffect(() => {
    if (board && board.supportedModes) {
      if (gameMode === "none" && !board.supportedModes.classic) {
        if (board.supportedModes.traitScoring) setGameMode("trait_scoring");
        else if (board.supportedModes.sameTrait) setGameMode("same_trait");
        else if (board.supportedModes.multiverse) setGameMode("multiverse");
      } else if (gameMode === "trait_scoring" && !board.supportedModes.traitScoring) {
        setGameMode("none");
      } else if (gameMode === "same_trait" && !board.supportedModes.sameTrait) {
        setGameMode("none");
      } else if (gameMode === "multiverse" && !board.supportedModes.multiverse) {
        setGameMode("none");
      }
    }
  }, [board, gameMode]);

  // Gather stats
  const filledCount = (Object.values(selectedCells).filter(Boolean) as RegisteredCharacter[]).length;
  const isComplete = filledCount === 9;

  let score = 0;
  if (board) {
    Object.entries(selectedCells).forEach(([idxStr, val]) => {
      const char = val as RegisteredCharacter | null;
      if (char) {
        const idx = Number(idxStr);
        // Eligible if exactly matches criteria OR matches joker (unless Multiverse source conflict exists)
        const hasConflict = gameMode === "multiverse" && hasSourceConflictOnBoard(char, idx, selectedCells);
        const isJoker = board.jokerId === char.id && !hasConflict;
        const isCompat = isCompatibleWithCell(char, idx);
        if (isJoker || isCompat) {
          score++;
        }
      }
    });
  }

  // Calculate already found traits of the Joker character
  const gridChars = Object.values(selectedCells).filter(Boolean) as RegisteredCharacter[];

  const scorePoints = useMemo(() => {
    if (!board) return 0;
    // Insira aqui a lógica/função de cálculo da pontuação base do tabuleiro
    return calculateBaseScorePoints(selectedCells, board); 
  }, [selectedCells, board]);

  const foundJokerTraits = useMemo(() => {
    if (!jokerChar || !board) return [];

    const found: { 
      key: string; 
      items: { value: string; isMatched: boolean; addedPoints?: boolean }[];
      description?: string;
    }[] = [];
    const allTraitKeys = Array.from(new Set([...Object.keys(traits), ...FIXED_TRAITS]));

    allTraitKeys.forEach((key) => {
      if (!isTraitDefinedForChar(jokerChar, key, animes)) return;

      // Get Joker's available values for this trait
      const jokerValues = getAvailableValuesForTrait(jokerChar, key, animes).map(v => v.trim());
      const validJokerValues = jokerValues.filter(v => v !== "");
      if (validJokerValues.length === 0) return;

      const items = validJokerValues.map((jokerVal) => {
        const lowerJokerVal = jokerVal.toLowerCase();
        let isMatched = false;
        
        for (const char of gridChars) {
          if (!isTraitDefinedForChar(char, key, animes)) continue;
          const charValues = getAvailableValuesForTrait(char, key, animes).map(v => v.trim().toLowerCase());
          if (charValues.includes(lowerJokerVal)) {
            isMatched = true;
            break;
          }
        }

        // Also check if matches any trait requirement from the sudoku board rows & columns constraints
        if (!isMatched && board) {
          const inRows = board.rowTraits?.some(rt => rt.key === key && rt.value.trim().toLowerCase() === lowerJokerVal);
          const inCols = board.colTraits?.some(ct => ct.key === key && ct.value.trim().toLowerCase() === lowerJokerVal);
          if (inRows || inCols) {
            isMatched = true;
          }
        }

        // Determine if this trait actually added +20 points in Trait Scoring mode
        let addedPoints = false;
        if (gameMode === "trait_scoring" && board) {
          let matchedByRegular = false;
          for (const char of gridChars) {
            if (!char || char.id === board.jokerId) continue;
            if (!isTraitDefinedForChar(char, key, animes)) continue;
            const charValues = getAvailableValuesForTrait(char, key, animes).map(v => v.trim().toLowerCase());
            if (charValues.includes(lowerJokerVal)) {
              matchedByRegular = true;
              break;
            }
          }

          const isJokerPlaced = gridChars.some(c => c.id === board.jokerId);
          const isPuzzleTrait = board.rowTraits.some(rt => rt.key === key) || board.colTraits.some(ct => ct.key === key);
          
          if (matchedByRegular || (isJokerPlaced && isPuzzleTrait)) {
            addedPoints = true;
          }
        }
        
        return {
          value: jokerVal,
          isMatched,
          addedPoints
        };
      });

      // Show this trait tracker only if at least one value has been matched!
      const anyMatched = items.some(item => item.isMatched);
      if (anyMatched) {
        // Collect matched descriptions if any
        const matchedDescriptions: string[] = [];
        items.forEach(item => {
          if (item.isMatched && !FIXED_TRAITS.includes(key)) {
            const opt = (traits[key] || []).find(t => t.name.trim().toLowerCase() === item.value.toLowerCase());
            if (opt && opt.description) {
              matchedDescriptions.push(`${item.value}: ${opt.description}`);
            }
          }
        });
        const descriptionText = matchedDescriptions.length > 0 ? matchedDescriptions.join(" | ") : undefined;

        found.push({
          key,
          items,
          description: descriptionText
        });
      }
    });

    return found.sort((a, b) => a.key.replace(/_/g, " ").localeCompare(b.key.replace(/_/g, " "), undefined, { sensitivity: "base" }));
  }, [jokerChar, gridChars, board, traits]);

  // Trait Scoring mode calculations
  const maxPossibleScore = useMemo(() => {
    if (!board || gameMode !== "trait_scoring" || !jokerChar) return 1000;
    
    let jokerTraitsCount = 0;
    const allTraitKeys = Array.from(new Set([...Object.keys(traits), ...FIXED_TRAITS]));
    
    allTraitKeys.forEach((key) => {
      if (!isTraitDefinedForChar(jokerChar, key, animes)) return;
      
      const jokerValues = getAvailableValuesForTrait(jokerChar, key, animes).map(v => v.trim());
      const validJokerValues = jokerValues.filter(v => v !== "");
      jokerTraitsCount += validJokerValues.length;
    });
    
    return 1000 + (jokerTraitsCount * 20);
  }, [board, gameMode, jokerChar, traits, animes]);

  const traitScoringPoints = useMemo(() => {
    if (!board || gameMode !== "trait_scoring" || !jokerChar) return 0;

    let points = 0;
    const allTraitKeys = Array.from(new Set([...Object.keys(traits), ...FIXED_TRAITS]));
    const isJokerPlaced = gridChars.some(c => c.id === board.jokerId);

    allTraitKeys.forEach((key) => {
      if (!isTraitDefinedForChar(jokerChar, key, animes)) return;

      const jokerValues = getAvailableValuesForTrait(jokerChar, key, animes).map(v => v.trim());
      const validJokerValues = jokerValues.filter(v => v !== "");
      if (validJokerValues.length === 0) return;

      const isPuzzleTrait = board.rowTraits.some(rt => rt.key === key) || board.colTraits.some(ct => ct.key === key);

      validJokerValues.forEach((jokerVal) => {
        const lowerJokerVal = jokerVal.toLowerCase();
        let isMatched = false;

        // Check if matched by ANY regular character placed on the board
        for (const char of gridChars) {
          if (!char || char.id === board.jokerId) continue;
          if (!isTraitDefinedForChar(char, key, animes)) continue;
          const charValues = getAvailableValuesForTrait(char, key, animes).map(v => v.trim().toLowerCase());
          if (charValues.includes(lowerJokerVal)) {
            isMatched = true;
            break;
          }
        }

        // If the Joker itself is placed, puzzle traits of the Joker are automatically matched!
        if (!isMatched && isJokerPlaced && isPuzzleTrait) {
          isMatched = true;
        }

        if (isMatched) {
          points += 20;
        }
      });
    });

    return points;
  }, [board, gameMode, jokerChar, gridChars, traits, selectedCells, animes]);

  const computedPoints = gameMode === "trait_scoring" ? (scorePoints + traitScoringPoints) : scorePoints;
  const displayPoints = (isDailyPuzzleMode && isDailyCompletedForUser && savedDailyScore !== null) 
    ? savedDailyScore 
    : computedPoints;

  // Saved History Auto-Save for Logged-In Users
  const savedHistoryRef = useRef<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  useEffect(() => {
    if (isComplete && user && board) {
      const puzzleHash = encodePuzzle(
        board.jokerId || "", 
        board.rowTraits, 
        board.colTraits, 
        board.bonusTrait
      );
      
      const isJokerPlaced = gridChars.some(c => c.id === board.jokerId);

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const completedAtDateStr = `${day}/${month}/${year}`;

      let modeName = "Classic";
      if (board.isCustom) modeName = "Custom";
      else if (gameMode === "multiverse") modeName = "Multiverse";
      else if (gameMode === "trait_scoring") modeName = "Trait Scoring";

      const recordKey = `${user.uid}_${puzzleHash}_${displayPoints}_${score}`;

      if (savedHistoryRef.current !== recordKey) {
        savedHistoryRef.current = recordKey;

        const record: PuzzleHistoryRecord = {
          id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: user.uid,
          userEmail: user.email || "",
          completedAt: completedAtDateStr,
          timestamp: Date.now(),
          matchScore: `${score}/9`,
          pointsScore: displayPoints,
          jokerStatus: isJokerPlaced ? "Found" : "Not Found",
          gameMode: modeName,
          puzzleCode: puzzleHash,
          boardSummary: {
            rowTraits: board.rowTraits.map(rt => `${rt.key}: ${rt.value}`),
            colTraits: board.colTraits.map(ct => `${ct.key}: ${ct.value}`),
            jokerName: jokerChar?.name || "Joker Character"
          }
        };

        fetch("/api/puzzle-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record)
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log("Puzzle completion history saved!", data.record);
          }
        })
        .catch(err => {
          console.error("Failed saving puzzle history:", err);
        });

        // Submit score to Daily Leaderboard if playing in Daily Puzzle Mode and user hasn't completed it yet
        if (isDailyPuzzleMode && !isDailyCompletedForUser) {
          const placedIds = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => selectedCells[i]?.id || "");

          fetch("/api/daily-leaderboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: dailyPuzzleDate,
              userId: user.uid,
              userDisplayName: user.displayName || user.email?.split("@")[0] || "Anonymous Player",
              userPhotoURL: user.photoURL || "",
              matchScore: `${score}/9`,
              pointsScore: displayPoints,
              jokerFound: isJokerPlaced,
              completedAt: new Date().toISOString(),
              placedCharacterIds: placedIds,
              gameMode: gameMode
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setIsDailyCompletedForUser(true);
              setSavedDailyScore(displayPoints);
              setDailyNotice(`🏆 High score submitted to Daily Leaderboard for ${dailyPuzzleDate}! Your puzzle answers are now locked.`);
            } else if (data.error) {
              setIsDailyCompletedForUser(true);
              setSavedDailyScore(displayPoints);
              setDailyNotice(`Notice: ${data.error}`);
            }
          })
          .catch(err => {
            console.error("Failed to save daily leaderboard entry:", err);
          });
        }
      }
    }
  }, [user, board, displayPoints, score, gameMode, gridChars, jokerChar]);

  // Filter available characters based on search query inside the modal (only starts searching when >= 3 chars)
  const alreadySelectedIds = (Object.values(selectedCells).filter(Boolean) as RegisteredCharacter[]).map(c => c.id);
  const filteredCandidates = searchQuery.length < 3
    ? []
    : characters.filter(c => {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesNickname = c.nicknames?.some(nick => nick.toLowerCase().includes(query)) || false;
        const matchesSearch = matchesName || matchesNickname;

        // Only show characters that have both traits of that row x col registered (are compatible with this cell)
        const matchesCellTraits = activeCellIndex !== null ? isSearchableForCell(c, activeCellIndex) : true;

        return matchesSearch && matchesCellTraits;
      });

  const handleSelectCharacter = (char: RegisteredCharacter) => {
    if (activeCellIndex === null) return;

    setSelectedCells(prev => ({
      ...prev,
      [activeCellIndex]: char
    }));
    
    // Close modal
    setActiveCellIndex(null);
    setSearchQuery("");
  };

  const getCellLabel = (index: number) => {
    const rowLetters = ["A", "B", "C"];
    const colLetters = ["D", "E", "F"];
    const r = Math.floor(index / 3);
    const c = index % 3;
    return `${rowLetters[r]}x${colLetters[c]}`;
  };

  // Render Custom Creator: Step 1 (Select Joker)
  if (customBuild && customBuild.active && customBuild.step === "joker_select") {
    const jokerCandidates = characters.filter(char => {
      let count = 0;
      const allTraitKeys = [...Object.keys(traits), ...FIXED_TRAITS];
      for (const key of allTraitKeys) {
        if (isTraitDefinedForChar(char, key)) {
          count++;
        }
      }
      return count >= 6;
    });

    // Apply Search
    const filteredJokers = jokerCandidates.filter(char => {
      if (!jokerSearch.trim()) return true;
      const query = jokerSearch.toLowerCase();
      const matchesName = char.name.toLowerCase().includes(query);
      const matchesNickname = char.nicknames?.some(nick => nick.toLowerCase().includes(query)) || false;
      const matchesSource = char.sources?.some(src => src.toLowerCase().includes(query)) || false;
      return matchesName || matchesNickname || matchesSource;
    });

    // Apply Pagination
    const pageSize = 12;
    const totalJokers = filteredJokers.length;
    const totalPages = Math.ceil(totalJokers / pageSize) || 1;
    const currentPage = Math.min(Math.max(1, jokerPage), totalPages);
    const paginatedJokers = filteredJokers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-5 gap-4">
          <div>
            <h2 className="text-xl font-black text-white font-sans flex items-center gap-2">
              <Sparkles className="h-5.5 w-5.5 text-violet-400" />
              <span>Create Custom Sudoku: Select Joker</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Step 1 of 3: Select a character with at least 6 filled traits. This character will serve as the hidden Joker.
            </p>
          </div>
          <button
            onClick={() => setCustomBuild(null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-850 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-350 hover:bg-slate-800 cursor-pointer transition-all shrink-0 self-start md:self-auto"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>
        </div>

        {jokerCandidates.length === 0 ? (
          <div className="rounded-2xl border border-slate-850 bg-slate-950/40 p-10 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h3 className="text-base font-black text-white">No Eligible Joker Characters Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              To create a custom puzzle, you must have at least one character in your database with at least 6 filled traits (categories in the traits DB).
            </p>
            <div className="pt-2">
              <button
                onClick={() => setCustomBuild(null)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-black text-white shadow-lg transition-all cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Search Box */}
              <div className="flex-1 max-w-md bg-slate-950 border border-slate-850 p-2 rounded-xl flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
                <input
                  type="text"
                  placeholder="Search characters by name, source or nickname..."
                  value={jokerSearch}
                  onChange={(e) => {
                    setJokerSearch(e.target.value);
                    setJokerPage(1);
                  }}
                  className="flex-1 bg-transparent text-xs text-slate-200 outline-hidden font-sans placeholder:text-slate-500"
                />
                {jokerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setJokerSearch("");
                      setJokerPage(1);
                    }}
                    className="text-slate-400 hover:text-white p-1 shrink-0 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Pick Random Joker Button */}
              <button
                type="button"
                onClick={handlePickRandomJoker}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500 bg-violet-500/10 hover:bg-violet-500/20 px-4 py-2.5 text-xs font-black text-violet-250 shadow-md cursor-pointer transition-all shrink-0"
              >
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span>Pick Random Joker</span>
              </button>
            </div>

            {filteredJokers.length === 0 ? (
              <div className="rounded-2xl border border-slate-850 bg-slate-950/20 p-8 text-center space-y-2">
                <p className="text-xs text-slate-400 font-semibold">No eligible joker matches found for "{jokerSearch}"</p>
                <button
                  type="button"
                  onClick={() => {
                    setJokerSearch("");
                    setJokerPage(1);
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300 font-bold underline cursor-pointer"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {paginatedJokers.map((char) => {
                    // Count filled traits
                    let count = 0;
                    const allTraitKeys = [...Object.keys(traits), ...FIXED_TRAITS];
                    allTraitKeys.forEach(key => {
                      if (isTraitDefinedForChar(char, key)) {
                        count++;
                      }
                    });

                    return (
                      <div
                        key={char.id}
                        onClick={() => handleSelectJoker(char)}
                        className="group relative cursor-pointer rounded-2xl border border-slate-850 bg-slate-950/50 p-4 transition-all hover:border-violet-500/50 hover:bg-slate-900/40 hover:shadow-xl hover:shadow-violet-950/5 flex items-center gap-3"
                      >
                        <div className="relative h-15 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 group-hover:border-violet-500/40">
                          {char.imageUrl ? (
                            <img
                              src={char.imageUrl}
                              alt={char.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover group-hover:scale-105 transition-all"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-indigo-950/20 text-[10px] font-bold text-indigo-400 font-mono">
                              N/A
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                            {char.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {char.sources && char.sources[0] ? char.sources[0] : "Anime Character"}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="text-[9px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/15 px-1.5 py-0.5 rounded-md font-extrabold">
                              {count} Traits Registered
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 mt-4">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Showing <span className="text-white font-bold">{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalJokers)}</span> of <span className="text-white font-bold">{totalJokers}</span> characters
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setJokerPage(currentPage - 1)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-350 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="text-xs font-bold text-slate-300 font-mono px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setJokerPage(currentPage + 1)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-350 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render Custom Creator: Step 2 (Edit Traits layout)
  if (customBuild && customBuild.active && customBuild.step === "editing" && customBuild.joker) {
    const { joker, customRowTraits, customColTraits, isValidating, isValidated, validationError } = customBuild;

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5 gap-3">
          <div>
            <h2 className="text-xl font-black text-white font-sans flex items-center gap-2">
              <Sparkles className="h-5.5 w-5.5 text-violet-400" />
              <span>Customize Traits Layout</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Step 2 of 3: Modify the 6 traits on rows/columns. All selected traits are from the Joker: <span className="text-violet-300">{joker.name}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomBuild(prev => prev ? { ...prev, step: "joker_select" } : null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-850 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-350 hover:bg-slate-800 cursor-pointer transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Joker</span>
            </button>
            <button
              onClick={() => setCustomBuild(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/10 bg-rose-500/5 px-3.5 py-2.5 text-xs font-bold text-rose-350 hover:bg-rose-500/15 cursor-pointer transition-all"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {/* Selected Joker Summary Card */}
        <div className="rounded-2xl border border-slate-850 bg-slate-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-15 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-800">
              {joker.imageUrl ? (
                <img
                  src={joker.imageUrl}
                  alt={joker.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-indigo-950/20 text-[10px] font-bold text-indigo-400 font-mono">
                  N/A
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-violet-400 font-mono">Secret Joker Selected</span>
              <h3 className="text-sm font-black text-white">{joker.name}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{joker.sources?.join(", ")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePickRandomJoker}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-350 hover:text-white cursor-pointer transition-all shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5 text-violet-400" />
            <span>Pick Random Joker</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Editor Grid: 6 selectors */}
          <div className="md:col-span-7 space-y-5 rounded-2xl border border-slate-850 bg-slate-950/20 p-5">
            <h3 className="text-xs font-black text-white tracking-widest uppercase font-mono text-indigo-400 pb-2 border-b border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Customize Board Slots</span>
              <button
                type="button"
                onClick={handleRandomizeBoard}
                className="inline-flex items-center gap-1.5 text-[11px] font-black text-violet-350 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer normal-case tracking-normal"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Randomize Entire Board</span>
              </button>
            </h3>

            {/* Rows section */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-rose-400 font-mono uppercase tracking-wider">
                Row Traits (A, B, C)
              </h4>
              <div className="space-y-3">
                {customRowTraits.map((trait, idx) => {
                  const available = getAvailableTraitsForSlot(true, idx);
                  // include current trait in options dropdown
                  const options = [trait, ...available];
                  const uniqueOptions = options
                    .filter((v, i, a) => a.findIndex(t => t.key === v.key) === i)
                    .sort((a, b) => a.key.replace(/_/g, " ").localeCompare(b.key.replace(/_/g, " "), undefined, { sensitivity: "base" }));
                  return (
                    <div key={`row-${idx}`} className="bg-slate-900/50 p-4 rounded-xl border border-slate-850/60 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <span className="text-xs font-black text-rose-300 font-mono bg-rose-500/10 px-2.5 py-1 rounded-lg">
                          Row {["A", "B", "C"][idx]}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono">
                          Current: <span className="text-rose-400 font-bold">{trait.key.replace(/_/g, " ").toUpperCase()}</span> = <span className="text-white font-bold">{trait.value}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">1. Select Category</label>
                          <select
                            value={trait.key}
                            onChange={(e) => handleUpdateSlot(true, idx, e.target.value)}
                            className="w-full text-xs font-bold text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-2 focus:border-violet-500 focus:outline-hidden cursor-pointer"
                          >
                            {uniqueOptions.map(opt => (
                              <option key={opt.key} value={opt.key}>
                                {opt.key.replace(/_/g, " ").toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">2. Select Value</label>
                          <select
                            value={trait.value}
                            onChange={(e) => handleUpdateSlotValue(true, idx, e.target.value)}
                            className="w-full text-xs font-bold text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-2 focus:border-violet-500 focus:outline-hidden cursor-pointer"
                          >
                            {getAvailableValuesForTrait(joker, trait.key, animes).map(val => (
                              <option key={val} value={val}>
                                {val}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-850/40">
                        <button
                          type="button"
                          onClick={() => handleRandomizeSlot(true, idx)}
                          className="inline-flex items-center gap-1 text-[10px] font-black text-rose-350 hover:text-white bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 px-2 py-1 rounded-md transition-all cursor-pointer"
                        >
                          <RefreshCw className="h-2.5 w-2.5 text-rose-450" />
                          <span>Pick Random</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRandomizeSlotValue(true, idx)}
                          className="inline-flex items-center gap-1 text-[10px] font-black text-rose-350 hover:text-white bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 px-2 py-1 rounded-md transition-all cursor-pointer"
                        >
                          <Sparkles className="h-2.5 w-2.5 text-rose-400" />
                          <span>Pick Random Value</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columns section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[11px] font-bold text-indigo-400 font-mono uppercase tracking-wider">
                Column Traits (D, E, F)
              </h4>
              <div className="space-y-3">
                {customColTraits.map((trait, idx) => {
                  const available = getAvailableTraitsForSlot(false, idx);
                  const options = [trait, ...available];
                  const uniqueOptions = options
                    .filter((v, i, a) => a.findIndex(t => t.key === v.key) === i)
                    .sort((a, b) => a.key.replace(/_/g, " ").localeCompare(b.key.replace(/_/g, " "), undefined, { sensitivity: "base" }));
                  return (
                    <div key={`col-${idx}`} className="bg-slate-900/50 p-4 rounded-xl border border-slate-850/60 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <span className="text-xs font-black text-indigo-300 font-mono bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                          Col {["D", "E", "F"][idx]}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono">
                          Current: <span className="text-indigo-400 font-bold">{trait.key.replace(/_/g, " ").toUpperCase()}</span> = <span className="text-white font-bold">{trait.value}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">1. Select Category</label>
                          <select
                            value={trait.key}
                            onChange={(e) => handleUpdateSlot(false, idx, e.target.value)}
                            className="w-full text-xs font-bold text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-2 focus:border-violet-500 focus:outline-hidden cursor-pointer"
                          >
                            {uniqueOptions.map(opt => (
                              <option key={opt.key} value={opt.key}>
                                {opt.key.replace(/_/g, " ").toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">2. Select Value</label>
                          <select
                            value={trait.value}
                            onChange={(e) => handleUpdateSlotValue(false, idx, e.target.value)}
                            className="w-full text-xs font-bold text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-2 focus:border-violet-500 focus:outline-hidden cursor-pointer"
                          >
                            {getAvailableValuesForTrait(joker, trait.key, animes).map(val => (
                              <option key={val} value={val}>
                                {val}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-850/40">
                        <button
                          type="button"
                          onClick={() => handleRandomizeSlot(false, idx)}
                          className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-350 hover:text-white bg-indigo-500/5 hover:bg-indigo-500/15 border border-indigo-500/10 px-2 py-1 rounded-md transition-all cursor-pointer"
                        >
                          <RefreshCw className="h-2.5 w-2.5 text-indigo-400" />
                          <span>Pick Random</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRandomizeSlotValue(false, idx)}
                          className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-350 hover:text-white bg-indigo-500/5 hover:bg-indigo-500/15 border border-indigo-500/10 px-2 py-1 rounded-md transition-all cursor-pointer"
                        >
                          <Sparkles className="h-2.5 w-2.5 text-indigo-400" />
                          <span>Pick Random Value</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Validation & Finish controls */}
          <div className="md:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-850 bg-slate-950/30 p-5 space-y-4">
              <h3 className="text-xs font-black text-white tracking-widest uppercase font-mono text-violet-400">
                Validation & Share
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                Before you can publish your custom puzzle, you must validate that a fully correct 3x3 unique combination of characters exists in the current database.
              </p>

              {validationError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-rose-300 font-semibold leading-normal">
                    {validationError}
                  </div>
                </div>
              )}

              {isValidated && !validationError && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-emerald-300 font-black leading-normal">
                      Puzzle is fully valid & solvable! You can now finish building and get your custom shared URL.
                    </div>
                  </div>

                  {customBuild?.supportedModes && (
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Validated Game Modes
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`p-2 rounded-lg flex items-center justify-between font-bold border ${customBuild.supportedModes.classic ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'}`}>
                          <span>Classic</span>
                          <span className="text-[10px] font-mono">{customBuild.supportedModes.classic ? '✓ Solvable' : '✗ Unsolvable'}</span>
                        </div>
                        <div className={`p-2 rounded-lg flex items-center justify-between font-bold border ${customBuild.supportedModes.traitScoring ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                          <span>Trait Scoring</span>
                          <span className="text-[10px] font-mono">{customBuild.supportedModes.traitScoring ? '✓ Supported' : '✗ Disabled'}</span>
                        </div>
                        <div className={`p-2 rounded-lg flex items-center justify-between font-bold border ${customBuild.supportedModes.sameTrait ? 'bg-purple-950/40 border-purple-500/30 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                          <span>Same Trait</span>
                          <span className="text-[10px] font-mono">{customBuild.supportedModes.sameTrait ? '✓ Solvable' : '✗ Unsolvable'}</span>
                        </div>
                        <div className={`p-2 rounded-lg flex items-center justify-between font-bold border ${customBuild.supportedModes.multiverse ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                          <span>Multiverse</span>
                          <span className="text-[10px] font-mono">{customBuild.supportedModes.multiverse ? '✓ Solvable' : '✗ Conflicts'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleValidateCustomPuzzle}
                  disabled={isValidating}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-50 px-4 py-2.5 text-xs font-black text-violet-200 shadow-md cursor-pointer transition-all"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Validating Layout...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Validate Sudoku</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleFinishCustomPuzzle}
                  disabled={!isValidated || !!validationError}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-lg cursor-pointer transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Finish Puzzle Building</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Render Custom Creator: Step 3 (Finished / Link Share)
  if (customBuild && customBuild.active && customBuild.step === "finished" && customBuild.customURL) {
    const { customURL } = customBuild;

    const handleCopy = () => {
      navigator.clipboard.writeText(customURL);
      setCustomURLCopied(true);
      setTimeout(() => setCustomURLCopied(false), 2000);
    };

    return (
      <div className="space-y-6 max-w-xl mx-auto py-8">
        <div className="rounded-3xl border border-slate-850 bg-slate-950/40 p-6 text-center space-y-6">
          <div className="h-16 w-16 bg-violet-500/10 text-violet-400 rounded-2xl flex items-center justify-center mx-auto border border-violet-500/20">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-white font-sans">
              Custom Puzzle Created!
            </h2>
            <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
              Your custom anime sudoku puzzle is ready to share. Anyone with this link can play your puzzle instantly!
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-left">
              Shareable Custom URL
            </label>
            <div className="flex gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl items-center">
              <input
                type="text"
                readOnly
                value={customURL}
                className="flex-1 bg-transparent text-xs text-slate-200 outline-hidden font-mono truncate px-2"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-bold text-white transition-all cursor-pointer"
              >
                {customURLCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{customURLCopied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                const path = customURL.substring(customURL.indexOf("/sudoku"));
                navigate(path);
                setCustomBuild(null);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg transition-all cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>Play Puzzle</span>
            </button>
            <button
              onClick={() => {
                setCustomBuild(null);
                navigate("/sudoku");
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-850 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-350 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>Back to Lobby</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Guest Mode Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 text-xs text-indigo-200 gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/30 ring-1 ring-indigo-500/40 text-indigo-400 shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-white">Guest Mode Active</span>
              <span className="text-slate-300 ml-1.5 hidden sm:inline">• You can generate & play Sudoku. Log in with Google to create custom puzzles and unlock all features.</span>
            </div>
          </div>
          <button
            onClick={() => openLoginModal("Sign in with Google to unlock custom puzzles, character databases, and traits configuration.")}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In with Google</span>
          </button>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5">
        <div>
          <h2 className="text-xl font-black text-white font-sans flex items-center gap-2">
            <Trophy className="h-5.5 w-5.5 text-amber-500" />
            <span>Classic 3x3 Anime Sudoku Grid</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Test your knowledge! Fit characters who match both Row and Column traits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              const todayStr = new Date().toISOString().split("T")[0];
              loadDailyPuzzle(todayStr);
              navigate(`/sudoku/daily/${todayStr}`);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-black shadow-lg transition-all cursor-pointer ${
              isDailyPuzzleMode
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-orange-500/20"
                : "bg-slate-900 border border-slate-800 text-amber-400 hover:bg-slate-800 hover:text-amber-300"
            }`}
          >
            <Flame className="h-4 w-4 text-orange-400 fill-orange-400" />
            <span>Daily Puzzle</span>
          </button>

          <button
            onClick={() => setShowDailyLeaderboardModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2.5 text-xs font-bold text-amber-300 cursor-pointer transition-colors"
          >
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>Daily Leaderboard</span>
          </button>

          <button
            onClick={() => setShowRules(!showRules)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-350 hover:bg-slate-800 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-indigo-400" />
            <span>{showRules ? "Hide Rules" : "Show Rules"}</span>
          </button>

          <button
            onClick={() => {
              if (!user) {
                openLoginModal();
              } else {
                setShowHistoryModal(true);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
            title={user ? "View your completed puzzle history" : "Sign in to view puzzle history"}
          >
            <History className="h-4 w-4 text-purple-400" />
            <span>Puzzle History</span>
            {!user && (
              <span className="text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                LOGIN REQ
              </span>
            )}
          </button>

          {characters.length >= 9 && (
            <button
              onClick={() => {
                setIsDailyPuzzleMode(false);
                generateNewSudoku();
                navigate("/sudoku");
              }}
              disabled={generating || traitsLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/20 cursor-pointer transition-all"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Solver...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Generate New Puzzle</span>
                </>
              )}
            </button>
          )}

          {characters.length >= 9 && (
            <button
              onClick={handleStartCustomPuzzleCreation}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black shadow-lg transition-all cursor-pointer ${
                user 
                  ? "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80"
              }`}
              title={user ? "Create Custom Puzzle" : "Sign in with Google to create custom puzzles"}
            >
              {user ? (
                <PlusCircle className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4 text-amber-400" />
              )}
              <span>Create Custom Puzzle</span>
              {!user && (
                <span className="ml-1 text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                  LOGIN REQ
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Daily Puzzle Mode Banner */}
      {isDailyPuzzleMode && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <Flame className="w-5 h-5 fill-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Daily Puzzle Mode</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {dailyPuzzleDate}
                </span>
              </div>
              <p className="text-xs text-slate-350 mt-0.5">
                Complete this daily puzzle today to submit your score to the global daily leaderboard!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Date Navigator */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  const d = new Date(dailyPuzzleDate + "T12:00:00Z");
                  d.setDate(d.getDate() - 1);
                  const prevStr = d.toISOString().split("T")[0];
                  loadDailyPuzzle(prevStr);
                  navigate(`/sudoku/daily/${prevStr}`);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={dailyPuzzleDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const chosen = e.target.value > todayStr ? todayStr : e.target.value;
                    loadDailyPuzzle(chosen);
                    navigate(`/sudoku/daily/${chosen}`);
                  }
                }}
                className="bg-transparent text-xs font-bold font-mono text-slate-200 px-2 py-1 focus:outline-none cursor-pointer"
              />

              <button
                onClick={() => {
                  const d = new Date(dailyPuzzleDate + "T12:00:00Z");
                  d.setDate(d.getDate() + 1);
                  let nextStr = d.toISOString().split("T")[0];
                  const todayStr = new Date().toISOString().split("T")[0];
                  if (nextStr > todayStr) nextStr = todayStr;
                  loadDailyPuzzle(nextStr);
                  navigate(`/sudoku/daily/${nextStr}`);
                }}
                disabled={dailyPuzzleDate >= new Date().toISOString().split("T")[0]}
                className={`p-1.5 rounded-lg transition-colors ${
                  dailyPuzzleDate >= new Date().toISOString().split("T")[0]
                    ? "text-slate-700 cursor-not-allowed"
                    : "hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                }`}
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowDailyLeaderboardModal(true)}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={() => {
                setIsDailyPuzzleMode(false);
                generateNewSudoku();
                navigate("/sudoku");
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Exit Daily
            </button>
          </div>
        </div>
      )}

      {/* Daily Leaderboard Notice */}
      {dailyNotice && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <span>{dailyNotice}</span>
          <button
            onClick={() => setDailyNotice(null)}
            className="p-1 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rules Board Banner */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-850 bg-slate-950/40 p-5 space-y-3">
              <h3 className="text-xs font-black text-white tracking-widest uppercase font-mono text-indigo-400">
                🧩 How to Play & Logic Rules
              </h3>
              <ul className="text-xs text-slate-350 space-y-2 leading-relaxed list-disc list-inside">
                <li>
                  <strong>6 Selected Traits</strong>: The generator selects 3 random traits for rows (A, B, C) and 3 for columns (D, E, F), each with a specific required value.
                </li>
                <li>
                  <strong>Distinct Elements</strong>: You must choose a <strong className="text-white">different character</strong> for each of the 9 cells. No character repeats can be made!
                </li>
                <li>
                  <strong>Match Criteria</strong>: Tap any card to search your database. Place a character possessing BOTH corresponding traits to score a successful point.
                </li>
                {gameMode === "trait_scoring" && (
                  <li className="text-amber-400 border border-amber-500/10 bg-amber-500/5 p-3.5 rounded-xl mt-3 block">
                    <div className="flex items-center gap-1.5 font-bold mb-1.5">
                      <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                      <span>Active Game Mode: Trait Scoring</span>
                    </div>
                    <span className="text-[11px] leading-relaxed text-slate-300 block font-semibold pl-5">
                      • Each unique Joker trait found during play (matching traits with the mystery Joker) adds <strong className="text-amber-300">+20 extra points</strong> to your score.<br />
                      • Finding and placing the Joker character still unlocks all traits visually, but only awards scoring points for the 6 traits of the puzzle (if they weren't unlocked yet).<br />
                      • A dynamic maximum possible score is calculated at the start of the game and shown in the scoreboard.
                    </span>
                  </li>
                )}
                {gameMode === "same_trait" && (
                  <li className="text-purple-400 border border-purple-500/10 bg-purple-500/5 p-3.5 rounded-xl mt-3 block">
                    <div className="flex items-center gap-1.5 font-bold mb-1.5">
                      <Shuffle className="h-4 w-4 text-purple-400" />
                      <span>Active Game Mode: Same Trait Mode</span>
                    </div>
                    <span className="text-[11px] leading-relaxed text-slate-300 block font-semibold pl-5">
                      • In addition to row and column traits, every character placed on the board must match the active <strong className="text-purple-300">Bonus Trait</strong>.<br />
                      • If a character does not match the Bonus Trait, it will validate as incompatible!
                    </span>
                  </li>
                )}
                {gameMode === "multiverse" && (
                  <li className="text-cyan-400 border border-cyan-500/10 bg-cyan-500/5 p-3.5 rounded-xl mt-3 block">
                    <div className="flex items-center gap-1.5 font-bold mb-1.5">
                      <Globe className="h-4 w-4 text-cyan-400 animate-pulse" />
                      <span>Active Game Mode: Multiverse Mode</span>
                    </div>
                    <span className="text-[11px] leading-relaxed text-slate-300 block font-semibold pl-5">
                      • Source Isolation: Whenever a character is entered on the board, any other character from the same anime source(s) will be marked as <strong className="text-rose-400">Incompatible</strong> (even the Joker).<br />
                      • Sources become valid again if the character is cleared from the board.
                    </span>
                  </li>
                )}
                <li>
                  <strong>Overlay Scoring Indicators</strong>:
                  <div className="flex flex-wrap gap-4 mt-2 pl-4">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Green (Success)
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Red (Incorrect Traits)
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                      Gold (Joker - Matches ALL 6 traits!)
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not enough characters state warning */}
      {characters.length < 9 ? (
        <div className="rounded-2xl border border-dashed border-slate-805 bg-slate-900/10 p-10 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-black text-white">Database Seed Required</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              To run the Sudoku backtracking solver, you must have at least <strong>9 registered characters</strong> in your JSON database. Currently, you have only <strong className="text-amber-400">{characters.length}</strong>.
            </p>
          </div>
        </div>
      ) : generationError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 flex items-start gap-3.5 max-w-2xl mx-auto">
          <AlertCircle className="h-5.5 w-5.5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest font-mono">
              Generation Constraint Mismatch
            </h4>
            <p className="text-xs text-slate-350 leading-relaxed">
              {generationError}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={generateNewSudoku}
                className="rounded-lg bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/20 px-3 py-1.5 text-[10px] font-black text-rose-300 transition-colors cursor-pointer"
              >
                Retry Generation
              </button>
            </div>
          </div>
        </div>
      ) : board ? (
        <div className="space-y-6">
          
          {/* Game Mode Selection */}
          <div className="max-w-4xl mx-auto bg-slate-950/40 border border-slate-850 p-5 rounded-2xl shadow-sm text-left space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
                  <span>Select Game Mode</span>
                  {isDailyPuzzleMode && (
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      🔒 LOCKED FOR DAILY PUZZLE
                    </span>
                  )}
                </span>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-snug">
                  {isDailyPuzzleMode
                    ? "This daily puzzle was assigned a specific game mode for global leaderboard fairness."
                    : "Choose your preferred playstyle. The game mode can only be toggled before you start placing characters on the board."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(() => {
                  const classicSupported = board?.supportedModes ? board.supportedModes.classic : true;
                  const traitScoringSupported = board?.supportedModes ? board.supportedModes.traitScoring : true;
                  const sameTraitSupported = board?.supportedModes ? board.supportedModes.sameTrait : true;
                  const multiverseSupported = board?.supportedModes ? board.supportedModes.multiverse : true;

                  return (
                    <>
                      <button
                        type="button"
                        disabled={filledCount > 0 || isDailyPuzzleMode || !classicSupported}
                        onClick={() => setGameMode("none")}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          gameMode === "none"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border border-indigo-500/20"
                            : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        <span>Default (Classic)</span>
                        {!classicSupported && (
                          <span className="text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 ml-1">
                            UNSOLVABLE
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={filledCount > 0 || isDailyPuzzleMode || !traitScoringSupported}
                        onClick={() => setGameMode("trait_scoring")}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          gameMode === "trait_scoring"
                            ? "bg-amber-600 text-white shadow-md shadow-amber-600/10 border border-amber-500/20"
                            : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                        <span>Trait Scoring Mode</span>
                        {!traitScoringSupported && (
                          <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-800 ml-1">
                            DISABLED
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={filledCount > 0 || isDailyPuzzleMode || !sameTraitSupported}
                        onClick={() => setGameMode("same_trait")}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          gameMode === "same_trait"
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/10 border border-purple-500/20"
                            : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Shuffle className="h-3.5 w-3.5 text-purple-300" />
                        <span>Same Trait Mode</span>
                        {!sameTraitSupported && (
                          <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-800 ml-1">
                            UNSOLVABLE
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={filledCount > 0 || isDailyPuzzleMode || !multiverseSupported}
                        onClick={() => setGameMode("multiverse")}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          gameMode === "multiverse"
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/10 border border-cyan-500/20"
                            : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Globe className="h-3.5 w-3.5 text-cyan-300" />
                        <span>Multiverse Mode</span>
                        {!multiverseSupported && (
                          <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-800 ml-1">
                            CONFLICTS
                          </span>
                        )}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
            {filledCount > 0 && (
              <p className="text-[11px] text-amber-500/80 font-bold flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-xl">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>Active game in progress ({filledCount} cells filled). Start over or clear the board if you wish to change the game mode.</span>
              </p>
            )}
          </div>

          {/* Active Banner for Multiverse Mode */}
          {gameMode === "multiverse" && (
            <div className="max-w-4xl mx-auto rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-teal-950/40 to-slate-950/60 p-4 text-left shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                        Multiverse Mode — Source Isolation
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        Active Rule
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-300 mt-1 leading-snug">
                      Characters sharing anime sources with any other character on the board will clash and become <strong className="text-rose-400 font-bold">Incompatible</strong> (even Jokers). Clearing the conflicting character instantly restores validity!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Bonus Trait Banner for Same Trait Mode */}
          {gameMode === "same_trait" && sameTraitBonus && (
            <div className="max-w-4xl mx-auto rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950/60 p-4 text-left shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Shuffle className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 font-mono">
                        Same Trait Mode — Required Bonus Trait
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                        Active Requirement
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        {sameTraitBonus.key.replace(/_/g, " ")}:
                      </span>
                      <span className="text-xs font-black text-purple-200 bg-purple-900/50 border border-purple-500/40 px-2.5 py-0.5 rounded-lg font-mono">
                        {sameTraitBonus.value}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-purple-300/80 font-medium max-w-xs sm:text-right leading-snug">
                  All cells require characters that possess <strong className="text-purple-200">{sameTraitBonus.key.replace(/_/g, " ")} = "{sameTraitBonus.value}"</strong> in addition to row & column traits.
                </p>
              </div>
            </div>
          )}

          {/* Board Actions Sub-bar */}
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 border border-slate-850 p-4 rounded-2xl shadow-lg">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Board Status:</span>
                <span className="text-xs font-mono font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/15 font-sans">
                  {filledCount} / 9 Filled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Score:</span>
                <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/15">
                  {gameMode === "trait_scoring" ? `${displayPoints} / ${maxPossibleScore} pts` : `${displayPoints} pts`}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowScoringRules(!showScoringRules)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer shadow-sm hover:border-slate-700"
              >
                <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>{showScoringRules ? "Hide Rules" : "Scoring Rules"}</span>
              </button>

              <button
                type="button"
                onClick={handleStartOver}
                disabled={isDailyPuzzleMode && isDailyCompletedForUser}
                className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer shadow-sm hover:border-slate-700 ${
                  isDailyPuzzleMode && isDailyCompletedForUser ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5 text-rose-400" />
                <span>Start Over</span>
              </button>

              <button
                type="button"
                onClick={handleShareBoard}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-black text-white shadow-md hover:shadow-indigo-600/10 transition-all cursor-pointer"
              >
                {shareCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-indigo-200" />
                    <span>Share Board</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scoring Rules Explanation Panel */}
          <AnimatePresence>
            {showScoringRules && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="max-w-4xl mx-auto overflow-hidden"
              >
                <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4 shadow-inner text-left">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Award className="h-4.5 w-4.5 animate-pulse" />
                    <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                      Anime Sudoku Scoring Rules {gameMode === "trait_scoring" && "— Trait Scoring Mode"}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-300">
                    
                    <div className="bg-slate-900/50 border border-slate-850/60 p-3 rounded-xl flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-xs font-black text-emerald-400 font-mono shrink-0">
                        +100
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-black text-slate-200 block">Compatible Character</span>
                        <span className="text-[10px] text-slate-400 leading-snug font-medium block">
                          Placing a compatible character in any grid cell grants 100 points.
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-850/60 p-3 rounded-xl flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-xs font-black text-amber-400 font-mono shrink-0">
                        +200
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-black text-slate-200 block">The Joker Card</span>
                        <span className="text-[10px] text-slate-400 leading-snug font-medium block">
                          The Joker fits any cell! Placing them grants a total of 200 points.
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-850/60 p-3 rounded-xl flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-xs font-black text-rose-400 font-mono shrink-0">
                        -100
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-black text-slate-200 block">Clearing a Cell</span>
                        <span className="text-[10px] text-slate-400 leading-snug font-medium block">
                          Clearing an occupied cell deducts 100 points from your current score.
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-850/60 p-3 rounded-xl flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-400 font-mono shrink-0">
                        +0
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-black text-slate-200 block">Incompatibles & Reuse</span>
                        <span className="text-[10px] text-slate-400 leading-snug font-medium block">
                          Incompatible cells or reusing previously placed characters gets 0 points.
                        </span>
                      </div>
                    </div>

                    {gameMode === "trait_scoring" && (
                      <div className="bg-amber-950/20 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-2.5 col-span-1 sm:col-span-2 md:col-span-4 mt-1">
                        <div className="h-6 w-6 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-xs font-black text-amber-400 font-mono shrink-0">
                          +20
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-black text-amber-300 block">Joker Trait Found (Mode Bonus)</span>
                          <span className="text-[10px] text-slate-400 leading-relaxed font-semibold block">
                            Every unique, valid trait value defined on the mystery Joker character that you match anywhere on the board (by placing compatible characters) grants you <strong className="text-amber-400">+20 extra points</strong>. If you place the Joker itself, it unlocks all of its traits, but only adds trait points for the 6 traits of the puzzle (if they weren't unlocked yet).
                          </span>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Sudoku Layout Grid Section */}
          <div className="relative overflow-x-auto pb-4">
            
            {/* The 4x4 layout grid including headers: Row labels on Left, Col labels on Top */}
            <div className="min-w-[480px] sm:min-w-[650px] md:min-w-[750px] max-w-4xl mx-auto grid grid-cols-4 gap-2 sm:gap-4 items-center">
              
              {/* Row 0, Col 0: Empty Top-Left Cell */}
              <div className="flex flex-col items-center justify-center p-2 sm:p-3 h-20 sm:h-28 border border-slate-900/50 bg-slate-950/20 rounded-xl sm:rounded-2xl">
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-600 font-mono">
                  SUDOKU
                </span>
                <span className="text-[11px] sm:text-[14px] font-black font-mono text-indigo-500/70 mt-1">
                  3 x 3
                </span>
              </div>

              {/* Top Column Labels D, E, F */}
              {board.colTraits.map((col, idx) => (
                <div 
                  key={`col-header-${idx}`}
                  className="flex flex-col items-center justify-center h-20 sm:h-28 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-850 bg-slate-900/60 shadow-md text-center"
                >
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-400 font-mono mb-0.5 sm:mb-1">
                    <span className="sm:hidden">COL {idx === 0 ? "D" : idx === 1 ? "E" : "F"}</span>
                    <span className="hidden sm:inline">COLUMN {idx === 0 ? "D" : idx === 1 ? "E" : "F"}</span>
                  </span>
                  <div className="text-[10px] sm:text-xs font-black text-slate-200 mt-0.5 leading-tight truncate w-full">
                    {col.key.replace(/_/g, " ")}
                  </div>
                  <div className="mt-0.5 sm:mt-1 relative group inline-block">
                    <div 
                      className="cursor-help text-[9px] sm:text-[11px] font-mono select-none px-1.5 sm:px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/10 transition-colors hover:bg-indigo-500/20"
                    >
                      {col.value}
                    </div>
                    {col.description && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 hidden group-hover:block bg-slate-950 border border-slate-800 text-[11px] text-slate-300 p-2.5 rounded-xl shadow-xl z-30 text-center leading-normal">
                        {col.description}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Rows 1, 2, 3 with active content cells */}
              {[0, 1, 2].map((rIdx) => {
                const rowTrait = board.rowTraits[rIdx];
                return (
                  <React.Fragment key={`row-group-${rIdx}`}>
                    
                    {/* Left Row Header A, B, C */}
                    <div 
                      className="flex flex-col justify-center aspect-square w-full p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-850 bg-slate-900/60 shadow-md"
                    >
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-rose-400 font-mono mb-0.5 sm:mb-1">
                        <span className="sm:hidden">R {rIdx === 0 ? "A" : rIdx === 1 ? "B" : "C"}</span>
                        <span className="hidden sm:inline">ROW {rIdx === 0 ? "A" : rIdx === 1 ? "B" : "C"}</span>
                      </span>
                      <div className="text-[10px] sm:text-xs font-black text-slate-200 mt-0.5 leading-tight truncate w-full">
                        {rowTrait.key.replace(/_/g, " ")}
                      </div>
                      <div className="mt-1 sm:mt-1.5 relative group inline-block self-start">
                        <div 
                          className="cursor-help text-[9px] sm:text-[11px] font-mono select-none px-1.5 sm:px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-bold border border-rose-500/10 transition-colors hover:bg-rose-500/20"
                        >
                          {rowTrait.value}
                        </div>
                        {rowTrait.description && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 hidden group-hover:block bg-slate-950 border border-slate-800 text-[11px] text-slate-300 p-2.5 rounded-xl shadow-xl z-30 text-center leading-normal">
                            {rowTrait.description}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Three playable cells in this row */}
                    {[0, 1, 2].map((cIdx) => {
                      const cellIdx = rIdx * 3 + cIdx;
                      const char = selectedCells[cellIdx];
                      
                      const hasConflict = gameMode === "multiverse" && char ? hasSourceConflictOnBoard(char, cellIdx, selectedCells) : false;
                      const isJoker = char ? (board.jokerId === char.id && !hasConflict) : false;
                      const isCompat = char ? isCompatibleWithCell(char, cellIdx) : false;

                      return (
                        <div key={`cell-${cellIdx}`} className="aspect-square w-full relative">
                          {!char ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isDailyPuzzleMode && isDailyCompletedForUser) return;
                                setActiveCellIndex(cellIdx);
                                setSearchQuery("");
                              }}
                              className="w-full h-full rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-805 bg-slate-950/30 hover:bg-slate-900/30 hover:border-indigo-500/40 transition-all flex flex-col items-center justify-center p-1.5 sm:p-3 cursor-pointer group"
                            >
                              <PlusCircle className="h-4 w-4 sm:h-6 sm:w-6 text-slate-500 group-hover:text-indigo-400 group-hover:scale-105 transition-transform mb-0.5 sm:mb-1" />
                              <span className="text-[10px] sm:text-xs font-black text-slate-350 tracking-wide group-hover:text-slate-200">
                                {getCellLabel(cellIdx)}
                              </span>
                              <span className="text-[7px] sm:text-[9px] uppercase font-bold text-slate-550 font-mono tracking-wider mt-0.5 sm:mt-1">
                                Select Match
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setViewingCharacterDetail({ char, cellIdx })}
                              title="Click to view registry details"
                              className={`w-full h-full rounded-xl sm:rounded-2xl border bg-slate-900/80 overflow-hidden flex relative shadow-lg group text-left transition-all hover:scale-[1.02] hover:brightness-110 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 cursor-pointer ${
                                isJoker 
                                  ? "border-amber-500/80 bg-amber-950/5" 
                                  : isCompat 
                                    ? "border-emerald-500/80 bg-emerald-950/5" 
                                    : "border-rose-500/80 bg-rose-950/5"
                              }`}
                            >
                              
                              {/* Left area: vertical character image */}
                              <div className="w-[48%] sm:w-[58%] md:w-[60%] h-full relative shrink-0 border-r border-slate-800/60 bg-slate-950">
                                <img 
                                  src={char.imageUrl} 
                                  alt={char.name} 
                                  className="w-full h-full object-cover object-[center_15%] select-none"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              {/* Right area: name, variation tag, and source anime info */}
                              <div className="flex-1 min-w-0 p-1.5 sm:p-3 pb-7 sm:pb-9 flex flex-col justify-center text-left h-full">
                                <h5 className="text-[9px] sm:text-[11px] font-black text-white leading-tight line-clamp-2 font-sans mb-0.5">
                                  {char.name}
                                </h5>
                                <div className="mb-0.5">
                                  <span className="inline-block text-[7px] sm:text-[8.5px] font-mono font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-1 py-0.2 rounded truncate max-w-full">
                                    {char.variationTitle || "Default"}
                                  </span>
                                </div>
                                <p className="text-[7.5px] sm:text-[9px] font-bold text-slate-400 line-clamp-3 font-sans">
                                  {char.sources.join(", ") || "Anime Origin"}
                                </p>
                              </div>

                              {/* Footer Status Badge Indicator */}
                              {isJoker ? (
                                <div className="absolute bottom-0 inset-x-0 bg-amber-950/95 border-t border-amber-500/30 py-0.5 sm:py-1 flex items-center justify-center gap-0.5 sm:gap-1 shadow-lg">
                                  <Sparkles className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-amber-300 shrink-0 animate-pulse" />
                                  <span className="text-[7px] sm:text-[9px] text-amber-300 font-black tracking-widest font-mono">
                                    JOKER
                                  </span>
                                </div>
                              ) : isCompat ? (
                                <div className="absolute bottom-0 inset-x-0 bg-emerald-950/95 border-t border-emerald-500/30 py-0.5 sm:py-1 flex items-center justify-center gap-0.5 sm:gap-1 shadow-lg">
                                  <Check className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-emerald-300 shrink-0" />
                                  <span className="text-[7px] sm:text-[9px] text-emerald-300 font-black tracking-widest font-mono">
                                    COMPATIBLE
                                  </span>
                                </div>
                              ) : (
                                <div className="absolute bottom-0 inset-x-0 bg-rose-950/95 border-t border-rose-500/30 py-0.5 sm:py-1 flex items-center justify-center gap-0.5 sm:gap-1 shadow-lg">
                                  <X className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-rose-300 shrink-0" />
                                  <span className="text-[7px] sm:text-[9px] text-rose-300 font-black tracking-widest font-mono">
                                    INCOMPATIBLE
                                  </span>
                                </div>
                              )}

                              {/* Cell Label Taglet */}
                              <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-slate-950/80 text-[7px] sm:text-[8px] font-mono font-bold text-slate-400 px-0.5 sm:px-1 rounded border border-slate-800 z-10">
                                {getCellLabel(cellIdx)}
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}

                  </React.Fragment>
                );
              })}

            </div>
          </div>

          {/* Joker Found Traits Section */}
          <div className="max-w-4xl mx-auto border border-slate-850 bg-slate-900/20 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
                  <span>Joker Found Traits Tracker</span>
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  Get closer to the Joker! Placing characters on the board reveals matched traits of the mystery Joker character.
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setShowJokerTraits(!showJokerTraits)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer shadow-sm"
              >
                {showJokerTraits ? (
                  <>
                    <EyeOff className="h-4 w-4 text-amber-400" />
                    <span>Hide Joker Found Traits</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 text-amber-400" />
                    <span>Show Joker Found Traits</span>
                  </>
                )}
              </button>
            </div>

            <AnimatePresence>
              {showJokerTraits && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-slate-850/60">
                    {foundJokerTraits.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 font-medium bg-slate-950/20 rounded-xl border border-dashed border-slate-850/50">
                        No matched traits found yet. Fill more cells on the grid to reveal Joker traits!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {foundJokerTraits.map((trait, idx) => (
                          <div 
                            key={`joker-trait-${idx}`}
                            className="bg-slate-950/50 border border-amber-500/10 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/20 transition-all shadow-sm"
                          >
                            <div className="absolute top-0 right-0 h-8 w-8 bg-amber-500/5 rounded-bl-full flex items-center justify-center pointer-events-none">
                              <Sparkles className="h-3 w-3 text-amber-500/30 animate-pulse" />
                            </div>
                            
                            <div>
                              <span className="text-[10px] font-black uppercase text-amber-400 font-mono tracking-wider block mb-2">
                                {trait.key.replace(/_/g, " ")}
                              </span>
                              
                              <div className="flex flex-wrap gap-1.5">
                                {trait.items.map((item, itemIdx) => (
                                  item.isMatched ? (
                                    <span 
                                      key={`val-${itemIdx}`}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-bold text-emerald-300"
                                    >
                                      <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                                      <span>{item.value}</span>
                                      {gameMode === "trait_scoring" && item.addedPoints && (
                                        <span className="text-[9px] font-mono font-black text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                                          +20
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span 
                                      key={`val-${itemIdx}`}
                                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900/50 border border-slate-800/40 border-dashed px-2 py-0.5 text-[11px] font-semibold text-slate-500 font-mono"
                                      title="Locked value. Find this trait by placing matching characters on the board!"
                                    >
                                      <span className="h-1 w-1 rounded-full bg-slate-600 animate-pulse" />
                                      <span>???</span>
                                    </span>
                                  )
                                ))}
                              </div>
                            </div>

                            {trait.description && (
                              <span className="text-[10px] text-slate-400 mt-2.5 leading-normal italic font-medium pt-1.5 border-t border-slate-850/30">
                                {trait.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Tally & Completion Overlay Banner */}
          {isComplete && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center max-w-xl mx-auto space-y-5 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -right-12 -top-12 opacity-10 pointer-events-none">
                <Trophy className="h-44 w-44 text-amber-500" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/25 text-indigo-400 mb-2">
                  <Award className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-black text-white font-sans">
                  CONGRATULATIONS! GAME COMPLETE
                </h4>
                <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
                  All 9 cells have been filled with character choices from your database. Let's see your final score!
                </p>
              </div>

              {/* Score Display Ring */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto">
                <div className="px-6 py-4 rounded-2xl bg-slate-950 border border-slate-850 flex-1 w-full text-center">
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-mono block">
                    Final Match Score
                  </span>
                  <span className="text-3xl font-black text-indigo-400 font-mono mt-1 block">
                    {score} <span className="text-slate-600 text-xl font-medium">/ 9</span>
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 leading-normal">
                    {score === 9 
                      ? "✨ ABSOLUTE LEGEND! Perfect match grid." 
                      : score >= 6 
                        ? "👍 GREAT JOB! Strong anime logic." 
                        : "😅 KEEP TRYING! Add more characters."}
                  </p>
                </div>
                
                <div className="px-6 py-4 rounded-2xl bg-slate-950 border border-slate-850 flex-1 w-full text-center">
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-mono block">
                    Final Points Score
                  </span>
                  <span className="text-3xl font-black text-amber-400 font-mono mt-1 block">
                    {displayPoints} <span className="text-slate-650 text-lg font-medium">{gameMode === "trait_scoring" ? ` / ${maxPossibleScore}` : ""} pts</span>
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 leading-normal">
                    {displayPoints >= (gameMode === "trait_scoring" ? maxPossibleScore : 900)
                      ? "👑 PERFECT STRATEGY!" 
                      : displayPoints >= (gameMode === "trait_scoring" ? Math.floor(maxPossibleScore * 0.65) : 600)
                        ? "🔥 ELITE TACTICIAN!" 
                        : "🎮 GREAT EFFORT!"}
                  </p>
                </div>
              </div>

              {/* Joker Reveal Section */}
              {board && board.jokerId && (
                (() => {
                  const jokerChar = characters.find(c => c.id === board.jokerId);
                  if (!jokerChar) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setViewingCharacterDetail({ char: jokerChar, cellIdx: -1 })}
                      className="max-w-xs mx-auto w-full rounded-2xl border border-amber-500/30 hover:border-amber-400 bg-gradient-to-b from-amber-950/20 to-amber-950/10 hover:from-amber-950/35 hover:to-amber-950/25 p-4 space-y-3 shadow-lg shadow-amber-950/5 text-left transition-all duration-300 cursor-pointer block group"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform duration-300 animate-pulse" />
                        <span>Joker for this Board (Click for details)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={jokerChar.imageUrl}
                          alt={jokerChar.name}
                          className="h-18 w-12 rounded-xl object-cover border border-amber-500/20 group-hover:border-amber-400/50 shadow-md shrink-0 transition-colors"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-black text-white group-hover:text-amber-100 truncate font-sans transition-colors">
                            {jokerChar.name}
                          </h5>
                          <p className="text-[10px] font-bold text-amber-300 truncate mt-0.5">
                            {jokerChar.sources?.[0] || "Anime Origin"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })()
              )}

              <div>
                <button
                  type="button"
                  onClick={generateNewSudoku}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-xs font-black text-white shadow-xl shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Start a New Game Board</span>
                </button>
              </div>

            </motion.div>
          )}

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-xs text-slate-400 font-semibold">
            Preparing anime logic grid...
          </p>
        </div>
      )}

      {/* Pop-up Character Search Modal Dialog */}
      <AnimatePresence>
        {activeCellIndex !== null && board && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setActiveCellIndex(null);
                setSearchQuery("");
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4 text-left"
            >
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-900 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-400 font-mono">
                    CHOOSE CHARACTER • {getCellLabel(activeCellIndex)}
                  </span>
                  <h4 className="text-sm font-black text-white mt-0.5">
                    Select Candidate Matching Requirements:
                  </h4>
                  
                  {/* Needed values */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(() => {
                      const rowT = board.rowTraits[Math.floor(activeCellIndex / 3)];
                      return (
                        <div className="relative group">
                          <span 
                            title={rowT.description || "No description configured"}
                            className="cursor-help text-[11px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/15 px-2 py-0.5 rounded-md font-extrabold block"
                          >
                            {rowT.key.replace(/_/g, " ")}: {rowT.value}
                          </span>
                          {rowT.description && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 hidden group-hover:block bg-slate-900 border border-slate-800 text-[11px] text-slate-300 p-2 rounded-lg shadow-xl z-50 text-center leading-normal">
                              {rowT.description}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {(() => {
                      const colT = board.colTraits[activeCellIndex % 3];
                      return (
                        <div className="relative group">
                          <span 
                            title={colT.description || "No description configured"}
                            className="cursor-help text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 px-2 py-0.5 rounded-md font-extrabold block"
                          >
                            {colT.key.replace(/_/g, " ")}: {colT.value}
                          </span>
                          {colT.description && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 hidden group-hover:block bg-slate-900 border border-slate-800 text-[11px] text-slate-300 p-2 rounded-lg shadow-xl z-50 text-center leading-normal">
                              {colT.description}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </div>

                <button
                  onClick={() => {
                    setActiveCellIndex(null);
                    setSearchQuery("");
                  }}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-900 hover:text-slate-300 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Hint Support Button & Banner */}
              <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Got Stuck? Try a Hint
                  </span>
                  <button
                    type="button"
                    onClick={handleGetHint}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/20 hover:bg-indigo-600/25 px-2.5 py-1 text-[10px] font-bold text-indigo-400 cursor-pointer transition-all"
                  >
                    <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
                    <span>Get Hint</span>
                  </button>
                </div>
                {hintText && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-indigo-505/20 bg-slate-900 p-2.5 text-xs font-extrabold text-slate-200 font-mono flex items-start gap-1.5"
                  >
                    <span className="text-indigo-400 text-xs leading-none mt-0.5">💡</span>
                    <span>{hintText}</span>
                  </motion.div>
                )}
              </div>

              {/* Live Search Bar Input */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Type at least 3 characters to search..."
                  value={searchQuery}
                  onChange={(e) => {
                    let val = e.target.value;
                    // Limit to only one space after the last letter/character
                    val = val.replace(/(\S)\s+$/, "$1 ");
                    setSearchQuery(val);
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-4 pl-10 text-xs placeholder-slate-500 text-slate-100 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              {/* Candidates result container */}
              <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-slate-900 p-2 bg-slate-950/60 font-sans">
                
                {searchQuery.length < 3 ? (
                  <div className="p-8 text-center text-xs text-slate-450 font-bold italic">
                    Type at least 3 characters to start searching...
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 font-semibold italic">
                    No registered character found matching "{searchQuery}".
                  </div>
                ) : (
                  filteredCandidates.map((char) => {
                    const isUsed = alreadySelectedIds.includes(char.id);
                    const hasConflict = gameMode === "multiverse" && activeCellIndex !== null
                      ? hasSourceConflictOnBoard(char, activeCellIndex, selectedCells)
                      : false;
                    
                    return (
                      <button
                        key={char.id}
                        type="button"
                        disabled={isUsed}
                        onClick={() => handleSelectCharacter(char)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left transition-colors font-semibold text-xs ${
                          isUsed 
                            ? "bg-slate-900/40 text-slate-650 cursor-not-allowed opacity-50" 
                            : "hover:bg-slate-900 text-slate-200 hover:text-white cursor-pointer"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          {/* Character name, variation badge, and nicknames displayed in search results */}
                          <span className="font-extrabold leading-tight flex flex-wrap items-center gap-1.5">
                            <span>{char.name}</span>
                            <span className="text-[9.5px] font-mono font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                              {char.variationTitle || "Default"}
                            </span>
                            {char.nicknames && char.nicknames.length > 0 && (
                              <span className="text-slate-400 font-medium text-[11px]">
                                (a.k.a {char.nicknames.join(", ")})
                              </span>
                            )}
                          </span>
                          {/* Source works list */}
                          {char.sources && char.sources.length > 0 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              From: {char.sources.join(", ")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {hasConflict && !isUsed && (
                            <span className="text-[9px] font-mono font-bold uppercase bg-rose-950/80 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                              Source Clash
                            </span>
                          )}
                          {isUsed && (
                            <span className="text-[9px] font-mono uppercase bg-slate-850 px-1.5 py-0.5 rounded text-slate-500">
                              Already Used
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}

              </div>

              {/* Close CTAs */}
              <div className="flex justify-end gap-2 text-xs font-bold pt-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCellIndex(null);
                    setSearchQuery("");
                  }}
                  className="rounded-lg bg-transparent hover:bg-slate-900 border border-slate-850 px-3.5 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up Character Detail Modal Dialog */}
      <AnimatePresence>
        {viewingCharacterDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingCharacterDetail(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden text-left flex flex-col md:flex-row z-10 max-h-[90vh]"
            >
              
              {/* Left Side: Character Portrait */}
              <div className="w-full md:w-2/5 aspect-[2/3] md:aspect-auto md:h-auto relative bg-slate-900 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-850 group/carousel flex flex-col justify-between overflow-hidden">
                {(() => {
                  const rawImages = viewingCharacterDetail.char.images;
                  const carouselImages = Array.isArray(rawImages) && rawImages.length > 0
                    ? rawImages.map((img: any) => ({
                        url: typeof img === 'string' ? img : (img.url || img.imageUrl || ""),
                        label: typeof img === 'string' ? "Profile Image" : (img.label || "Profile Image")
                      }))
                    : [{ url: viewingCharacterDetail.char.imageUrl, label: "Profile Image" }];

                  const currentImg = carouselImages[detailActiveImageIndex] || carouselImages[0];

                  return (
                    <div className="w-full h-full relative flex flex-col justify-between flex-1 min-h-[250px] md:min-h-[400px]">
                      <div className="relative flex-1 w-full overflow-hidden min-h-0 bg-slate-950">
                        {currentImg && currentImg.url ? (
                          <img 
                            src={currentImg.url} 
                            alt={`${viewingCharacterDetail.char.name} - ${currentImg.label}`} 
                            className="w-full h-full object-cover absolute inset-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-600 bg-slate-900 font-semibold italic text-xs">
                            No Image Registered
                          </div>
                        )}

                        {/* Role Badge Overlay */}
                        <div className="absolute top-3 left-3 bg-indigo-600/90 backdrop-blur-xs text-[10px] font-black uppercase text-indigo-100 px-2.5 py-1 rounded-md tracking-wider shadow-md font-mono z-10">
                          {viewingCharacterDetail.char.role} Role
                        </div>
                      </div>

                      {/* Separated Solid Footer at Bottom */}
                      <div className="w-full bg-slate-950 border-t border-slate-850 h-12 shrink-0 flex items-center justify-between px-3 select-none z-10 shadow-lg">
                        {carouselImages.length > 1 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setDetailActiveImageIndex((prev) => (prev > 0 ? prev - 1 : carouselImages.length - 1))}
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                              title="Previous Image"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            
                            <div className="flex flex-col items-center justify-center min-w-0 flex-1 px-2 text-center">
                              <p className="text-xs font-black text-slate-100 truncate w-full" title={currentImg?.label || "Profile Image"}>
                                {currentImg?.label || "Profile Image"}
                              </p>
                              <span className="text-[10px] font-mono font-bold text-indigo-400 mt-0.5 leading-none">
                                {detailActiveImageIndex + 1} of {carouselImages.length}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setDetailActiveImageIndex((prev) => (prev < carouselImages.length - 1 ? prev + 1 : 0))}
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                              title="Next Image"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <p className="text-xs font-black text-slate-100 truncate text-center w-full px-2">
                            {currentImg?.label || "Profile Image"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Side: Profile Details */}
              <div className="flex-1 flex flex-col p-6 min-w-0 overflow-y-auto max-h-[64vh] md:max-h-[85vh]">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-900 pb-4 mb-4">
                  <div className="min-w-0 pr-4">
                    <span className="text-[10px] font-black uppercase text-indigo-400 font-mono tracking-widest block mb-0.5">
                      CHARACTER REGISTRY PROFILE
                    </span>
                    <h3 className="text-lg md:text-xl font-black text-white leading-tight">
                      {viewingCharacterDetail.char.name}
                    </h3>
                    {viewingCharacterDetail.char.nicknames && viewingCharacterDetail.char.nicknames.length > 0 && (
                      <p className="text-xs text-slate-400 font-semibold mt-1">
                        Aliases: {viewingCharacterDetail.char.nicknames.join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingCharacterDetail(null)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-900 hover:text-slate-350 cursor-pointer transition-colors shrink-0"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Info List */}
                <div className="space-y-4 flex-1">
                  {/* Source Anime */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-500 font-mono tracking-wider mb-1.5">
                      Origin Anime & Sources
                    </h4>
                    <p className="text-xs text-slate-200 font-extrabold bg-slate-900/50 border border-slate-900 rounded-lg p-2.5 leading-relaxed font-sans">
                      {viewingCharacterDetail.char.sources.join(", ") || "No source specified"}
                    </p>
                  </div>

                  {/* Multiverse Conflict Callout */}
                  {gameMode === "multiverse" && viewingCharacterDetail.cellIdx >= 0 && (() => {
                    const conflicts = getSourceConflicts(viewingCharacterDetail.char, viewingCharacterDetail.cellIdx, selectedCells);
                    if (conflicts.length === 0) return null;
                    return (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-left space-y-1 my-2 font-sans">
                        <div className="flex items-center gap-1.5 text-xs font-black text-rose-400 font-mono uppercase">
                          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                          <span>Multiverse Source Clash</span>
                        </div>
                        <p className="text-[11px] text-rose-200/90 leading-snug font-medium">
                          In Multiverse Mode, characters sharing anime source(s) with other placed characters are incompatible:
                        </p>
                        <ul className="text-[10px] text-rose-300 font-mono list-disc list-inside space-y-0.5 pt-1">
                          {conflicts.map((c, i) => (
                            <li key={i}>
                              <strong>{c.conflictingChar.name}</strong> ({c.conflictingSource})
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* Character Traits */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-500 font-mono tracking-wider mb-2">
                      Registered Traits & Attributes
                    </h4>
                    {(() => {
                      const cellIdx = viewingCharacterDetail.cellIdx;
                      const rIdx = Math.floor(cellIdx / 3);
                      const cIdx = cellIdx % 3;
                      const rowT = board?.rowTraits[rIdx];
                      const colT = board?.colTraits[cIdx];

                      // Build the full set of traits to display
                      const traitEntries: Record<string, string | string[]> = {
                        ...(viewingCharacterDetail.char.traits || {})
                      };

                      // Include FIXED_TRAITS dynamically if they are part of the cell criteria or bonus trait
                      if (rowT && FIXED_TRAITS.includes(rowT.key)) {
                        traitEntries[rowT.key] = getFixedTraitValue(viewingCharacterDetail.char, rowT.key);
                      }
                      if (colT && FIXED_TRAITS.includes(colT.key)) {
                        traitEntries[colT.key] = getFixedTraitValue(viewingCharacterDetail.char, colT.key);
                      }
                      if (gameMode === "same_trait" && sameTraitBonus && FIXED_TRAITS.includes(sameTraitBonus.key)) {
                        traitEntries[sameTraitBonus.key] = getFixedTraitValue(viewingCharacterDetail.char, sameTraitBonus.key);
                      }

                      const entries = Object.entries(traitEntries).sort(([a], [b]) => 
                        a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " "), undefined, { sensitivity: "base" })
                      );

                      if (entries.length > 0) {
                        return (
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {entries.map(([key, val]) => {
                              const formattedKey = key.replace(/_/g, " ");
                              const formattedVal = Array.isArray(val) ? val.join(", ") : String(val);
                              if (!formattedVal.trim()) return null;

                              const isRowTrait = rowT && rowT.key === key;
                              const isColTrait = colT && colT.key === key;
                              const isBonusTrait = gameMode === "same_trait" && sameTraitBonus && sameTraitBonus.key === key;
                              const isTargetTrait = isRowTrait || isColTrait || isBonusTrait;

                              let matches = false;
                              let expectedValue = "";
                              let labelSuffix = "";

                              if (isRowTrait) {
                                matches = matchesTrait(viewingCharacterDetail.char, rowT.key, rowT.value);
                                expectedValue = rowT.value;
                                labelSuffix = ` (Row Target: ${rowT.value})`;
                              } else if (isColTrait) {
                                matches = matchesTrait(viewingCharacterDetail.char, colT.key, colT.value);
                                expectedValue = colT.value;
                                labelSuffix = ` (Col Target: ${colT.value})`;
                              } else if (isBonusTrait && sameTraitBonus) {
                                matches = matchesTrait(viewingCharacterDetail.char, sameTraitBonus.key, sameTraitBonus.value);
                                expectedValue = sameTraitBonus.value;
                                labelSuffix = ` (Bonus Target: ${sameTraitBonus.value})`;
                              }

                              const containerClass = isTargetTrait
                                ? matches
                                  ? "p-2 rounded-lg bg-emerald-950/20 border-2 border-emerald-500/80 flex flex-col justify-center gap-0.5 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse"
                                  : "p-2 rounded-lg bg-rose-950/20 border-2 border-rose-500/80 flex flex-col justify-center gap-0.5 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                                : "p-2 rounded-lg bg-slate-900/40 border border-slate-900/50 flex flex-col justify-center gap-0.5";

                              const titleClass = isTargetTrait
                                ? matches
                                  ? "text-[8px] font-black text-emerald-400 uppercase tracking-wider font-mono flex items-center justify-between"
                                  : "text-[8px] font-black text-rose-400 uppercase tracking-wider font-mono flex items-center justify-between"
                                : "text-[8px] font-bold text-slate-500 uppercase tracking-wider font-mono";

                              const valueClass = isTargetTrait
                                ? matches
                                  ? "text-[11px] font-black text-emerald-200 truncate"
                                  : "text-[11px] font-black text-rose-200 truncate"
                                : "text-[11px] font-black text-slate-200 truncate";

                              return (
                                <div key={key} className={containerClass}>
                                  <span className={titleClass}>
                                    <span>{formattedKey}</span>
                                    {isTargetTrait && (
                                      <span className="text-[7px] px-1 py-0.2 bg-slate-950/45 rounded font-bold uppercase tracking-widest leading-none ml-1">
                                        {matches ? "MATCH" : "MISMATCH"}
                                      </span>
                                    )}
                                  </span>
                                  <span className={valueClass} title={`${formattedVal}${labelSuffix}`}>
                                    {formattedVal}
                                    {isTargetTrait && (
                                      <span className="text-[9px] block font-medium opacity-80 mt-0.5">
                                        Target: {expectedValue}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        return (
                          <p className="text-xs text-slate-500 italic p-2.5 bg-slate-900/30 rounded-lg">
                            No custom traits registered for this character.
                          </p>
                        );
                      }
                    })()}
                  </div>

                  {/* External Link or Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 font-mono border-t border-slate-900 pt-3">
                    <div className="flex flex-col gap-0.5">
                      <span>MAL ID: {viewingCharacterDetail.char.malId}</span>
                      {viewingCharacterDetail.char.registeredAt && (
                        <span>Registered: {new Date(viewingCharacterDetail.char.registeredAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {viewingCharacterDetail.char.malId > 0 && (
                      <a 
                        href={`https://myanimelist.net/character/${viewingCharacterDetail.char.malId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                      >
                        <span>View MAL Profile</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between border-t border-slate-900 pt-4 mt-6">
                  {/* Clear Cell CTA */}
                  {!isDailyCompletedForUser && viewingCharacterDetail.cellIdx >= 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCells(prev => ({
                          ...prev,
                          [viewingCharacterDetail.cellIdx]: null
                        }));
                        setViewingCharacterDetail(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-black text-rose-400 transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 text-rose-400" />
                      <span>Clear Cell</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewingCharacterDetail(null)}
                    className="rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 px-4 py-2 text-xs font-black text-slate-350 hover:text-white cursor-pointer transition-colors ml-auto"
                  >
                    Close
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Puzzle History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-950 border border-indigo-500/30 text-indigo-400">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">Your Saved Puzzle History</h3>
                    <p className="text-xs text-slate-400">Review your past puzzle completions or click Play Again to reload a board.</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <PuzzleHistoryView
                onPlayPuzzle={(puzzleCode) => {
                  setShowHistoryModal(false);
                  if (puzzleCode) {
                    navigate(`/sudoku/${puzzleCode}`);
                  } else {
                    generateNewSudoku();
                  }
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Leaderboard Modal */}
      <AnimatePresence>
        {showDailyLeaderboardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <DailyLeaderboardView
                characters={characters}
                initialDate={dailyPuzzleDate}
                onPlayDailyPuzzle={(pCode, gMode, pDate) => {
                  setShowDailyLeaderboardModal(false);
                  loadDailyPuzzle(pDate);
                  navigate(`/sudoku/daily/${pDate}`);
                }}
                onClose={() => setShowDailyLeaderboardModal(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
