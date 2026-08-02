import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context";
import { PuzzleHistoryRecord } from "@shared/types/index";
import { 
  History, 
  Calendar, 
  Trophy, 
  Sparkles, 
  Play, 
  Copy, 
  Check, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Gamepad2, 
  Award,
  RotateCcw,
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PuzzleHistoryViewProps {
  onPlayPuzzle?: (code: string) => void;
  compact?: boolean;
}

export default function PuzzleHistoryView({ onPlayPuzzle, compact = false }: PuzzleHistoryViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [historyRecords, setHistoryRecords] = useState<PuzzleHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealedJokers, setRevealedJokers] = useState<Record<string, boolean>>({});

  const toggleJokerVisibility = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRevealedJokers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/puzzle-history/${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data);
      } else {
        setError("Failed to load puzzle history.");
      }
    } catch (err: any) {
      console.error("Error fetching puzzle history:", err);
      setError("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/puzzle-history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistoryRecords(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete record:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/sudoku/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handlePlayAgain = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onPlayPuzzle) {
      onPlayPuzzle(code);
    } else {
      navigate(`/sudoku/${code}`);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-3">
        <History className="h-8 w-8 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-200">Sign In to Save History</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Sign in with your Google account to automatically track and save your completed Sudoku puzzles!
        </p>
      </div>
    );
  }

  // Calculate stats
  const totalCompleted = historyRecords.length;
  const perfectGames = historyRecords.filter(r => r.matchScore === "9/9" || r.matchScore?.startsWith("9")).length;
  const totalPoints = historyRecords.reduce((acc, curr) => acc + (curr.pointsScore || 0), 0);
  const jokersFound = historyRecords.filter(r => r.jokerStatus === "Found" || r.jokerStatus === "Placed").length;

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            <span>Puzzle Completion History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View your saved completed Sudoku records, replay past challenges, or share puzzle links.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Aggregate Stats Bar */}
      {totalCompleted > 0 && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Completed
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-black text-white">{totalCompleted}</span>
              <span className="text-[10px] text-slate-500 font-bold">Puzzles</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-mono">
              Perfect Matches
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-black text-emerald-300">{perfectGames}</span>
              <span className="text-[10px] text-emerald-500 font-bold">/ {totalCompleted}</span>
            </div>
          </div>

          <div className="rounded-xl border border-purple-900/30 bg-purple-950/20 p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block font-mono">
              Total Points
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-black text-purple-300">{totalPoints.toLocaleString()}</span>
              <span className="text-[10px] text-purple-500 font-bold">PTS</span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block font-mono">
              Jokers Placed
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-black text-amber-300">{jokersFound}</span>
              <span className="text-[10px] text-amber-500 font-bold">Found</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-xs font-mono">Loading completed puzzle history...</p>
        </div>
      ) : error ? (
        <div className="flex items-center space-x-3 rounded-xl border border-rose-800/40 bg-rose-950/30 p-4 text-xs text-rose-300">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : historyRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center space-y-3 bg-slate-900/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-950 text-indigo-400 mx-auto border border-indigo-800/40">
            <Gamepad2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">No Completed Puzzles Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Fill all 9 characters in any Sudoku puzzle to automatically archive your game date, score, points, and replay code here!
          </p>
          <button
            onClick={() => handlePlayAgain("")}
            className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Play Sudoku Now</span>
          </button>
        </div>
      ) : (
        /* History Records List */
        <div className="space-y-3">
          {historyRecords.map((record) => {
            const isExpanded = expandedId === record.id;
            const isPerfect = record.matchScore === "9/9" || record.matchScore?.startsWith("9");
            const isJokerFound = record.jokerStatus === "Found" || record.jokerStatus === "Placed";

            return (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isExpanded
                    ? "border-indigo-500/50 bg-slate-900 shadow-xl"
                    : "border-slate-800/90 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90"
                }`}
              >
                {/* Main Card Summary */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    
                    {/* Mode Icon Badge */}
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-bold text-xs ${
                      isPerfect 
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/20" 
                        : "bg-indigo-950/60 border-indigo-500/40 text-indigo-400"
                    }`}>
                      {isPerfect ? (
                        <Trophy className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Award className="h-5 w-5 text-indigo-400" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Game Mode Badge */}
                        <span className="inline-flex items-center rounded-md bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                          {record.gameMode || "Classic"} Mode
                        </span>

                        {/* Completion Date */}
                        <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-bold text-slate-300">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{record.completedAt}</span>
                        </span>
                      </div>

                      {/* Summary details */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-300">
                          Match: <strong className={isPerfect ? "text-emerald-400 font-bold" : "text-amber-300 font-bold"}>{record.matchScore}</strong>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="font-semibold text-slate-300">
                          Points: <strong className="text-purple-300 font-extrabold">{record.pointsScore?.toLocaleString() || 0} pts</strong>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className={`inline-flex items-center gap-1 font-semibold ${isJokerFound ? "text-purple-400" : "text-slate-400"}`}>
                          <Sparkles className="h-3 w-3" />
                          <span>Joker: {record.jokerStatus}</span>
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 w-full sm:w-auto justify-end">
                    
                    {/* Play Again Button */}
                    <button
                      onClick={(e) => handlePlayAgain(record.puzzleCode, e)}
                      className="inline-flex items-center space-x-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer"
                      title="Play this puzzle again"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Play Again</span>
                    </button>

                    {/* Copy Puzzle Code Link */}
                    <button
                      onClick={(e) => handleCopyLink(record.puzzleCode, e)}
                      className="inline-flex items-center space-x-1 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                      title="Copy sharable puzzle link"
                    >
                      {copiedCode === record.puzzleCode ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span className="hidden sm:inline">{copiedCode === record.puzzleCode ? "Copied" : "Share"}</span>
                    </button>

                    {/* Delete Entry */}
                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      disabled={deletingId === record.id}
                      className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-rose-400 hover:border-rose-800/50 transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      {deletingId === record.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Chevron expand */}
                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>

                  </div>
                </div>

                {/* Expanded Details Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800/80 bg-slate-950/60 p-4 space-y-3 text-xs"
                    >
                      {/* Joker Character Section with Toggle */}
                      {record.boardSummary?.jokerName && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-800/30">
                          <div className="flex items-center space-x-2 min-w-0">
                            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide font-mono shrink-0">
                              Puzzle Joker:
                            </span>
                            {revealedJokers[record.id] ? (
                              <span className="font-bold text-amber-200 text-xs truncate">
                                {record.boardSummary.jokerName}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-500 text-xs italic">
                                ••••••••• (Hidden)
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => toggleJokerVisibility(record.id, e)}
                            className="inline-flex items-center space-x-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-800/60 px-3 py-1.5 text-xs font-bold text-amber-200 border border-amber-500/30 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                          >
                            {revealedJokers[record.id] ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                                <span>Hide Joker</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 text-amber-300" />
                                <span>Show Joker</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Row and Col Traits */}
                      {record.boardSummary && (record.boardSummary.rowTraits?.length || record.boardSummary.colTraits?.length) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {record.boardSummary.rowTraits && record.boardSummary.rowTraits.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                                Row Criteria
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {record.boardSummary.rowTraits.map((rt, idx) => (
                                  <span key={idx} className="rounded bg-slate-900 px-2 py-1 text-[10px] font-mono text-indigo-300 border border-slate-800">
                                    {rt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {record.boardSummary.colTraits && record.boardSummary.colTraits.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                                Column Criteria
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {record.boardSummary.colTraits.map((ct, idx) => (
                                  <span key={idx} className="rounded bg-slate-900 px-2 py-1 text-[10px] font-mono text-purple-300 border border-slate-800">
                                    {ct}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 text-[11px] text-slate-500">
                        <span>User: {record.userEmail || record.userId}</span>
                        <button
                          onClick={() => handlePlayAgain(record.puzzleCode)}
                          className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Open in Game Engine</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
