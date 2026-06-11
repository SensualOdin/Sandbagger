import { computeResults, FORMAT_FNS } from '../index';
import { mkRound, scoresFrom } from '../testkit';
import type { FormatKey } from '../types';

const ALL_FORMATS: FormatKey[] = [
  'skins', 'nassau', 'wolf', 'vegas', 'bingoBangoBongo', 'matchplay', 'strokeplay', 'sixpoint',
];

describe('FORMAT_FNS', () => {
  it('implements every declared format key', () => {
    for (const key of ALL_FORMATS) expect(typeof FORMAT_FNS[key]).toBe('function');
  });
});

describe('computeResults', () => {
  it('combines format and junk nets and settles the total', () => {
    const scores = scoresFrom({ 0: { A: 4, B: 5 } });
    const round = mkRound({
      format: 'skins',
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      scores,
      junk: {
        config: { enabled: ['greenie'], values: { greenie: 2 } },
        events: [{ hole: 0, type: 'greenie', playerId: 'B' }],
      },
    });
    const result = computeResults(round);
    const a = result.perPlayer.find((p) => p.playerId === 'A')!;
    const b = result.perPlayer.find((p) => p.playerId === 'B')!;
    expect(a).toMatchObject({ formatNet: 5, junkNet: -2, total: 3 });
    expect(b).toMatchObject({ formatNet: -5, junkNet: 2, total: -3 });
    expect(result.transactions).toEqual([{ from: 'B', to: 'A', amount: 3 }]);
  });

  it('applies net scoring before format math', () => {
    // B has handicap 18: a stroke on every hole. Gross tie -> B net-wins every hole.
    const scores = scoresFrom({ 0: { A: 4, B: 4 } });
    const round = mkRound({
      format: 'skins',
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      useNetScoring: true,
      players: [
        { id: 'A', name: 'Al', handicapIndex: 0 },
        { id: 'B', name: 'Bo', handicapIndex: 18 },
      ],
      scores,
    });
    const result = computeResults(round);
    expect(result.perPlayer.find((p) => p.playerId === 'B')!.total).toBe(5);
  });
});
