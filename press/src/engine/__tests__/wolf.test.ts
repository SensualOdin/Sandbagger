import { scoreWolf } from '../formats/wolf';
import { expectZeroSum, mkRound, scoresFrom } from '../testkit';

const four = [
  { id: 'A', name: 'Al' },
  { id: 'B', name: 'Bo' },
  { id: 'C', name: 'Cy' },
  { id: 'D', name: 'Di' },
];

describe('scoreWolf', () => {
  it('scores partner, lone, blind, and tied holes for 4 players', () => {
    const scores = scoresFrom({
      0: { A: 3, B: 5, C: 4, D: 4 }, // wolf A + partner B win
      1: { A: 4, B: 3, C: 4, D: 5 }, // wolf B lone (x2) wins
      2: { A: 3, B: 3, C: 5, D: 3 }, // wolf C blind (x3) loses
      3: { A: 4, B: 5, C: 5, D: 4 }, // wolf D + partner A: best balls tie
    });
    const round = mkRound({
      format: 'wolf',
      config: { wolf: { pointValue: 1, loneMult: 2, blindMult: 3 } },
      players: four,
      scores,
      wolf: {
        0: { mode: 'partner', partnerId: 'B' },
        1: { mode: 'lone' },
        2: { mode: 'blind' },
        3: { mode: 'partner', partnerId: 'A' },
      },
    });
    const { net, detail } = scoreWolf(round, scores);
    expect(detail.pts).toEqual({ A: 2, B: 10, C: -12, D: 0 });
    expect(net).toEqual({ A: 2, B: 10, C: -12, D: 0 });
    expectZeroSum(net);
  });

  it('splits unequal partner teams zero-sum (3-player 2v1)', () => {
    const scores = scoresFrom({ 0: { A: 4, B: 3, C: 5 } });
    const round = mkRound({
      format: 'wolf',
      config: { wolf: { pointValue: 1, loneMult: 2, blindMult: 3 } },
      players: four.slice(0, 3),
      scores,
      wolf: { 0: { mode: 'partner', partnerId: 'B' } },
    });
    const { net } = scoreWolf(round, scores);
    expect(net).toEqual({ A: 0.5, B: 0.5, C: -1 });
    expectZeroSum(net);
  });

  it('skips holes without a decision or scores', () => {
    const scores = scoresFrom({ 0: { A: 3, B: 5, C: 4, D: 4 } });
    const round = mkRound({
      format: 'wolf',
      config: { wolf: { pointValue: 1, loneMult: 2, blindMult: 3 } },
      players: four,
      scores,
      wolf: {}, // no decisions at all
    });
    const { net } = scoreWolf(round, scores);
    expect(net).toEqual({ A: 0, B: 0, C: 0, D: 0 });
  });

  it('applies pointValue to points', () => {
    const scores = scoresFrom({ 0: { A: 3, B: 5, C: 4, D: 4 } });
    const round = mkRound({
      format: 'wolf',
      config: { wolf: { pointValue: 5, loneMult: 2, blindMult: 3 } },
      players: four,
      scores,
      wolf: { 0: { mode: 'partner', partnerId: 'B' } },
    });
    const { net } = scoreWolf(round, scores);
    expect(net).toEqual({ A: 5, B: 5, C: -5, D: -5 });
  });
});
