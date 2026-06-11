import { netScores } from './handicap';
import type { ID, JunkEvent, Round } from './types';
import { holeEntered, playerIds, zeroNet } from './util';

/**
 * Junk/dots layer: each enabled event pays its value to the holder from every
 * other player. Runs on top of any game; disabled types are ignored, which
 * also keeps Bingo-Bango-Bongo format events out of the junk pool.
 *
 * Two animals are special, both hot potatoes:
 * - Snake: a snake event marks who 3-putted last. The holder at the end PAYS
 *   the pot, split by the others. The pot grows by the snake value every hole
 *   played — or stays a flat bet when snakeMode is 'flat'.
 * - Rabbit: derived from scores — win a hole outright to take it. The holder
 *   at the end COLLECTS the pot (value x holes played), paid by the others.
 *
 * Greenie carryover: when enabled, every par 3 played without a greenie rolls
 * one more unit of value onto the next greenie awarded.
 */
export function scoreJunk(round: Round): Record<ID, number> {
  const ids = playerIds(round);
  const net = zeroNet(ids);
  const { enabled, values, greenieCarryover } = round.junk.config;

  const greenieValue = greenieMultipliers(round);
  for (const e of round.junk.events) {
    if (e.type === 'snake' || !enabled.includes(e.type)) continue;
    let v = values[e.type] ?? 0;
    if (e.type === 'greenie' && greenieCarryover) v *= greenieValue.get(e) ?? 1;
    for (const id of ids) {
      if (id === e.playerId) net[id] += v * (ids.length - 1);
      else net[id] -= v;
    }
  }

  const holesPlayed = countEnteredHoles(round);

  if (enabled.includes('snake')) {
    const holder = snakeHolder(round.junk.events);
    if (holder) {
      const flat = round.junk.config.snakeMode === 'flat';
      const pot = (values.snake ?? 0) * (flat ? 1 : holesPlayed);
      for (const id of ids) {
        if (id === holder) net[id] -= pot;
        else net[id] += pot / (ids.length - 1);
      }
    }
  }

  if (enabled.includes('rabbit')) {
    const holder = rabbitHolder(round);
    if (holder) {
      const pot = (values.rabbit ?? 0) * holesPlayed;
      for (const id of ids) {
        if (id === holder) net[id] += pot;
        else net[id] -= pot / (ids.length - 1);
      }
    }
  }

  return net;
}

function countEnteredHoles(round: Round): number {
  const ids = playerIds(round);
  let n = 0;
  for (let h = 0; h < round.numHoles; h++) {
    if (holeEntered(round.scores, h, ids)) n++;
  }
  return n;
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

/**
 * Who won a hole outright last — straight from the card, no taps needed.
 * Uses net scores when the round does, so the rabbit agrees with the games.
 */
export function rabbitHolder(round: Round): ID | null {
  const ids = playerIds(round);
  const scores = netScores(round);
  let holder: ID | null = null;
  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    const min = Math.min(...ids.map((id) => scores[h][id]));
    const winners = ids.filter((id) => scores[h][id] === min);
    if (winners.length === 1) holder = winners[0];
  }
  return holder;
}

/**
 * Carryover multiplier per greenie event: par 3s played without a greenie
 * stack +1 onto the next one awarded.
 */
function greenieMultipliers(round: Round): Map<JunkEvent, number> {
  const ids = playerIds(round);
  const out = new Map<JunkEvent, number>();
  let carry = 0;
  for (let h = 0; h < round.numHoles; h++) {
    if (round.holes[h].par !== 3 || !holeEntered(round.scores, h, ids)) continue;
    const here = round.junk.events.filter((e) => e.type === 'greenie' && e.hole === h);
    if (here.length === 0) {
      carry += 1;
    } else {
      here.forEach((e, i) => out.set(e, i === 0 ? 1 + carry : 1));
      carry = 0;
    }
  }
  return out;
}
