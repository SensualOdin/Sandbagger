import type { FormatConfig, FormatKey, HoleInfo, Round, Scores } from './types';

export const mkHoles = (n: number, par = 4): HoleInfo[] =>
  Array.from({ length: n }, (_, i) => ({ par, strokeIndex: i + 1 }));

export function mkRound(
  over: Partial<Round> & { format: FormatKey; config: FormatConfig }
): Round {
  const numHoles = over.numHoles ?? 18;
  return {
    id: 'r1',
    createdAt: '2026-06-10T00:00:00Z',
    numHoles,
    holes: mkHoles(numHoles),
    players: [
      { id: 'A', name: 'Al' },
      { id: 'B', name: 'Bo' },
    ],
    useNetScoring: false,
    scores: {},
    wolf: {},
    presses: [],
    junk: { config: { enabled: [], values: {} }, events: [] },
    status: 'active',
    ...over,
  };
}

/** Convenience: rows[hole] = { A: 4, B: 5 } */
export const scoresFrom = (rows: Record<number, Record<string, number>>): Scores => rows;

export const expectZeroSum = (net: Record<string, number>) => {
  const sum = Object.values(net).reduce((a, b) => a + b, 0);
  expect(Math.abs(sum)).toBeLessThan(1e-9);
};
