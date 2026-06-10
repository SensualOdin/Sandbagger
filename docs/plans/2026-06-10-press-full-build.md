# Press Full Build Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development in-session) to implement this plan task-by-task.

**Goal:** Build the complete local-first Press app (MVP + v1.1): Expo + TypeScript, pure scoring engine with 8 formats + junk + handicaps + settle-up, persisted rounds, 5 screens, themed UI, full Jest coverage.

**Architecture:** Pure TS engine (`src/engine/`, never imports React) computes all money math from a `Round` object; Zustand store (AsyncStorage-persisted) holds the active round; expo-sqlite archives completed rounds; expo-router screens render it. Design doc: `docs/plans/2026-06-10-press-app-design.md`. Visual/logic reference: `docs/press-golf-games.jsx`.

**Tech Stack:** Expo (latest SDK), TypeScript, expo-router, Zustand, @react-native-async-storage/async-storage, expo-sqlite, expo-haptics, @expo-google-fonts (Fraunces, Hanken Grotesk, DM Mono), react-native-view-shot + expo-sharing, Jest (jest-expo).

**Conventions:**
- Repo root: `/Users/georgegewinner/Desktop/golf app`. App lives in `press/`. All commands run from `press/` unless noted.
- Run tests: `npx jest src/engine` (engine) or `npx jest` (all). Typecheck: `npx tsc --noEmit`.
- Commit after every green task from repo root: `git add -A && git commit -m "..."`.
- TDD for the engine: write failing test → run → implement → run green → commit.
- Money convention: every format result MUST be zero-sum. Cents rounding happens only in `settle()` and display, never inside format math.

---

### Task 0: Scaffold

**Step 1:** From repo root:
```bash
cd "/Users/georgegewinner/Desktop/golf app"
npx create-expo-app@latest press --yes
cd press
rm -rf .git                      # repo root is the parent folder
npm run reset-project -- --no-example 2>/dev/null || npm run reset-project   # strip example screens (keep no app-example)
```
If `reset-project` prompts, answer to delete example files. End state: `app/_layout.tsx` + `app/index.tsx` minimal.

**Step 2:** Install deps:
```bash
npx expo install expo-sqlite expo-haptics expo-font expo-sharing react-native-view-shot @react-native-async-storage/async-storage
npm install zustand @expo-google-fonts/fraunces @expo-google-fonts/hanken-grotesk @expo-google-fonts/dm-mono
npx expo install -- --save-dev jest-expo jest @types/jest
```

**Step 3:** Add to `press/package.json`:
```json
"scripts": { "test": "jest" },
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|zustand)"
  ]
}
```

**Step 4:** Sanity: `npx tsc --noEmit` passes. Commit: `chore: scaffold Expo app with deps and jest`.

---

### Task 1: Engine types + utils

**Files:** Create `press/src/engine/types.ts`, `press/src/engine/util.ts`.

`types.ts` (complete):
```typescript
export type ID = string;

export interface Player { id: ID; name: string; handicapIndex?: number; }

export type FormatKey =
  | 'skins' | 'nassau' | 'wolf' | 'vegas' | 'bingoBangoBongo'
  | 'matchplay' | 'strokeplay' | 'sixpoint';

export interface HoleInfo { par: number; strokeIndex: number; }

/** scores[holeIndex][playerId] = gross strokes */
export type Scores = Record<number, Record<ID, number>>;

export interface SkinsConfig { value: number; carryover: boolean; valueMode: 'perPlayer' | 'totalPot'; }
export interface NassauConfig { perLeg: number; autoPress: boolean; pressTrigger: number; }
export interface WolfConfig { pointValue: number; loneMult: number; blindMult: number; }
export interface VegasConfig { pointValue: number; flipBirds: boolean; teams: [ID[], ID[]]; }
export interface BBBConfig { pointValue: number; }
export interface MatchplayConfig { matchValue: number; }
export interface StrokeplayConfig { perStroke: number; }
export interface SixpointConfig { pointValue: number; }

export interface FormatConfig {
  skins?: SkinsConfig; nassau?: NassauConfig; wolf?: WolfConfig; vegas?: VegasConfig;
  bingoBangoBongo?: BBBConfig; matchplay?: MatchplayConfig;
  strokeplay?: StrokeplayConfig; sixpoint?: SixpointConfig;
}

export interface WolfDecision { mode: 'partner' | 'lone' | 'blind'; partnerId?: ID; }
export type WolfData = Record<number, WolfDecision>;

export type NassauLeg = 'front' | 'back';
export interface ManualPress { leg: NassauLeg; startHole: number; }

export type JunkType =
  | 'greenie' | 'sandie' | 'barkie' | 'chippie' | 'birdie' | 'eagle' | 'polie' | 'snake'
  | 'bingo' | 'bango' | 'bongo';

export interface JunkEvent { hole: number; type: JunkType; playerId: ID; }
export interface JunkConfig { enabled: JunkType[]; values: Partial<Record<JunkType, number>>; }

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

export interface Transaction { from: ID; to: ID; amount: number; }
export interface PlayerNet { playerId: ID; formatNet: number; junkNet: number; total: number; }
export interface RoundResult { perPlayer: PlayerNet[]; transactions: Transaction[]; detail: Record<string, unknown>; }
export type FormatNets = { net: Record<ID, number>; detail: Record<string, unknown> };
```

`util.ts`:
```typescript
import type { ID, Round, Scores } from './types';
export const playerIds = (round: Round): ID[] => round.players.map(p => p.id);
export const holeEntered = (scores: Scores, hole: number, ids: ID[]): boolean =>
  ids.every(id => scores[hole]?.[id] != null);
export const zeroNet = (ids: ID[]): Record<ID, number> =>
  Object.fromEntries(ids.map(id => [id, 0]));
```

Also create the shared test helper `press/src/engine/__tests__/helpers.ts`:
```typescript
import type { Round, FormatKey, FormatConfig, Scores, HoleInfo } from '../types';

export const mkHoles = (n: number, par = 4): HoleInfo[] =>
  Array.from({ length: n }, (_, i) => ({ par, strokeIndex: i + 1 }));

export function mkRound(over: Partial<Round> & { format: FormatKey; config: FormatConfig }): Round {
  const players = over.players ?? [
    { id: 'A', name: 'Al' }, { id: 'B', name: 'Bo' },
  ];
  const numHoles = over.numHoles ?? 18;
  return {
    id: 'r1', createdAt: '2026-06-10T00:00:00Z', numHoles,
    holes: over.holes ?? mkHoles(numHoles),
    players, useNetScoring: false, scores: {}, wolf: {}, presses: [],
    junk: { config: { enabled: [], values: {} }, events: [] },
    status: 'active', ...over,
  } as Round;
}

/** scoresFromRows: rows[hole] = { A: 4, B: 5 } */
export const scoresFrom = (rows: Record<number, Record<string, number>>): Scores => rows;
```

Run `npx tsc --noEmit` → passes. Commit: `feat(engine): types and utils`.

---

### Task 2: Handicap / net scoring (TDD)

**Files:** Create `press/src/engine/handicap.ts`, test `press/src/engine/__tests__/handicap.test.ts`.

**Test scenarios:**
1. Index 5 on 18 holes (SI 1–18): receives exactly 1 stroke on SI 1–5, 0 elsewhere.
2. Index 20: 1 stroke on every hole + extra stroke on SI 1–2 (total 20).
3. `netScores` with `useNetScoring: false` returns gross unchanged.
4. `netScores` with player index 2: gross 5 on the SI-1 hole becomes net 4; holes without entered scores stay absent.

**Implementation:**
```typescript
import type { HoleInfo, Round, Scores } from './types';

export function strokesReceived(handicapIndex: number, holes: HoleInfo[]): number[] {
  const course = Math.round(handicapIndex);
  return holes.map(h => {
    let s = 0;
    if (course >= h.strokeIndex) s += 1;
    if (course >= h.strokeIndex + 18) s += 1;
    return s;
  });
}

export function netScores(round: Round): Scores {
  if (!round.useNetScoring) return round.scores;
  const allocs = Object.fromEntries(
    round.players.map(p => [p.id, strokesReceived(p.handicapIndex ?? 0, round.holes)]));
  const out: Scores = {};
  for (let h = 0; h < round.numHoles; h++) {
    if (!round.scores[h]) continue;
    out[h] = {};
    for (const p of round.players) {
      const gross = round.scores[h][p.id];
      if (gross != null) out[h][p.id] = gross - allocs[p.id][h];
    }
  }
  return out;
}
```
Run red → implement → green → commit `feat(engine): handicap stroke allocation and net scoring`.

---

### Task 3: Skins (TDD)

**Files:** `press/src/engine/formats/skins.ts`, test `__tests__/skins.test.ts`.

**Test scenarios (3 players A/B/C, value 5, 9 holes, only holes 0–2 entered):**
1. *Carryover on, perPlayer:* H0 A4/B5/C5 (A skin), H1 A4/B4/C5 (tie, carry), H2 A4/B3/C4 (B wins 2 units). Expect skinsWon A=1,B=2; nets A=0, B=+15, C=−15 (formula `value*(won*n − total)`).
2. *Carryover off:* same scores → A=1, B=1 → nets A=+5, B=+5, C=−10.
3. *totalPot mode, value 6:* only H0 entered (A wins 1 skin) → A=+6, B=−3, C=−3 (per-loser = value/(n−1)).
4. *Unentered holes skipped:* no NaN, carry not incremented by unentered holes.
5. Zero-sum on every case.

**Implementation:**
```typescript
import type { FormatNets, ID, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

export function scoreSkins(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { value, carryover, valueMode } = round.config.skins!;
  const skinsWon = zeroNet(ids);
  let carry = 0;
  const holeLog: { hole: number; winner: ID | null; units: number }[] = [];
  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    const min = Math.min(...ids.map(id => scores[h][id]));
    const winners = ids.filter(id => scores[h][id] === min);
    if (winners.length === 1) {
      const units = 1 + carry;
      skinsWon[winners[0]] += units;
      holeLog.push({ hole: h, winner: winners[0], units });
      carry = 0;
    } else {
      carry = carryover ? carry + 1 : 0;
      holeLog.push({ hole: h, winner: null, units: 0 });
    }
  }
  const total = ids.reduce((a, id) => a + skinsWon[id], 0);
  const n = ids.length;
  const perLoser = valueMode === 'perPlayer' ? value : value / (n - 1);
  const net = zeroNet(ids);
  ids.forEach(id => (net[id] = perLoser * (skinsWon[id] * n - total)));
  return { net, detail: { skinsWon, carry, holeLog } };
}
```
Commit: `feat(engine): skins with carryover and value-mode knob`.

---

### Task 4: Nassau with presses (TDD)

**Files:** `press/src/engine/formats/nassau.ts`, test `__tests__/nassau.test.ts`.

Press rules: presses exist on **front/back legs only** (never total). Auto-press opens at most once per leg, the hole AFTER the base-match running margin first reaches ±`pressTrigger`, and runs to leg end. Manual presses (`round.presses`) run `startHole` → leg end. Each press pays `perLeg` by sign of its own margin.

**Test scenario (A vs B, perLeg 10, trigger 2):** A wins H0,H1; H2–8 halved; B wins H9,H10; A wins H11; H12–17 halved.
- Legs: front +2 (A +10), back −1 (B +10), total +1 (A +10).
- autoPress on: front press starts H2, margin 0 → $0; back press starts H11, margin +1 → A +10.
- Expected netA: **+20** with autoPress, **+10** without.
- Manual press test: autoPress off + `presses: [{leg:'back', startHole: 11}]` → netA +20.
- Edge: trigger reached on the LAST hole of a leg → no press (no holes left).
- Zero-sum: netB = −netA always.

**Implementation:**
```typescript
import type { FormatNets, ID, NassauLeg, Round, Scores } from '../types';
import { playerIds } from '../util';

const LEGS: Record<NassauLeg | 'total', { start: number; end: number }> = {
  front: { start: 0, end: 9 }, back: { start: 9, end: 18 }, total: { start: 0, end: 18 },
};

function margin(scores: Scores, a: ID, b: ID, start: number, end: number) {
  let diff = 0; const running: number[] = [];
  for (let h = start; h < end; h++) {
    const sa = scores[h]?.[a], sb = scores[h]?.[b];
    if (sa != null && sb != null) diff += sa < sb ? 1 : sb < sa ? -1 : 0;
    running.push(diff);
  }
  return { final: diff, running };
}

export function scoreNassau(round: Round, scores: Scores): FormatNets {
  const [a, b] = playerIds(round);
  const { perLeg, autoPress, pressTrigger } = round.config.nassau!;
  let netA = 0;
  const legs: Record<string, number> = {};
  const pressLog: { leg: NassauLeg; startHole: number; result: number; source: 'auto' | 'manual' }[] = [];

  for (const legName of ['front', 'back', 'total'] as const) {
    const { start, end } = LEGS[legName];
    if (end > round.numHoles) continue;
    const base = margin(scores, a, b, start, end);
    netA += Math.sign(base.final) * perLeg;
    legs[legName] = base.final;
    if (autoPress && legName !== 'total') {
      for (let i = 0; i < base.running.length - 1; i++) {
        if (Math.abs(base.running[i]) >= pressTrigger) {
          const startHole = start + i + 1;
          const p = margin(scores, a, b, startHole, end);
          netA += Math.sign(p.final) * perLeg;
          pressLog.push({ leg: legName, startHole, result: p.final, source: 'auto' });
          break;
        }
      }
    }
  }
  for (const mp of round.presses) {
    const { end } = LEGS[mp.leg];
    if (end > round.numHoles || mp.startHole >= end) continue;
    const p = margin(scores, a, b, mp.startHole, end);
    netA += Math.sign(p.final) * perLeg;
    pressLog.push({ ...mp, result: p.final, source: 'manual' });
  }
  return { net: { [a]: netA, [b]: -netA }, detail: { legs, pressLog } };
}
```
Commit: `feat(engine): nassau with auto and manual presses`.

---

### Task 5: Wolf (TDD)

**Files:** `press/src/engine/formats/wolf.ts`, test `__tests__/wolf.test.ts`.

Money rule (generalizes the prototype to 3–5 players): wolf team vs the field. Stake `mult` = 1 (partner), `loneMult`, or `blindMult`. Transfer T = `mult × opponentCount`; wolf-team members split ±T equally; each opponent moves ∓`mult`. Unresolved holes (no decision or missing scores) score nothing.

**Test scenario (A/B/C/D, pointValue 1, lone 2, blind 3; rotation = ids[h % 4]):**
- H0 (wolf A, partner B): A3 B5 C4 D4 → A+1 B+1 C−1 D−1.
- H1 (wolf B, lone): B3 A4 C4 D5 → B+6, others −2.
- H2 (wolf C, blind): C5 A3 B3 D3 → C−9, others +3.
- H3 (wolf D, partner A, best balls tie 4/4) → no movement.
- Totals: A+2, B+10, C−12, D 0. Zero-sum.
- 3-player partner case (2v1): wolf team wins → winners +0.5 each, loser −1.
- Missing decision on an entered hole → skipped.

**Implementation:**
```typescript
import type { FormatNets, ID, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

export function scoreWolf(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue, loneMult, blindMult } = round.config.wolf!;
  const pts = zeroNet(ids);
  const holeLog: Record<string, unknown>[] = [];
  for (let h = 0; h < round.numHoles; h++) {
    const wolfId = ids[h % ids.length];
    const d = round.wolf[h];
    if (!d || !holeEntered(scores, h, ids) || (d.mode === 'partner' && !d.partnerId)) {
      holeLog.push({ hole: h, wolfId, resolved: false });
      continue;
    }
    const sc = (id: ID) => scores[h][id];
    const wolfTeam = d.mode === 'partner' ? [wolfId, d.partnerId!] : [wolfId];
    const mult = d.mode === 'partner' ? 1 : d.mode === 'blind' ? blindMult : loneMult;
    const opps = ids.filter(id => !wolfTeam.includes(id));
    const bestW = Math.min(...wolfTeam.map(sc));
    const bestO = Math.min(...opps.map(sc));
    if (bestW !== bestO) {
      const wolfWins = bestW < bestO;
      const T = mult * opps.length;
      wolfTeam.forEach(id => (pts[id] += (wolfWins ? T : -T) / wolfTeam.length));
      opps.forEach(id => (pts[id] += wolfWins ? -mult : mult));
    }
    holeLog.push({ hole: h, wolfId, mode: d.mode, resolved: true });
  }
  const net = zeroNet(ids);
  ids.forEach(id => (net[id] = pts[id] * pointValue));
  return { net, detail: { pts, holeLog } };
}
```
Commit: `feat(engine): wolf for 3-5 players`.

---

### Task 6: Vegas (TDD)

**Files:** `press/src/engine/formats/vegas.ts`, test `__tests__/vegas.test.ts`.

Rules: 2v2. Team number = scores low-digit-first (4,5→45); a 10+ score goes first (10,4→104). Flip-the-bird: a team birdie (any member score < par) reverses the OPPONENT number high-first; two birdies cancel. Points = sum of (oppNumber − teamNumber). Each member of the losing team pays `points × pointValue` to each... (per-player: each winner +pts×value, each loser −pts×value).

**Test (teams [A,B] vs [C,D], $1, flip on, all par 4):**
- H0: A4B5=45 vs C4D6=46 → +1.
- H1: A3(bird)B5=35 vs C4D5 flipped=54 → +19.
- H2: A4B4 flipped=44 vs C2(bird)D4=24 → −20.
- H3: A10B4=104 vs C5D5=55 → −49.
- Total −49 → A,B −49 each; C,D +49 each. Zero-sum. Flip-cancel case: both teams birdie → no flips.

**Implementation:**
```typescript
import type { FormatNets, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

export function teamNumber(x: number, y: number, flip: boolean): number {
  const [lo, hi] = x <= y ? [x, y] : [y, x];
  if (hi >= 10) return hi * (lo >= 10 ? 100 : 10) + lo;
  return flip ? hi * 10 + lo : lo * 10 + hi;
}

export function scoreVegas(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue, flipBirds, teams } = round.config.vegas!;
  const [t1, t2] = teams;
  let pts = 0;
  const holeLog: Record<string, unknown>[] = [];
  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    const par = round.holes[h].par;
    const s1 = t1.map(id => scores[h][id]) as [number, number];
    const s2 = t2.map(id => scores[h][id]) as [number, number];
    const bird1 = flipBirds && s1.some(s => s < par);
    const bird2 = flipBirds && s2.some(s => s < par);
    const n1 = teamNumber(s1[0], s1[1], bird2 && !bird1);
    const n2 = teamNumber(s2[0], s2[1], bird1 && !bird2);
    pts += n2 - n1;
    holeLog.push({ hole: h, n1, n2 });
  }
  const net = zeroNet(ids);
  t1.forEach(id => (net[id] = pts * pointValue));
  t2.forEach(id => (net[id] = -pts * pointValue));
  return { net, detail: { points: pts, holeLog } };
}
```
Wait — `teamNumber(10, 11)`: hi=11, lo=10 → 11*100+10 = 1110. Correct. `(10,4)`: hi=10, lo=4 → 10*10+4=104. Correct.
Commit: `feat(engine): vegas with flip-the-bird`.

---

### Task 7: Bingo-Bango-Bongo (TDD)

**Files:** `press/src/engine/formats/bbb.ts`, test `__tests__/bbb.test.ts`.

Event-based: reads `round.junk.events` of types `bingo|bango|bongo` (recorded by Play screen). Each point: every other player pays `pointValue`.

**Test (A/B/C, $2):** events bingo A H0, bango A H0, bongo B H0 → pts A2 B1 C0 → nets A+6, B 0, C−6. Zero-sum. Non-BBB junk events ignored.

**Implementation:**
```typescript
import type { FormatNets, JunkType, Round, Scores } from '../types';
import { playerIds, zeroNet } from '../util';

const BBB: JunkType[] = ['bingo', 'bango', 'bongo'];

export function scoreBBB(round: Round, _scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue } = round.config.bingoBangoBongo!;
  const pts = zeroNet(ids);
  for (const e of round.junk.events) if (BBB.includes(e.type)) pts[e.playerId] += 1;
  const total = ids.reduce((a, id) => a + pts[id], 0);
  const net = zeroNet(ids);
  ids.forEach(id => (net[id] = pointValue * (pts[id] * ids.length - total)));
  return { net, detail: { pts } };
}
```
Commit: `feat(engine): bingo-bango-bongo`.

---

### Task 8: Match play + Stroke play (TDD)

**Files:** `press/src/engine/formats/matchplay.ts`, `formats/strokeplay.ts`, tests `__tests__/matchstroke.test.ts`.

**Matchplay test (A vs B, $20):** A wins 3 holes, B wins 1, rest halved → A+20/B−20. All-square → 0/0.
**Strokeplay test (A/B/C, $1/stroke, 2 holes entered):** totals A8 B9 C10 → A+3, B 0, C−3 (pairwise diffs). Hole where only A+B entered is excluded for everyone.

**Implementation:**
```typescript
// matchplay.ts
import type { FormatNets, Round, Scores } from '../types';
import { playerIds } from '../util';

export function scoreMatchplay(round: Round, scores: Scores): FormatNets {
  const [a, b] = playerIds(round);
  const { matchValue } = round.config.matchplay!;
  let diff = 0;
  for (let h = 0; h < round.numHoles; h++) {
    const sa = scores[h]?.[a], sb = scores[h]?.[b];
    if (sa != null && sb != null) diff += sa < sb ? 1 : sb < sa ? -1 : 0;
  }
  const netA = Math.sign(diff) * matchValue;
  return { net: { [a]: netA, [b]: -netA }, detail: { holesUp: diff } };
}
```
```typescript
// strokeplay.ts
import type { FormatNets, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

export function scoreStrokeplay(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { perStroke } = round.config.strokeplay!;
  const totals = zeroNet(ids);
  let holesCounted = 0;
  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    holesCounted++;
    ids.forEach(id => (totals[id] += scores[h][id]));
  }
  const net = zeroNet(ids);
  for (const a of ids) for (const b of ids)
    if (a !== b) net[a] += perStroke * (totals[b] - totals[a]);
  return { net, detail: { totals, holesCounted } };
}
```
Commit: `feat(engine): match play and stroke play`.

---

### Task 9: Six-Point (TDD)

**Files:** `press/src/engine/formats/sixpoint.ts`, test `__tests__/sixpoint.test.ts`.

3 players, 6 pts/hole: outright 4-2-0; two tie low 3-3-0; two tie high 4-1-1; all tie 2-2-2. Net $ = (pts − 2×holesCounted) × pointValue.

**Test (A/B/C, $1, 5 holes):** H0 A3B4C5→4/2/0; H1 A4B4C5→3/3/0; H2 A5B4C4→B3C3A0; H3 A4B5C5→4/1/1; H4 all 4→2/2/2. pts A13 B11 C6 → nets A+3, B+1, C−4. Zero-sum.

**Implementation:**
```typescript
import type { FormatNets, Round, Scores } from '../types';
import { holeEntered, playerIds, zeroNet } from '../util';

export function scoreSixpoint(round: Round, scores: Scores): FormatNets {
  const ids = playerIds(round);
  const { pointValue } = round.config.sixpoint!;
  const pts = zeroNet(ids);
  let holesCounted = 0;
  for (let h = 0; h < round.numHoles; h++) {
    if (!holeEntered(scores, h, ids)) continue;
    holesCounted++;
    const sorted = [...ids].sort((x, y) => scores[h][x] - scores[h][y]);
    const [s0, s1, s2] = sorted.map(id => scores[h][id]);
    if (s0 === s1 && s1 === s2) sorted.forEach(id => (pts[id] += 2));
    else if (s0 === s1) { pts[sorted[0]] += 3; pts[sorted[1]] += 3; }
    else if (s1 === s2) { pts[sorted[0]] += 4; pts[sorted[1]] += 1; pts[sorted[2]] += 1; }
    else { pts[sorted[0]] += 4; pts[sorted[1]] += 2; }
  }
  const net = zeroNet(ids);
  ids.forEach(id => (net[id] = pointValue * (pts[id] - 2 * holesCounted)));
  return { net, detail: { pts, holesCounted } };
}
```
Commit: `feat(engine): six-point game`.

---

### Task 10: Junk layer (TDD)

**Files:** `press/src/engine/junk.ts`, test `__tests__/junk.test.ts`.

Each enabled event: holder collects its value from every other player; `snake` is negative (committer pays everyone). Events with types not in `enabled` are ignored (this also firewalls BBB events from double-count).

**Test (A/B/C; greenie $1, snake $2 enabled):** greenie A, snake B → A+4, B−5, C+1. Zero-sum. Disabled type ignored.

**Implementation:**
```typescript
import type { ID, Round } from './types';
import { playerIds, zeroNet } from './util';

export function scoreJunk(round: Round): Record<ID, number> {
  const ids = playerIds(round);
  const net = zeroNet(ids);
  const { enabled, values } = round.junk.config;
  for (const e of round.junk.events) {
    if (!enabled.includes(e.type)) continue;
    const v = values[e.type] ?? 0;
    const amt = e.type === 'snake' ? -v : v;
    for (const id of ids) {
      if (id === e.playerId) net[id] += amt * (ids.length - 1);
      else net[id] -= amt;
    }
  }
  return net;
}
```
Commit: `feat(engine): junk/dots layer`.

---

### Task 11: Settle-up (TDD)

**Files:** `press/src/engine/settle.ts`, test `__tests__/settle.test.ts`.

**Tests:** {A:+15,B:−10,C:−5} → exactly [B→A 10, C→A 5]. All-zero → []. Money conserved (Σ amounts == Σ positive nets) incl. fractional cents rounding to 2dp. n−1 max transactions for n participants.

**Implementation:** (prototype's greedy, IDs not names)
```typescript
import type { ID, Transaction } from './types';

export function settle(net: Record<ID, number>): Transaction[] {
  const creditors = Object.entries(net).filter(([, v]) => v > 0.001)
    .map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const debtors = Object.entries(net).filter(([, v]) => v < -0.001)
    .map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const tx: Transaction[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v);
    tx.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(pay * 100) / 100 });
    debtors[i].v -= pay; creditors[j].v -= pay;
    if (debtors[i].v < 0.001) i++;
    if (creditors[j].v < 0.001) j++;
  }
  return tx;
}
```
Commit: `feat(engine): greedy settle-up netting`.

---

### Task 12: Dispatcher + zero-sum property test (TDD)

**Files:** `press/src/engine/index.ts`, tests `__tests__/dispatcher.test.ts`, `__tests__/zerosum.property.test.ts`.

**Dispatcher tests:** every `FormatKey` maps to a function (regression for the blueprint's missing-formats bug); junk combines with format nets; transactions settle the combined net.

```typescript
import type { FormatKey, FormatNets, ID, Round, RoundResult, Scores } from './types';
import { netScores } from './handicap';
import { scoreJunk } from './junk';
import { settle } from './settle';
import { playerIds } from './util';
import { scoreSkins } from './formats/skins';
import { scoreNassau } from './formats/nassau';
import { scoreWolf } from './formats/wolf';
import { scoreVegas } from './formats/vegas';
import { scoreBBB } from './formats/bbb';
import { scoreMatchplay } from './formats/matchplay';
import { scoreStrokeplay } from './formats/strokeplay';
import { scoreSixpoint } from './formats/sixpoint';

export const FORMAT_FNS: Record<FormatKey, (r: Round, s: Scores) => FormatNets> = {
  skins: scoreSkins, nassau: scoreNassau, wolf: scoreWolf, vegas: scoreVegas,
  bingoBangoBongo: scoreBBB, matchplay: scoreMatchplay,
  strokeplay: scoreStrokeplay, sixpoint: scoreSixpoint,
};

export function computeResults(round: Round): RoundResult {
  const scores = netScores(round);
  const { net: formatNet, detail } = FORMAT_FNS[round.format](round, scores);
  const junkNet = scoreJunk(round);
  const ids = playerIds(round);
  const combined: Record<ID, number> = {};
  for (const id of ids) combined[id] = (formatNet[id] ?? 0) + (junkNet[id] ?? 0);
  return {
    perPlayer: ids.map(id => ({
      playerId: id, formatNet: formatNet[id] ?? 0,
      junkNet: junkNet[id] ?? 0, total: combined[id],
    })),
    transactions: settle(combined),
    detail,
  };
}
```

**Property test:** seeded mulberry32 PRNG; for each format build valid rounds (right player counts, teams for vegas, decisions for wolf, events for BBB), random scores 2–8 over 50 iterations; assert `|Σ total| < 1e-6` and Σ transaction amounts ≈ Σ positive nets (±$0.02 rounding slack).
Commit: `feat(engine): dispatcher with all 8 formats + zero-sum property tests`.

---

### Task 13: Theme, fonts, shared components

**Files:** Create `press/src/theme/index.ts`, `press/src/components/{Card,SectionLabel,Knob,Stepper,PillButton}.tsx`; modify `press/app/_layout.tsx` (font loading + Stack with felt background, no header).

`theme/index.ts`: port prototype tokens —
```typescript
export const theme = {
  felt: '#10301f', feltDeep: '#0a2417', bone: '#f4efe1', boneDim: '#e7e0cd',
  ink: '#1c2620', brass: '#c9a24b', brassDim: '#9c7c34', clay: '#b4472f',
  up: '#2f7d4f', down: '#e88b72', line: 'rgba(244,239,225,0.14)',
  fontDisplay: 'Fraunces_600SemiBold', fontUI: 'HankenGrotesk_500Medium',
  fontUIBold: 'HankenGrotesk_700Bold', fontMono: 'DMMono_500Medium',
};
```
`_layout.tsx`: `useFonts` with `Fraunces_600SemiBold`, `HankenGrotesk_400Regular/500Medium/600SemiBold/700Bold`, `DMMono_400Regular/500Medium`; render `<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.felt } }} />` inside a felt-colored root View; keep splash until fonts load.

Components (View/Text/Pressable + StyleSheet, mirroring prototype visuals):
- `Card`: bone background, radius 18, shadow.
- `SectionLabel`: uppercase brass letter-spaced label.
- `Stepper`: −/+ round buttons (46px hit area) with `expo-haptics` `selectionAsync()` on press; props `{value, display?, onDec, onInc}`.
- `Knob`: labeled stepper row for config values (prefix/suffix support).
- `PillButton`: selectable chip (brass when selected).

Verify: `npx tsc --noEmit`. Commit: `feat(ui): theme, fonts, shared components`.

---

### Task 14: Round store + AsyncStorage persistence

**Files:** `press/src/store/roundStore.ts`, test `__tests__/roundStore.test.ts` (pure logic parts).

Zustand store with `persist` middleware (`createJSONStorage(() => AsyncStorage)`, name `press-active-round`):
```typescript
interface RoundState {
  round: Round | null;
  startRound: (r: Round) => void;
  setScore: (hole: number, playerId: ID, strokes: number) => void;
  setPar: (hole: number, par: number) => void;
  setWolf: (hole: number, d: WolfDecision) => void;
  addPress: (p: ManualPress) => void;
  toggleJunk: (e: JunkEvent) => void;   // adds, or removes identical event (tap again to undo)
  completeRound: () => void;            // status = 'complete'
  clearRound: () => void;
}
```
All mutators immutably update `round` (spread per the prototype's `setScores` pattern). `toggleJunk` for BBB also removes any same-type event on the same hole by another player (only one bingo per hole).
**Stepper default fix:** the STORE doesn't default; the Play screen passes explicit strokes. Test the toggle/replace logic with plain zustand (no AsyncStorage needed in test — use `createStore` without persist or mock storage).
Commit: `feat(state): persisted active-round store`.

---

### Task 15: History DB (expo-sqlite)

**Files:** `press/src/db/history.ts`.

```typescript
import * as SQLite from 'expo-sqlite';
// table: rounds(id TEXT PRIMARY KEY, created_at TEXT, format TEXT, num_holes INTEGER,
//               players TEXT, payload TEXT)  -- payload = JSON.stringify({round, result})
export function getDb() { /* openDatabaseSync('press.db'), CREATE TABLE IF NOT EXISTS */ }
export function saveRound(round: Round, result: RoundResult): void
export function listRounds(): HistoryRow[]   // id, createdAt, format, players[] names, winner summary
export function getRound(id: string): { round: Round; result: RoundResult } | null
export function deleteRound(id: string): void
```
Use sync API (`runSync`/`getAllSync`) — simple and fine at this scale. No unit test (native module); verified via History screen smoke test. `npx tsc --noEmit`. Commit: `feat(db): sqlite round history`.

---

### Task 16: Home screen

**Files:** Rewrite `press/app/index.tsx`.

- "Press" display title + "Golf Money Games" brass subtitle (per prototype header).
- Buttons: **New round** (→ `/setup`), **Resume round** (only when `round?.status === 'active'`; → `/play`), **History** (→ `/history`).
- Resume shows format + hole progress (count of entered holes).
Commit: `feat(ui): home screen`.

---

### Task 17: Setup screen

**Files:** `press/app/setup.tsx` (+ extract `src/components/setup/*` if it grows past ~300 lines).

Port prototype Setup, extended:
- Players 2–6 (name inputs, remove ×, add); optional handicap index input per player (numeric, shown when "Net scoring" toggled on).
- Holes 9/18 toggle.
- Format cards for all 8, gated by player count: skins 2–6, nassau 2 (+18 holes only), wolf 3–5, vegas exactly 4, bbb 2–6, matchplay 2, strokeplay 2–6, sixpoint exactly 3. Disabled cards show the reason (prototype pattern).
- Per-format knobs (defaults): skins value $5 + carryover toggle + valueMode toggle ("each player pays" / "total pot"); nassau perLeg $5, autoPress toggle, trigger 2; wolf $1/2×/3×; vegas $1 + flip toggle + team picker (tap 2 players for team 1); bbb $1; matchplay $10; strokeplay $1; sixpoint $1.
- Junk section: chips for greenie/sandie/barkie/chippie/birdie/eagle/polie/snake with per-type value knob when enabled (default $1). (bingo/bango/bongo never appear here.)
- Start: builds `Round` (`nanoid` not needed — use `Crypto.randomUUID()` via `expo-crypto` or `Math.random` fallback id helper in `src/engine/id.ts`), calls `startRound`, `router.replace('/play')`.
Commit: `feat(ui): setup screen with all formats, knobs, junk config`.

---

### Task 18: Play screen

**Files:** `press/app/play.tsx` (+ `src/components/play/*`: `StandingsStrip`, `ScoreRow`, `WolfPicker`, `JunkBar`).

Port prototype Play, extended:
- Standings strip: live `computeResults(round)` totals per player (memoized).
- Hole header: ‹ › navigation, big hole number, par stepper (3–6).
- Score rows: name (+wolf badge), relative-to-par tag, Stepper. **First tap lands ON par** (review fix): `onInc`/`onDec` use `cur = scores[h]?.[id] ?? (pars[h] ∓/± nothing)` — concretely: if no score yet, `+` sets `par` and `−` sets `par − 1`? NO — simpler and predictable: if no score entered yet, EITHER button sets it to par; subsequent taps adjust ±1. Haptics on every tap.
- Wolf picker card when `format === 'wolf'` (partner buttons exclude wolf, Lone ×N, Blind ×N).
- **Press button** when `format === 'nassau'`: shows current leg ("front"/"back" from hole index); tap → confirm → `addPress({leg, startHole: h})`; badge shows open press count. Hidden on total-only contexts (h ≥ 18 impossible).
- Junk bar: for each enabled junk type, row of player chips; tap toggles `JunkEvent` for current hole (highlight when awarded). For BBB format: three fixed rows (Bingo/Bango/Bongo).
- Footer: "Next hole →" / on last hole "Finish & settle up" → `completeRound()`, `router.push('/settle')`.
Commit: `feat(ui): play screen with steppers, wolf, presses, junk`.

---

### Task 19: Settle screen + share

**Files:** `press/app/settle.tsx` (+ `src/components/settle/SettleCard.tsx`).

- "The Damage" header (format · holes).
- Ranked net list (format + junk split shown small: "game +$12 · dots +$3").
- Settle-up card: transactions "X pays Y $N" (names via player lookup), or "All square."
- Format breakdown: wolf points, nassau legs+presses (from `detail.pressLog`), skins per player, sixpoint points, vegas points.
- **Share:** wrap cards in a `ViewShot` ref; share button → `captureRef` → `expo-sharing.shareAsync(uri)`.
- Buttons: "← Back to round" (only if came from active play — round status still complete? keep simple: always allow back), "Save & new round": `saveRound(round, result)` to SQLite, `clearRound()`, `router.replace('/')`.
Commit: `feat(ui): settle screen with share and history save`.

---

### Task 20: History screen

**Files:** `press/app/history.tsx`, `press/app/history/[id].tsx` — or single screen with detail modal; prefer `app/history.tsx` list + `app/round/[id].tsx` detail.

- List from `listRounds()`: date, format label, player names, top winner ("Bo +$24").
- Tap → detail view rendering the saved settle layout (read-only, from payload). Long-press or swipe → delete (confirm).
- Empty state: "No rounds yet. Go take someone's money."
Commit: `feat(ui): history list and round detail`.

---

### Task 21: Final verification

1. `npx jest` → all green.
2. `npx tsc --noEmit` → clean.
3. `npx expo start` smoke: app boots; create a 4-player skins round, enter 3 holes, finish, settle shows correct math (cross-check by hand), save → appears in history; kill/reload app mid-round → resume works.
4. Update `README.md` in `press/` (one-pager: what it is, run instructions, engine test command).
5. Final commit + update vault note per global instructions (new project → `~/Desktop/george/notes/projects/Press.md`, status entry in `~/Desktop/george/ops/status.md`).
