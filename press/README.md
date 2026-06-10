# Press — Golf Money Games

A fast, single-phone, betting-first golf scorekeeper. One person tracks for the group;
Press computes every side game and nets everyone down to "who pays whom" in one tap.
It never moves money — it's a calculator, not a gambling app.

## Formats

Skins (carryover + value-mode house rules), Nassau (auto + manual presses), Wolf (3–5
players, lone/blind multipliers), Vegas (flip-the-bird), Bingo-Bango-Bongo, Match play,
Stroke play, Six-Point — plus a junk/dots layer (greenie, sandie, barkie, chippie,
birdie, eagle, polie, snake) on top of any format, and optional handicap/net scoring.

## Run it

```bash
npm install
npx expo start        # scan the QR with Expo Go, or press i for the iOS simulator
```

Fully offline. The active round survives app restarts (AsyncStorage); finished rounds
are archived locally (SQLite) under History.

## Engine

All money math lives in `src/engine/` — pure TypeScript, no React imports.
Every format is unit-tested with hand-computed scenarios plus a seeded property test
asserting every result is zero-sum and settle-up conserves money:

```bash
npx jest src/engine
```

## Layout

```
src/
  app/         expo-router screens (index, setup, play, settle, history, round/[id])
  engine/      scoring engine: formats/, junk, handicap, settle, dispatcher
  store/       zustand active-round store (AsyncStorage-persisted)
  db/          sqlite round history
  components/  Card, Stepper, Knob, PillButton, play/, settle/
  theme/       felt/brass/bone tokens + fonts
```

Reference docs live in the repo root under `docs/` (build blueprint, design doc, plans).
