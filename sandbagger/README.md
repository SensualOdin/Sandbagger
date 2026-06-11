# Sandbagger — Golf Money Games

*Trust the card, not the player.*

A fast, single-phone, betting-first golf scorekeeper. One person tracks for the group;
Sandbagger computes every side game and nets everyone down to "who pays whom" in one
tap. It never moves money — it's a calculator, not a gambling app.

## Formats

Skins (carryover + value-mode house rules), Nassau (auto + manual presses), Wolf (3–5
players, lone/blind multipliers), Vegas (flip-the-bird), Bingo-Bango-Bongo, Match play,
Stroke play, Six-Point — plus a junk/dots layer (greenie, sandie, barkie, chippie,
birdie, eagle, polie) and the snake (hot-potato pot: grows every hole, last 3-putt
holds it, holder pays at the end), and optional handicap/net scoring.

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
  store/       zustand active-round store (AsyncStorage-persisted, hydration-gated)
  db/          sqlite round history
  components/  Backdrop, Crest, Plaque, Rule, TicketEdge, Card, Stepper, play/, settle/
  theme/       "private club ledger" design tokens + fonts
```

Reference docs live in the repo root under `docs/` (build blueprint, design doc, plans
— written under the working title "Press").
