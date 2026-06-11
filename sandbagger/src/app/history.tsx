import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Plaque } from '@/components/Plaque';
import { deleteRound, listRounds, type HistoryRow } from '@/db/history';
import type { FormatKey } from '@/engine/types';
import { FORMATS } from '@/lib/formats';
import { theme } from '@/theme';

export default function History() {
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      setRows(listRounds());
    }, [])
  );

  const confirmDelete = (row: HistoryRow) =>
    Alert.alert('Delete round?', `${row.playerNames.join(', ')} — this can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteRound(row.id);
          setRows(listRounds());
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.kicker}>✦ THE LEDGER ✦</Text>
      <Text style={styles.title}>History</Text>
      {rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>No rounds on the books.</Text>
          <Text style={styles.emptySub}>Go take someone&apos;s money.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <Pressable
                onPress={() => router.push({ pathname: '/round/[id]', params: { id: item.id } })}
                onLongPress={() => confirmDelete(item)}
              >
                <Card framed style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.format}>
                      {item.formats
                        .map((f) => FORMATS[f as FormatKey]?.label ?? f)
                        .join(' + ')}{' '}
                      · {item.numHoles}
                    </Text>
                    <Text style={styles.players} numberOfLines={1}>
                      {item.playerNames.join(', ')}
                    </Text>
                    <Text style={styles.date}>
                      {new Date(item.createdAt)
                        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.topLine}>{item.topLine}</Text>
                </Card>
              </Pressable>
            </Animated.View>
          )}
        />
      )}
      <Plaque kind="ghost" label="The Books · career ledger" onPress={() => router.push('/stats')} style={styles.backBtn} />
      <Plaque kind="ghost" label="← Back" onPress={() => router.back()} style={styles.backBtn} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20 },
  kicker: {
    fontFamily: theme.fontMonoLight,
    fontSize: 10,
    letterSpacing: 4,
    color: theme.brass,
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    fontFamily: theme.fontDisplayBlack,
    fontSize: 40,
    color: theme.bone,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    letterSpacing: -1,
  },
  list: { gap: 12, paddingBottom: 16 },
  row: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexShrink: 1, paddingRight: 10 },
  format: { fontFamily: theme.fontDisplay, fontSize: 17, color: theme.ink },
  players: { fontFamily: theme.fontUI, fontSize: 13, color: theme.inkSoft, marginTop: 3 },
  date: { fontFamily: theme.fontMonoLight, fontSize: 10, letterSpacing: 2, color: theme.inkFaint, marginTop: 5 },
  topLine: { fontFamily: theme.fontMono, fontSize: 14, color: theme.up },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: theme.fontDisplay, fontSize: 22, color: theme.bone },
  emptySub: { fontFamily: theme.fontDisplayItalic, fontSize: 14, color: theme.boneMuted, marginTop: 8 },
  backBtn: { marginTop: 8 },
});
