import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

interface RuleProps {
  /** Optional engraved label set between the rules. */
  label?: string;
  /** 'felt' for dark backgrounds, 'card' for cardstock. */
  variant?: 'felt' | 'card';
}

/** Engraved divider: ───── ✦ ───── , the club's letterpress signature. */
export function Rule({ label, variant = 'felt' }: RuleProps) {
  const lineColor = variant === 'felt' ? theme.line : theme.inkHairline;
  const textColor = variant === 'felt' ? theme.brass : theme.brassDeep;
  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
      <Text style={[styles.mark, { color: textColor }]}>
        {label ? `✦  ${label.toUpperCase()}  ✦` : '✦'}
      </Text>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  mark: {
    fontFamily: theme.fontMonoLight,
    fontSize: 10,
    letterSpacing: 3,
  },
});
