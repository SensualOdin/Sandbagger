import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Plaque } from '@/components/Plaque';
import { Rule } from '@/components/Rule';
import { getAllRounds } from '@/db/history';
import type { FormatKey } from '@/engine/types';
import { FORMATS } from '@/lib/formats';
import { fmtMoney, theme } from '@/theme';

interface PlayerStats {
  name: string;
  rounds: number;
  wins: number;
  net: number;
  byFormat: Partial<Record<FormatKey, number>>;
  paidTo: Record<string, number>;
}

/** Career ledger aggregated by player name across every saved round. */
function aggregate(): PlayerStats[] {
  const byName = new Map<string, PlayerStats>();
  const get = (name: string): PlayerStats => {
    if (!byName.has(name)) {
      byName.set(name, { name, rounds: 0, wins: 0, net: 0, byFormat: {}, paidTo: {} });
    }
    return byName.get(name)!;
  };

  for (const { round, result } of getAllRounds()) {
    const nameOf = (id: string) => round.players.find((p) => p.id === id)?.name ?? id;
    for (const r of result.perPlayer) {
      const s = get(nameOf(r.playerId));
      s.rounds += 1;
      if (r.total > 0) s.wins += 1;
      s.net += r.total;
      for (const [f, v] of Object.entries(r.byFormat)) {
        s.byFormat[f as FormatKey] = (s.byFormat[f as FormatKey] ?? 0) + (v ?? 0);
      }
    }
    for (const t of result.transactions) {
      const payer = get(nameOf(t.from));
      const toName = nameOf(t.to);
      payer.paidTo[toName] = (payer.paidTo[toName] ?? 0) + t.amount;
    }
  }
  return [...byName.values()].sort((a, b) => b.net - a.net);
}

const bestGame = (s: PlayerStats): string | null => {
  const entries = Object.entries(s.byFormat) as [FormatKey, number][];
  if (entries.length === 0) return null;
  const [f, v] = entries.sort((a, b) => b[1] - a[1])[0];
  return v > 0 ? `${FORMATS[f].label} ${fmtMoney(v)}` : null;
};

const nemesis = (s: PlayerStats): string | null => {
  const entries = Object.entries(s.paidTo);
  if (entries.length === 0) return null;
  const [who, amt] = entries.sort((a, b) => b[1] - a[1])[0];
  return amt > 0 ? `${who} (${fmtMoney(amt)} paid)` : null;
};

export default function Stats() {
  const stats = useMemo(aggregate, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.kicker}>✦ CAREER LEDGER ✦</Text>
      <Text style={styles.title}>The Books</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        {stats.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>The books are empty.</Text>
            <Text style={styles.emptySub}>Finish a round and the ledger begins.</Text>
          </View>
        ) : (
          stats.map((s, i) => (
            <Animated.View key={s.name} entering={FadeInDown.delay(i * 70).springify()}>
              <Card framed style={styles.card}>
                <View style={styles.head}>
                  <Text style={styles.name}>
                    {String(i + 1).padStart(2, '0')}  {s.name}
                  </Text>
                  <Text
                    style={[
                      styles.net,
                      s.net > 0 && { color: theme.up },
                      s.net < 0 && { color: theme.wax },
                    ]}
                  >
                    {s.net === 0 ? 'even' : fmtMoney(s.net)}
                  </Text>
                </View>
                <Rule variant="card" />
                <StatLine label="Record" value={`${s.wins}–${s.rounds - s.wins} in ${s.rounds} round${s.rounds === 1 ? '' : 's'}`} />
                {bestGame(s) && <StatLine label="Best game" value={bestGame(s)!} />}
                {nemesis(s) && <StatLine label="Nemesis" value={nemesis(s)!} />}
              </Card>
            </Animated.View>
          ))
        )}
        <Plaque kind="ghost" label="← Back" onPress={() => router.back()} style={styles.back} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kicker: {
    fontFamily: theme.fontMonoLight,
    fontSize: 10,
    letterSpacing: 4,
    color: theme.brass,
    textAlign: 'center',
    marginTop: 14,
  },
  title: {
    fontFamily: theme.fontDisplayBlack,
    fontSize: 40,
    color: theme.bone,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    letterSpacing: -1,
  },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 44, gap: 12 },
  card: { padding: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: theme.fontDisplay, fontSize: 20, color: theme.ink },
  net: { fontFamily: theme.fontMono, fontSize: 19, color: theme.inkFaint, fontVariant: ['tabular-nums'] },
  statLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  statLabel: { fontFamily: theme.fontMonoLight, fontSize: 10, letterSpacing: 2, color: theme.brassDeep },
  statValue: { fontFamily: theme.fontUISemi, fontSize: 13, color: theme.ink },
  emptyWrap: { alignItems: 'center', paddingVertical: 100 },
  empty: { fontFamily: theme.fontDisplay, fontSize: 22, color: theme.bone },
  emptySub: { fontFamily: theme.fontDisplayItalic, fontSize: 14, color: theme.boneMuted, marginTop: 8 },
  back: { marginTop: 10 },
});
