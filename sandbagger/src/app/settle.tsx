import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { Plaque } from '@/components/Plaque';
import { SettleView } from '@/components/settle/SettleView';
import { computeResults } from '@/engine';
import { saveRound } from '@/db/history';
import { useRoundStore } from '@/store/roundStore';
import { enter } from '@/lib/anim';
import { theme } from '@/theme';

export default function Settle() {
  const round = useRoundStore((s) => s.round);
  const clearRound = useRoundStore((s) => s.clearRound);
  const shotRef = useRef<View>(null);

  const result = useMemo(() => (round ? computeResults(round) : null), [round]);

  if (!round || !result) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.empty}>No round to settle.</Text>
        <Plaque kind="ghost" label="Home" onPress={() => router.replace('/')} style={styles.emptyBtn} />
      </SafeAreaView>
    );
  }

  const share = async () => {
    const uri = await captureRef(shotRef, { format: 'png', quality: 1 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri.startsWith('file://') ? uri : `file://${uri}`);
    }
  };

  const saveAndNew = () => {
    saveRound(round, result);
    clearRound();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={enter(FadeInDown.springify().damping(14))}>
          <View ref={shotRef} collapsable={false} style={styles.shot}>
            <SettleView round={round} result={result} />
          </View>
        </Animated.View>

        <Animated.View entering={enter(FadeInUp.delay(250).springify())}>
          {Platform.OS !== 'web' && (
            <Plaque kind="ghost" label="Share the damage" onPress={share} style={styles.shareBtn} />
          )}
          <View style={styles.actions}>
            <Plaque kind="ghost" label="← Back to round" onPress={() => router.back()} style={styles.flex1} />
            <Plaque label="Save & done" onPress={saveAndNew} style={styles.flex1} />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 44 },
  // solid felt so the shared PNG isn't transparent
  shot: { backgroundColor: theme.feltDeep, borderRadius: 12, padding: 6 },
  empty: { fontFamily: theme.fontDisplayItalic, color: theme.bone, textAlign: 'center', marginTop: 140, fontSize: 17 },
  emptyBtn: { margin: 24 },
  shareBtn: { marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
});
