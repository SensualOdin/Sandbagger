import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tapSelect } from '@/lib/haptics';
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
    tapSelect();
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
    width: 48,
    height: 48,
    borderRadius: 14,
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
  dec: {
    backgroundColor: theme.boneDim,
    borderWidth: 1,
    borderColor: theme.inkLine,
    borderBottomWidth: 2,
    borderBottomColor: theme.boneShadow,
  },
  inc: {
    backgroundColor: theme.ink,
    borderWidth: 1,
    borderColor: theme.feltBlack,
    borderTopWidth: 1,
    borderTopColor: 'rgba(246,240,223,0.25)',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  decGlyph: { color: theme.ink, fontSize: 24, lineHeight: 28 },
  incGlyph: { color: theme.bone, fontSize: 24, lineHeight: 28 },
  valueLarge: {
    fontFamily: theme.fontMono,
    fontSize: 30,
    color: theme.ink,
    minWidth: 42,
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
