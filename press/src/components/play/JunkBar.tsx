import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { PillButton } from '@/components/PillButton';
import { snakeHolder } from '@/engine/junk';
import type { JunkEvent, JunkType, Round } from '@/engine/types';
import { JUNK_TYPES } from '@/lib/formats';
import { theme } from '@/theme';

const BBB_ROWS: { type: JunkType; label: string }[] = [
  { type: 'bingo', label: 'Bingo · first on' },
  { type: 'bango', label: 'Bango · closest on' },
  { type: 'bongo', label: 'Bongo · first in' },
];

interface JunkBarProps {
  round: Round;
  hole: number;
  onToggle: (e: JunkEvent) => void;
}

/** Dot rows for the current hole: junk types (or BBB dots) x player chips. */
export function JunkBar({ round, hole, onToggle }: JunkBarProps) {
  const rows =
    round.format === 'bingoBangoBongo'
      ? BBB_ROWS
      : round.junk.config.enabled.map((t) => ({
          type: t,
          label: JUNK_TYPES.find((j) => j.type === t)?.label ?? t,
        }));
  if (rows.length === 0) return null;

  const has = (type: JunkType, playerId: string) =>
    round.junk.events.some((e) => e.hole === hole && e.type === type && e.playerId === playerId);

  const holderId = snakeHolder(round.junk.events);
  const holderName = round.players.find((p) => p.id === holderId)?.name;

  const rowLabel = (row: { type: JunkType; label: string }) =>
    row.type === 'snake'
      ? `Snake 🐍 ${holderName ? `· ${holderName} has it` : '· nobody yet'}`
      : row.label;

  return (
    <Card style={styles.card}>
      {rows.map((row) => (
        <View key={row.type} style={styles.row}>
          <Text style={styles.label}>{rowLabel(row)}</Text>
          <View style={styles.chips}>
            {round.players.map((p) => (
              <PillButton
                key={p.id}
                label={p.name}
                selected={has(row.type, p.id)}
                selectedColor={row.type === 'snake' ? theme.clay : theme.up}
                onPress={() => onToggle({ hole, type: row.type, playerId: p.id })}
              />
            ))}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 6, padding: 14, gap: 10 },
  row: { gap: 6 },
  label: { fontFamily: theme.fontUISemi, fontSize: 12, color: theme.brassDim },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
