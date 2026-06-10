import type { ID, Round, Scores } from './types';

export const playerIds = (round: Round): ID[] => round.players.map((p) => p.id);

export const holeEntered = (scores: Scores, hole: number, ids: ID[]): boolean =>
  ids.every((id) => scores[hole]?.[id] != null);

export const zeroNet = (ids: ID[]): Record<ID, number> =>
  Object.fromEntries(ids.map((id) => [id, 0]));
