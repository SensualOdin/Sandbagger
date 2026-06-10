import type { FormatNets, ID, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

/**
 * Wolf team vs the field. Stake per opponent is `mult` (1 for partner holes,
 * loneMult/blindMult for solo holes). The wolf team splits the total swing
 * equally, so the math stays zero-sum for 3-5 players and unequal teams.
 */
export function scoreWolf(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue, loneMult, blindMult } = round.config.wolf!;
  const pts = zeroNet(ids);
  const holeLog: Record<string, unknown>[] = [];

  for (let h = 0; h < round.numHoles; h++) {
    const wolfId = ids[h % ids.length];
    const d = round.wolf[h];
    if (!d || !holeEntered(scores, h, ids) || (d.mode === 'partner' && !d.partnerId)) {
      holeLog.push({ hole: h, wolfId, resolved: false });
      continue;
    }
    const sc = (id: ID) => scores[h][id];
    const wolfTeam = d.mode === 'partner' ? [wolfId, d.partnerId!] : [wolfId];
    const mult = d.mode === 'partner' ? 1 : d.mode === 'blind' ? blindMult : loneMult;
    const opps = ids.filter((id) => !wolfTeam.includes(id));
    const bestW = Math.min(...wolfTeam.map(sc));
    const bestO = Math.min(...opps.map(sc));
    if (bestW !== bestO) {
      const wolfWins = bestW < bestO;
      const swing = mult * opps.length;
      wolfTeam.forEach((id) => (pts[id] += (wolfWins ? swing : -swing) / wolfTeam.length));
      opps.forEach((id) => (pts[id] += wolfWins ? -mult : mult));
    }
    holeLog.push({ hole: h, wolfId, mode: d.mode, resolved: true });
  }

  const net = zeroNet(ids);
  ids.forEach((id) => (net[id] = pts[id] * pointValue));
  return { net, detail: { pts, holeLog } };
}
