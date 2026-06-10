import { mkRound } from '../../engine/testkit';
import { createRoundSlice, type RoundState } from '../roundSlice';

/** Drive the slice without zustand/AsyncStorage: a tiny set/get harness. */
function harness() {
  let state: RoundState;
  const set = (partial: Partial<RoundState> | ((s: RoundState) => Partial<RoundState>)) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...next };
  };
  const get = () => state;
  state = createRoundSlice(set as never, get as never, undefined as never);
  return { get: () => state };
}

const baseRound = () =>
  mkRound({
    format: 'skins',
    config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
  });

describe('roundSlice', () => {
  it('starts and clears rounds', () => {
    const h = harness();
    h.get().startRound(baseRound());
    expect(h.get().round?.id).toBe('r1');
    h.get().clearRound();
    expect(h.get().round).toBeNull();
  });

  it('sets scores immutably per hole', () => {
    const h = harness();
    h.get().startRound(baseRound());
    h.get().setScore(0, 'A', 4);
    h.get().setScore(0, 'B', 5);
    h.get().setScore(1, 'A', 3);
    expect(h.get().round?.scores).toEqual({ 0: { A: 4, B: 5 }, 1: { A: 3 } });
  });

  it('toggles a junk event off when tapped twice', () => {
    const h = harness();
    h.get().startRound(baseRound());
    h.get().toggleJunk({ hole: 2, type: 'greenie', playerId: 'A' });
    expect(h.get().round?.junk.events).toHaveLength(1);
    h.get().toggleJunk({ hole: 2, type: 'greenie', playerId: 'A' });
    expect(h.get().round?.junk.events).toHaveLength(0);
  });

  it('moves an exclusive BBB event to the new player', () => {
    const h = harness();
    h.get().startRound(baseRound());
    h.get().toggleJunk({ hole: 2, type: 'bingo', playerId: 'A' });
    h.get().toggleJunk({ hole: 2, type: 'bingo', playerId: 'B' });
    expect(h.get().round?.junk.events).toEqual([{ hole: 2, type: 'bingo', playerId: 'B' }]);
  });

  it('moves the snake to the new player when tapped on the same hole', () => {
    const h = harness();
    h.get().startRound(baseRound());
    h.get().toggleJunk({ hole: 4, type: 'snake', playerId: 'A' });
    h.get().toggleJunk({ hole: 4, type: 'snake', playerId: 'B' });
    expect(h.get().round?.junk.events).toEqual([{ hole: 4, type: 'snake', playerId: 'B' }]);
  });

  it('allows the same non-exclusive junk for two players on one hole', () => {
    const h = harness();
    h.get().startRound(baseRound());
    h.get().toggleJunk({ hole: 2, type: 'birdie', playerId: 'A' });
    h.get().toggleJunk({ hole: 2, type: 'birdie', playerId: 'B' });
    expect(h.get().round?.junk.events).toHaveLength(2);
  });

  it('records wolf decisions, presses, pars, and completion', () => {
    const h = harness();
    h.get().startRound(baseRound());
    h.get().setWolf(0, { mode: 'lone' });
    h.get().addPress({ leg: 'front', startHole: 4 });
    h.get().setPar(0, 5);
    h.get().completeRound();
    const r = h.get().round!;
    expect(r.wolf[0]).toEqual({ mode: 'lone' });
    expect(r.presses).toEqual([{ leg: 'front', startHole: 4 }]);
    expect(r.holes[0].par).toBe(5);
    expect(r.status).toBe('complete');
  });
});
