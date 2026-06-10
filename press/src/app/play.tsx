import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Stepper } from '@/components/Stepper';
import { JunkBar } from '@/components/play/JunkBar';
import { WolfPicker } from '@/components/play/WolfPicker';
import { computeResults } from '@/engine';
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
        <Pressable style={styles.footerBtn} onPress={() => router.replace('/')}>
          <Text style={styles.footerBtnText}>Home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const par = round.holes[hole].par;
  const ids = round.players.map((p) => p.id);
  const wolfId = round.format === 'wolf' ? ids[hole % ids.length] : null;
  const last = hole === round.numHoles - 1;

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
      {/* standings strip */}
      <View style={styles.strip}>
        {results.perPlayer.map((r) => {
          const p = round.players.find((x) => x.id === r.playerId)!;
          return (
            <View key={r.playerId} style={styles.stripItem}>
              <Text style={styles.stripName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text
                style={[
                  styles.stripMoney,
                  r.total > 0 && { color: theme.brass },
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
            <Text style={styles.holeLabel}>HOLE</Text>
            <Text style={styles.holeNum}>{hole + 1}</Text>
            <View style={styles.parRow}>
              <Pressable onPress={() => setPar(hole, Math.max(3, par - 1))} hitSlop={10}>
                <Text style={styles.parBtn}>−</Text>
              </Pressable>
              <Text style={styles.parText}>Par {par}</Text>
              <Pressable onPress={() => setPar(hole, Math.min(6, par + 1))} hitSlop={10}>
                <Text style={styles.parBtn}>+</Text>
              </Pressable>
            </View>
          </View>
          <Pressable disabled={last} onPress={() => setHole(hole + 1)} hitSlop={12}>
            <Text style={[styles.arrow, last && styles.arrowOff]}>›</Text>
          </Pressable>
        </View>

        {round.format === 'wolf' && (
          <WolfPicker round={round} hole={hole} onPick={(d) => setWolf(hole, d)} />
        )}

        {round.format === 'nassau' && (
          <Pressable style={styles.pressBtn} onPress={confirmPress}>
            <Text style={styles.pressBtnText}>
              ⚡ Press the {pressLeg}
              {openPresses > 0 ? `  ·  ${openPresses} open` : ''}
            </Text>
          </Pressable>
        )}

        {/* score rows */}
        <View style={styles.scores}>
          {round.players.map((p) => {
            const val = round.scores[hole]?.[p.id];
            const rel = val != null ? val - par : null;
            const isWolf = p.id === wolfId;
            return (
              <Card key={p.id} style={[styles.scoreRow, isWolf && styles.wolfRow]}>
                <View style={styles.scoreName}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {p.name}
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
            );
          })}
        </View>

        <JunkBar round={round} hole={hole} onToggle={toggleJunk} />
      </ScrollView>

      {/* footer */}
      <View style={styles.footer}>
        {last ? (
          <Pressable style={[styles.footerBtn, styles.finishBtn]} onPress={finish}>
            <Text style={styles.finishText}>Finish &amp; settle up</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.footerBtn} onPress={() => setHole(hole + 1)}>
            <Text style={styles.footerBtnText}>Next hole →</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 16 },
  empty: { fontFamily: theme.fontUI, color: theme.bone, textAlign: 'center', marginTop: 120, fontSize: 16 },
  strip: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  stripItem: { minWidth: 60, alignItems: 'center' },
  stripName: { fontFamily: theme.fontUI, fontSize: 12, color: theme.bone, opacity: 0.7, maxWidth: 80 },
  stripMoney: { fontFamily: theme.fontMono, fontSize: 15, color: theme.bone, fontVariant: ['tabular-nums'] },
  holeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 6,
  },
  holeCenter: { alignItems: 'center' },
  holeLabel: { fontFamily: theme.fontMono, fontSize: 11, letterSpacing: 3, color: theme.brass },
  holeNum: { fontFamily: theme.fontDisplay, fontSize: 44, color: theme.bone, lineHeight: 50 },
  parRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  parBtn: { color: theme.brassDim, fontSize: 18, paddingHorizontal: 4 },
  parText: { fontFamily: theme.fontMono, fontSize: 13, color: theme.bone, opacity: 0.8 },
  arrow: { color: theme.bone, fontSize: 30, paddingHorizontal: 8 },
  arrowOff: { opacity: 0.25 },
  pressBtn: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.boneFaint,
    borderWidth: 1,
    borderColor: theme.brassDim,
  },
  pressBtnText: { fontFamily: theme.fontUISemi, fontSize: 14, color: theme.brass },
  scores: { paddingHorizontal: 16, paddingVertical: 6, gap: 10 },
  scoreRow: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wolfRow: { borderWidth: 2, borderColor: theme.brass },
  scoreName: { flexShrink: 1, paddingRight: 8 },
  playerName: { fontFamily: theme.fontUIBold, fontSize: 16, color: theme.ink },
  wolfTag: { fontFamily: theme.fontUI, color: theme.brassDim },
  relPar: { fontFamily: theme.fontMono, fontSize: 12, color: theme.inkFaint, marginTop: 2 },
  footer: { padding: 16, paddingBottom: 24 },
  footerBtn: {
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: theme.bone,
  },
  footerBtnText: { fontFamily: theme.fontUIBold, fontSize: 16, color: theme.ink },
  finishBtn: { backgroundColor: theme.brass },
  finishText: { fontFamily: theme.fontUIBold, fontSize: 17, color: theme.feltDeep },
});
