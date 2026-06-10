import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { SettleView } from '@/components/settle/SettleView';
import { computeResults } from '@/engine';
import { saveRound } from '@/db/history';
import { useRoundStore } from '@/store/roundStore';
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
        <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/')}>
          <Text style={styles.secondaryText}>Home</Text>
        </Pressable>
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
        <View ref={shotRef} collapsable={false} style={styles.shot}>
          <SettleView round={round} result={result} />
        </View>

        <Pressable style={styles.shareBtn} onPress={share}>
          <Text style={styles.shareText}>Share the damage</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>← Back to round</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={saveAndNew}>
            <Text style={styles.primaryText}>Save &amp; done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 40 },
  shot: { backgroundColor: theme.felt },
  empty: { fontFamily: theme.fontUI, color: theme.bone, textAlign: 'center', marginTop: 120, fontSize: 16 },
  shareBtn: {
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: theme.boneFaint,
    borderWidth: 1,
    borderColor: theme.brassDim,
    marginBottom: 12,
  },
  shareText: { fontFamily: theme.fontUISemi, fontSize: 15, color: theme.brass },
  actions: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: theme.brass },
  primaryText: { fontFamily: theme.fontUIBold, fontSize: 15, color: theme.feltDeep },
  secondaryBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: theme.boneFaint,
    borderWidth: 1,
    borderColor: theme.line,
  },
  secondaryText: { fontFamily: theme.fontUISemi, fontSize: 15, color: theme.bone },
});
