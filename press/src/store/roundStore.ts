import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createRoundSlice, type RoundState } from './roundSlice';

/**
 * Active round, persisted on every mutation so a crash, reload, or dead
 * battery mid-round never loses scores.
 */
export const useRoundStore = create<RoundState>()(
  persist(createRoundSlice, {
    name: 'press-active-round',
    storage: createJSONStorage(() => AsyncStorage),
  })
);
