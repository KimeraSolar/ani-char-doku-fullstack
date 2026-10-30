// Default anime title is the English one; falls back to the MAL default title when no English title exists.
export function getEnglishTitle(anime: {
  title?: string | null;
  title_english?: string | null;
  titles?: { type?: string; title?: string }[] | null;
}): string {
  const english =
    anime.title_english ||
    anime.titles?.find((t) => t?.type === "English" && t.title)?.title;
  return String(english || anime.title || "").trim();
}

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