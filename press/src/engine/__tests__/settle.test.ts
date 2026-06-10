import { settle } from '../settle';

describe('settle', () => {
  it('produces minimal transactions for a simple split', () => {
    expect(settle({ A: 15, B: -10, C: -5 })).toEqual([
      { from: 'B', to: 'A', amount: 10 },
      { from: 'C', to: 'A', amount: 5 },
    ]);
  });

  it('returns nothing when everyone is even', () => {
    expect(settle({ A: 0, B: 0 })).toEqual([]);
  });

  it('conserves money and rounds to cents', () => {
    const net = { A: 10 / 3, B: 10 / 3, C: -20 / 3 };
    const tx = settle(net);
    const paid = tx.reduce((a, t) => a + t.amount, 0);
    expect(paid).toBeCloseTo(20 / 3, 1);
    tx.forEach((t) => expect(t.amount).toBe(Math.round(t.amount * 100) / 100));
  });

  it('never needs more than n-1 transactions', () => {
    const net = { A: 7, B: 3, C: -4, D: -6 };
    expect(settle(net).length).toBeLessThanOrEqual(3);
  });
});
