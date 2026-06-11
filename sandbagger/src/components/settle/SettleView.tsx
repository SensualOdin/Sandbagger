import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Rule } from '@/components/Rule';
import { TicketEdge } from '@/components/TicketEdge';
import type { FormatKey, Round, RoundResult } from '@/engine/types';
import { FORMATS } from '@/lib/formats';
import { fmtMoney, theme } from '@/theme';

interface SettleViewProps {
  round: Round;
  result: RoundResult;
}

/** Menu-style dot leader filling the space between a name and its figure. */
function Leader() {
  return (
    <Text style={styles.leader} numberOfLines={1} ellipsizeMode="clip">
      {'·'.repeat(60)}
    </Text>
  );
}

const dateLine = (iso: string) =>
  new Date(iso)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();

/** "The Damage": the night's receipt — ranked nets, who pays whom, breakdown. */
export function SettleView({ round, result }: SettleViewProps) {
  const name = (id: string) => round.players.find((p) => p.id === id)?.name ?? id;
  const ranked = [...result.perPlayer].sort((a, b) => b.total - a.total);
  const hasJunk = result.perPlayer.some((p) => p.junkNet !== 0);
  const showSplit = hasJunk || round.formats.length > 1;
  const splitLine = (r: (typeof result.perPlayer)[number]) =>
    [
      ...round.formats.map((f) => `${FORMATS[f].label.toLowerCase()} ${fmtMoney(r.byFormat[f] ?? 0)}`),
      ...(hasJunk ? [`dots ${fmtMoney(r.junkNet)}`] : []),
    ].join(' · ');

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.kicker}>✦ THE NIGHT&apos;S RECEIPT ✦</Text>
        <Text style={styles.title}>The Damage</Text>
        <Text style={styles.sub}>
          {round.formats.map((f) => FORMATS[f].label.toUpperCase()).join(' + ')} ·{' '}
          {round.numHoles} HOLES{round.useNetScoring ? ' · NET' : ''}
        </Text>
      </View>

      {/* the ticket */}
      <Card style={styles.ticket}>
        <TicketEdge position="top" />
        <View style={styles.ticketBody}>
          <Text style={styles.ticketDate}>{dateLine(round.createdAt)}</Text>

          <Rule label="Net result" variant="card" />
          {ranked.map((r, i) => (
            <View key={r.playerId} style={styles.ledgerRow}>
              <Text style={styles.rank}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={styles.ledgerName}>
                <Text style={styles.playerName}>{name(r.playerId)}</Text>
                {showSplit && <Text style={styles.split}>{splitLine(r)}</Text>}
              </View>
              <Leader />
              <Text
                style={[
                  styles.money,
                  r.total > 0 && { color: theme.up },
                  r.total < 0 && { color: theme.wax },
                ]}
              >
                {r.total === 0 ? 'even' : fmtMoney(r.total)}
              </Text>
            </View>
          ))}

          <Rule label="Settle up" variant="card" />
          {result.transactions.length === 0 ? (
            <Text style={styles.allSquare}>All square. Nobody owes a thing.</Text>
          ) : (
            result.transactions.map((t, i) => (
              <View key={i} style={styles.ledgerRow}>
                <Text style={styles.txText} numberOfLines={1}>
                  <Text style={styles.txName}>{name(t.from)}</Text>
                  <Text style={styles.txPays}> pays </Text>
                  <Text style={styles.txName}>{name(t.to)}</Text>
                </Text>
                <Leader />
                <Text style={styles.txMoney}>{fmtMoney(t.amount)}</Text>
              </View>
            ))
          )}

          {round.formats.map((f) => (
            <FormatBreakdown
              key={f}
              format={f}
              round={round}
              detail={result.details[f] ?? {}}
              name={name}
            />
          ))}

          <Text style={styles.stamp}>TRUST THE CARD, NOT THE PLAYER · SANDBAGGER</Text>
        </View>
        <TicketEdge position="bottom" />
      </Card>
    </View>
  );
}

function FormatBreakdown({
  format,
  round,
  detail,
  name,
}: {
  format: FormatKey;
  round: Round;
  detail: Record<string, unknown>;
  name: (id: string) => string;
}) {
  const d = detail;

  if (format === 'wolf' || format === 'sixpoint' || format === 'bingoBangoBongo' || format === 'stableford') {
    const pts = d.pts as Record<string, number>;
    return (
      <>
        <Rule label={`${FORMATS[format].label} points`} variant="card" />
        {round.players.map((p) => (
          <View key={p.id} style={styles.ledgerRow}>
            <Text style={styles.playerName}>{p.name}</Text>
            <Leader />
            <Text style={styles.txMoney}>
              {pts[p.id] > 0 ? '+' : ''}
              {pts[p.id]} pts
            </Text>
          </View>
        ))}
      </>
    );
  }

  if (format === 'nassau') {
    const legs = d.legs as Record<string, number>;
    const pressLog = d.pressLog as { leg: string; startHole: number; result: number; source: string }[];
    const [a, b] = round.players;
    const legWinner = (m: number) => (m > 0 ? a.name : m < 0 ? b.name : 'halved');
    return (
      <>
        <Rule label={`Legs · ${a.name} vs ${b.name}`} variant="card" />
        <View style={styles.legsRow}>
          {Object.entries(legs).map(([leg, m]) => (
            <View key={leg} style={styles.legItem}>
              <Text style={styles.legName}>{leg.toUpperCase()}</Text>
              <Text style={styles.legWinner}>{legWinner(m)}</Text>
            </View>
          ))}
        </View>
        {pressLog.length > 0 && (
          <>
            <Rule label="Presses" variant="card" />
            {pressLog.map((p, i) => (
              <View key={i} style={styles.ledgerRow}>
                <Text style={styles.playerName}>
                  {p.leg} 9, hole {p.startHole + 1}
                  <Text style={styles.split}> · {p.source}</Text>
                </Text>
                <Leader />
                <Text style={styles.txMoney}>{legWinner(p.result)}</Text>
              </View>
            ))}
          </>
        )}
      </>
    );
  }

  if (format === 'skins') {
    const skinsWon = d.skinsWon as Record<string, number>;
    return (
      <>
        <Rule label="Skins" variant="card" />
        {round.players.map((p) => (
          <View key={p.id} style={styles.ledgerRow}>
            <Text style={styles.playerName}>{p.name}</Text>
            <Leader />
            <Text style={styles.txMoney}>{skinsWon[p.id]}</Text>
          </View>
        ))}
      </>
    );
  }

  if (format === 'vegas') {
    const points = d.points as number;
    const [t1, t2] = round.config.vegas!.teams;
    const winners = points > 0 ? t1 : t2;
    if (points === 0) return null;
    return (
      <>
        <Rule label="Vegas points" variant="card" />
        <View style={styles.ledgerRow}>
          <Text style={styles.playerName}>{winners.map(name).join(' & ')}</Text>
          <Leader />
          <Text style={styles.txMoney}>+{Math.abs(points)} pts</Text>
        </View>
      </>
    );
  }

  if (format === 'matchplay') {
    const up = d.holesUp as number;
    return (
      <>
        <Rule label="Match" variant="card" />
        <View style={styles.ledgerRow}>
          <Text style={styles.playerName}>
            {up === 0 ? 'All square' : `${name(round.players[up > 0 ? 0 : 1].id)} wins`}
          </Text>
          {up !== 0 && (
            <>
              <Leader />
              <Text style={styles.txMoney}>{Math.abs(up)} up</Text>
            </>
          )}
        </View>
      </>
    );
  }

  if (format === 'aceyDeucey') {
    const aces = d.aces as Record<string, number>;
    const deuces = d.deuces as Record<string, number>;
    return (
      <>
        <Rule label="Aces · Deuces" variant="card" />
        {round.players.map((p) => (
          <View key={p.id} style={styles.ledgerRow}>
            <Text style={styles.playerName}>{p.name}</Text>
            <Leader />
            <Text style={styles.txMoney}>
              {aces[p.id] ?? 0} · {deuces[p.id] ?? 0}
            </Text>
          </View>
        ))}
      </>
    );
  }

  if (format === 'strokeplay') {
    const totals = d.totals as Record<string, number>;
    return (
      <>
        <Rule label="Strokes" variant="card" />
        {round.players.map((p) => (
          <View key={p.id} style={styles.ledgerRow}>
            <Text style={styles.playerName}>{p.name}</Text>
            <Leader />
            <Text style={styles.txMoney}>{totals[p.id]}</Text>
          </View>
        ))}
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: 14, paddingBottom: 20 },
  kicker: { fontFamily: theme.fontMonoLight, fontSize: 10, letterSpacing: 4, color: theme.brass },
  title: {
    fontFamily: theme.fontDisplayBlack,
    fontSize: 46,
    color: theme.bone,
    letterSpacing: -1,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  sub: { fontFamily: theme.fontMonoLight, fontSize: 11, letterSpacing: 3, color: theme.boneMuted, marginTop: 8 },
  ticket: { marginBottom: 22, overflow: 'hidden' },
  ticketBody: { paddingHorizontal: 18, paddingVertical: 12 },
  ticketDate: {
    fontFamily: theme.fontMonoLight,
    fontSize: 10,
    letterSpacing: 3,
    color: theme.inkSoft,
    textAlign: 'center',
    marginTop: 6,
  },
  ledgerRow: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 9, gap: 8 },
  rank: { fontFamily: theme.fontMonoLight, fontSize: 12, color: theme.brassDeep, marginBottom: 1 },
  ledgerName: { flexShrink: 1 },
  playerName: { fontFamily: theme.fontUIBold, fontSize: 16, color: theme.ink },
  split: { fontFamily: theme.fontMonoLight, fontSize: 11, color: theme.inkFaint, marginTop: 2 },
  leader: {
    flex: 1,
    fontFamily: theme.fontMonoLight,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.inkFaint,
    marginBottom: 2,
    minWidth: 16,
  },
  money: { fontFamily: theme.fontMono, fontSize: 18, color: theme.inkFaint, fontVariant: ['tabular-nums'] },
  allSquare: {
    fontFamily: theme.fontDisplayItalic,
    fontSize: 15,
    color: theme.ink,
    textAlign: 'center',
    paddingVertical: 8,
  },
  txText: { fontSize: 15, flexShrink: 1 },
  txName: { fontFamily: theme.fontUIBold, color: theme.ink },
  txPays: { fontFamily: theme.fontDisplayItalic, color: theme.brassDeep },
  txMoney: { fontFamily: theme.fontMono, fontSize: 16, color: theme.ink, fontVariant: ['tabular-nums'] },
  legsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  legItem: { alignItems: 'center' },
  legName: { fontFamily: theme.fontMonoLight, fontSize: 10, letterSpacing: 2, color: theme.brassDeep },
  legWinner: { fontFamily: theme.fontUIBold, fontSize: 14, color: theme.ink, marginTop: 4 },
  stamp: {
    fontFamily: theme.fontMonoLight,
    fontSize: 9,
    letterSpacing: 3,
    color: theme.inkFaint,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
});
