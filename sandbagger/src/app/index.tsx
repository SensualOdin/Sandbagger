import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Crest } from '@/components/Crest';
import { Plaque } from '@/components/Plaque';
import { FORMATS } from '@/lib/formats';
import { useRoundStore } from '@/store/roundStore';
import { theme } from '@/theme';

export default function Home() {
  const round = useRoundStore((s) => s.round);
  const active = round?.status === 'active' ? round : null;
  // A round finished but never saved (app killed at the settle screen) must
  // stay reachable — otherwise the data sits in storage with no way in.
  const unsettled = round?.status === 'complete' ? round : null;
  const holesEntered = active
    ? Object.values(active.scores).filter((h) =>
        active.players.every((p) => h[p.id] != null)
      ).length
    : 0;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Animated.View entering={FadeIn.duration(900)}>
          <Crest size={92} />
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(120).springify()}
          style={styles.title}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          Sandbagger
        </Animated.Text>
        <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.estRow}>
          <View style={styles.estLine} />
          <Text style={styles.subtitle}>GOLF MONEY GAMES</Text>
          <View style={styles.estLine} />
        </Animated.View>
        <Animated.Text entering={FadeIn.delay(420).duration(700)} style={styles.motto}>
          trust the card, not the player
        </Animated.Text>
      </View>

      <View style={styles.actions}>
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Plaque label="New round" onPress={() => router.push('/setup')} />
        </Animated.View>

        {active && (
          <Animated.View entering={FadeInDown.delay(380).springify()}>
            <Plaque
              kind="ghost"
              label={`Resume ${FORMATS[active.format].label} · ${holesEntered}/${active.numHoles} holes`}
              onPress={() => router.push('/play')}
            />
          </Animated.View>
        )}

        {unsettled && (
          <Animated.View entering={FadeInDown.delay(380).springify()}>
            <Plaque
              kind="ghost"
              label={`Finish settling ${FORMATS[unsettled.format].label}`}
              onPress={() => router.push('/settle')}
            />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(460).springify()}>
          <Plaque kind="ghost" label="History" onPress={() => router.push('/history')} />
        </Animated.View>
      </View>

      <Animated.Text entering={FadeIn.delay(700).duration(800)} style={styles.footer}>
        Sandbagger tracks friendly wagers. It never moves money — settle up
        yourselves, responsibly and legally.
      </Animated.Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 22, justifyContent: 'space-between' },
  header: { alignItems: 'center', paddingTop: 64 },
  title: {
    fontFamily: theme.fontDisplayBlack,
    fontSize: 56,
    color: theme.bone,
    letterSpacing: -1.5,
    marginTop: 14,
    maxWidth: '100%',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  estRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  estLine: { width: 34, height: StyleSheet.hairlineWidth, backgroundColor: theme.brass },
  subtitle: {
    fontFamily: theme.fontMono,
    fontSize: 12,
    color: theme.brass,
    letterSpacing: 5,
  },
  motto: {
    fontFamily: theme.fontDisplayItalic,
    fontSize: 14,
    color: theme.boneMuted,
    marginTop: 18,
  },
  actions: { gap: 12 },
  footer: {
    fontFamily: theme.fontUI,
    fontSize: 11,
    color: theme.boneMuted,
    textAlign: 'center',
    paddingBottom: 8,
    lineHeight: 16,
    paddingHorizontal: 10,
  },
});
