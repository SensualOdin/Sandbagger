import type { FormatNets, JunkType, Round, Scores } from '../types';
import { playerIds, zeroNet } from '../util';

const BBB_TYPES: JunkType[] = ['bingo', 'bango', 'bongo'];

/**
 * Bingo-Bango-Bongo is event-based: first on the green, closest once all on,
 * first in the hole. Events are recorded alongside junk; each point is paid
 * by every other player.
 */
export function scoreBBB(round: Round, _scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue } = round.config.bingoBangoBongo!;
  const pts = zeroNet(ids);
  for (const e of round.junk.events) {
    if (BBB_TYPES.includes(e.type)) pts[e.playerId] += 1;
  }
  const total = ids.reduce((a, id) => a + pts[id], 0);
  const net = zeroNet(ids);
  ids.forEach((id) => (net[id] = pointValue * (pts[id] * ids.length - total)));
  return { net, detail: { pts } };
}
