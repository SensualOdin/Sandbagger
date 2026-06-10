import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { PillButton } from '@/components/PillButton';
import type { Round, WolfDecision } from '@/engine/types';
import { theme } from '@/theme';

interface WolfPickerProps {
  round: Round;
  hole: number;
  onPick: (d: WolfDecision) => void;
}

export function WolfPicker({ round, hole, onPick }: WolfPickerProps) {
  const ids = round.players.map((p) => p.id);
  const wolfId = ids[hole % ids.length];
  const name = (id: string) => round.players.find((p) => p.id === id)?.name ?? id;
  const cur = round.wolf[hole];
  const { loneMult, blindMult } = round.config.wolf!;

  return (
    <Card framed style={styles.card}>
      <Text style={styles.title}>
        🐺 <Text style={styles.titleItalic}>Wolf this hole —</Text>{' '}
        <Text style={styles.wolfName}>{name(wolfId)}</Text>
      </Text>
      <View style={styles.chips}>
        {ids
          .filter((id) => id !== wolfId)
          .map((id) => (
            <PillButton
              key={id}
              label={`+ ${name(id)}`}
              selected={cur?.mode === 'partner' && cur.partnerId === id}
              onPress={() => onPick({ mode: 'partner', partnerId: id })}
            />
          ))}
        <PillButton
          label={`Lone Wolf ×${loneMult}`}
          selected={cur?.mode === 'lone'}
          selectedColor={theme.clay}
          onPress={() => onPick({ mode: 'lone' })}
        />
        <PillButton
          label={`Blind Wolf ×${blindMult}`}
          selected={cur?.mode === 'blind'}
          selectedColor={theme.clay}
          onPress={() => onPick({ mode: 'blind' })}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 18, marginVertical: 6, padding: 15 },
  title: { fontFamily: theme.fontUISemi, fontSize: 14, color: theme.brassDeep, marginBottom: 10 },
  titleItalic: { fontFamily: theme.fontDisplayItalic },
  wolfName: { fontFamily: theme.fontUIBold, color: theme.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
