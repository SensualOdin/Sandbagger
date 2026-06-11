import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { BRASS_GRADIENT, theme } from '@/theme';

interface PlaqueProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** brass = primary engraved plate; ghost = etched outline on felt. */
  kind?: 'brass' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

/** The club's button: an engraved brass plate that gives under the thumb. */
export function Plaque({ label, onPress, disabled = false, kind = 'brass', style }: PlaqueProps) {
  const scale = useSharedValue(1);
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View style={[pressed, style]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => (scale.value = withSpring(0.965, { damping: 18, stiffness: 320 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 14, stiffness: 260 }))}
        onPress={press}
      >
        {kind === 'brass' ? (
          <View style={[styles.brassFrame, disabled && styles.disabled]}>
            <LinearGradient colors={BRASS_GRADIENT} locations={[0, 0.55, 1]} style={styles.brassFace}>
              <Text style={styles.brassLabel}>{label.toUpperCase()}</Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={[styles.ghost, disabled && styles.disabled]}>
            <Text style={styles.ghostLabel}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  brassFrame: {
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: 'rgba(36,27,8,0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  brassFace: {
    borderRadius: theme.radius.button - 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,244,214,0.65)',
    paddingVertical: 17,
    alignItems: 'center',
  },
  brassLabel: {
    fontFamily: theme.fontUIBold,
    fontSize: 15,
    letterSpacing: 2.5,
    color: theme.brassInk,
  },
  ghost: {
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.boneFaint,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ghostLabel: {
    fontFamily: theme.fontUISemi,
    fontSize: 15,
    color: theme.bone,
  },
  disabled: { opacity: 0.45 },
});
