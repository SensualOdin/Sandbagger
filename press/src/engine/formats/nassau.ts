import type { FormatNets, ID, NassauLeg, Round, Scores } from '../types';
import { playerIds } from '../util';

const LEGS: Record<NassauLeg | 'total', { start: number; end: number }> = {
  front: { start: 0, end: 9 },
  back: { start: 9, end: 18 },
  total: { start: 0, end: 18 },
};

/** Running hole-win margin from A's perspective over [start, end). */
function margin(scores: Scores, a: ID, b: ID, start: number, end: number) {
  let diff = 0;
  const running: number[] = [];
  for (let h = start; h < end; h++) {
    const sa = scores[h]?.[a];
    const sb = scores[h]?.[b];
    if (sa != null && sb != null) diff += sa < sb ? 1 : sb < sa ? -1 : 0;
    running.push(diff);
  }
  return { final: diff, running };
}

export function scoreNassau(round: Round, scores: Scores): FormatNets {
  const [a, b] = playerIds(round);
  const { perLeg, autoPress, pressTrigger } = round.config.nassau!;
  let netA = 0;
  const legs: Record<string, number> = {};
  const pressLog: { leg: NassauLeg; startHole: number; result: number; source: 'auto' | 'manual' }[] = [];

  for (const legName of ['front', 'back', 'total'] as const) {
    const { start, end } = LEGS[legName];
    if (end > round.numHoles) continue;
    const base = margin(scores, a, b, start, end);
    netA += Math.sign(base.final) * perLeg;
    legs[legName] = base.final;

    // Presses live on the nines, never the total bet. One auto-press per leg,
    // opening the hole after the base margin first reaches the trigger.
    if (autoPress && legName !== 'total') {
      for (let i = 0; i < base.running.length - 1; i++) {
        if (Math.abs(base.running[i]) >= pressTrigger) {
          const startHole = start + i + 1;
          const press = margin(scores, a, b, startHole, end);
          netA += Math.sign(press.final) * perLeg;
          pressLog.push({ leg: legName, startHole, result: press.final, source: 'auto' });
          break;
        }
      }
    }
  }

  for (const mp of round.presses) {
    const { end } = LEGS[mp.leg];
    if (end > round.numHoles || mp.startHole >= end) continue;
    const press = margin(scores, a, b, mp.startHole, end);
    netA += Math.sign(press.final) * perLeg;
    pressLog.push({ leg: mp.leg, startHole: mp.startHole, result: press.final, source: 'manual' });
  }

  return { net: { [a]: netA, [b]: -netA }, detail: { legs, pressLog } };
}
