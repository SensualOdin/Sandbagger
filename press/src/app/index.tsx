import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FORMATS } from '@/lib/formats';
import { useRoundStore } from '@/store/roundStore';
import { theme } from '@/theme';

export default function Home() {
  const round = useRoundStore((s) => s.round);
  const active = round?.status === 'active' ? round : null;
  const holesEntered = active
    ? Object.values(active.scores).filter((h) =>
        active.players.every((p) => h[p.id] != null)
      ).length
    : 0;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Press</Text>
        <Text style={styles.subtitle}>GOLF MONEY GAMES</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.primary]} onPress={() => router.push('/setup')}>
          <Text style={styles.primaryText}>New round</Text>
        </Pressable>

        {active && (
          <Pressable style={[styles.btn, styles.secondary]} onPress={() => router.push('/play')}>
            <Text style={styles.secondaryText}>
              Resume {FORMATS[active.format].label} · {holesEntered}/{active.numHoles} holes
            </Text>
          </Pressable>
        )}

        <Pressable style={[styles.btn, styles.secondary]} onPress={() => router.push('/history')}>
          <Text style={styles.secondaryText}>History</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        Press tracks friendly wagers. It never moves money — settle up yourselves,
        responsibly and legally.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 18, justifyContent: 'space-between' },
  header: { alignItems: 'center', paddingTop: 80 },
  title: { fontFamily: theme.fontDisplay, fontSize: 64, color: theme.bone, letterSpacing: -1 },
  subtitle: { fontFamily: theme.fontMono, fontSize: 13, color: theme.brass, letterSpacing: 4, marginTop: 8 },
  actions: { gap: 12 },
  btn: { padding: 17, borderRadius: 16, alignItems: 'center' },
  primary: { backgroundColor: theme.brass },
  primaryText: { fontFamily: theme.fontUIBold, fontSize: 17, color: theme.feltDeep },
  secondary: { backgroundColor: theme.boneFaint, borderWidth: 1, borderColor: theme.line },
  secondaryText: { fontFamily: theme.fontUISemi, fontSize: 15, color: theme.bone },
  footer: {
    fontFamily: theme.fontUI,
    fontSize: 11,
    color: theme.boneMuted,
    textAlign: 'center',
    paddingBottom: 10,
    lineHeight: 16,
  },
});
