import type { FormatNets, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

/**
 * Acey Deucey: on each hole the outright low (the ace) collects from every
 * other player, and the outright high (the deuce) pays every other player.
 * Ties for low kill the ace; ties for high kill the deuce.
 */
export function scoreAceyDeucey(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { aceValue, deuceValue } = round.config.aceyDeucey!;
  const net = zeroNet(ids);
  const aces = zeroNet(ids);
  const deuces = zeroNet(ids);

  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    const vals = ids.map((id) => scores[h][id]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) continue; // everyone tied: no blood
    const lows = ids.filter((id) => scores[h][id] === min);
    const highs = ids.filter((id) => scores[h][id] === max);
    if (lows.length === 1) {
      const ace = lows[0];
      aces[ace] += 1;
      ids.forEach((id) => (net[id] += id === ace ? aceValue * (ids.length - 1) : -aceValue));
    }
    if (highs.length === 1) {
      const deuce = highs[0];
      deuces[deuce] += 1;
      ids.forEach((id) => (net[id] += id === deuce ? -deuceValue * (ids.length - 1) : deuceValue));
    }
  }

  return { net, detail: { aces, deuces } };
}
