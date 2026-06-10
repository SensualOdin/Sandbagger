import type { ID, Round } from './types';
import { playerIds, zeroNet } from './util';

/**
 * Junk/dots layer: each enabled event pays its value to the holder from every
 * other player. Snake is the penalty dot — the committer pays everyone.
 * Runs on top of any format; disabled types are ignored, which also keeps
 * Bingo-Bango-Bongo format events out of the junk pool.
 */
export function scoreJunk(round: Round): Record<ID, number> {
  const ids = playerIds(round);
  const net = zeroNet(ids);
  const { enabled, values } = round.junk.config;
  for (const e of round.junk.events) {
    if (!enabled.includes(e.type)) continue;
    const v = values[e.type] ?? 0;
    const amt = e.type === 'snake' ? -v : v;
    for (const id of ids) {
      if (id === e.playerId) net[id] += amt * (ids.length - 1);
      else net[id] -= amt;
    }
  }
  return net;
}
