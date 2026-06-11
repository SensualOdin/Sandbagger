import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { tapSelect } from '@/lib/haptics';
import { theme } from '@/theme';

interface PillButtonProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** Renders a small "?" tail that opens an explanation instead of toggling. */
  onInfo?: () => void;
  /** 'light' renders on bone cards, 'dark' on the felt background. */
  variant?: 'light' | 'dark';
  selectedColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Ball-marker chip: stamped metal when selected, etched when idle. */
export function PillButton({
  label,
  selected = false,
  disabled = false,
  onPress,
  onInfo,
  variant = 'light',
  selectedColor = theme.up,
  style,
}: PillButtonProps) {
  const base = variant === 'light' ? styles.light : styles.dark;
  const text = variant === 'light' ? styles.lightText : styles.darkText;
  const pill = (
    <Pressable
      disabled={disabled}
      onPress={() => {
        tapSelect();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        base,
        selected && {
          backgroundColor: selectedColor,
          borderColor: 'rgba(4,19,10,0.45)',
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
  if (!onInfo) return pill;
  return (
    <View style={styles.withInfo}>
      {pill}
      <Pressable hitSlop={8} onPress={onInfo} accessibilityLabel={`about ${label}`}>
        <Text style={styles.info}>?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  light: { backgroundColor: theme.boneDim, borderColor: theme.inkLine },
  dark: { backgroundColor: theme.boneFaint, borderColor: theme.line },
  lightText: { fontFamily: theme.fontUISemi, fontSize: 13, color: theme.ink },
  darkText: { fontFamily: theme.fontUISemi, fontSize: 13, color: theme.bone },
  selectedText: { color: theme.bone },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.96 }] },
  withInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  info: {
    fontFamily: theme.fontMonoLight,
    fontSize: 11,
    color: theme.brassDeep,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.brassDeep,
    borderRadius: 8,
    width: 15,
    height: 15,
    textAlign: 'center',
    lineHeight: 14,
    overflow: 'hidden',
  },
});
