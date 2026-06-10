import { scoreJunk } from '../junk';
import { expectZeroSum, mkRound } from '../testkit';

const three = [
  { id: 'A', name: 'Al' },
  { id: 'B', name: 'Bo' },
  { id: 'C', name: 'Cy' },
];

describe('scoreJunk', () => {
  it('pays dots from every other player; snake is negative', () => {
    const round = mkRound({
      format: 'skins',
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      players: three,
      junk: {
        config: { enabled: ['greenie', 'snake'], values: { greenie: 1, snake: 2 } },
        events: [
          { hole: 0, type: 'greenie', playerId: 'A' },
          { hole: 3, type: 'snake', playerId: 'B' },
        ],
      },
    });
    const net = scoreJunk(round);
    expect(net).toEqual({ A: 4, B: -5, C: 1 });
    expectZeroSum(net);
  });

  it('ignores events whose type is not enabled', () => {
    const round = mkRound({
      format: 'skins',
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      players: three,
      junk: {
        config: { enabled: ['greenie'], values: { greenie: 1 } },
        events: [{ hole: 0, type: 'birdie', playerId: 'A' }],
      },
    });
    expect(scoreJunk(round)).toEqual({ A: 0, B: 0, C: 0 });
  });
});
