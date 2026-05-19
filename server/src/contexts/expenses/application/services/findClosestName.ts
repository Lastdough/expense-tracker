/**
 * Levenshtein-distance-based closest-name suggester for import errors.
 *
 * Used by `ImportExpenses` to turn "category 'Foods' not found" into
 * "did you mean 'Food'?". Pure string code — keep it in `application/services/`
 * with the other cross-cutting helpers.
 */

export function findClosestName(
  query: string,
  candidates: readonly string[],
  threshold = 3,
): string | null {
  if (candidates.length === 0) return null;
  const q = query.trim().toLowerCase();
  if (q.length === 0) return null;

  let best: { name: string; distance: number } | null = null;
  for (const candidate of candidates) {
    const c = candidate.trim().toLowerCase();
    if (c === q) return candidate;
    const distance = levenshtein(q, c);
    if (best === null || distance < best.distance) {
      best = { name: candidate, distance };
    }
  }
  if (best === null) return null;
  // Cap by absolute threshold AND a relative one — for short names like "BCA"
  // distance ≥ 3 already swaps every character, which isn't a real suggestion.
  const relativeBound = Math.max(1, Math.floor(q.length / 2));
  if (best.distance > Math.min(threshold, relativeBound)) return null;
  return best.name;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Two-row rolling buffer; same algorithm as the textbook DP.
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length] as number;
}
