import { useState, useEffect } from "react";
import { DailyLeaderboardEntry, DailyPuzzleRecord, RegisteredCharacter } from "@shared/types/index";
import { useAuth } from "../context";
import { 
  Calendar, 
  Trophy, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Eye, 
  X,
  Check,
  Crown, 
  Medal,
  Lock,
  Trash2,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DailyLeaderboardViewProps {
  characters: RegisteredCharacter[];
  onPlayDailyPuzzle?: (puzzleCode: string, gameMode: string, date: string) => void;
  onClose?: () => void;
  initialDate?: string;
}

export default function DailyLeaderboardView({
  characters,
  onPlayDailyPuzzle,
  onClose,
  initialDate
}: DailyLeaderboardViewProps) {
  const { user, isOwner } = useAuth();
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  
  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    const today = new Date().toISOString().split("T")[0];
    if (initialDate && initialDate > today) return today;
    return initialDate || today;
  });

  const setSelectedDate = (dateVal: string) => {
    const today = getTodayStr();
    if (dateVal > today) {
      setSelectedDateState(today);
    } else {
      setSelectedDateState(dateVal);
    }
  };
  
  const [loading, setLoading] = useState<boolean>(true);
  const [dailyPuzzle, setDailyPuzzle] = useState<DailyPuzzleRecord | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  
  // Selected entry for viewing board grid preview modal
  const [previewEntry, setPreviewEntry] = useState<DailyLeaderboardEntry | null>(null);

  // Determine if current user has completed the daily puzzle for selectedDate
  const hasUserCompletedDaily = Boolean(user && leaderboard.some(entry => entry.userId === user.uid));

  const handleDeleteEntry = async (entry: DailyLeaderboardEntry) => {
    if (!isOwner) return;
    const targetName = entry.userDisplayName || "this user";
    if (!window.confirm(`Are you sure you want to delete the leaderboard registry for "${targetName}" on ${selectedDate}?`)) {
      return;
    }

    setDeletingId(entry.id);
    try {
      const res = await fetch(`/api/daily-leaderboard/${entry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to delete leaderboard entry.");
      }

      if (previewEntry?.id === entry.id) {
        setPreviewEntry(null);
      }

      const lbRes = await fetch(`/api/daily-leaderboard?date=${selectedDate}`);
      const lbJson = await lbRes.json();
      if (lbJson.leaderboard && Array.isArray(lbJson.leaderboard)) {
        setLeaderboard(lbJson.leaderboard);
      } else {
        setLeaderboard(prev => prev.filter(item => item.id !== entry.id));
      }

      setActionNotice(`Leaderboard registry entry for "${targetName}" deleted successfully.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to delete leaderboard entry.");
    } finally {
      setDeletingId(null);
    }
  };

  // Fetch puzzle & leaderboard data whenever selectedDate changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const today = getTodayStr();
        const effectiveDate = selectedDate > today ? today : selectedDate;

        // Fetch puzzle info
        const puzzleRes = await fetch(`/api/daily-puzzle?date=${effectiveDate}`);
        const puzzleJson = await puzzleRes.json();
        
        // Fetch leaderboard info
        const lbRes = await fetch(`/api/daily-leaderboard?date=${effectiveDate}`);
        const lbJson = await lbRes.json();

        if (isMounted) {
          if (puzzleJson.exists && puzzleJson.puzzle) {
            setDailyPuzzle(puzzleJson.puzzle);
          } else {
            setDailyPuzzle(null);
          }

          if (lbJson.leaderboard && Array.isArray(lbJson.leaderboard)) {
            setLeaderboard(lbJson.leaderboard);
          } else {
            setLeaderboard([]);
          }
        }
      } catch (err) {
        console.error("Error loading daily leaderboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const changeDateByDays = (days: number) => {
    const d = new Date(selectedDate + "T12:00:00Z");
    d.setDate(d.getDate() + days);
    let newStr = d.toISOString().split("T")[0];
    const today = getTodayStr();
    if (newStr > today) newStr = today;
    setSelectedDate(newStr);
  };

  const isToday = selectedDate >= getTodayStr();

  const getModeBadge = (modeKey: string) => {
    switch (modeKey) {
      case "trait_scoring":
        return { label: "Trait Scoring Mode", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "same_trait":
        return { label: "Same Trait Mode", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      case "multiverse":
        return { label: "Multiverse Mode", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
      default:
        return { label: "Classic Mode", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
    }
  };

  const getRankBadge = (rank?: number) => {
    if (!rank) return <span className="text-slate-400 font-mono text-xs">#--</span>;
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold text-xs">
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>1st</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 font-extrabold text-xs">
          <Medal className="w-3.5 h-3.5 text-slate-300" />
          <span>2nd</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 font-extrabold text-xs">
          <Medal className="w-3.5 h-3.5 text-amber-600" />
          <span>3rd</span>
        </span>
      );
    }
    return <span className="font-mono text-slate-400 text-xs font-bold">#{rank}</span>;
  };

  const formatCompletedTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto w-full">
      {/* Header Bar */}
      <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Daily Puzzle Leaderboard</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-normal">
                Daily Mode
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete daily puzzles on the date they release to earn leaderboard placement!
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Date Picker & Control Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDateByDays(-1)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev Day</span>
          </button>

          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-indigo-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              max={getTodayStr()}
              onChange={(e) => {
                if (e.target.value) {
                  const chosen = e.target.value > getTodayStr() ? getTodayStr() : e.target.value;
                  setSelectedDate(chosen);
                }
              }}
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
            />
          </div>

          <button
            onClick={() => changeDateByDays(1)}
            disabled={isToday}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
              isToday
                ? "bg-slate-850 border-slate-800 text-slate-600 cursor-not-allowed"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 cursor-pointer"
            }`}
            title="Next Day"
          >
            <span className="hidden sm:inline">Next Day</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(getTodayStr())}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        {/* Daily Puzzle Mode Info & Play CTA */}
        {dailyPuzzle ? (
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getModeBadge(dailyPuzzle.gameMode).color}`}>
              {getModeBadge(dailyPuzzle.gameMode).label}
            </span>

            {onPlayDailyPuzzle && (
              <button
                onClick={() => onPlayDailyPuzzle(dailyPuzzle.puzzleCode, dailyPuzzle.gameMode, dailyPuzzle.date)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Daily Puzzle</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>Daily puzzle not generated yet for this date. Playing it will generate and lock it for today!</span>
          </div>
        )}
      </div>

      {/* Leaderboard Table Content */}
      <div className="p-4 sm:p-6 space-y-4 min-h-[300px]">
        {actionNotice && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-200 font-bold shadow-md">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="p-1 hover:bg-emerald-500/30 rounded-lg text-emerald-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {lockNotice && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200 font-bold shadow-md">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{lockNotice}</span>
            </div>
            <button
              onClick={() => setLockNotice(null)}
              className="p-1 hover:bg-amber-500/30 rounded-lg text-amber-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!hasUserCompletedDaily && leaderboard.length > 0 && !loading && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Board previews are locked! Complete today's daily puzzle ({selectedDate}) yourself to reveal other players' winning character grids.
              </span>
            </div>
            {dailyPuzzle && onPlayDailyPuzzle && (
              <button
                onClick={() => onPlayDailyPuzzle(dailyPuzzle.puzzleCode, dailyPuzzle.gameMode, dailyPuzzle.date)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs shrink-0 hover:bg-amber-400 transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Play Now</span>
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Loading leaderboard for {selectedDate}...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/80 p-6">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-300">No Leaderboard Entries Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                No users have completed this daily puzzle on {selectedDate} yet.
                Be the first to solve it today and take 1st place!
              </p>
            </div>
            {dailyPuzzle && onPlayDailyPuzzle && (
              <button
                onClick={() => onPlayDailyPuzzle(dailyPuzzle.puzzleCode, dailyPuzzle.gameMode, dailyPuzzle.date)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play & Set High Score</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] font-mono border-b border-slate-800">
                <tr>
                  <th className="px-3 py-3 text-center">Rank</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-3 py-3 text-right">Points Score</th>
                  <th className="px-3 py-3 text-center">Matches</th>
                  <th className="px-3 py-3 text-center">Joker</th>
                  <th className="px-3 py-3 text-right">Time</th>
                  <th className="px-3 py-3 text-center">Board</th>
                  {isOwner && <th className="px-3 py-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {leaderboard.map((entry, idx) => {
                  const isTop3 = entry.rank && entry.rank <= 3;
                  const isOwnEntry = Boolean(user && entry.userId === user.uid);
                  const canViewBoard = hasUserCompletedDaily || isOwnEntry;

                  return (
                    <tr 
                      key={entry.id || idx}
                      className={`hover:bg-slate-850/60 transition-colors ${
                        isTop3 ? "bg-slate-900/40" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getRankBadge(entry.rank)}
                      </td>

                      {/* Player Display Name / Avatar */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {entry.userPhotoURL ? (
                            <img
                              src={entry.userPhotoURL}
                              alt={entry.userDisplayName || "User"}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                              {(entry.userDisplayName || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-100 max-w-[140px] truncate">
                              {entry.userDisplayName || "Anonymous Player"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Points Score */}
                      <td className="px-3 py-3 text-right font-extrabold text-amber-400 font-mono text-sm whitespace-nowrap">
                        {entry.pointsScore.toLocaleString()} pts
                      </td>

                      {/* Match Score */}
                      <td className="px-3 py-3 text-center font-mono font-bold text-indigo-300 whitespace-nowrap">
                        {entry.matchScore}
                      </td>

                      {/* Joker Found */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {entry.jokerFound ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            Found
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-mono">
                            None
                          </span>
                        )}
                      </td>

                      {/* Completed At */}
                      <td className="px-3 py-3 text-right font-mono text-slate-400 whitespace-nowrap text-[11px]">
                        {formatCompletedTime(entry.completedAt)}
                      </td>

                      {/* View Character Grid */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {canViewBoard ? (
                          <button
                            onClick={() => setPreviewEntry(entry)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span>View Board</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setLockNotice(`Complete the daily puzzle for ${selectedDate} first to inspect other players' boards!`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-amber-300 hover:border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                            title="Complete this daily puzzle first to view board"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-500/80" />
                            <span>Locked</span>
                          </button>
                        )}
                      </td>

                      {/* Owner Delete Action */}
                      {isOwner && (
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            disabled={deletingId === entry.id}
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 hover:border-rose-800/60 transition-colors cursor-pointer mx-auto flex items-center justify-center"
                            title={`Delete leaderboard registry entry for ${entry.userDisplayName || 'user'}`}
                          >
                            {deletingId === entry.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Board Grid Modal */}
      <AnimatePresence>
        {previewEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 max-w-lg w-full space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{previewEntry.userDisplayName}'s Winning Board</span>
                    {getRankBadge(previewEntry.rank)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Points: <span className="font-bold text-amber-400 font-mono">{previewEntry.pointsScore.toLocaleString()}</span> • Matches: <span className="font-bold text-indigo-300 font-mono">{previewEntry.matchScore}</span>
                  </p>
                </div>
                <button
                  onClick={() => setPreviewEntry(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3x3 Grid Preview */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                {Array.from({ length: 9 }).map((_, idx) => {
                  const charId = previewEntry.placedCharacterIds && previewEntry.placedCharacterIds[idx];
                  const char = charId ? characters.find((c) => c.id === charId) : null;

                  return (
                    <div
                      key={idx}
                      className="aspect-square bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex flex-col items-center justify-center text-center overflow-hidden relative group"
                    >
                      {char ? (
                        <>
                          <img
                            src={char.imageUrl}
                            alt={char.name}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover border border-slate-700 shadow-sm mb-1"
                          />
                          <span className="text-[10px] font-bold text-slate-200 line-clamp-1 w-full px-1">
                            {char.name}
                          </span>
                        </>
                      ) : (
                        <div className="text-slate-600 text-[10px] font-mono">Empty</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                {isOwner && (
                  <button
                    onClick={() => handleDeleteEntry(previewEntry)}
                    disabled={deletingId === previewEntry.id}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-800/70 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {deletingId === previewEntry.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>Delete Registry Entry</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewEntry(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
