import type { FormatConfig, FormatKey, JunkType, Player, Round } from '@/engine/types';
import { newId } from '@/lib/id';

export interface FormatMeta {
  label: string;
  blurb: string;
  min: number;
  max: number;
  needs18?: boolean;
}

export const FORMATS: Record<FormatKey, FormatMeta> = {
  skins: { label: 'Skins', blurb: 'Low score wins the hole. Ties carry over.', min: 2, max: 6 },
  nassau: { label: 'Nassau', blurb: 'Front 9, back 9, total — with presses. Heads-up.', min: 2, max: 2, needs18: true },
  wolf: { label: 'Wolf', blurb: 'Rotating wolf picks a partner or goes it alone.', min: 3, max: 5 },
  vegas: { label: 'Vegas', blurb: 'Two teams combine scores into numbers. Low wins big.', min: 4, max: 4 },
  bingoBangoBongo: { label: 'Bingo Bango Bongo', blurb: 'First on, closest on, first in. Three dots a hole.', min: 2, max: 6 },
  matchplay: { label: 'Match Play', blurb: 'Holes up wins the match. Heads-up.', min: 2, max: 2 },
  strokeplay: { label: 'Stroke Play', blurb: 'Every stroke counts. Pairwise payouts.', min: 2, max: 6 },
  sixpoint: { label: 'Six-Point', blurb: '6 points a hole split by rank. Threesome classic.', min: 3, max: 3 },
};

export const FORMAT_KEYS = Object.keys(FORMATS) as FormatKey[];

/** Junk types offered in the junk/dots section (BBB types are format-owned). */
export const JUNK_TYPES: { type: JunkType; label: string; hint: string }[] = [
  { type: 'greenie', label: 'Greenie', hint: 'on the green in one on a par 3' },
  { type: 'sandie', label: 'Sandie', hint: 'par or better from a bunker' },
  { type: 'barkie', label: 'Barkie', hint: 'par or better after hitting a tree' },
  { type: 'chippie', label: 'Chippie', hint: 'hole out a chip' },
  { type: 'birdie', label: 'Birdie', hint: 'one under par' },
  { type: 'eagle', label: 'Eagle', hint: 'two under par' },
  { type: 'polie', label: 'Polie', hint: 'putt longer than the flagstick' },
  { type: 'snake', label: 'Snake', hint: 'three-putt — pays everyone' },
];

export const defaultConfig = (players: Player[]): Required<FormatConfig> => ({
  skins: { value: 5, carryover: true, valueMode: 'perPlayer' },
  nassau: { perLeg: 5, autoPress: false, pressTrigger: 2 },
  wolf: { pointValue: 1, loneMult: 2, blindMult: 3 },
  vegas: {
    pointValue: 1,
    flipBirds: true,
    teams: [players.slice(0, 2).map((p) => p.id), players.slice(2, 4).map((p) => p.id)],
  },
  bingoBangoBongo: { pointValue: 1 },
  matchplay: { matchValue: 10 },
  strokeplay: { perStroke: 1 },
  sixpoint: { pointValue: 1 },
});

export function formatAvailable(key: FormatKey, playerCount: number, numHoles: number): string | null {
  const f = FORMATS[key];
  if (playerCount < f.min || playerCount > f.max) {
    return f.min === f.max ? `Needs ${f.min} players` : `Needs ${f.min}–${f.max} players`;
  }
  if (f.needs18 && numHoles !== 18) return 'Needs 18 holes';
  return null;
}

interface BuildRoundArgs {
  players: Player[];
  format: FormatKey;
  numHoles: 9 | 18;
  config: FormatConfig;
  useNetScoring: boolean;
  junkEnabled: JunkType[];
  junkValues: Partial<Record<JunkType, number>>;
}

export function buildRound(args: BuildRoundArgs): Round {
  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    numHoles: args.numHoles,
    holes: Array.from({ length: args.numHoles }, (_, i) => ({ par: 4, strokeIndex: i + 1 })),
    players: args.players,
    format: args.format,
    config: args.config,
    useNetScoring: args.useNetScoring,
    scores: {},
    wolf: {},
    presses: [],
    junk: { config: { enabled: args.junkEnabled, values: args.junkValues }, events: [] },
    status: 'active',
  };
}
