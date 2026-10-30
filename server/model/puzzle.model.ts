import { DailyLeaderboardEntry, DailyPuzzleRecord, PuzzleHistoryRecord, UserProfile } from "@shared/types/index.js";
import { getDb, fetchAllUsers } from "./index.js";
import { parseMatchScoreNum } from "@shared/utils/index.js";

export async function savePuzzleHistoryRecord(record: PuzzleHistoryRecord): Promise<PuzzleHistoryRecord> {
  const db = await getDb();
  if (db) {
    try {
      await db.collection("puzzle_history").replaceOne({ _id: record.id as any }, record, { upsert: true });
      console.log(`💾 Saved puzzle history record ${record.id} to MongoDB.`);
    } catch (err) {
      console.error("Failed to save puzzle history record to MongoDB:", err);
    }
  }

  return record;
}

export async function fetchUserPuzzleHistory(userId: string): Promise<PuzzleHistoryRecord[]> {
  const db = await getDb();
  let items: PuzzleHistoryRecord[] = [];

  if (db) {
    try {
      const docs = await db.collection("puzzle_history").find({ userId }).toArray();
      items = docs.map(({ _id, ...rest }: any) => rest as PuzzleHistoryRecord);
    } catch (err) {
      console.error("Failed to fetch user puzzle history from MongoDB:", err);
    }
  }

  return items;
}

export async function deletePuzzleHistoryRecord(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    try {
      await db.collection("puzzle_history").deleteOne({ _id: id as any });
    } catch (err) {
      console.error("Failed to delete puzzle history from MongoDB:", err);
    }
  }

  return true;
}

export async function fetchDailyPuzzle(date: string): Promise<DailyPuzzleRecord | null> {
  const db = await getDb();
  if (db) {
    try {
      const doc = await db.collection("daily_puzzles").findOne({ _id: date as any });
      if (doc) {
        const { _id, ...rest } = doc as any;
        return rest as DailyPuzzleRecord;
      }
    } catch (err) {
      console.error(`Failed to fetch daily puzzle for ${date} from MongoDB:`, err);
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

  const db = await getDb();
  if (db) {
    try {
      await db.collection("daily_puzzles").updateOne({ _id: date as any }, { $set: record }, { upsert: true });
    } catch (err) {
      console.error(`Failed to save daily puzzle for ${date} to MongoDB:`, err);
    }
  }

  return record;
}

export async function fetchDailyLeaderboard(date: string): Promise<DailyLeaderboardEntry[]> {
  const db = await getDb();
  let entriesMap = new Map<string, DailyLeaderboardEntry>();

  // Fetch registered users to resolve up-to-date display names / avatars
  let usersMap = new Map<string, UserProfile>();
  try {
    const allUsers = await fetchAllUsers();
    allUsers.forEach((u) => usersMap.set(u.uid, u));
  } catch (e) {}

  if (db) {
    try {
      const docs = await db.collection("daily_leaderboards").find({ date }).toArray();
      docs.forEach((doc: any) => {
        const { _id, ...rest } = doc;
        const data = rest as DailyLeaderboardEntry;
        if (data && data.userId) {
          entriesMap.set(data.id || String(_id), { ...data, id: data.id || String(_id) });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch daily leaderboard for ${date} from MongoDB:`, err);
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

  const db = await getDb();
  if (db) {
    try {
      const existing = await db.collection("daily_leaderboards").findOne({ _id: id as any });
      if (existing) {
        return {
          success: false,
          reason: `You already have a submitted score on the leaderboard for ${input.date}.`,
        };
      }
      await db.collection("daily_leaderboards").insertOne({ ...fullEntry, _id: id as any });
    } catch (err) {
      console.error("Failed to save leaderboard entry to MongoDB:", err);
    }
  }

  return { success: true, entry: fullEntry };
}

export async function deleteDailyLeaderboardEntry(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    try {
      await db.collection("daily_leaderboards").deleteOne({ _id: id as any });
    } catch (err) {
      console.error(`Failed to delete daily leaderboard entry ${id} from MongoDB:`, err);
    }
  }

  return true;
}