import type { HoleInfo, Round, Scores } from './types';

/** Strokes a player receives per hole, allocated by stroke index (wraps past 18). */
export function strokesReceived(handicapIndex: number, holes: HoleInfo[]): number[] {
  const course = Math.round(handicapIndex);
  return holes.map((h) => {
    let s = 0;
    if (course >= h.strokeIndex) s += 1;
    if (course >= h.strokeIndex + 18) s += 1;
    return s;
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
