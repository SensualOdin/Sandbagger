import { scoreVegas, teamNumber } from '../formats/vegas';
import { expectZeroSum, mkRound, scoresFrom } from '../testkit';

const four = [
  { id: 'A', name: 'Al' },
  { id: 'B', name: 'Bo' },
  { id: 'C', name: 'Cy' },
  { id: 'D', name: 'Di' },
];

const vegasRound = (scores: ReturnType<typeof scoresFrom>, flipBirds = true) =>
  mkRound({
    formats: ['vegas'],
    config: { vegas: { pointValue: 1, flipBirds, teams: [['A', 'B'], ['C', 'D']] } },
    players: four,
    scores,
  });

describe('teamNumber', () => {
  it('puts the low score first', () => expect(teamNumber(5, 4, false)).toBe(45));
  it('reverses when flipped', () => expect(teamNumber(4, 5, true)).toBe(54));
  it('puts a 10+ score first regardless of flip', () => {
    expect(teamNumber(10, 4, false)).toBe(104);
    expect(teamNumber(4, 10, true)).toBe(104);
  });
  it('handles two double-digit scores', () => expect(teamNumber(10, 11, false)).toBe(1110));
});

describe('scoreVegas', () => {
  it('scores points with birdie flips and big numbers', () => {
    const scores = scoresFrom({
      0: { A: 4, B: 5, C: 4, D: 6 }, // 45 vs 46: +1
      1: { A: 3, B: 5, C: 4, D: 5 }, // team1 birdie: 35 vs flipped 54: +19
      2: { A: 4, B: 4, C: 2, D: 4 }, // team2 birdie: flipped 44 vs 24: -20
      3: { A: 10, B: 4, C: 5, D: 5 }, // 104 vs 55: -49
    });
    const { net, detail } = scoreVegas(vegasRound(scores), scores);
    expect(detail.points).toBe(-49);
    expect(net).toEqual({ A: -49, B: -49, C: 49, D: 49 });
    expectZeroSum(net);
  });

  it('cancels flips when both teams birdie', () => {
    const scores = scoresFrom({ 0: { A: 3, B: 5, C: 3, D: 6 } }); // 35 vs 36, no flips
    const { detail } = scoreVegas(vegasRound(scores), scores);
    expect(detail.points).toBe(1);
  });

  it('ignores flips when the knob is off', () => {
    const scores = scoresFrom({ 0: { A: 3, B: 5, C: 4, D: 5 } }); // 35 vs 45
    const { detail } = scoreVegas(vegasRound(scores, false), scores);
    expect(detail.points).toBe(10);
  });

  it('skips unentered holes', () => {
    const scores = scoresFrom({ 2: { A: 4, B: 5, C: 4, D: 6 } });
    const { detail } = scoreVegas(vegasRound(scores), scores);
    expect(detail.points).toBe(1);
  });
});
