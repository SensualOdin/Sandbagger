import { StyleSheet, Text, View } from 'react-native';

import { Stepper } from '@/components/Stepper';
import { theme } from '@/theme';

interface KnobProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
  suffix?: string;
}

/** Labeled config stepper row used for stakes and house rules. */
export function Knob({ label, value, onChange, step = 1, min = 0, prefix = '', suffix = '' }: KnobProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Stepper
        size="small"
        display={`${prefix}${value}${suffix}`}
        onDec={() => onChange(Math.max(min, value - step))}
        onInc={() => onChange(value + step)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontFamily: theme.fontUISemi,
    fontSize: 14,
    color: theme.ink,
    flexShrink: 1,
    paddingRight: 8,
  },
});
