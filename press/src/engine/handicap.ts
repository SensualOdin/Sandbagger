import type { HoleInfo, Round, Scores } from './types';

/**
 * Strokes a player receives per hole, allocated by stroke index.
 * - Scales the 18-hole index down for 9-hole rounds.
 * - Indexes above the hole count wrap (a second stroke on the hardest holes).
 * - Plus handicaps (negative index) give strokes back, easiest holes first.
 */
export function strokesReceived(handicapIndex: number, holes: HoleInfo[]): number[] {
  const n = holes.length;
  const course = Math.round(handicapIndex * (n / 18));
  const sign = course >= 0 ? 1 : -1;
  const mag = Math.abs(course);
  const full = Math.floor(mag / n);
  const rem = mag % n;
  return holes.map((h) => {
    // receiving: hardest first (SI 1 up); giving back: easiest first (SI n down)
    const rank = sign >= 0 ? h.strokeIndex : n - h.strokeIndex + 1;
    const strokes = full + (rank <= rem ? 1 : 0);
    return strokes === 0 ? 0 : sign * strokes;
  });
}

/** Converts gross scores to net when the round uses net scoring; otherwise passes gross through. */
export function netScores(round: Round): Scores {
  if (!round.useNetScoring) return round.scores;
  const allocs = Object.fromEntries(
    round.players.map((p) => [p.id, strokesReceived(p.handicapIndex ?? 0, round.holes)])
  );
  const out: Scores = {};
  for (let h = 0; h < round.numHoles; h++) {
    if (!round.scores[h]) continue;
    out[h] = {};
    for (const p of round.players) {
      const gross = round.scores[h][p.id];
      if (gross != null) out[h][p.id] = gross - allocs[p.id][h];
    }
  }
  return out;
}
