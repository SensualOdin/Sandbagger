import type { StateCreator } from 'zustand';

import type { ID, JunkEvent, JunkType, ManualPress, Round, WolfDecision } from '@/engine/types';

/** Bingo/bango/bongo: only one player can hold each per hole. */
const EXCLUSIVE_TYPES: JunkType[] = ['bingo', 'bango', 'bongo'];

export interface RoundState {
  round: Round | null;
  startRound: (r: Round) => void;
  setScore: (hole: number, playerId: ID, strokes: number) => void;
  setPar: (hole: number, par: number) => void;
  setWolf: (hole: number, d: WolfDecision) => void;
  addPress: (p: ManualPress) => void;
  toggleJunk: (e: JunkEvent) => void;
  completeRound: () => void;
  clearRound: () => void;
}

const sameEvent = (a: JunkEvent, b: JunkEvent) =>
  a.hole === b.hole && a.type === b.type && a.playerId === b.playerId;

export const createRoundSlice: StateCreator<RoundState> = (set, get) => ({
  round: null,

  startRound: (round) => set({ round }),

  setScore: (hole, playerId, strokes) =>
    set(({ round }) => {
      if (!round) return {};
      return {
        round: {
          ...round,
          scores: { ...round.scores, [hole]: { ...round.scores[hole], [playerId]: strokes } },
        },
      };
    }),

  setPar: (hole, par) =>
    set(({ round }) => {
      if (!round) return {};
      return {
        round: {
          ...round,
          holes: round.holes.map((h, i) => (i === hole ? { ...h, par } : h)),
        },
      };
    }),

  setWolf: (hole, d) =>
    set(({ round }) => {
      if (!round) return {};
      return { round: { ...round, wolf: { ...round.wolf, [hole]: d } } };
    }),

  addPress: (p) =>
    set(({ round }) => {
      if (!round) return {};
      return { round: { ...round, presses: [...round.presses, p] } };
    }),

  toggleJunk: (e) =>
    set(({ round }) => {
      if (!round) return {};
      const events = round.junk.events;
      let next: JunkEvent[];
      if (events.some((x) => sameEvent(x, e))) {
        next = events.filter((x) => !sameEvent(x, e));
      } else if (EXCLUSIVE_TYPES.includes(e.type)) {
        next = [...events.filter((x) => !(x.hole === e.hole && x.type === e.type)), e];
      } else {
        next = [...events, e];
      }
      return { round: { ...round, junk: { ...round.junk, events: next } } };
    }),

  completeRound: () =>
    set(({ round }) => (round ? { round: { ...round, status: 'complete' } } : {})),

  clearRound: () => set({ round: null }),
});
