import { useMemo } from 'react';

/**
 * Lightweight fuzzy similarity using normalized Levenshtein distance.
 * Returns items above `threshold` (0..1, default 0.7), capped to `limit`.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ةه]/g, 'ه')
    .replace(/\s+/g, ' ');
}

export interface FuzzyMatchOptions {
  threshold?: number;
  limit?: number;
}

export function useFuzzyMatch<T>(
  query: string,
  items: T[],
  getKey: (item: T) => string,
  { threshold = 0.7, limit = 5 }: FuzzyMatchOptions = {},
) {
  return useMemo(() => {
    const q = normalize(query);
    if (q.length < 3) return { matches: [] as T[], count: 0 };
    const scored = items
      .map(it => ({ it, score: similarity(q, normalize(getKey(it))) }))
      .filter(x => x.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { matches: scored.map(s => s.it), count: scored.length };
  }, [query, items, getKey, threshold, limit]);
}