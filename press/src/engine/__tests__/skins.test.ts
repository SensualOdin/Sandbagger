import { scoreSkins } from '../formats/skins';
import { expectZeroSum, mkRound, scoresFrom } from '../testkit';
import type { Round } from '../types';

const players = [
  { id: 'A', name: 'Al' },
  { id: 'B', name: 'Bo' },
  { id: 'C', name: 'Cy' },
];

// H0: A wins. H1: A/B tie (carry). H2: B wins.
const scores = scoresFrom({
  0: { A: 4, B: 5, C: 5 },
  1: { A: 4, B: 4, C: 5 },
  2: { A: 4, B: 3, C: 4 },
});

const skinsRound = (over: Partial<Round>, value = 5, carryover = true, valueMode: 'perPlayer' | 'totalPot' = 'perPlayer') =>
  mkRound({
    format: 'skins',
    config: { skins: { value, carryover, valueMode } },
    numHoles: 9,
    players,
    scores,
    ...over,
  });

describe('scoreSkins', () => {
  it('carries tied holes when carryover is on', () => {
    const { net, detail } = scoreSkins(skinsRound({}), scores);
    expect(detail.skinsWon).toEqual({ A: 1, B: 2, C: 0 });
    expect(net).toEqual({ A: 0, B: 15, C: -15 });
    expectZeroSum(net);
  });

  it('does not carry when carryover is off', () => {
    const { net } = scoreSkins(skinsRound({}, 5, false), scores);
    expect(net).toEqual({ A: 5, B: 5, C: -10 });
    expectZeroSum(net);
  });

  it('totalPot mode: a skin is worth its value in total', () => {
    const oneHole = scoresFrom({ 0: { A: 4, B: 5, C: 5 } });
    const { net } = scoreSkins(skinsRound({ scores: oneHole }, 6, true, 'totalPot'), oneHole);
    expect(net.A).toBeCloseTo(6);
    expect(net.B).toBeCloseTo(-3);
    expect(net.C).toBeCloseTo(-3);
    expectZeroSum(net);
  });

  it('skips unentered holes without breaking carry', () => {
    const gappy = scoresFrom({ 0: { A: 4, B: 4, C: 5 }, 4: { A: 3, B: 4, C: 4 } });
    const { net, detail } = scoreSkins(skinsRound({ scores: gappy }), gappy);
    expect(detail.skinsWon).toEqual({ A: 2, B: 0, C: 0 }); // tie carried over the gap
    expectZeroSum(net);
    expect(Object.values(net).every(Number.isFinite)).toBe(true);
  });
});
