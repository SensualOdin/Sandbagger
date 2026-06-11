import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Plaque } from '@/components/Plaque';
import { Rule } from '@/components/Rule';
import { theme } from '@/theme';

export interface RuleBookEntry {
  title: string;
  body: string;
}

interface RuleBookProps {
  entry: RuleBookEntry | null;
  onClose: () => void;
}

/** The club rule book: a cardstock page that explains a game or a dot. */
export function RuleBook({ entry, onClose }: RuleBookProps) {
  return (
    <Modal visible={entry != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <Card framed style={styles.page}>
            <Text style={styles.kicker}>FROM THE RULE BOOK</Text>
            <Text style={styles.title}>{entry?.title}</Text>
            <Rule variant="card" />
            <Text style={styles.body}>{entry?.body}</Text>
            <Plaque label="Got it" onPress={onClose} style={styles.btn} />
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,19,10,0.82)',
    justifyContent: 'center',
    padding: 26,
  },
  page: { padding: 22 },
  kicker: {
    fontFamily: theme.fontMonoLight,
    fontSize: 10,
    letterSpacing: 3,
    color: theme.brassDeep,
    textAlign: 'center',
  },
  title: {
    fontFamily: theme.fontDisplay,
    fontSize: 26,
    color: theme.ink,
    textAlign: 'center',
    marginTop: 6,
  },
  body: {
    fontFamily: theme.fontDisplayItalic,
    fontSize: 15,
    lineHeight: 23,
    color: theme.ink,
    marginTop: 4,
    marginBottom: 18,
  },
  btn: { marginTop: 4 },
});
