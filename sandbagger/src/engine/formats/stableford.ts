import type { FormatNets, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

/** Classic: albatross 5, eagle 4, birdie 3, par 2, bogey 1, worse 0. */
const classicPoints = (diff: number): number =>
  diff <= -3 ? 5 : diff === -2 ? 4 : diff === -1 ? 3 : diff === 0 ? 2 : diff === 1 ? 1 : 0;

/** Modified (PGA): albatross 8, eagle 5, birdie 2, par 0, bogey -1, worse -3. */
const modifiedPoints = (diff: number): number =>
  diff <= -3 ? 8 : diff === -2 ? 5 : diff === -1 ? 2 : diff === 0 ? 0 : diff === 1 ? -1 : -3;

/** Stableford for money: every pair settles the points difference. */
export function scoreStableford(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue, modified } = round.config.stableford!;
  const table = modified ? modifiedPoints : classicPoints;
  const pts = zeroNet(ids);
  let holesCounted = 0;

  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    holesCounted++;
    const par = round.holes[h].par;
    ids.forEach((id) => (pts[id] += table(scores[h][id] - par)));
  }

  const net = zeroNet(ids);
  for (const a of ids) {
    for (const b of ids) {
      if (a !== b) net[a] += pointValue * (pts[a] - pts[b]);
    }
  }
  return { net, detail: { pts, holesCounted } };
}
