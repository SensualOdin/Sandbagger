import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import type { Round, RoundResult } from '@/engine/types';
import { FORMATS } from '@/lib/formats';
import { fmtMoney, theme } from '@/theme';

interface SettleViewProps {
  round: Round;
  result: RoundResult;
}

/** "The Damage": ranked nets, settle-up transactions, format breakdown. */
export function SettleView({ round, result }: SettleViewProps) {
  const name = (id: string) => round.players.find((p) => p.id === id)?.name ?? id;
  const ranked = [...result.perPlayer].sort((a, b) => b.total - a.total);
  const hasJunk = result.perPlayer.some((p) => p.junkNet !== 0);

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.kicker}>
          {FORMATS[round.format].label.toUpperCase()} · {round.numHoles} HOLES
          {round.useNetScoring ? ' · NET' : ''}
        </Text>
        <Text style={styles.title}>The Damage</Text>
      </View>

      <SectionLabel>Net result</SectionLabel>
      <Card style={styles.card}>
        {ranked.map((r, i) => (
          <View key={r.playerId} style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.rowLeft}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View>
                <Text style={styles.playerName}>{name(r.playerId)}</Text>
                {hasJunk && (
                  <Text style={styles.split}>
                    game {fmtMoney(r.formatNet)} · dots {fmtMoney(r.junkNet)}
                  </Text>
                )}
              </View>
            </View>
            <Text
              style={[
                styles.money,
                r.total > 0 && { color: theme.up },
                r.total < 0 && { color: theme.clay },
              ]}
            >
              {r.total === 0 ? 'even' : fmtMoney(r.total)}
            </Text>
          </View>
        ))}
      </Card>

      <SectionLabel>Settle up</SectionLabel>
      <Card style={styles.card}>
        {result.transactions.length === 0 ? (
          <Text style={styles.allSquare}>All square. Nobody owes a thing.</Text>
        ) : (
          result.transactions.map((t, i) => (
            <View key={i} style={[styles.row, i > 0 && styles.divider]}>
              <Text style={styles.txText}>
                <Text style={styles.txName}>{name(t.from)}</Text>
                <Text style={styles.txPays}> pays </Text>
                <Text style={styles.txName}>{name(t.to)}</Text>
              </Text>
              <Text style={styles.txMoney}>{fmtMoney(t.amount)}</Text>
            </View>
          ))
        )}
      </Card>

      <Breakdown round={round} result={result} name={name} />
    </View>
  );
}

function Breakdown({
  round,
  result,
  name,
}: SettleViewProps & { name: (id: string) => string }) {
  const d = result.detail;

  if (round.format === 'wolf' || round.format === 'sixpoint' || round.format === 'bingoBangoBongo') {
    const pts = d.pts as Record<string, number>;
    return (
      <>
        <SectionLabel>Points</SectionLabel>
        <Card style={styles.card}>
          {round.players.map((p, i) => (
            <View key={p.id} style={[styles.row, i > 0 && styles.divider]}>
              <Text style={styles.playerName}>{p.name}</Text>
              <Text style={styles.txMoney}>
                {pts[p.id] > 0 ? '+' : ''}
                {pts[p.id]} pts
              </Text>
            </View>
          ))}
        </Card>
      </>
    );
  }

  if (round.format === 'nassau') {
    const legs = d.legs as Record<string, number>;
    const pressLog = d.pressLog as { leg: string; startHole: number; result: number; source: string }[];
    const [a, b] = round.players;
    const legWinner = (m: number) => (m > 0 ? a.name : m < 0 ? b.name : 'halved');
    return (
      <>
        <SectionLabel>{`Legs · ${a.name} vs ${b.name}`}</SectionLabel>
        <Card style={[styles.card, styles.legsCard]}>
          {Object.entries(legs).map(([leg, m]) => (
            <View key={leg} style={styles.legItem}>
              <Text style={styles.legName}>{leg.toUpperCase()}</Text>
              <Text style={styles.legWinner}>{legWinner(m)}</Text>
            </View>
          ))}
        </Card>
        {pressLog.length > 0 && (
          <>
            <SectionLabel>Presses</SectionLabel>
            <Card style={styles.card}>
              {pressLog.map((p, i) => (
                <View key={i} style={[styles.row, i > 0 && styles.divider]}>
                  <Text style={styles.playerName}>
                    {p.leg} 9 from hole {p.startHole + 1}
                    <Text style={styles.split}> · {p.source}</Text>
                  </Text>
                  <Text style={styles.txMoney}>{legWinner(p.result)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}
      </>
    );
  }

  if (round.format === 'skins') {
    const skinsWon = d.skinsWon as Record<string, number>;
    return (
      <>
        <SectionLabel>Skins</SectionLabel>
        <Card style={styles.card}>
          {round.players.map((p, i) => (
            <View key={p.id} style={[styles.row, i > 0 && styles.divider]}>
              <Text style={styles.playerName}>{p.name}</Text>
              <Text style={styles.txMoney}>{skinsWon[p.id]}</Text>
            </View>
          ))}
        </Card>
      </>
    );
  }

  if (round.format === 'vegas') {
    const points = d.points as number;
    const [t1, t2] = round.config.vegas!.teams;
    const winners = points > 0 ? t1 : t2;
    if (points === 0) return null;
    return (
      <>
        <SectionLabel>Vegas points</SectionLabel>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.playerName}>{winners.map(name).join(' & ')}</Text>
            <Text style={styles.txMoney}>+{Math.abs(points)} pts</Text>
          </View>
        </Card>
      </>
    );
  }

  if (round.format === 'matchplay') {
    const up = d.holesUp as number;
    return (
      <>
        <SectionLabel>Match</SectionLabel>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.playerName}>
              {up === 0 ? 'All square' : `${name(round.players[up > 0 ? 0 : 1].id)} wins`}
            </Text>
            {up !== 0 && <Text style={styles.txMoney}>{Math.abs(up)} up</Text>}
          </View>
        </Card>
      </>
    );
  }

  if (round.format === 'strokeplay') {
    const totals = d.totals as Record<string, number>;
    return (
      <>
        <SectionLabel>Strokes</SectionLabel>
        <Card style={styles.card}>
          {round.players.map((p, i) => (
            <View key={p.id} style={[styles.row, i > 0 && styles.divider]}>
              <Text style={styles.playerName}>{p.name}</Text>
              <Text style={styles.txMoney}>{totals[p.id]}</Text>
            </View>
          ))}
        </Card>
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 18 },
  kicker: { fontFamily: theme.fontMono, fontSize: 12, letterSpacing: 3, color: theme.brass },
  title: { fontFamily: theme.fontDisplay, fontSize: 38, color: theme.bone, marginTop: 4 },
  card: { padding: 14, marginBottom: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  divider: { borderTopWidth: 1, borderTopColor: theme.inkLine },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { fontFamily: theme.fontMono, fontSize: 14, color: theme.brassDim },
  playerName: { fontFamily: theme.fontUIBold, fontSize: 16, color: theme.ink },
  split: { fontFamily: theme.fontMono, fontSize: 11, color: theme.inkFaint, marginTop: 2 },
  money: { fontFamily: theme.fontMono, fontSize: 18, color: theme.inkFaint, fontVariant: ['tabular-nums'] },
  allSquare: { fontFamily: theme.fontUI, fontSize: 15, color: theme.ink, textAlign: 'center', padding: 8 },
  txText: { fontSize: 15 },
  txName: { fontFamily: theme.fontUIBold, color: theme.ink },
  txPays: { fontFamily: theme.fontUI, color: theme.brassDim },
  txMoney: { fontFamily: theme.fontMono, fontSize: 16, color: theme.ink, fontVariant: ['tabular-nums'] },
  legsCard: { flexDirection: 'row', justifyContent: 'space-around' },
  legItem: { alignItems: 'center', paddingVertical: 4 },
  legName: { fontFamily: theme.fontMono, fontSize: 11, letterSpacing: 1, color: theme.brassDim },
  legWinner: { fontFamily: theme.fontUIBold, fontSize: 14, color: theme.ink, marginTop: 3 },
});
