import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/theme';

interface PillButtonProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** 'light' renders on bone cards, 'dark' on the felt background. */
  variant?: 'light' | 'dark';
  selectedColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Selectable chip used for wolf picks, junk dots, and toggles. */
export function PillButton({
  label,
  selected = false,
  disabled = false,
  onPress,
  variant = 'light',
  selectedColor = theme.up,
  style,
}: PillButtonProps) {
  const base = variant === 'light' ? styles.light : styles.dark;
  const text = variant === 'light' ? styles.lightText : styles.darkText;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        base,
        selected && { backgroundColor: selectedColor },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  light: { backgroundColor: theme.boneDim },
  dark: { backgroundColor: theme.boneFaint, borderWidth: 1, borderColor: theme.line },
  lightText: { fontFamily: theme.fontUISemi, fontSize: 13, color: theme.ink },
  darkText: { fontFamily: theme.fontUISemi, fontSize: 13, color: theme.bone },
  selectedText: { color: theme.bone },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.97 }] },
});
