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
  stableford: { label: 'Stableford', blurb: 'Points for birdies, nothing for blowups.', min: 2, max: 6 },
  aceyDeucey: { label: 'Acey Deucey', blurb: 'Low collects from everyone. High pays everyone.', min: 3, max: 6 },
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
  { type: 'arnie', label: 'Arnie', hint: 'par or better without touching the fairway' },
  { type: 'hogan', label: 'Hogan', hint: 'fairway, green, one putt' },
  { type: 'ferret', label: 'Ferret', hint: 'hole out from off the green' },
  { type: 'goldenFerret', label: 'Golden Ferret', hint: 'hole out from the sand' },
  { type: 'rabbit', label: 'Rabbit', hint: 'win a hole outright to take it — holder collects the pot' },
  { type: 'snake', label: 'Snake', hint: '3-putt holds it — pot grows every hole, holder pays at the end' },
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
  stableford: { pointValue: 1, modified: false },
  aceyDeucey: { aceValue: 1, deuceValue: 1 },
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
  formats: FormatKey[];
  numHoles: 9 | 18;
  config: FormatConfig;
  useNetScoring: boolean;
  junkEnabled: JunkType[];
  junkValues: Partial<Record<JunkType, number>>;
  greenieCarryover: boolean;
}

export function buildRound(args: BuildRoundArgs): Round {
  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    numHoles: args.numHoles,
    holes: Array.from({ length: args.numHoles }, (_, i) => ({ par: 4, strokeIndex: i + 1 })),
    players: args.players,
    formats: args.formats,
    config: args.config,
    useNetScoring: args.useNetScoring,
    scores: {},
    wolf: {},
    presses: [],
    junk: {
      config: {
        enabled: args.junkEnabled,
        values: args.junkValues,
        greenieCarryover: args.greenieCarryover,
      },
      events: [],
    },
    status: 'active',
  };
}
