# PRESS — Golf Money Games

### The complete build blueprint: prototype → App Store + Google Play

This is the master document for turning the working prototype into a real, submittable, monetizable app. It assumes you (the builder) are comfortable with React/TypeScript, SQL, and have shipped to TestFlight before — so it's concrete, not hand-wavy. Work top to bottom; each section is sequenced so you're never blocked.

---

## 0. The one-paragraph thesis

Every golfer who bets has the same problem: scoring is easy, but the *money math* is a nightmare. Nassau presses, skins carryovers, Wolf multipliers, and a pile of junk dots turn the 18th green into an argument. The existing apps (18Birdies, GolfGameBook, TheGrint) treat betting as a bolt-on to a bloated GPS/social platform. **Press is the opposite: a fast, single-phone, betting-first scorekeeper that nets everyone down to "who pays whom" in one tap.** The wedge is doing the one annoying thing extremely well, then expanding.

---

## 1. Competitive landscape & positioning

| App | Strength | Weakness you exploit |
|---|---|---|
| 18Birdies | Huge feature set, GPS, AI caddie | Bloated; betting buried; subscription-heavy |
| Golf GameBook | Social scoring, live tournaments | Betting math limited; needs everyone on the app |
| TheGrint | Handicap tracking (USGA-ish) | Not built for side games |
| Hello Birdie / various | Simple skins calculators | One format, no settle-up netting |

**Positioning:** "The fastest way to track golf bets and settle up." Not a GPS app. Not a social network. A betting calculator that happens to keep score. Single-phone first means you don't need 4 downloads to play — one person tracks for the group. That's the adoption cheat code.

**Differentiators to lead with:**
1. One-tap **settle-up netting** (minimal transactions).
2. **Configurable house rules** — every group plays Wolf differently; let them set the knobs.
3. **Offline-first** — courses have terrible signal. The app must work in airplane mode.
4. **Junk/dots layered on any format** — the thing dedicated bettors actually want.

---

## 2. Tech stack decision

You built the prototype in React. The cleanest path to *both* stores from one codebase is **React Native via Expo**. You reuse all your scoring logic (it's pure TypeScript) and most of your mental model.

**Recommended stack:**

- **Expo (React Native)** — managed workflow, one codebase → iOS + Android. EAS Build/Submit handles native builds in the cloud (no Mac required for Android; Mac still simplest for iOS but EAS can build iOS in the cloud too).
- **TypeScript** — non-negotiable; the scoring engine *must* be typed.
- **State:** Zustand (tiny, no boilerplate) for game state. Avoid Redux overkill.
- **Local persistence:** `expo-sqlite` or `react-native-mmkv` for round history. MMKV is faster for key-value; SQLite if you want queryable history/stats.
- **Navigation:** `expo-router` (file-based, like Next.js).
- **Backend (Phase 2+):** Supabase — Postgres + Auth + Realtime. You already use it; it's the right call for optional cloud sync and live multi-device rounds later. **MVP needs no backend at all** — ship fully local first.
- **Build/submit:** EAS (`eas build`, `eas submit`).

**Why not native Swift/Kotlin twice?** You'd double the work and can't reuse the engine. You shipped ChickenTinders in Swift — you know the cost. Expo gets you to both stores from the React code you already wrote.

**Why not stay web/PWA?** Stores reward native; discovery, push notifications, offline, and monetization (IAP) all work better. PWA can be a marketing companion later.

---

## 3. Project setup (do this first)

```bash
# Scaffold
npx create-expo-app@latest press --template tabs   # TypeScript + expo-router
cd press

# Core deps
npx expo install expo-sqlite expo-haptics expo-font expo-status-bar
npm install zustand nanoid
npm install -D typescript @types/react

# (Phase 2) backend + payments
npx expo install @supabase/supabase-js react-native-mmkv
npm install react-native-purchases   # RevenueCat for IAP/subscriptions

# Dev
npx expo start          # scan QR with Expo Go on your phone
```

**Folder structure:**

```
press/
  app/                    # expo-router screens
    index.tsx             # home / new round
    setup.tsx             # players, format, stakes
    play/[hole].tsx       # hole-by-hole entry
    settle.tsx            # results + payouts
    history/index.tsx     # past rounds
  src/
    engine/               # ⭐ the heart — pure, testable, no UI
      types.ts
      formats/
        skins.ts
        nassau.ts
        wolf.ts
        vegas.ts
        bingoBangoBongo.ts
      junk.ts
      settle.ts
      index.ts            # computeResults() dispatcher
    store/                # zustand stores
    db/                   # sqlite wrappers
    theme/                # design tokens (port from prototype)
    components/           # Stepper, PlayerRow, StandingsStrip, Knob
  assets/                 # icon, splash, fonts
  app.json                # Expo config
  eas.json                # build profiles
```

The golden rule: **the engine never imports React.** It takes data in, returns results out. That makes it unit-testable and reusable on a future backend.

---

## 4. The data model (TypeScript)

This is the contract everything else is built on. Put it in `src/engine/types.ts`.

```typescript
export type ID = string;

export interface Player {
  id: ID;
  name: string;
  handicapIndex?: number;     // optional; enables net scoring
}

export type FormatKey =
  | 'skins' | 'nassau' | 'wolf' | 'vegas' | 'bingoBangoBongo'
  | 'matchplay' | 'strokeplay' | 'sixpoint';

export interface HoleInfo {
  par: number;
  strokeIndex: number;        // 1..18, for allocating handicap strokes
  yardage?: number;
}

export interface Course {
  id: ID;
  name: string;
  holes: HoleInfo[];          // length 9 or 18
}

// Raw input: strokes[holeIndex][playerId] = gross strokes
export type Scores = Record<number, Record<ID, number>>;

// Per-format configuration ("the knobs")
export interface FormatConfig {
  skins?: { value: number; carryover: boolean };
  nassau?: { perLeg: number; autoPress: boolean; pressTrigger: number }; // press when N down
  wolf?: { pointValue: number; loneMult: number; blindMult: number; players: 3 | 4 | 5 };
  vegas?: { pointValue: number; flipBirds: boolean };
  bingoBangoBongo?: { pointValue: number };
}

// Wolf decisions per hole
export interface WolfDecision { mode: 'partner' | 'lone' | 'blind'; partnerId?: ID; }
export type WolfData = Record<number, WolfDecision>;

// Bingo/Bango/Bongo & junk are event-based, not score-derived:
export type JunkType =
  | 'greenie' | 'sandie' | 'barkie' | 'chippie' | 'birdie'
  | 'eagle' | 'snake' | 'polie' | 'bingo' | 'bango' | 'bongo';

export interface JunkEvent { hole: number; type: JunkType; playerId: ID; }

export interface JunkConfig {
  enabled: JunkType[];
  values: Partial<Record<JunkType, number>>;  // dollars per dot
}

export interface Round {
  id: ID;
  createdAt: string;
  course?: Course;
  numHoles: 9 | 18;
  players: Player[];
  format: FormatKey;
  config: FormatConfig;
  useNetScoring: boolean;
  scores: Scores;
  wolf?: WolfData;
  junk?: { config: JunkConfig; events: JunkEvent[] };
  status: 'active' | 'complete';
}

// Engine output
export interface PlayerResult {
  playerId: ID;
  net: number;                 // dollars; + = won, - = owed
  points?: number;             // for points games
  detail?: Record<string, unknown>;
}

export interface RoundResult {
  perPlayer: PlayerResult[];
  transactions: Transaction[]; // settle-up
  byFormat: number;            // main game total
  byJunk: number;              // junk total
}

export interface Transaction { from: ID; to: ID; amount: number; }
```

---

## 5. The scoring engine (production version)

Port and harden the prototype's `computeResults`. This is your moat — make it bulletproof and unit-test every format.

### 5.1 Net scoring (handicaps)

Before any format runs, optionally convert gross → net. Standard allocation: a player receiving `S` strokes gets one stroke on each of the `S` lowest-stroke-index holes (wrapping for S>18).

```typescript
export function strokesReceived(player: Player, holes: HoleInfo[], handicapPct = 1): number[] {
  const idx = player.handicapIndex ?? 0;
  const course = Math.round(idx * handicapPct); // simplify; real WHS uses slope/rating
  return holes.map(h => {
    let s = 0;
    if (course >= h.strokeIndex) s += 1;
    if (course >= h.strokeIndex + 18) s += 1; // second stroke for high handicaps
    return s;
  });
}

export function netScores(round: Round): Scores {
  if (!round.useNetScoring || !round.course) return round.scores;
  const out: Scores = {};
  const allocs = Object.fromEntries(
    round.players.map(p => [p.id, strokesReceived(p, round.course!.holes)])
  );
  for (let h = 0; h < round.numHoles; h++) {
    out[h] = {};
    for (const p of round.players) {
      const gross = round.scores[h]?.[p.id];
      if (gross != null) out[h][p.id] = gross - allocs[p.id][h];
    }
  }
  return out;
}
```

### 5.2 Skins (`formats/skins.ts`)

```typescript
export function scoreSkins(round: Round, scores: Scores) {
  const ids = round.players.map(p => p.id);
  const value = round.config.skins!.value;
  const carryEnabled = round.config.skins!.carryover;
  const skinsWon: Record<string, number> = Object.fromEntries(ids.map(i => [i, 0]));
  let carry = 0;
  for (let h = 0; h < round.numHoles; h++) {
    const entered = ids.every(i => scores[h]?.[i] != null);
    if (!entered) continue;
    const vals = ids.map(i => scores[h][i]);
    const min = Math.min(...vals);
    const winners = ids.filter(i => scores[h][i] === min);
    const units = 1 + carry;
    if (winners.length === 1) { skinsWon[winners[0]] += units; carry = 0; }
    else { carry = carryEnabled ? carry + 1 : 0; }
  }
  const total = Object.values(skinsWon).reduce((a, b) => a + b, 0);
  const n = ids.length;
  // zero-sum payout: each skin transfers `value` from every non-winner to winner
  return ids.map(id => ({ playerId: id, net: value * (skinsWon[id] * n - total),
    detail: { skinsWon: skinsWon[id] } }));
}
```

### 5.3 Nassau with presses (`formats/nassau.ts`)

Presses are the hard part. A press is a *new* match that starts mid-leg when a side goes `pressTrigger` holes down, running from that hole to the end of the leg. Model each leg as the base match plus a list of presses, each settled independently.

```typescript
type Leg = { start: number; end: number };
const LEGS: Record<string, Leg> = {
  front: { start: 0, end: 9 }, back: { start: 9, end: 18 }, total: { start: 0, end: 18 },
};

function matchMargin(scores: Scores, a: string, b: string, start: number, end: number, n: number) {
  // returns running diff and per-hole margins for press detection
  let diff = 0; const running: number[] = [];
  for (let h = start; h < Math.min(end, n); h++) {
    const sa = scores[h]?.[a], sb = scores[h]?.[b];
    if (sa != null && sb != null) diff += sa < sb ? 1 : sb < sa ? -1 : 0;
    running.push(diff);
  }
  return { final: diff, running };
}

export function scoreNassau(round: Round, scores: Scores) {
  const [a, b] = round.players.map(p => p.id);
  const { perLeg, autoPress, pressTrigger } = round.config.nassau!;
  let netA = 0;
  const legsDetail: Record<string, number> = {};
  for (const [name, leg] of Object.entries(LEGS)) {
    if (name === 'total' && round.numHoles < 18) continue;
    const { final, running } = matchMargin(scores, a, b, leg.start, leg.end, round.numHoles);
    netA += Math.sign(final) * perLeg;
    legsDetail[name] = final;
    // auto-press: when |margin| hits trigger, open a press from that hole to leg end
    if (autoPress) {
      for (let i = 0; i < running.length; i++) {
        if (Math.abs(running[i]) >= pressTrigger) {
          const pressStart = leg.start + i + 1;
          const press = matchMargin(scores, a, b, pressStart, leg.end, round.numHoles);
          netA += Math.sign(press.final) * perLeg;
          break; // one auto-press per leg in MVP; allow manual stacking later
        }
      }
    }
  }
  return [
    { playerId: a, net: netA, detail: { legs: legsDetail } },
    { playerId: b, net: -netA, detail: {} },
  ];
}
```

> Real Nassau presses can stack and be manual. Ship auto-press (one per leg) first; add manual "Press now" buttons in v1.1.

### 5.4 Wolf (`formats/wolf.ts`)

Port the prototype's logic; it's already correct and zero-sum. Generalize partner/best-ball for 3/4/5 players and keep multipliers configurable. (See prototype `computeResults` Wolf branch — that's the reference implementation.)

### 5.5 Vegas & Bingo-Bango-Bongo

- **Vegas:** combine each team's two scores into a number (low digit first; double-digit goes first; "flip the bird" reverses opponent digits on a birdie). Diff between team numbers × point value.
- **BBB:** purely event-based — three dots per hole (first on green, closest once all on, first in hole). Comes from `JunkEvent`s, not strokes. The user taps who got each.

### 5.6 Junk layer (`junk.ts`)

Junk runs *on top of* any format. Each event is worth its configured dollar value, paid by everyone else (or split — your call; default: each other player pays the value).

```typescript
export function scoreJunk(round: Round): Record<string, number> {
  const ids = round.players.map(p => p.id);
  const net: Record<string, number> = Object.fromEntries(ids.map(i => [i, 0]));
  if (!round.junk) return net;
  const { values } = round.junk.config;
  for (const e of round.junk.events) {
    const v = values[e.type] ?? 0;
    const isNegative = e.type === 'snake'; // 3-putt etc.
    const amt = isNegative ? -v : v;
    // winner collects `amt` from each other player (negative = pays everyone)
    for (const id of ids) {
      if (id === e.playerId) net[id] += amt * (ids.length - 1);
      else net[id] -= amt;
    }
  }
  return net;
}
```

### 5.7 Settle-up (`settle.ts`)

```typescript
export function settle(net: Record<string, number>): Transaction[] {
  const creditors = Object.entries(net).filter(([, v]) => v > 0.001)
    .map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const debtors = Object.entries(net).filter(([, v]) => v < -0.001)
    .map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const tx: Transaction[] = []; let i = 0, j = 0;
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

### 5.8 Dispatcher (`engine/index.ts`)

```typescript
export function computeResults(round: Round): RoundResult {
  const scores = netScores(round);
  const formatFn = { skins: scoreSkins, nassau: scoreNassau, wolf: scoreWolf,
    vegas: scoreVegas, bingoBangoBongo: scoreBBB }[round.format];
  const formatResults = formatFn(round, scores);
  const junkNet = scoreJunk(round);
  const combined: Record<string, number> = {};
  for (const r of formatResults) combined[r.playerId] = r.net + (junkNet[r.playerId] ?? 0);
  return {
    perPlayer: round.players.map(p => ({ playerId: p.id, net: combined[p.id],
      detail: formatResults.find(r => r.playerId === p.id)?.detail })),
    transactions: settle(combined),
    byFormat: formatResults.reduce((a, r) => a + Math.max(0, r.net), 0),
    byJunk: Object.values(junkNet).reduce((a, v) => a + Math.max(0, v), 0),
  };
}
```

**Test it.** Every format gets a `*.test.ts` with hand-computed scenarios. This is where bugs cost you 1-star reviews — golfers will scream if the money's wrong.

---

## 6. Feature roadmap

### MVP (ship this to the stores)
- Players (2–6), course/par setup (or generic), 9/18 holes
- Formats: **Skins, Nassau, Wolf, Stroke/Match play**
- Hole-by-hole entry, live standings, settle-up netting
- Local round history (SQLite)
- Fully offline
- Polished UI (port the prototype's look)

### v1.1
- **Junk/dots** layer + Bingo-Bango-Bongo
- Nassau **manual presses**
- **Handicap/net scoring**
- Share results (text/image of the settle-up)
- Vegas, Six-Point

### v2 (backend era — Supabase)
- Accounts + cloud sync of history
- **Live multi-device rounds** (Supabase Realtime): each player on their own phone, scores sync
- Friends, stats dashboard (your BI wheelhouse — win rate by format, $ over time, "nemesis" tracking)
- Course database (import via a hole/par API)

### v3
- Tournaments / leagues, season-long ledgers
- Apple Watch companion for quick score entry
- "Course mode" GPS (only if users demand it — resist bloat)

---

## 7. Screen inventory & UX notes

| Screen | Purpose | Notes |
|---|---|---|
| Home | New round / resume / history | Big "New Round" CTA |
| Setup | Players, format, stakes, knobs | Gate formats by player count (already designed) |
| Play (per hole) | Score steppers, format inputs, live standings | Big tap targets; works one-handed; haptics on tap |
| Settle | Net result + transactions + breakdown | The hero screen; make it shareable |
| History | Past rounds, re-open, stats | SQLite-backed |

**On-course UX is the whole game.** Sunlight, gloves, one hand, bad signal. That means: large steppers (no keyboards), high-contrast theme, instant offline saves, haptic feedback, and a layout that survives being glanced at between shots. The prototype already nails the stepper pattern — keep it.

---

## 8. Backend (Phase 2) — Supabase schema

MVP is local-only. When you add accounts and live sync, this is the schema:

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  handicap_index numeric,
  created_at timestamptz default now()
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  owner uuid references profiles(id),
  course_name text,
  num_holes int not null check (num_holes in (9, 18)),
  format text not null,
  config jsonb not null,
  use_net_scoring bool default false,
  status text default 'active',
  created_at timestamptz default now()
);

create table round_players (
  round_id uuid references rounds(id) on delete cascade,
  player_id uuid references profiles(id),
  guest_name text,                 -- for non-app friends
  primary key (round_id, player_id)
);

create table scores (
  round_id uuid references rounds(id) on delete cascade,
  hole int not null,
  player_id uuid,
  strokes int,
  primary key (round_id, hole, player_id)
);

create table junk_events (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  hole int, type text, player_id uuid
);

-- Row Level Security: users only see rounds they own or are in
alter table rounds enable row level security;
create policy "own or participant" on rounds for select
  using (owner = auth.uid() or exists (
    select 1 from round_players rp where rp.round_id = id and rp.player_id = auth.uid()));
```

Use **Supabase Realtime** on the `scores` table for live multi-phone rounds. The same engine runs client-side on the synced data — no server compute needed.

---

## 9. ⚠️ App store gambling policy (read this twice)

This is the section that decides whether you get approved. Press **tracks** bets between friends; it must **never process real money**. Treat it like a calculator, and you're in the same lane as dozens of approved skins apps. Cross the line into handling stakes, and you're a regulated gambling app.

**Hard rules:**
- **No in-app money movement.** No deposits, no payouts, no linking Venmo/PayPal to "settle" inside the app. The app shows *who owes whom*; people settle themselves. (Linking out to Venmo is a gray area — safest MVP move is don't.)
- **Frame it as scorekeeping** for "friendly wagers among friends," not gambling. Copy and store listing matter.
- **Age rating:** Set **17+ (Apple)** / appropriate Google rating. Add a "simulated gambling" / frequent gambling reference flag honestly in the questionnaire.
- **Apple Guideline 5.3 (Gaming, Gambling, Lotteries):** real-money gaming needs licensing/geo-restriction. You avoid this by *not* being real-money. Google has an equivalent **Real-Money Gambling policy** — same logic.
- **Disclaimers in-app + in listing:** "Press is a score and side-game tracker for recreational play. It does not facilitate, process, or enable real-money gambling. Settle responsibly and legally in your jurisdiction."
- Include a **Terms of Service** and **Privacy Policy** (required by both stores). Host them on a simple page (Vercel works).

> Not legal advice — I'm not a lawyer. Betting laws vary by state/country. If you ever add real-money rails, get a gaming attorney first. For a tracker that moves no money, the above keeps you in the approvable lane.

---

## 10. Branding & ASO

- **Name:** "Press" is clean and on-theme (a press is a bet) but check trademark/availability on both stores; it's a common word so you may need "Press: Golf Bets" or a distinct mark. Alternatives to check: *Skins Ledger, Wolfpack, Dormie, Press Golf, BetThe Card.*
- **App Store keywords:** golf betting, skins, nassau, wolf, golf games, scorecard, golf bet tracker, side games, golf wager.
- **Icon:** Bold, legible at 1024px and tiny. A single strong mark (e.g., a poker-chip-meets-golf-ball, or a stylized "P" on felt green) beats a busy scene.
- **Screenshots:** Lead with the **settle-up screen** ("Settle up in one tap") — that's the hook. Then Wolf partner picker, live standings, format variety.

---

## 11. Store submission playbook

### Accounts & costs
- **Apple Developer Program:** $99/year. Enroll early (verification can take days).
- **Google Play Developer:** $25 one-time. Newer accounts may need a short closed-testing period (e.g., ~12–14 testers for ~2 weeks) before production — start this early.

### Build & submit with EAS

```bash
npm install -g eas-cli
eas login
eas build:configure
# Build store binaries
eas build --platform ios --profile production
eas build --platform android --profile production
# Submit
eas submit --platform ios --latest
eas submit --platform android --latest
```

`eas.json` profiles control versioning and signing; EAS manages credentials so you don't wrestle provisioning profiles by hand.

### Pre-submission checklist
- [ ] App icon (1024×1024) + adaptive Android icon + splash
- [ ] Screenshots for required device sizes (iPhone 6.7"/6.5", iPad if supported; Android phone/tablet)
- [ ] App name, subtitle, description, keywords, category (Sports)
- [ ] **Privacy Policy URL + Terms URL** (host on Vercel)
- [ ] Apple **Privacy Nutrition Labels** / Google **Data Safety form** — declare what you collect (MVP local-only: "no data collected" is your friend)
- [ ] Age rating questionnaire (answer gambling-reference honestly → 17+)
- [ ] Test on real devices (iOS + a couple Android screen sizes)
- [ ] TestFlight beta (you've done this) + Google closed test before production
- [ ] Support URL / contact email
- [ ] Demo account or notes for reviewers explaining no real money is handled

### Common rejection causes (avoid these)
- Crashes on reviewer's device → test cold-start offline.
- Gambling concerns → lean hard on the framing/disclaimers in §9.
- Missing privacy policy → have it ready.
- "Not enough functionality" → MVP must feel complete; the settle-up + 4 formats clears this bar.

---

## 12. Monetization

Don't gate the core loop — golfers will abandon. Use a **freemium** model via **RevenueCat** (wraps StoreKit + Google Billing, handles receipts cross-platform):

- **Free:** Skins, Nassau, Wolf, stroke/match play; single-phone; last 5 rounds of history.
- **Press Pro (~$3.99/mo or $19.99/yr):**
  - All formats + junk/dots + presses
  - Unlimited history + **stats dashboard** (your BI strength — make this genuinely good)
  - Live multi-phone rounds (Phase 2)
  - Custom house-rule presets you save per group
  - Export/share settle-up as image
- **Tip jar / one-time unlock** as an alternative to subscription fatigue.

Pricing logic: betting golfers are not cheap and they play weekly. The value metric is "never argue about money again." $20/yr is trivial against a $20 Nassau.

---

## 13. Suggested timeline (solo, nights/weekends)

| Phase | Scope | Rough effort |
|---|---|---|
| 1 | Expo scaffold, port engine to TS, unit tests | 1–2 weeks |
| 2 | MVP screens (setup/play/settle/history), local persistence | 2–3 weeks |
| 3 | Polish, icon, screenshots, legal pages | 1 week |
| 4 | TestFlight + Google closed test, fix feedback | 1–2 weeks |
| 5 | Submit to both stores | review: days–2 weeks |
| 6 | v1.1: junk, presses, handicaps | post-launch |
| 7 | v2: Supabase accounts + live sync + stats | post-launch |

---

## 14. Immediate next actions

1. `create-expo-app`, get the engine compiling in TS with one passing Skins test.
2. Port the prototype theme tokens and the Stepper/PlayerRow components.
3. Build the three MVP screens against the engine.
4. Enroll in Apple Developer + Google Play **now** (the clock and verification are the real bottleneck).
5. Stand up the Privacy Policy / ToS page on Vercel.
6. Stub the gambling disclaimers into onboarding from day one.

The engine is the asset. Everything else is UI and paperwork. You've already proven the hard part works.

---

*Build doc v1 — companion to the working prototype (`press-golf-games.jsx`). Treat the prototype as the visual + logic reference and this as the production map.*
