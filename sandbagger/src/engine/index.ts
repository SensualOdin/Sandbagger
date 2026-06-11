import { scoreBBB } from './formats/bbb';
import { scoreMatchplay } from './formats/matchplay';
import { scoreNassau } from './formats/nassau';
import { scoreSixpoint } from './formats/sixpoint';
import { scoreSkins } from './formats/skins';
import { scoreStrokeplay } from './formats/strokeplay';
import { scoreVegas } from './formats/vegas';
import { scoreWolf } from './formats/wolf';
import { netScores } from './handicap';
import { scoreJunk } from './junk';
import { settle } from './settle';
import type { FormatKey, FormatNets, ID, Round, RoundResult, Scores } from './types';
import { playerIds } from './util';

export const FORMAT_FNS: Record<FormatKey, (r: Round, s: Scores) => FormatNets> = {
  skins: scoreSkins,
  nassau: scoreNassau,
  wolf: scoreWolf,
  vegas: scoreVegas,
  bingoBangoBongo: scoreBBB,
  matchplay: scoreMatchplay,
  strokeplay: scoreStrokeplay,
  sixpoint: scoreSixpoint,
};

/** The engine's front door: format money + junk money -> nets and settle-up. */
export function computeResults(round: Round): RoundResult {
  const scores = netScores(round);
  const { net: formatNet, detail } = FORMAT_FNS[round.format](round, scores);
  const junkNet = scoreJunk(round);
  const ids = playerIds(round);
  const combined: Record<ID, number> = {};
  for (const id of ids) combined[id] = (formatNet[id] ?? 0) + (junkNet[id] ?? 0);
  return {
    perPlayer: ids.map((id) => ({
      playerId: id,
      formatNet: formatNet[id] ?? 0,
      junkNet: junkNet[id] ?? 0,
      total: combined[id],
    })),
    transactions: settle(combined),
    detail,
  };
}

export * from './types';
export { netScores, strokesReceived } from './handicap';
export { scoreJunk } from './junk';
export { settle } from './settle';
