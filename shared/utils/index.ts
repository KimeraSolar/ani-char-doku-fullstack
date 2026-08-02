export function parseMatchScoreNum(matchScore: string): number {
  if (!matchScore) return 0;
  if (matchScore.includes("/")) {
    const parts = matchScore.split("/");
    const val = parseInt(parts[0], 10);
    return isNaN(val) ? 0 : val;
  }
  const val = parseInt(matchScore, 10);
  return isNaN(val) ? 0 : val;
}