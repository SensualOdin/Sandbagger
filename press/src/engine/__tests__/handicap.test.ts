import { netScores, strokesReceived } from '../handicap';
import { mkHoles, mkRound } from '../testkit';

describe('strokesReceived', () => {
  it('gives index 5 one stroke on stroke-index 1-5 only', () => {
    const alloc = strokesReceived(5, mkHoles(18));
    expect(alloc.filter((s) => s === 1)).toHaveLength(5);
    expect(alloc[0]).toBe(1); // SI 1
    expect(alloc[4]).toBe(1); // SI 5
    expect(alloc[5]).toBe(0); // SI 6
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('gives index 20 a stroke everywhere plus a second on SI 1-2', () => {
    const alloc = strokesReceived(20, mkHoles(18));
    expect(alloc[0]).toBe(2);
    expect(alloc[1]).toBe(2);
    expect(alloc[2]).toBe(1);
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(20);
  });

  it('rounds fractional index', () => {
    const alloc = strokesReceived(5.4, mkHoles(18));
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('halves the index for 9-hole rounds', () => {
    const alloc = strokesReceived(10, mkHoles(9));
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(5);
    expect(alloc[0]).toBe(1); // SI 1
    expect(alloc[5]).toBe(0); // SI 6
  });

  it('gives plus-handicap strokes back on the easiest holes first', () => {
    const alloc = strokesReceived(-2, mkHoles(18));
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(-2);
    expect(alloc[17]).toBe(-1); // SI 18
    expect(alloc[16]).toBe(-1); // SI 17
    expect(alloc[0]).toBe(0);
  });

  it('allocates a third stroke above 36', () => {
    const alloc = strokesReceived(37, mkHoles(18));
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(37);
    expect(alloc[0]).toBe(3); // SI 1
    expect(alloc[1]).toBe(2);
  });
});

describe('netScores', () => {
  it('returns gross unchanged when net scoring is off', () => {
    const round = mkRound({
      format: 'skins',
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      scores: { 0: { A: 5, B: 4 } },
    });
    expect(netScores(round)).toBe(round.scores);
  });

  it('subtracts allocated strokes; absent holes stay absent', () => {
    const round = mkRound({
      format: 'skins',
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      useNetScoring: true,
      players: [
        { id: 'A', name: 'Al', handicapIndex: 2 },
        { id: 'B', name: 'Bo', handicapIndex: 0 },
      ],
      scores: { 0: { A: 5, B: 4 }, 5: { A: 6, B: 6 } },
    });
    const net = netScores(round);
    expect(net[0].A).toBe(4); // SI 1: A gets a stroke
    expect(net[0].B).toBe(4);
    expect(net[5].A).toBe(6); // SI 6: no stroke for index 2
    expect(net[1]).toBeUndefined();
  });
});
