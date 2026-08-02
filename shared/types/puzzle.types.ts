export interface PuzzleHistoryRecord {
  id: string;
  userId: string;
  userEmail?: string;
  completedAt: string; // "dd/mm/yyyy"
  timestamp: number;
  matchScore: string; // e.g., "9/9"
  pointsScore: number;
  jokerStatus: string; // "Found" | "Not Found"
  gameMode: string; // e.g., "Classic", "Multiverse", "Trait Scoring", "Custom"
  puzzleCode: string;
  boardSummary?: {
    rowTraits?: string[];
    colTraits?: string[];
    jokerName?: string;
  };
}

export interface DailyPuzzleRecord {
  date: string; // YYYY-MM-DD
  puzzleCode: string;
  gameMode: string;
  createdAt: string;
}

export interface DailyLeaderboardEntry {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  matchScore: string;
  pointsScore: number;
  jokerFound: boolean;
  completedAt: string;
  placedCharacterIds: string[];
  gameMode: string;
  rank?: number;
}