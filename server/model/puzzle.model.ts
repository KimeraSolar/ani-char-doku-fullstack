import { DailyLeaderboardEntry, DailyPuzzleRecord, PuzzleHistoryRecord, UserProfile } from "@shared/types/index.js";
import { getFirestoreDb, fetchAllUsers } from "./index.js";
import { parseMatchScoreNum } from "@shared/utils/index.js";

export async function savePuzzleHistoryRecord(record: PuzzleHistoryRecord): Promise<PuzzleHistoryRecord> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const docRef = db.collection("puzzle_history").doc(record.id);
      await docRef.set(record);
      console.log(`💾 Saved puzzle history record ${record.id} to Firestore.`);
    } catch (err) {
      console.error("Failed to save puzzle history record to Firestore:", err);
    }
  }

  return record;
}

export async function fetchUserPuzzleHistory(userId: string): Promise<PuzzleHistoryRecord[]> {
  const db = getFirestoreDb();
  let firestoreItems: PuzzleHistoryRecord[] = [];

  if (db) {
    try {
      const snapshot = await db.collection("puzzle_history").get();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PuzzleHistoryRecord;
        if (data && data.userId === userId) {
          firestoreItems.push(data);
        }
      });
    } catch (err) {
      console.error("Failed to fetch user puzzle history from Firestore:", err);
    }
  }

  return firestoreItems;
}

export async function deletePuzzleHistoryRecord(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const docRef = db.collection("puzzle_history").doc(id);
      await docRef.delete();
    } catch (err) {
      console.error("Failed to delete puzzle history from Firestore:", err);
    }
  }

  return true;
}

export async function fetchDailyPuzzle(date: string): Promise<DailyPuzzleRecord | null> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const docRef = db.collection("daily_puzzles").doc(date);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return docSnap.data() as DailyPuzzleRecord;
      }
    } catch (err) {
      console.error(`Failed to fetch daily puzzle for ${date} from Firestore:`, err);
    }
  }

  return null;
}

export async function saveDailyPuzzle(date: string, puzzleCode: string, gameMode: string): Promise<DailyPuzzleRecord> {
  const record: DailyPuzzleRecord = {
    date,
    puzzleCode,
    gameMode,
    createdAt: new Date().toISOString(),
  };

  const db = getFirestoreDb();
  if (db) {
    try {
      const docRef = db.collection("daily_puzzles").doc(date);
      await docRef.set(record, { merge: true });
    } catch (err) {
      console.error(`Failed to save daily puzzle for ${date} to Firestore:`, err);
    }
  }

  return record;
}

export async function fetchDailyLeaderboard(date: string): Promise<DailyLeaderboardEntry[]> {
  const db = getFirestoreDb();
  let entriesMap = new Map<string, DailyLeaderboardEntry>();

  // Fetch registered users to resolve up-to-date display names / avatars
  let usersMap = new Map<string, UserProfile>();
  try {
    const allUsers = await fetchAllUsers();
    allUsers.forEach((u) => usersMap.set(u.uid, u));
  } catch (e) {}

  if (db) {
    try {
      // No firebase-admin: consultas com .where() são encadeadas diretamente no db.collection()
      const snapshot = await db.collection("daily_leaderboards").where("date", "==", date).get();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DailyLeaderboardEntry;
        if (data && data.userId) {
          entriesMap.set(data.id || docSnap.id, { ...data, id: data.id || docSnap.id });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch daily leaderboard for ${date} from Firestore:`, err);
    }
  }

  let entries = Array.from(entriesMap.values());

  // Enrich with current user display name / photoURL
  entries = entries.map((entry) => {
    const userProf = usersMap.get(entry.userId);
    return {
      ...entry,
      userDisplayName: userProf?.displayName || entry.userDisplayName || "Anonymous",
      userPhotoURL: userProf?.photoURL !== undefined ? userProf.photoURL : entry.userPhotoURL,
    };
  });

  // Sort by highest pointsScore, then highest matchScore
  entries.sort((a, b) => {
    if (b.pointsScore !== a.pointsScore) {
      return b.pointsScore - a.pointsScore;
    }
    const matchA = parseMatchScoreNum(a.matchScore);
    const matchB = parseMatchScoreNum(b.matchScore);
    return matchB - matchA;
  });

  // Calculate Rank (ties share the exact same rank position)
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1];
      const curr = entries[i];
      const prevMatch = parseMatchScoreNum(prev.matchScore);
      const currMatch = parseMatchScoreNum(curr.matchScore);

      // If exact same points score and match score, share same rank!
      if (curr.pointsScore === prev.pointsScore && currMatch === prevMatch) {
        curr.rank = prev.rank;
      } else {
        curr.rank = i + 1;
      }
    } else {
      entries[0].rank = 1;
    }
  }

  return entries;
}

export async function saveDailyLeaderboardEntry(input: Omit<DailyLeaderboardEntry, "id">): Promise<{
  success: boolean;
  entry?: DailyLeaderboardEntry;
  reason?: string;
}> {
  // Validate completion date vs puzzle date
  const completionDateStr = input.completedAt ? input.completedAt.split("T")[0] : "";
  if (completionDateStr !== input.date) {
    return {
      success: false,
      reason: `Leaderboard entries are only recorded if finished on the puzzle date (${input.date}). Finished on: ${completionDateStr}`,
    };
  }

  const id = `${input.date}_${input.userId}`;
  const fullEntry: DailyLeaderboardEntry = {
    ...input,
    id,
  };

  const db = getFirestoreDb();
  if (db) {
    try {
      const docRef = db.collection("daily_leaderboards").doc(id);
      const existingSnap = await docRef.get();
      if (existingSnap.exists) {
        return {
          success: false,
          reason: `You already have a submitted score on the leaderboard for ${input.date}.`,
        };
      }
      await docRef.set(fullEntry);
    } catch (err) {
      console.error("Failed to save leaderboard entry to Firestore:", err);
    }
  }

  return { success: true, entry: fullEntry };
}

export async function deleteDailyLeaderboardEntry(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const docRef = db.collection("daily_leaderboards").doc(id);
      await docRef.delete();
    } catch (err) {
      console.error(`Failed to delete daily leaderboard entry ${id} from Firestore:`, err);
    }
  }

  return true;
}