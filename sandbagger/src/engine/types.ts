export type ID = string;

export interface Player {
  id: ID;
  name: string;
  handicapIndex?: number;
}

export type FormatKey =
  | 'skins'
  | 'nassau'
  | 'wolf'
  | 'vegas'
  | 'bingoBangoBongo'
  | 'matchplay'
  | 'strokeplay'
  | 'sixpoint';

export interface HoleInfo {
  par: number;
  strokeIndex: number;
}

/** scores[holeIndex][playerId] = gross strokes */
export type Scores = Record<number, Record<ID, number>>;

export interface SkinsConfig {
  value: number;
  carryover: boolean;
  /** 'perPlayer': each loser pays `value` per skin. 'totalPot': each skin is worth `value` total. */
  valueMode: 'perPlayer' | 'totalPot';
}
export interface NassauConfig {
  perLeg: number;
  autoPress: boolean;
  pressTrigger: number;
}
export interface WolfConfig {
  pointValue: number;
  loneMult: number;
  blindMult: number;
}
export interface VegasConfig {
  pointValue: number;
  flipBirds: boolean;
  teams: [ID[], ID[]];
}
export interface BBBConfig {
  pointValue: number;
}
export interface MatchplayConfig {
  matchValue: number;
}
export interface StrokeplayConfig {
  perStroke: number;
}
export interface SixpointConfig {
  pointValue: number;
}

export interface FormatConfig {
  skins?: SkinsConfig;
  nassau?: NassauConfig;
  wolf?: WolfConfig;
  vegas?: VegasConfig;
  bingoBangoBongo?: BBBConfig;
  matchplay?: MatchplayConfig;
  strokeplay?: StrokeplayConfig;
  sixpoint?: SixpointConfig;
}

export interface WolfDecision {
  mode: 'partner' | 'lone' | 'blind';
  partnerId?: ID;
}
export type WolfData = Record<number, WolfDecision>;

export type NassauLeg = 'front' | 'back';
export interface ManualPress {
  leg: NassauLeg;
  startHole: number;
}

export type JunkType =
  | 'greenie'
  | 'sandie'
  | 'barkie'
  | 'chippie'
  | 'birdie'
  | 'eagle'
  | 'polie'
  | 'snake'
  | 'bingo'
  | 'bango'
  | 'bongo';

export interface JunkEvent {
  hole: number;
  type: JunkType;
  playerId: ID;
}
export interface JunkConfig {
  enabled: JunkType[];
  values: Partial<Record<JunkType, number>>;
}

export interface Round {
  id: ID;
  createdAt: string;
  courseName?: string;
  numHoles: 9 | 18;
  holes: HoleInfo[];
  players: Player[];
  format: FormatKey;
  config: FormatConfig;
  useNetScoring: boolean;
  scores: Scores;
  wolf: WolfData;
  presses: ManualPress[];
  junk: { config: JunkConfig; events: JunkEvent[] };
  status: 'active' | 'complete';
}

export interface Transaction {
  from: ID;
  to: ID;
  amount: number;
}
export interface PlayerNet {
  playerId: ID;
  formatNet: number;
  junkNet: number;
  total: number;
}
export interface RoundResult {
  perPlayer: PlayerNet[];
  transactions: Transaction[];
  detail: Record<string, unknown>;
}
export type FormatNets = {
  net: Record<ID, number>;
  detail: Record<string, unknown>;
};
