/**
 * Lightweight Arabic-aware string similarity for soft-warning duplicate detection.
 * Uses Dice coefficient on bigrams after Arabic normalization.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(s: string): Set<string> {
  const grams = new Set<string>();
  const n = s.length;
  for (let i = 0; i < n - 1; i++) grams.add(s.slice(i, i + 2));
  return grams;
}

export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;
  const ga = bigrams(na);
  const gb = bigrams(nb);
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return (2 * inter) / (ga.size + gb.size);
}

/**
 * Find existing entries whose name closely matches the candidate.
 * Returns top matches above the threshold.
 */
export function findSimilar<T>(
  candidate: string,
  list: T[],
  getter: (row: T) => string,
  threshold = 0.78,
  limit = 3
): Array<{ row: T; score: number }> {
  if (!candidate.trim()) return [];
  return list
    .map((row) => ({ row, score: similarity(candidate, getter(row)) }))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}