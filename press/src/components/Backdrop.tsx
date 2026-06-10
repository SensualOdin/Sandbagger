import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { FELT_GRADIENT, theme } from '@/theme';

/**
 * The room every screen lives in: deep felt falling away to black at the
 * bottom, a faint brass lamp-glow from above, and edge vignettes. Mount once
 * behind the router.
 */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={FELT_GRADIENT} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      {/* lamp glow */}
      <LinearGradient
        colors={[theme.feltGlow, 'rgba(214,174,96,0.0)']}
        locations={[0, 1]}
        style={styles.glow}
      />
      {/* side vignettes */}
      <LinearGradient
        colors={['rgba(4,19,10,0.55)', 'rgba(4,19,10,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.18, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(4,19,10,0)', 'rgba(4,19,10,0.55)']}
        start={{ x: 0.82, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
});
