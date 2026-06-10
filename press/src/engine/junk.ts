import type { ID, JunkEvent, Round } from './types';
import { holeEntered, playerIds, zeroNet } from './util';

/**
 * Junk/dots layer: each enabled event pays its value to the holder from every
 * other player. Runs on top of any format; disabled types are ignored, which
 * also keeps Bingo-Bango-Bongo format events out of the junk pool.
 *
 * Snake is special — a hot potato, not a dot. The pot grows by the snake value
 * on every hole played; a snake event marks who 3-putted last (the holder).
 * Whoever holds it when the round ends pays the pot, split by the others.
 */
export function scoreJunk(round: Round): Record<ID, number> {
  const ids = playerIds(round);
  const net = zeroNet(ids);
  const { enabled, values } = round.junk.config;

  for (const e of round.junk.events) {
    if (e.type === 'snake' || !enabled.includes(e.type)) continue;
    const v = values[e.type] ?? 0;
    for (const id of ids) {
      if (id === e.playerId) net[id] += v * (ids.length - 1);
      else net[id] -= v;
    }
  }

  if (enabled.includes('snake')) {
    const holder = snakeHolder(round.junk.events);
    if (holder) {
      const perHole = values.snake ?? 0;
      let holesPlayed = 0;
      for (let h = 0; h < round.numHoles; h++) {
        if (holeEntered(round.scores, h, ids)) holesPlayed++;
      }
      const pot = perHole * holesPlayed;
      for (const id of ids) {
        if (id === holder) net[id] -= pot;
        else net[id] += pot / (ids.length - 1);
      }
    }
  }

  return net;
}

/** Who 3-putted last — ties on the same hole go to the most recent tap. */
export function snakeHolder(events: JunkEvent[]): ID | null {
  let holder: ID | null = null;
  let holderHole = -1;
  for (const e of events) {
    if (e.type === 'snake' && e.hole >= holderHole) {
      holder = e.playerId;
      holderHole = e.hole;
    }
  }
  return holder;
}
