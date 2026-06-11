import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FormatConfig, FormatKey, JunkType, SnakeMode } from '@/engine/types';
import { FORMATS } from '@/lib/formats';

/** A saved table: the usual crew and their usual games, two taps to tee off. */
export interface RoundPreset {
  label: string;
  players: { name: string; handicapIndex?: number }[];
  formats: FormatKey[];
  config: FormatConfig;
  numHoles: 9 | 18;
  useNet: boolean;
  junkEnabled: JunkType[];
  junkValues: Partial<Record<JunkType, number>>;
  greenieCarryover: boolean;
  /** Absent on presets saved before flat snakes existed — treat as 'perHole'. */
  snakeMode?: SnakeMode;
}

const KEY = 'sb-quick-starts';
const MAX = 3;

export function presetLabel(p: Pick<RoundPreset, 'players' | 'formats'>): string {
  return `${p.players.map((x) => x.name).join(', ')} · ${p.formats
    .map((f) => FORMATS[f].label)
    .join(' + ')}`;
}

export async function loadPresets(): Promise<RoundPreset[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RoundPreset[]) : [];
  } catch {
    return [];
  }
}

/** Most-recent-first, deduped by label, capped. */
export async function rememberPreset(p: RoundPreset): Promise<void> {
  const existing = await loadPresets();
  const next = [p, ...existing.filter((x) => x.label !== p.label)].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
