import type { FormatNets, ID, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

export function scoreSkins(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { value, carryover, valueMode } = round.config.skins!;
  const skinsWon = zeroNet(ids);
  let carry = 0;
  const holeLog: { hole: number; winner: ID | null; units: number }[] = [];

  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    const min = Math.min(...ids.map((id) => scores[h][id]));
    const winners = ids.filter((id) => scores[h][id] === min);
    if (winners.length === 1) {
      const units = 1 + carry;
      skinsWon[winners[0]] += units;
      holeLog.push({ hole: h, winner: winners[0], units });
      carry = 0;
    } else {
      carry = carryover ? carry + 1 : 0;
      holeLog.push({ hole: h, winner: null, units: 0 });
    }
  }

  const total = ids.reduce((a, id) => a + skinsWon[id], 0);
  const n = ids.length;
  // perPlayer: every loser pays `value` per skin. totalPot: a skin is worth `value`
  // in total, so each loser chips in value/(n-1).
  const perLoser = valueMode === 'perPlayer' ? value : value / (n - 1);
  const net = zeroNet(ids);
  ids.forEach((id) => (net[id] = perLoser * (skinsWon[id] * n - total)));
  return { net, detail: { skinsWon, carry, holeLog } };
}
