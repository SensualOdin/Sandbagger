import { StyleSheet, Text } from 'react-native';

import { theme } from '@/theme';

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: theme.fontUISemi,
    fontSize: 12,
    letterSpacing: 2,
    color: theme.brass,
    marginHorizontal: 4,
    marginBottom: 10,
    marginTop: 2,
  },
});
