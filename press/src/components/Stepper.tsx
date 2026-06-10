import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

interface StepperProps {
  display: string;
  onDec: () => void;
  onInc: () => void;
  size?: 'large' | 'small';
}

/** Big-thumb minus/plus stepper with haptics — the core on-course control. */
export function Stepper({ display, onDec, onInc, size = 'large' }: StepperProps) {
  const tap = (fn: () => void) => () => {
    Haptics.selectionAsync();
    fn();
  };
  const btn = size === 'large' ? styles.btnLarge : styles.btnSmall;
  const txt = size === 'large' ? styles.valueLarge : styles.valueSmall;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="decrease"
        onPress={tap(onDec)}
        style={({ pressed }) => [btn, styles.dec, pressed && styles.pressed]}
      >
        <Text style={styles.decGlyph}>−</Text>
      </Pressable>
      <Text style={txt}>{display}</Text>
      <Pressable
        accessibilityLabel="increase"
        onPress={tap(onInc)}
        style={({ pressed }) => [btn, styles.inc, pressed && styles.pressed]}
      >
        <Text style={styles.incGlyph}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnLarge: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dec: { backgroundColor: theme.boneDim },
  inc: { backgroundColor: theme.ink },
  pressed: { transform: [{ scale: 0.95 }] },
  decGlyph: { color: theme.ink, fontSize: 24, lineHeight: 28 },
  incGlyph: { color: theme.bone, fontSize: 24, lineHeight: 28 },
  valueLarge: {
    fontFamily: theme.fontMono,
    fontSize: 28,
    color: theme.ink,
    minWidth: 40,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  valueSmall: {
    fontFamily: theme.fontMono,
    fontSize: 18,
    color: theme.ink,
    minWidth: 56,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
