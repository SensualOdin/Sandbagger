import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createRoundSlice, type RoundState } from './roundSlice';

interface RoundStore extends RoundState {
  /** True once AsyncStorage rehydration finished. The app must not render
   *  (and so cannot write) before this — a write that lands first would
   *  overwrite the saved round with the fresh empty state. */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
}

/**
 * Active round, persisted on every mutation so a crash, reload, or dead
 * battery mid-round never loses scores.
 */
export const useRoundStore = create<RoundStore>()(
  persist(
    (set, get, api) => ({
      ...createRoundSlice(set as never, get as never, api as never),
      hasHydrated: false,
      setHasHydrated: (v: boolean) => set({ hasHydrated: v }),
    }),
    {
      name: 'press-active-round',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ round: s.round }),
      version: 1,
      // rounds persisted before multi-game support carried a single `format`
      migrate: (persisted) => {
        const p = persisted as { round: (RoundState['round'] & { format?: string }) | null };
        if (p?.round?.format && !p.round.formats) {
          p.round.formats = [p.round.format as never];
        }
        return p as never;
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
