import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Plaque } from '@/components/Plaque';
import { SettleView } from '@/components/settle/SettleView';
import { getRound } from '@/db/history';
import { enter } from '@/lib/anim';
import { theme } from '@/theme';

export default function RoundDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useMemo(() => (id ? getRound(id) : null), [id]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {saved ? (
          <Animated.View entering={enter(FadeInDown.springify().damping(14))}>
            <SettleView round={saved.round} result={saved.result} />
          </Animated.View>
        ) : (
          <Text style={styles.empty}>Round not found.</Text>
        )}
        <Plaque kind="ghost" label="← Back to history" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 44 },
  empty: { fontFamily: theme.fontDisplayItalic, color: theme.bone, textAlign: 'center', marginVertical: 140, fontSize: 17 },
});
