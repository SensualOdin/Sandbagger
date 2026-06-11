import { Platform } from 'react-native';

/**
 * Entering animations don't run on static web (reanimated layout animations
 * are native-only there), which would leave content frozen at opacity 0 —
 * so on web we skip them entirely.
 */
export const enter = <T,>(animation: T): T | undefined =>
  Platform.OS === 'web' ? undefined : animation;
