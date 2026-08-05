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

export function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_");
}