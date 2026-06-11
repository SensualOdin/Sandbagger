import { scoreNassau } from '../formats/nassau';
import { mkRound, scoresFrom } from '../testkit';
import type { Scores } from '../types';

// Hole winners: A wins H0,H1; H2-8 halved; B wins H9,H10; A wins H11; H12-17 halved.
// Legs: front +2 (A), back -1 (B), total +1 (A).
const A_WINS = { A: 4, B: 5 };
const B_WINS = { A: 5, B: 4 };
const HALVED = { A: 4, B: 4 };
const scores: Scores = scoresFrom(
  Object.fromEntries(
    Array.from({ length: 18 }, (_, h) => {
      if (h <= 1 || h === 11) return [h, A_WINS];
      if (h === 9 || h === 10) return [h, B_WINS];
      return [h, HALVED];
    })
  )
);

const nassauRound = (autoPress: boolean, presses: { leg: 'front' | 'back'; startHole: number }[] = []) =>
  mkRound({
    format: 'nassau',
    config: { nassau: { perLeg: 10, autoPress, pressTrigger: 2 } },
    scores,
    presses,
  });

describe('scoreNassau', () => {
  it('scores the three base legs without presses', () => {
    const { net, detail } = scoreNassau(nassauRound(false), scores);
    expect(detail.legs).toEqual({ front: 2, back: -1, total: 1 });
    expect(net).toEqual({ A: 10, B: -10 }); // +10 front, -10 back, +10 total
  });

  it('opens one auto-press per leg when trigger is reached', () => {
    const { net, detail } = scoreNassau(nassauRound(true), scores);
    // Front press from H2 (margin hit +2 at H1): halved rest => $0.
    // Back press from H11 (margin hit -2 at H10): A wins H11 => +10.
    expect(net).toEqual({ A: 20, B: -20 });
    const log = detail.pressLog as { leg: string; startHole: number; result: number; source: string }[];
    expect(log).toEqual([
      { leg: 'front', startHole: 2, result: 0, source: 'auto' },
      { leg: 'back', startHole: 11, result: 1, source: 'auto' },
    ]);
  });

  it('scores manual presses from their start hole to leg end', () => {
    const { net } = scoreNassau(nassauRound(false, [{ leg: 'back', startHole: 11 }]), scores);
    expect(net).toEqual({ A: 20, B: -20 });
  });

  it('ignores a trigger reached on the last hole of a leg', () => {
    // A wins only H8 and H17 (margin first reaches 1 on each leg's final hole, trigger 1)
    const lateScores: Scores = scoresFrom(
      Object.fromEntries(
        Array.from({ length: 18 }, (_, h) => [h, h === 8 || h === 17 ? A_WINS : HALVED])
      )
    );
    const round = mkRound({
      format: 'nassau',
      config: { nassau: { perLeg: 10, autoPress: true, pressTrigger: 1 } },
      scores: lateScores,
    });
    const { detail } = scoreNassau(round, lateScores);
    expect(detail.pressLog).toEqual([]);
  });
});
