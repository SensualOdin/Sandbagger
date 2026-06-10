import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { deleteRound, listRounds, type HistoryRow } from '@/db/history';
import { FORMATS } from '@/lib/formats';
import type { FormatKey } from '@/engine/types';
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
      <Text style={styles.title}>History</Text>
      {rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>No rounds yet.</Text>
          <Text style={styles.emptySub}>Go take someone&apos;s money.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/round/[id]', params: { id: item.id } })}
              onLongPress={() => confirmDelete(item)}
            >
              <Card style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.format}>
                    {FORMATS[item.format as FormatKey]?.label ?? item.format} · {item.numHoles}
                  </Text>
                  <Text style={styles.players} numberOfLines={1}>
                    {item.playerNames.join(', ')}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={styles.topLine}>{item.topLine}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}
      <Pressable style={styles.homeBtn} onPress={() => router.back()}>
        <Text style={styles.homeText}>← Back</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 18 },
  title: {
    fontFamily: theme.fontDisplay,
    fontSize: 34,
    color: theme.bone,
    textAlign: 'center',
    marginBottom: 18,
  },
  list: { gap: 10, paddingBottom: 16 },
  row: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexShrink: 1, paddingRight: 10 },
  format: { fontFamily: theme.fontUIBold, fontSize: 15, color: theme.ink },
  players: { fontFamily: theme.fontUI, fontSize: 13, color: theme.inkFaint, marginTop: 2 },
  date: { fontFamily: theme.fontMono, fontSize: 11, color: theme.inkFaint, marginTop: 4 },
  topLine: { fontFamily: theme.fontMono, fontSize: 14, color: theme.up },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: theme.fontDisplay, fontSize: 22, color: theme.bone },
  emptySub: { fontFamily: theme.fontUI, fontSize: 14, color: theme.boneMuted, marginTop: 6 },
  homeBtn: { padding: 14, alignItems: 'center' },
  homeText: { fontFamily: theme.fontUISemi, fontSize: 15, color: theme.bone },
});
