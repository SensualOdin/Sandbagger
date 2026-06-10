# Press — Full Local-First Build: Design

**Date:** 2026-06-10
**Status:** Approved
**Scope:** MVP + v1.1 features from [the blueprint](../PRESS-build-blueprint.md), local-only (no backend)
**Reference:** [PRESS-build-blueprint.md](../PRESS-build-blueprint.md) (production map), [press-golf-games.jsx](../press-golf-games.jsx) (visual + logic prototype)

## Goal

A store-submittable, offline-first golf money-games app: single-phone scorekeeper that
computes every bet format and nets the group down to "who pays whom" in one tap.

## Decisions

- **Stack:** Expo (React Native) + TypeScript + expo-router + Zustand. Per blueprint §2.
- **Deviation from blueprint:** no `react-native-mmkv` (requires custom dev build).
  Use `@react-native-async-storage/async-storage` for active-round persistence and
  `expo-sqlite` for round history, so the app runs in **Expo Go** for instant on-device testing.
- **Repo layout:** this folder (`golf app/`) is the repo root. `docs/` holds the blueprint,
  prototype, and plans. `press/` is the Expo app.
- **No backend, no payments** in this build (blueprint Phase 2+).

## Engine (`press/src/engine/`)

Pure TypeScript. Never imports React. Takes a `Round`, returns a `RoundResult`.
Data model per blueprint §4 with adjustments below.

**Formats (all 8 wired into the dispatcher — fixes the blueprint gap where
`matchplay`/`strokeplay`/`sixpoint` were typed but unimplemented):**

| Format | Players | Notes |
|---|---|---|
| Skins | 2–6 | Carryover knob; **value-mode knob**: `$X per player` vs `$X total pot` (review fix #3) |
| Nassau | 2 | Front/back/total legs; **auto-press** (configurable trigger) **and manual presses** (review fix #5) — presses stack, each settles independently |
| Wolf | 3–5 | Rotating wolf, partner/lone/blind, configurable multipliers; generalized from the 4-player prototype |
| Vegas | 4 (2v2) | Team-number diff × point value; flip-the-bird knob |
| Bingo-Bango-Bongo | 2–6 | Event-based (first on, closest, first in) via junk-event mechanism |
| Match play | 2 | Holes up/down, dollar value per match |
| Stroke play | 2–6 | Total-strokes diff × per-stroke value, pairwise |
| Six-Point | 3 | Classic 6 points per hole split by rank |

**Layers (compose with any format):**
- **Junk/dots:** greenie, sandie, barkie, chippie, birdie, eagle, polie, snake (negative — committer pays).
  Each event pays winner from every other player.
- **Handicaps / net scoring:** stroke allocation by stroke index (wraps for >18), gross→net before format scoring.
- **Settle-up:** greedy minimal-transaction netting over combined (format + junk) nets.

**Engine invariant:** every format result is zero-sum. Enforced by a property test
across all formats (the money-bug tripwire).

## State & persistence

- Zustand store for the active round; persisted to AsyncStorage on every mutation
  (crash/refresh-safe mid-round — fixes the prototype's data loss).
- Completed rounds archived to SQLite (`rounds` table, JSON payload + summary columns)
  powering History.

## Screens (expo-router)

| Route | Screen | Notes |
|---|---|---|
| `/` | Home | New round / Resume active / History |
| `/setup` | Setup | Players (2–6), holes (9/18), format gating by player count, stakes knobs, junk config, handicaps |
| `/play` | Play | Score steppers (**first tap = par**, review fix #2), wolf picker, junk dot buttons, manual Press button (Nassau), live standings strip |
| `/settle` | Settle | "The Damage": ranked nets, who-pays-whom, format breakdown, share as image |
| `/history` | History | Past rounds from SQLite, tap to view settle screen |

On-course UX rules (blueprint §7): big tap targets, no keyboards after setup, haptics on
score taps, high contrast, one-handed reach.

## Theme

Port prototype tokens: felt `#10301f`, bone `#f4efe1`, brass `#c9a24b`, clay `#b4472f`.
Fonts via `@expo-google-fonts`: Fraunces (display), Hanken Grotesk (UI), DM Mono (numbers).

## Testing

- Jest unit tests per format with hand-computed scenarios.
- Zero-sum property test across all formats/configs.
- Settle-up tests: minimal transactions, conservation of money, rounding.
- Junk + handicap layer tests.

## Out of scope

Supabase accounts/sync, live multi-device rounds, RevenueCat/monetization, store
submission assets, GPS/course database.
