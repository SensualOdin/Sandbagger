import type { FormatKey, JunkType } from '@/engine/types';

/** Plain-English house rules — what each game and dot is, and how it pays. */
export const GAME_RULES: Record<FormatKey, string> = {
  skins:
    'Lowest score on the hole wins the skin. Tie it up and (house rule) the skin carries — the next hole is worth double. Each skin collects from every other player, or splits one pot, your call in the stakes.',
  nassau:
    'Three bets in one: the front nine, the back nine, and the overall 18, each worth the per-leg stake. Fall behind and you can press — a fresh bet from that hole to the end of the nine. Heads-up classic.',
  wolf:
    'The wolf rotates every hole. After watching tee shots the wolf picks a partner — or goes Lone (double) or Blind before anyone swings (triple). Best ball decides; a solo wolf wins from or pays the whole field.',
  vegas:
    "Two teams of two. Each team's scores combine into a number, low digit first — a 4 and a 5 makes 45. Low number wins the difference in points. Make a birdie and the other team's digits flip the wrong way.",
  bingoBangoBongo:
    "Three dots on every hole: first ball on the green (bingo), closest once everyone's on (bango), first in the cup (bongo). Each dot collects from every other player.",
  matchplay: 'Win more holes than the other player. The match value goes to whoever finishes up. Simple, ancient, brutal.',
  strokeplay:
    'Total strokes, settled pairwise: every stroke between you and each other player is worth the per-stroke stake. Card speaks.',
  sixpoint:
    'A threesome game, six points a hole: 4–2–0 outright, 3–3–0 when two tie low, 4–1–1 when two tie high, 2–2–2 all square. Dollars settle on points above or below your share.',
  stableford:
    "Points, not strokes: classic pays 3 for birdie, 2 for par, 1 for bogey, nothing worse. Modified (PGA) swings harder — birdies +2, bogeys −1, doubles −3. Settled pairwise on the points difference, so blowup holes can't ruin the day. Unless you run Modified.",
  aceyDeucey:
    'Every hole the outright low (the ace) collects from every player, and the outright high (the deuce) pays every player. Ties kill the blood — no ace or deuce that hole.',
};

export const JUNK_RULES: Record<JunkType, string> = {
  greenie:
    'On the green with your tee shot on a par 3 — closest if more than one makes it. Collects from every other player. With carryover on, unwon par 3s roll their value onto the next greenie.',
  sandie: 'Par or better on a hole where you escaped a bunker. The up-and-down of champions.',
  barkie: 'Par or better after your ball hits a tree. Yes, it has to hit the tree. Yes, it counts.',
  chippie: 'Hole out a chip from off the green. Instant dot.',
  birdie: 'One under par on the hole — a dot from everyone at the table.',
  eagle: 'Two under par. Rare air; collect from everybody.',
  polie: 'Sink a putt longer than the flagstick. Pace it off if you have to.',
  arnie:
    'Par or better without ever touching the fairway. Named for Arnold Palmer, who made a living from the trees.',
  hogan: 'Fairway, green, one putt. Textbook golf, named for Ben Hogan.',
  ferret: 'Hole out from off the green — chip, pitch, or putt from the fringe.',
  goldenFerret: 'Hole out from the sand. The rarest dot on the card.',
  snake:
    'Three-putt and the snake is yours until someone else three-putts. Whoever holds it at the end pays the pot, split by the table. Run it growing — the pot adds its value every hole played — or flat, one fixed bet that never grows.',
  rabbit:
    'Win a hole outright and the rabbit runs with you; lose it when someone else wins one. The pot grows every hole, tracked automatically from the card. Hold it at the end and you collect.',
  bingo: 'First ball on the green. One of the three Bingo-Bango-Bongo dots.',
  bango: "Closest to the pin once everyone's on the green.",
  bongo: 'First ball in the cup.',
};
