import type { FormatNets, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

/**
 * Combine two scores into the Vegas team number: low digit first (4,5 -> 45).
 * A 10+ score always leads (10,4 -> 104). `flip` reverses to high-first
 * (the "flip the bird" penalty when the opponents make a birdie).
 */
export function teamNumber(x: number, y: number, flip: boolean): number {
  const [lo, hi] = x <= y ? [x, y] : [y, x];
  if (hi >= 10) return hi * (lo >= 10 ? 100 : 10) + lo;
  return flip ? hi * 10 + lo : lo * 10 + hi;
}

export function scoreVegas(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue, flipBirds, teams } = round.config.vegas!;
  const [t1, t2] = teams;
  let points = 0;
  const holeLog: { hole: number; n1: number; n2: number }[] = [];

  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    const par = round.holes[h].par;
    const s1 = t1.map((id) => scores[h][id]);
    const s2 = t2.map((id) => scores[h][id]);
    const bird1 = flipBirds && s1.some((s) => s < par);
    const bird2 = flipBirds && s2.some((s) => s < par);
    const n1 = teamNumber(s1[0], s1[1], bird2 && !bird1);
    const n2 = teamNumber(s2[0], s2[1], bird1 && !bird2);
    points += n2 - n1; // low number wins the difference
    holeLog.push({ hole: h, n1, n2 });
  }

  const net = zeroNet(ids);
  t1.forEach((id) => (net[id] = points * pointValue));
  t2.forEach((id) => (net[id] = -points * pointValue));
  return { net, detail: { points, holeLog } };
}
