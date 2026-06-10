import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

/**
 * Receipt perforation: a row of felt-colored notches biting into cardstock.
 * Put on the top or bottom edge of a settle ticket.
 */
export function TicketEdge({ position = 'bottom' }: { position?: 'top' | 'bottom' }) {
  return (
    <View style={[styles.row, position === 'top' ? styles.top : styles.bottom]}>
      {Array.from({ length: 18 }, (_, i) => (
        <View key={i} style={styles.notch} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    overflow: 'hidden',
    height: 7,
  },
  top: { marginBottom: -1 },
  bottom: { marginTop: -1 },
  notch: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.feltDeep,
    alignSelf: 'center',
  },
});
