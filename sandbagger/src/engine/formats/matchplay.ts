import type { FormatNets, Round, Scores } from '../types';
import { neg, playerIds } from '../util';

/** Heads-up match play: flat match value to whoever finishes holes-up. */
export function scoreMatchplay(round: Round, scores: Scores): FormatNets {
  const [a, b] = playerIds(round);
  const { matchValue } = round.config.matchplay!;
  let diff = 0;
  for (let h = 0; h < round.numHoles; h++) {
    const sa = scores[h]?.[a];
    const sb = scores[h]?.[b];
    if (sa != null && sb != null) diff += sa < sb ? 1 : sb < sa ? -1 : 0;
  }
  const netA = Math.sign(diff) * matchValue;
  return { net: { [a]: netA, [b]: neg(netA) }, detail: { holesUp: diff } };
}
