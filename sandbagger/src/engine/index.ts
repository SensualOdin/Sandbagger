import { scoreAceyDeucey } from './formats/aceyDeucey';
import { scoreBBB } from './formats/bbb';
import { scoreMatchplay } from './formats/matchplay';
import { scoreNassau } from './formats/nassau';
import { scoreSixpoint } from './formats/sixpoint';
import { scoreSkins } from './formats/skins';
import { scoreStableford } from './formats/stableford';
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
  stableford: scoreStableford,
  aceyDeucey: scoreAceyDeucey,
};

/**
 * The engine's front door: every running game plus junk money, summed into
 * one net per player and settled in minimal transactions.
 */
export function computeResults(round: Round): RoundResult {
  const scores = netScores(round);
  const ids = playerIds(round);

  const details: RoundResult['details'] = {};
  const byFormatPerPlayer: Record<ID, Partial<Record<FormatKey, number>>> = Object.fromEntries(
    ids.map((id) => [id, {}])
  );
  const formatTotals: Record<ID, number> = Object.fromEntries(ids.map((id) => [id, 0]));

  for (const f of round.formats) {
    const { net, detail } = FORMAT_FNS[f](round, scores);
    details[f] = detail;
    for (const id of ids) {
      byFormatPerPlayer[id][f] = net[id] ?? 0;
      formatTotals[id] += net[id] ?? 0;
    }
  }

  const junkNet = scoreJunk(round);
  const combined: Record<ID, number> = {};
  for (const id of ids) combined[id] = formatTotals[id] + (junkNet[id] ?? 0);

  return {
    perPlayer: ids.map((id) => ({
      playerId: id,
      byFormat: byFormatPerPlayer[id],
      formatNet: formatTotals[id],
      junkNet: junkNet[id] ?? 0,
      total: combined[id],
    })),
    transactions: settle(combined),
    details,
  };
}

export * from './types';
export { netScores, strokesReceived } from './handicap';
export { rabbitHolder, scoreJunk, snakeHolder } from './junk';
export { settle } from './settle';
