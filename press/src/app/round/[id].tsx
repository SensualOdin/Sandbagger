import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettleView } from '@/components/settle/SettleView';
import { getRound } from '@/db/history';
import { theme } from '@/theme';

export default function RoundDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useMemo(() => (id ? getRound(id) : null), [id]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {saved ? (
          <SettleView round={saved.round} result={saved.result} />
        ) : (
          <Text style={styles.empty}>Round not found.</Text>
        )}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to history</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 40 },
  empty: { fontFamily: theme.fontUI, color: theme.bone, textAlign: 'center', marginTop: 120, fontSize: 16 },
  backBtn: {
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: theme.boneFaint,
    borderWidth: 1,
    borderColor: theme.line,
  },
  backText: { fontFamily: theme.fontUISemi, fontSize: 15, color: theme.bone },
});
