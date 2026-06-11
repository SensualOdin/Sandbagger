import { computeResults } from '../index';
import { mkRound } from '../testkit';
import type { FormatConfig, FormatKey, JunkEvent, Player, Round, Scores, WolfData } from '../types';

/** Deterministic PRNG so failures reproduce. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mkPlayers = (n: number): Player[] =>
  ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, n).map((id, i) => ({
    id,
    name: id,
    handicapIndex: i * 3,
  }));

interface Fixture {
  format: FormatKey;
  playerCount: number;
  config: (players: Player[]) => FormatConfig;
}

const FIXTURES: Fixture[] = [
  { format: 'skins', playerCount: 4, config: () => ({ skins: { value: 5, carryover: true, valueMode: 'perPlayer' } }) },
  { format: 'skins', playerCount: 3, config: () => ({ skins: { value: 6, carryover: false, valueMode: 'totalPot' } }) },
  { format: 'nassau', playerCount: 2, config: () => ({ nassau: { perLeg: 10, autoPress: true, pressTrigger: 2 } }) },
  { format: 'wolf', playerCount: 4, config: () => ({ wolf: { pointValue: 2, loneMult: 2, blindMult: 3 } }) },
  { format: 'wolf', playerCount: 5, config: () => ({ wolf: { pointValue: 1, loneMult: 3, blindMult: 4 } }) },
  { format: 'wolf', playerCount: 3, config: () => ({ wolf: { pointValue: 1, loneMult: 2, blindMult: 3 } }) },
  { format: 'vegas', playerCount: 4, config: (p) => ({ vegas: { pointValue: 1, flipBirds: true, teams: [[p[0].id, p[1].id], [p[2].id, p[3].id]] } }) },
  { format: 'bingoBangoBongo', playerCount: 4, config: () => ({ bingoBangoBongo: { pointValue: 1 } }) },
  { format: 'matchplay', playerCount: 2, config: () => ({ matchplay: { matchValue: 20 } }) },
  { format: 'strokeplay', playerCount: 4, config: () => ({ strokeplay: { perStroke: 1 } }) },
  { format: 'sixpoint', playerCount: 3, config: () => ({ sixpoint: { pointValue: 2 } }) },
];

const JUNK_TYPES = ['greenie', 'sandie', 'barkie', 'birdie', 'snake'] as const;

function randomRound(fixture: Fixture, rnd: () => number): Round {
  const players = mkPlayers(fixture.playerCount);
  const numHoles = 18;
  const scores: Scores = {};
  const wolf: WolfData = {};
  const events: JunkEvent[] = [];

  for (let h = 0; h < numHoles; h++) {
    if (rnd() < 0.15) continue; // some holes unentered (partial rounds must stay zero-sum)
    scores[h] = {};
    for (const p of players) scores[h][p.id] = 2 + Math.floor(rnd() * 7);
    if (fixture.format === 'wolf') {
      const r = rnd();
      const wolfId = players[h % players.length].id;
      const partners = players.filter((p) => p.id !== wolfId);
      wolf[h] =
        r < 0.5
          ? { mode: 'partner', partnerId: partners[Math.floor(rnd() * partners.length)].id }
          : r < 0.8
            ? { mode: 'lone' }
            : { mode: 'blind' };
    }
    if (fixture.format === 'bingoBangoBongo') {
      for (const t of ['bingo', 'bango', 'bongo'] as const) {
        if (rnd() < 0.8) events.push({ hole: h, type: t, playerId: players[Math.floor(rnd() * players.length)].id });
      }
    }
    if (rnd() < 0.3) {
      events.push({
        hole: h,
        type: JUNK_TYPES[Math.floor(rnd() * JUNK_TYPES.length)],
        playerId: players[Math.floor(rnd() * players.length)].id,
      });
    }
  }

  return mkRound({
    format: fixture.format,
    config: fixture.config(players),
    players,
    scores,
    wolf,
    useNetScoring: rnd() < 0.5,
    presses: fixture.format === 'nassau' && rnd() < 0.5 ? [{ leg: 'back', startHole: 12 }] : [],
    junk: {
      config: { enabled: ['greenie', 'sandie', 'barkie', 'birdie', 'snake'], values: { greenie: 1, sandie: 1, barkie: 2, birdie: 1, snake: 2 } },
      events,
    },
  });
}

describe('zero-sum property', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.format} (${fixture.playerCount}p) is always zero-sum and money is conserved`, () => {
      const rnd = mulberry32(42);
      for (let iter = 0; iter < 50; iter++) {
        const round = randomRound(fixture, rnd);
        const result = computeResults(round);
        const sum = result.perPlayer.reduce((a, p) => a + p.total, 0);
        expect(Math.abs(sum)).toBeLessThan(1e-6);
        // transactions cover what winners are owed, within cents rounding
        const positive = result.perPlayer.reduce((a, p) => a + Math.max(0, p.total), 0);
        const paid = result.transactions.reduce((a, t) => a + t.amount, 0);
        expect(Math.abs(paid - positive)).toBeLessThan(0.02);
      }
    });
  }
});
