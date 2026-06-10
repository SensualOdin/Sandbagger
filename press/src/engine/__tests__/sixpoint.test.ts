import { scoreSixpoint } from '../formats/sixpoint';
import { expectZeroSum, mkRound, scoresFrom } from '../testkit';

const three = [
  { id: 'A', name: 'Al' },
  { id: 'B', name: 'Bo' },
  { id: 'C', name: 'Cy' },
];

describe('scoreSixpoint', () => {
  it('splits 6 points per hole across all tie patterns', () => {
    const scores = scoresFrom({
      0: { A: 3, B: 4, C: 5 }, // outright: 4-2-0
      1: { A: 4, B: 4, C: 5 }, // two tie low: 3-3-0
      2: { A: 5, B: 4, C: 4 }, // B,C tie low: B3 C3 A0
      3: { A: 4, B: 5, C: 5 }, // two tie high: 4-1-1
      4: { A: 4, B: 4, C: 4 }, // all tie: 2-2-2
    });
    const round = mkRound({
      format: 'sixpoint',
      config: { sixpoint: { pointValue: 1 } },
      players: three,
      scores,
    });
    const { net, detail } = scoreSixpoint(round, scores);
    expect(detail.pts).toEqual({ A: 13, B: 11, C: 6 });
    expect(net).toEqual({ A: 3, B: 1, C: -4 }); // pts minus 2 per hole played
    expectZeroSum(net);
  });

  it('skips unentered holes', () => {
    const scores = scoresFrom({ 0: { A: 3, B: 4 } }); // C missing
    const round = mkRound({
      format: 'sixpoint',
      config: { sixpoint: { pointValue: 1 } },
      players: three,
      scores,
    });
    const { detail } = scoreSixpoint(round, scores);
    expect(detail.holesCounted).toBe(0);
  });
});
