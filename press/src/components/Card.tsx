import { StyleSheet, View, type ViewProps } from 'react-native';

import { theme } from '@/theme';

interface CardProps extends ViewProps {
  /** Adds the engraved inner hairline frame — for cards that should feel printed. */
  framed?: boolean;
}

/** Cream cardstock riding above the felt. */
export function Card({ style, framed = false, children, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {framed && <View pointerEvents="none" style={styles.frame} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.bone,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: 'rgba(4,19,10,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  frame: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: theme.radius.card - 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.inkHairline,
  },
});
