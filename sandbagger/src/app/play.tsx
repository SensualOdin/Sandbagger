import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Plaque } from '@/components/Plaque';
import { Stepper } from '@/components/Stepper';
import { JunkBar } from '@/components/play/JunkBar';
import { WolfPicker } from '@/components/play/WolfPicker';
import { computeResults } from '@/engine';
import { snakeHolder } from '@/engine/junk';
import type { Round } from '@/engine/types';
import { useRoundStore } from '@/store/roundStore';
import { fmtMoney, theme } from '@/theme';

/** First hole missing a score from anyone — where a resumed round picks up. */
function firstOpenHole(round: Round): number {
  for (let h = 0; h < round.numHoles; h++) {
    if (!round.players.every((p) => round.scores[h]?.[p.id] != null)) return h;
  }
  return round.numHoles - 1;
}

export default function Play() {
  const round = useRoundStore((s) => s.round);
  const setScore = useRoundStore((s) => s.setScore);
  const setPar = useRoundStore((s) => s.setPar);
  const setWolf = useRoundStore((s) => s.setWolf);
  const addPress = useRoundStore((s) => s.addPress);
  const toggleJunk = useRoundStore((s) => s.toggleJunk);
  const completeRound = useRoundStore((s) => s.completeRound);
  const [rawHole, setHole] = useState(() => (round ? firstOpenHole(round) : 0));

  // A previous round's Play screen can stay mounted below the stack; clamp and
  // reset so a new (possibly shorter) round never reads past its last hole.
  const roundIdRef = useRef(round?.id);
  useEffect(() => {
    if (round && round.id !== roundIdRef.current) {
      roundIdRef.current = round.id;
      setHole(firstOpenHole(round));
    }
  }, [round]);
  const hole = round ? Math.min(rawHole, round.numHoles - 1) : 0;

  const results = useMemo(() => (round ? computeResults(round) : null), [round]);

  if (!round || !results) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.empty}>No active round.</Text>
        <Plaque kind="ghost" label="Home" onPress={() => router.replace('/')} style={styles.emptyBtn} />
      </SafeAreaView>
    );
  }

  const par = round.holes[hole].par;
  const ids = round.players.map((p) => p.id);
  const wolfId = round.formats.includes('wolf') ? ids[hole % ids.length] : null;
  const snakeId = round.junk.config.enabled.includes('snake')
    ? snakeHolder(round.junk.events)
    : null;
  const last = hole === round.numHoles - 1;
  const leader = [...results.perPlayer].sort((a, b) => b.total - a.total)[0];

  // First tap lands on par; later taps step by one, never below 1.
  const bump = (playerId: string, delta: number) => {
    const cur = round.scores[hole]?.[playerId];
    setScore(hole, playerId, cur == null ? par : Math.max(1, cur + delta));
  };

  const pressLeg = hole < 9 ? ('front' as const) : ('back' as const);
  const openPresses = round.presses.filter((p) => p.leg === pressLeg).length;
  const confirmPress = () =>
    Alert.alert(
      `Press the ${pressLeg} 9?`,
      `A new bet starts on hole ${hole + 1} and runs to the end of the ${pressLeg}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Press it', style: 'destructive', onPress: () => addPress({ leg: pressLeg, startHole: hole }) },
      ]
    );

  const finish = () => {
    completeRound();
    router.push('/settle');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* the book: live standings ticker */}
      <View style={styles.strip}>
        <Pressable
          accessibilityLabel="home"
          onPress={() => router.replace('/')}
          hitSlop={10}
          style={styles.homeBtn}
        >
          <Text style={styles.homeGlyph}>⌂</Text>
        </Pressable>
        {results.perPlayer.map((r) => {
          const p = round.players.find((x) => x.id === r.playerId)!;
          const leading = r.playerId === leader.playerId && r.total > 0;
          return (
            <View key={r.playerId} style={styles.stripItem}>
              <Text style={styles.stripName} numberOfLines={1}>
                {leading ? '▲ ' : ''}
                {p.name.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.stripMoney,
                  r.total > 0 && { color: theme.brassBright },
                  r.total < 0 && { color: theme.down },
                ]}
              >
                {r.total === 0 ? '—' : fmtMoney(r.total)}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        {/* hole header */}
        <View style={styles.holeHeader}>
          <Pressable disabled={hole === 0} onPress={() => setHole(hole - 1)} hitSlop={12}>
            <Text style={[styles.arrow, hole === 0 && styles.arrowOff]}>‹</Text>
          </Pressable>
          <View style={styles.holeCenter}>
            <Text style={styles.holeLabel}>✦ HOLE ✦</Text>
            <Text style={styles.holeNum}>{hole + 1}</Text>
            <Text style={styles.holeOf}>OF {round.numHoles}</Text>
            <View style={styles.parRow}>
              <Pressable onPress={() => setPar(hole, Math.max(3, par - 1))} hitSlop={10}>
                <Text style={styles.parBtn}>−</Text>
              </Pressable>
              <Text style={styles.parText}>PAR {par}</Text>
              <Pressable onPress={() => setPar(hole, Math.min(6, par + 1))} hitSlop={10}>
                <Text style={styles.parBtn}>+</Text>
              </Pressable>
            </View>
          </View>
          <Pressable disabled={last} onPress={() => setHole(hole + 1)} hitSlop={12}>
            <Text style={[styles.arrow, last && styles.arrowOff]}>›</Text>
          </Pressable>
        </View>

        {round.formats.includes('wolf') && (
          <WolfPicker round={round} hole={hole} onPick={(d) => setWolf(hole, d)} />
        )}

        {round.formats.includes('nassau') && (
          <Pressable style={styles.pressBtn} onPress={confirmPress}>
            <Text style={styles.pressBtnText}>
              ⚡ PRESS THE {pressLeg.toUpperCase()}
              {openPresses > 0 ? `  ·  ${openPresses} OPEN` : ''}
            </Text>
          </Pressable>
        )}

        {/* score rows */}
        <View style={styles.scores}>
          {round.players.map((p, i) => {
            const val = round.scores[hole]?.[p.id];
            const rel = val != null ? val - par : null;
            const isWolf = p.id === wolfId;
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 50).springify()}>
                <Card framed style={[styles.scoreRow, isWolf && styles.wolfRow]}>
                  <View style={styles.scoreName}>
                    <Text style={styles.playerName} numberOfLines={1}>
                      {p.name}
                      {p.id === snakeId && ' 🐍'}
                      {isWolf && <Text style={styles.wolfTag}> · wolf</Text>}
                    </Text>
                    {rel != null && (
                      <Text
                        style={[
                          styles.relPar,
                          rel < 0 && { color: theme.up },
                          rel > 0 && { color: theme.clay },
                        ]}
                      >
                        {rel === 0 ? 'par' : rel > 0 ? `+${rel}` : `${rel}`}
                      </Text>
                    )}
                  </View>
                  <Stepper
                    display={val != null ? String(val) : '–'}
                    onDec={() => bump(p.id, -1)}
                    onInc={() => bump(p.id, +1)}
                  />
                </Card>
              </Animated.View>
            );
          })}
        </View>

        <JunkBar round={round} hole={hole} onToggle={toggleJunk} />
      </ScrollView>

      {/* footer */}
      <View style={styles.footer}>
        {last ? (
          <Plaque label="Finish & settle up" onPress={finish} />
        ) : (
          <Plaque kind="ghost" label="Next hole →" onPress={() => setHole(hole + 1)} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 16 },
  empty: { fontFamily: theme.fontDisplayItalic, color: theme.bone, textAlign: 'center', marginTop: 140, fontSize: 17 },
  emptyBtn: { margin: 24 },
  strip: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,75,0.35)',
    backgroundColor: 'rgba(4,19,10,0.35)',
  },
  homeBtn: { justifyContent: 'center', paddingRight: 2 },
  homeGlyph: { color: theme.boneMuted, fontSize: 18, lineHeight: 20 },
  stripItem: { minWidth: 64, alignItems: 'center' },
  stripName: {
    fontFamily: theme.fontMonoLight,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.boneMuted,
    maxWidth: 90,
  },
  stripMoney: {
    fontFamily: theme.fontMono,
    fontSize: 16,
    color: theme.bone,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  holeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 6,
  },
  holeCenter: { alignItems: 'center' },
  holeLabel: { fontFamily: theme.fontMonoLight, fontSize: 10, letterSpacing: 4, color: theme.brass },
  holeNum: {
    fontFamily: theme.fontDisplayBlack,
    fontSize: 64,
    color: theme.bone,
    lineHeight: 70,
    letterSpacing: -2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  holeOf: { fontFamily: theme.fontMonoLight, fontSize: 10, letterSpacing: 3, color: theme.boneMuted },
  parRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  parBtn: { color: theme.brassDim, fontSize: 18, paddingHorizontal: 4 },
  parText: { fontFamily: theme.fontMono, fontSize: 12, letterSpacing: 2, color: theme.bone, opacity: 0.85 },
  arrow: { color: theme.brass, fontSize: 34, paddingHorizontal: 8 },
  arrowOff: { opacity: 0.2 },
  pressBtn: {
    marginHorizontal: 18,
    marginVertical: 8,
    padding: 13,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    backgroundColor: 'rgba(158,58,36,0.22)',
    borderWidth: 1,
    borderColor: theme.wax,
  },
  pressBtnText: { fontFamily: theme.fontUIBold, fontSize: 13, letterSpacing: 2, color: theme.down },
  scores: { paddingHorizontal: 18, paddingVertical: 8, gap: 12 },
  scoreRow: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wolfRow: { borderWidth: 2, borderColor: theme.brass },
  scoreName: { flexShrink: 1, paddingRight: 8 },
  playerName: { fontFamily: theme.fontUIBold, fontSize: 17, color: theme.ink },
  wolfTag: { fontFamily: theme.fontDisplayItalic, fontSize: 14, color: theme.brassDeep },
  relPar: { fontFamily: theme.fontMono, fontSize: 12, color: theme.inkFaint, marginTop: 2 },
  footer: { padding: 18, paddingBottom: 26 },
});
