import { scoreJunk } from '../junk';
import { expectZeroSum, mkRound } from '../testkit';

const three = [
  { id: 'A', name: 'Al' },
  { id: 'B', name: 'Bo' },
  { id: 'C', name: 'Cy' },
];

describe('scoreJunk', () => {
  it('pays dots from every other player', () => {
    const round = mkRound({
      format: 'skins',
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      players: three,
      junk: {
        config: { enabled: ['greenie'], values: { greenie: 1 } },
        events: [{ hole: 0, type: 'greenie', playerId: 'A' }],
      },
    });
    const net = scoreJunk(round);
    expect(net).toEqual({ A: 2, B: -1, C: -1 });
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

describe('snake (hot potato)', () => {
  const snakeRound = (events: { hole: number; playerId: string }[], scores: Record<number, Record<string, number>>) =>
    mkRound({
      format: 'skins',
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      players: three,
      scores,
      junk: {
        config: { enabled: ['snake'], values: { snake: 2 } },
        events: events.map((e) => ({ ...e, type: 'snake' as const })),
      },
    });

  // every entered hole adds the snake value to the pot
  const twoHoles = { 0: { A: 4, B: 4, C: 4 }, 3: { A: 4, B: 4, C: 4 } };

  it('last 3-putt holds the snake and pays the pot, split by the others', () => {
    const round = snakeRound(
      [
        { hole: 0, playerId: 'B' },
        { hole: 3, playerId: 'A' }, // A takes it from B
      ],
      twoHoles
    );
    const net = scoreJunk(round);
    expect(net).toEqual({ A: -4, B: 2, C: 2 }); // pot = $2 x 2 holes
    expectZeroSum(net);
  });

  it('costs nothing when nobody ever 3-putts', () => {
    const round = snakeRound([], twoHoles);
    expect(scoreJunk(round)).toEqual({ A: 0, B: 0, C: 0 });
  });

  it('grows the pot with every entered hole, not every event', () => {
    const fourHoles = {
      0: { A: 4, B: 4, C: 4 },
      1: { A: 4, B: 4, C: 4 },
      2: { A: 4, B: 4, C: 4 },
      5: { A: 4, B: 4, C: 4 },
    };
    const round = snakeRound([{ hole: 1, playerId: 'C' }], fourHoles);
    const net = scoreJunk(round);
    expect(net).toEqual({ A: 4, B: 4, C: -8 }); // pot = $2 x 4 holes
    expectZeroSum(net);
  });
});
