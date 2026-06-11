import type { FormatNets, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

/**
 * Stroke play for money: every pair settles the difference in total strokes
 * at `perStroke`. Only holes everyone has entered count, so partial rounds
 * stay fair.
 */
export function scoreStrokeplay(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { perStroke } = round.config.strokeplay!;
  const totals = zeroNet(ids);
  let holesCounted = 0;
  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    holesCounted++;
    ids.forEach((id) => (totals[id] += scores[h][id]));
  }
  const net = zeroNet(ids);
  for (const a of ids) {
    for (const b of ids) {
      if (a !== b) net[a] += perStroke * (totals[b] - totals[a]);
    }
  }
  return { net, detail: { totals, holesCounted } };
}
