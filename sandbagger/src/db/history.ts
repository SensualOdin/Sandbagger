import * as SQLite from 'expo-sqlite';

import type { Round, RoundResult } from '@/engine/types';
import { fmtMoney } from '@/theme';

export interface HistoryRow {
  id: string;
  createdAt: string;
  format: string;
  numHoles: number;
  playerNames: string[];
  /** e.g. "Bo +$24" — biggest winner for the list view. */
  topLine: string;
}

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('press.db');
    db.execSync(
      `CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        format TEXT NOT NULL,
        num_holes INTEGER NOT NULL,
        player_names TEXT NOT NULL,
        top_line TEXT NOT NULL,
        payload TEXT NOT NULL
      );`
    );
  }
  return db;
}

export function saveRound(round: Round, result: RoundResult): void {
  const names = round.players.map((p) => p.name);
  const top = [...result.perPlayer].sort((a, b) => b.total - a.total)[0];
  const topName = round.players.find((p) => p.id === top?.playerId)?.name ?? '';
  const topLine =
    top && top.total > 0 ? `${topName} +${fmtMoney(top.total)}` : 'All square';
  getDb().runSync(
    `INSERT OR REPLACE INTO rounds (id, created_at, format, num_holes, player_names, top_line, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    round.id,
    round.createdAt,
    round.format,
    round.numHoles,
    JSON.stringify(names),
    topLine,
    JSON.stringify({ round, result })
  );
}

export function listRounds(): HistoryRow[] {
  const rows = getDb().getAllSync<{
    id: string;
    created_at: string;
    format: string;
    num_holes: number;
    player_names: string;
    top_line: string;
  }>(`SELECT id, created_at, format, num_holes, player_names, top_line
      FROM rounds ORDER BY created_at DESC;`);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    format: r.format,
    numHoles: r.num_holes,
    playerNames: JSON.parse(r.player_names),
    topLine: r.top_line,
  }));
}

export function getRound(id: string): { round: Round; result: RoundResult } | null {
  const row = getDb().getFirstSync<{ payload: string }>(
    `SELECT payload FROM rounds WHERE id = ?;`,
    id
  );
  return row ? JSON.parse(row.payload) : null;
}

export function deleteRound(id: string): void {
  getDb().runSync(`DELETE FROM rounds WHERE id = ?;`, id);
}
