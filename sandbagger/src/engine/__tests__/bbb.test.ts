import { scoreBBB } from '../formats/bbb';
import { expectZeroSum, mkRound } from '../testkit';

const three = [
  { id: 'A', name: 'Al' },
  { id: 'B', name: 'Bo' },
  { id: 'C', name: 'Cy' },
];

describe('scoreBBB', () => {
  it('pays each point from every other player', () => {
    const round = mkRound({
      formats: ['bingoBangoBongo'],
      config: { bingoBangoBongo: { pointValue: 2 } },
      players: three,
      junk: {
        config: { enabled: [], values: {} },
        events: [
          { hole: 0, type: 'bingo', playerId: 'A' },
          { hole: 0, type: 'bango', playerId: 'A' },
          { hole: 0, type: 'bongo', playerId: 'B' },
        ],
      },
    });
    const { net, detail } = scoreBBB(round, round.scores);
    expect(detail.pts).toEqual({ A: 2, B: 1, C: 0 });
    expect(net).toEqual({ A: 6, B: 0, C: -6 });
    expectZeroSum(net);
  });

  it('ignores non-BBB junk events', () => {
    const round = mkRound({
      formats: ['bingoBangoBongo'],
      config: { bingoBangoBongo: { pointValue: 2 } },
      players: three,
      junk: {
        config: { enabled: [], values: {} },
        events: [{ hole: 0, type: 'greenie', playerId: 'A' }],
      },
    });
    const { net } = scoreBBB(round, round.scores);
    expect(net).toEqual({ A: 0, B: 0, C: 0 });
  });
});
