import type { ID, Transaction } from './types';

const EPSILON = 0.001;

/** Greedy minimal settlement: largest debtor pays largest creditor until clear. */
export function settle(net: Record<ID, number>): Transaction[] {
  const creditors = Object.entries(net)
    .filter(([, v]) => v > EPSILON)
    .map(([id, v]) => ({ id, v }))
    .sort((a, b) => b.v - a.v);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -EPSILON)
    .map(([id, v]) => ({ id, v: -v }))
    .sort((a, b) => b.v - a.v);

  const tx: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v);
    tx.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(pay * 100) / 100 });
    debtors[i].v -= pay;
    creditors[j].v -= pay;
    if (debtors[i].v < EPSILON) i++;
    if (creditors[j].v < EPSILON) j++;
  }
  return tx;
}
