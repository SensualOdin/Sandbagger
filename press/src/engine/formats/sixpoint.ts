import type { FormatNets, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

/**
 * Six-Point game (3 players, 6 points per hole):
 * outright 4-2-0, two tie low 3-3-0, two tie high 4-1-1, all tie 2-2-2.
 * Dollars are points above/below the 2-per-hole expectation.
 */
export function scoreSixpoint(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue } = round.config.sixpoint!;
  const pts = zeroNet(ids);
  let holesCounted = 0;

  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    holesCounted++;
    const sorted = [...ids].sort((x, y) => scores[h][x] - scores[h][y]);
    const [s0, s1, s2] = sorted.map((id) => scores[h][id]);
    if (s0 === s1 && s1 === s2) {
      sorted.forEach((id) => (pts[id] += 2));
    } else if (s0 === s1) {
      pts[sorted[0]] += 3;
      pts[sorted[1]] += 3;
    } else if (s1 === s2) {
      pts[sorted[0]] += 4;
      pts[sorted[1]] += 1;
      pts[sorted[2]] += 1;
    } else {
      pts[sorted[0]] += 4;
      pts[sorted[1]] += 2;
    }
  }

  const net = zeroNet(ids);
  ids.forEach((id) => (net[id] = pointValue * (pts[id] - 2 * holesCounted)));
  return { net, detail: { pts, holesCounted } };
}
