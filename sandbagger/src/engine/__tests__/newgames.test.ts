import { scoreAceyDeucey } from '../formats/aceyDeucey';
import { scoreStableford } from '../formats/stableford';
import { computeResults } from '../index';
import { rabbitHolder, scoreJunk } from '../junk';
import { expectZeroSum, mkRound, scoresFrom } from '../testkit';

const three = [
  { id: 'A', name: 'Al' },
  { id: 'B', name: 'Bo' },
  { id: 'C', name: 'Cy' },
];
const four = [...three, { id: 'D', name: 'Di' }];

describe('scoreStableford', () => {
  // Par 4s. H0: A birdie, B par, C bogey. H1: A par, B par, C double.
  const scores = scoresFrom({
    0: { A: 3, B: 4, C: 5 },
    1: { A: 4, B: 4, C: 6 },
  });

  it('classic scoring pays pairwise points differences', () => {
    const round = mkRound({
      formats: ['stableford'],
      config: { stableford: { pointValue: 1, modified: false } },
      players: three,
      scores,
    });
    const { net, detail } = scoreStableford(round, scores);
    expect(detail.pts).toEqual({ A: 5, B: 4, C: 1 }); // 3+2 / 2+2 / 1+0
    expect(net).toEqual({ A: 5, B: 2, C: -7 });
    expectZeroSum(net);
  });

  it('modified scoring swings harder', () => {
    const round = mkRound({
      formats: ['stableford'],
      config: { stableford: { pointValue: 1, modified: true } },
      players: three,
      scores,
    });
    const { detail } = scoreStableford(round, scores);
    expect(detail.pts).toEqual({ A: 2, B: 0, C: -4 }); // 2+0 / 0+0 / -1-3
  });
});

describe('scoreAceyDeucey', () => {
  it('ace collects from all, deuce pays all', () => {
    const scores = scoresFrom({ 0: { A: 2, B: 3, C: 3, D: 5 } });
    const round = mkRound({
      formats: ['aceyDeucey'],
      config: { aceyDeucey: { aceValue: 2, deuceValue: 1 } },
      players: four,
      scores,
    });
    const { net, detail } = scoreAceyDeucey(round, scores);
    expect(net).toEqual({ A: 7, B: -1, C: -1, D: -5 });
    expect(detail.aces).toEqual({ A: 1, B: 0, C: 0, D: 0 });
    expect(detail.deuces).toEqual({ A: 0, B: 0, C: 0, D: 1 });
    expectZeroSum(net);
  });

  it('ties kill the ace and the deuce', () => {
    const scores = scoresFrom({ 0: { A: 3, B: 3, C: 5, D: 5 } });
    const round = mkRound({
      formats: ['aceyDeucey'],
      config: { aceyDeucey: { aceValue: 2, deuceValue: 1 } },
      players: four,
      scores,
    });
    expect(scoreAceyDeucey(round, scores).net).toEqual({ A: 0, B: 0, C: 0, D: 0 });
  });
});

describe('rabbit', () => {
  const rabbitRound = (scores: ReturnType<typeof scoresFrom>) =>
    mkRound({
      formats: ['skins'],
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      players: three,
      scores,
      junk: { config: { enabled: ['rabbit'], values: { rabbit: 1 } }, events: [] },
    });

  it('last outright hole winner holds it and collects the pot', () => {
    const scores = scoresFrom({
      0: { A: 3, B: 4, C: 4 }, // A takes the rabbit
      1: { A: 4, B: 3, C: 4 }, // B takes it
      2: { A: 4, B: 4, C: 4 }, // tie: B keeps it
    });
    const round = rabbitRound(scores);
    expect(rabbitHolder(round)).toBe('B');
    const net = scoreJunk(round);
    expect(net).toEqual({ A: -1.5, B: 3, C: -1.5 }); // pot = $1 x 3 holes
    expectZeroSum(net);
  });

  it('pays nothing when no hole is won outright', () => {
    const scores = scoresFrom({ 0: { A: 4, B: 4, C: 4 } });
    expect(scoreJunk(rabbitRound(scores))).toEqual({ A: 0, B: 0, C: 0 });
  });
});

describe('greenie carryover', () => {
  it('rolls unwon par-3 value onto the next greenie', () => {
    const round = mkRound({
      formats: ['skins'],
      config: { skins: { value: 5, carryover: true, valueMode: 'perPlayer' } },
      players: three,
      numHoles: 9,
      holes: [3, 4, 3, 4, 3, 4, 4, 4, 4].map((par, i) => ({ par, strokeIndex: i + 1 })),
      scores: scoresFrom(
        Object.fromEntries(Array.from({ length: 6 }, (_, h) => [h, { A: 4, B: 4, C: 4 }]))
      ),
      junk: {
        config: { enabled: ['greenie'], values: { greenie: 1 }, greenieCarryover: true },
        events: [{ hole: 4, type: 'greenie', playerId: 'A' }], // H0 and H2 par 3s unwon
      },
    });
    const net = scoreJunk(round);
    expect(net).toEqual({ A: 6, B: -3, C: -3 }); // $1 x (1 + 2 carried)
    expectZeroSum(net);
  });
});

describe('multi-game rounds', () => {
  it('sums nets across games and junk, with per-format splits', () => {
    // Heads-up: skins + matchplay + a greenie
    const scores = scoresFrom({ 0: { A: 3, B: 4 }, 1: { A: 4, B: 4 } });
    const round = mkRound({
      formats: ['skins', 'matchplay'],
      config: {
        skins: { value: 5, carryover: true, valueMode: 'perPlayer' },
        matchplay: { matchValue: 10 },
      },
      scores,
      junk: {
        config: { enabled: ['greenie'], values: { greenie: 2 } },
        events: [{ hole: 0, type: 'greenie', playerId: 'B' }],
      },
    });
    const result = computeResults(round);
    const a = result.perPlayer.find((p) => p.playerId === 'A')!;
    expect(a.byFormat).toEqual({ skins: 5, matchplay: 10 });
    expect(a).toMatchObject({ formatNet: 15, junkNet: -2, total: 13 });
    expect(result.transactions).toEqual([{ from: 'B', to: 'A', amount: 13 }]);
    expect(result.details.skins).toBeDefined();
    expect(result.details.matchplay).toBeDefined();
    const sum = result.perPlayer.reduce((acc, p) => acc + p.total, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-9);
  });
});
