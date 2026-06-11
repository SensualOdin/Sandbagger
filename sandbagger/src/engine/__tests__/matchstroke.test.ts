import { scoreMatchplay } from '../formats/matchplay';
import { scoreStrokeplay } from '../formats/strokeplay';
import { expectZeroSum, mkRound, scoresFrom } from '../testkit';

describe('scoreMatchplay', () => {
  it('pays the flat match value to the holes-up winner', () => {
    // A wins 3, B wins 1, rest halved
    const scores = scoresFrom({
      0: { A: 3, B: 4 },
      1: { A: 3, B: 4 },
      2: { A: 3, B: 4 },
      3: { A: 5, B: 4 },
      4: { A: 4, B: 4 },
    });
    const round = mkRound({ formats: ['matchplay'], config: { matchplay: { matchValue: 20 } }, scores });
    const { net, detail } = scoreMatchplay(round, scores);
    expect(detail.holesUp).toBe(2);
    expect(net).toEqual({ A: 20, B: -20 });
    expectZeroSum(net);
  });

  it('pays nothing when all square', () => {
    const scores = scoresFrom({ 0: { A: 3, B: 4 }, 1: { A: 4, B: 3 } });
    const round = mkRound({ formats: ['matchplay'], config: { matchplay: { matchValue: 20 } }, scores });
    expect(scoreMatchplay(round, scores).net).toEqual({ A: 0, B: 0 });
  });
});

describe('scoreStrokeplay', () => {
  const three = [
    { id: 'A', name: 'Al' },
    { id: 'B', name: 'Bo' },
    { id: 'C', name: 'Cy' },
  ];

  it('pays pairwise stroke differences', () => {
    const scores = scoresFrom({
      0: { A: 4, B: 5, C: 5 },
      1: { A: 4, B: 4, C: 5 },
    });
    const round = mkRound({
      formats: ['strokeplay'],
      config: { strokeplay: { perStroke: 1 } },
      players: three,
      scores,
    });
    const { net, detail } = scoreStrokeplay(round, scores);
    expect(detail.totals).toEqual({ A: 8, B: 9, C: 10 });
    expect(net).toEqual({ A: 3, B: 0, C: -3 });
    expectZeroSum(net);
  });

  it('only counts holes everyone entered', () => {
    const scores = scoresFrom({
      0: { A: 4, B: 5, C: 5 },
      1: { A: 1, B: 9 }, // C missing: excluded for all
    });
    const round = mkRound({
      formats: ['strokeplay'],
      config: { strokeplay: { perStroke: 1 } },
      players: three,
      scores,
    });
    const { detail } = scoreStrokeplay(round, scores);
    expect(detail.holesCounted).toBe(1);
    expect(detail.totals).toEqual({ A: 4, B: 5, C: 5 });
  });
});
