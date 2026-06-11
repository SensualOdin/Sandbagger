import type { Round, RoundResult } from '@/engine/types';
import { fmtMoney } from '@/theme';

import type { HistoryRow } from './history';

/**
 * Web build of the round archive: same API as the native SQLite module,
 * backed by localStorage. Metro picks this file automatically for web.
 */

interface StoredRound {
  id: string;
  createdAt: string;
  formats: string[];
  numHoles: number;
  playerNames: string[];
  topLine: string;
  payload: { round: Round; result: RoundResult };
}

const KEY = 'sb-history';

function read(): StoredRound[] {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredRound[]) : [];
  } catch {
    return [];
  }
}

function write(rows: StoredRound[]): void {
  globalThis.localStorage?.setItem(KEY, JSON.stringify(rows));
}

const migrate = (payload: StoredRound['payload']) => {
  const r = payload.round as Round & { format?: string };
  if (r.format && !r.formats) r.formats = [r.format as never];
  return payload;
};

export function saveRound(round: Round, result: RoundResult): void {
  const names = round.players.map((p) => p.name);
  const top = [...result.perPlayer].sort((a, b) => b.total - a.total)[0];
  const topName = round.players.find((p) => p.id === top?.playerId)?.name ?? '';
  const topLine =
    top && top.total > 0 ? `${topName} +${fmtMoney(top.total)}` : 'All square';
  const rows = read().filter((r) => r.id !== round.id);
  rows.unshift({
    id: round.id,
    createdAt: round.createdAt,
    formats: round.formats,
    numHoles: round.numHoles,
    playerNames: names,
    topLine,
    payload: { round, result },
  });
  write(rows);
}

export function listRounds(): HistoryRow[] {
  return read()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, createdAt, formats, numHoles, playerNames, topLine }) => ({
      id,
      createdAt,
      formats,
      numHoles,
      playerNames,
      topLine,
    }));
}

export function getRound(id: string): { round: Round; result: RoundResult } | null {
  const row = read().find((r) => r.id === id);
  return row ? migrate(row.payload) : null;
}

export function getAllRounds(): { round: Round; result: RoundResult }[] {
  return read()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => migrate(r.payload));
}

export function deleteRound(id: string): void {
  write(read().filter((r) => r.id !== id));
}
