import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Haptics that quietly stand down on the web. */
export const tapSelect = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export const tapImpact = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
};
