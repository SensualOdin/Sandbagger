import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Knob } from '@/components/Knob';
import { PillButton } from '@/components/PillButton';
import { SectionLabel } from '@/components/SectionLabel';
import type { FormatConfig, FormatKey, JunkType, Player } from '@/engine/types';
import { buildRound, defaultConfig, FORMAT_KEYS, FORMATS, formatAvailable, JUNK_TYPES } from '@/lib/formats';
import { newId } from '@/lib/id';
import { useRoundStore } from '@/store/roundStore';
import { theme } from '@/theme';

const mkPlayer = (): Player => ({ id: newId(), name: '' });

export default function Setup() {
  const startRound = useRoundStore((s) => s.startRound);
  const [players, setPlayers] = useState<Player[]>([mkPlayer(), mkPlayer()]);
  const [numHoles, setNumHoles] = useState<9 | 18>(18);
  const [format, setFormat] = useState<FormatKey>('skins');
  const [config, setConfig] = useState<FormatConfig>(defaultConfig(players));
  const [useNet, setUseNet] = useState(false);
  const [junkEnabled, setJunkEnabled] = useState<JunkType[]>([]);
  const [junkValues, setJunkValues] = useState<Partial<Record<JunkType, number>>>({});
  const [team1, setTeam1] = useState<string[]>([]);

  const count = players.length;
  const blocked = formatAvailable(format, count, numHoles);
  const named = players.every((p) => p.name.trim().length > 0);
  const vegasReady = format !== 'vegas' || team1.length === 2;
  const canStart = !blocked && named && vegasReady;

  const patch = <K extends keyof FormatConfig>(key: K, val: FormatConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: val }));

  const setName = (id: string, name: string) =>
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
  const setHandicap = (id: string, text: string) =>
    setPlayers((ps) =>
      ps.map((p) =>
        p.id === id ? { ...p, handicapIndex: text === '' ? undefined : Number(text) || 0 } : p
      )
    );

  const toggleJunkType = (t: JunkType) => {
    setJunkEnabled((e) => (e.includes(t) ? e.filter((x) => x !== t) : [...e, t]));
    setJunkValues((v) => ({ ...v, [t]: v[t] ?? 1 }));
  };

  const toggleTeam1 = (id: string) =>
    setTeam1((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < 2 ? [...t, id] : t));

  const removePlayer = (id: string) => {
    setPlayers((ps) => ps.filter((x) => x.id !== id));
    setTeam1((t) => t.filter((x) => x !== id));
  };

  const start = () => {
    const finalConfig: FormatConfig = { ...config };
    if (format === 'vegas') {
      const team2 = players.filter((p) => !team1.includes(p.id)).map((p) => p.id);
      finalConfig.vegas = { ...config.vegas!, teams: [team1, team2] };
    }
    startRound(
      buildRound({
        players,
        format,
        numHoles,
        config: finalConfig,
        useNetScoring: useNet,
        junkEnabled,
        junkValues,
      })
    );
    router.replace('/play');
  };

  const knobs = useMemo(() => {
    switch (format) {
      case 'skins':
        return (
          <>
            <Knob label="Per skin" prefix="$" value={config.skins!.value} min={1}
              onChange={(v) => patch('skins', { ...config.skins!, value: v })} />
            <RowToggle label="Ties carry over" value={config.skins!.carryover}
              onChange={(v) => patch('skins', { ...config.skins!, carryover: v })} />
            <RowToggle
              label={config.skins!.valueMode === 'perPlayer' ? 'Each player pays per skin' : 'Skin is the total pot'}
              value={config.skins!.valueMode === 'perPlayer'}
              onChange={(v) => patch('skins', { ...config.skins!, valueMode: v ? 'perPlayer' : 'totalPot' })} />
          </>
        );
      case 'nassau':
        return (
          <>
            <Knob label="Per leg (front / back / total)" prefix="$" value={config.nassau!.perLeg} min={1}
              onChange={(v) => patch('nassau', { ...config.nassau!, perLeg: v })} />
            <RowToggle label="Auto-press when down" value={config.nassau!.autoPress}
              onChange={(v) => patch('nassau', { ...config.nassau!, autoPress: v })} />
            {config.nassau!.autoPress && (
              <Knob label="Press trigger (holes down)" value={config.nassau!.pressTrigger} min={1}
                onChange={(v) => patch('nassau', { ...config.nassau!, pressTrigger: v })} />
            )}
          </>
        );
      case 'wolf':
        return (
          <>
            <Knob label="Point value" prefix="$" value={config.wolf!.pointValue} min={1}
              onChange={(v) => patch('wolf', { ...config.wolf!, pointValue: v })} />
            <Knob label="Lone Wolf multiplier" suffix="×" value={config.wolf!.loneMult} min={1}
              onChange={(v) => patch('wolf', { ...config.wolf!, loneMult: v })} />
            <Knob label="Blind Wolf multiplier" suffix="×" value={config.wolf!.blindMult} min={1}
              onChange={(v) => patch('wolf', { ...config.wolf!, blindMult: v })} />
          </>
        );
      case 'vegas':
        return (
          <>
            <Knob label="Point value" prefix="$" value={config.vegas!.pointValue} min={1}
              onChange={(v) => patch('vegas', { ...config.vegas!, pointValue: v })} />
            <RowToggle label="Flip the bird (birdie reverses)" value={config.vegas!.flipBirds}
              onChange={(v) => patch('vegas', { ...config.vegas!, flipBirds: v })} />
            <Text style={styles.hint}>Tap two players for team 1 — the rest are team 2.</Text>
            <View style={styles.chips}>
              {players.map((p, i) => (
                <PillButton key={p.id} label={p.name.trim() || `Player ${i + 1}`}
                  selected={team1.includes(p.id)} onPress={() => toggleTeam1(p.id)} />
              ))}
            </View>
          </>
        );
      case 'bingoBangoBongo':
        return (
          <Knob label="Per dot" prefix="$" value={config.bingoBangoBongo!.pointValue} min={1}
            onChange={(v) => patch('bingoBangoBongo', { pointValue: v })} />
        );
      case 'matchplay':
        return (
          <Knob label="Match value" prefix="$" value={config.matchplay!.matchValue} min={1}
            onChange={(v) => patch('matchplay', { matchValue: v })} />
        );
      case 'strokeplay':
        return (
          <Knob label="Per stroke" prefix="$" value={config.strokeplay!.perStroke} min={1}
            onChange={(v) => patch('strokeplay', { perStroke: v })} />
        );
      case 'sixpoint':
        return (
          <Knob label="Point value" prefix="$" value={config.sixpoint!.pointValue} min={1}
            onChange={(v) => patch('sixpoint', { pointValue: v })} />
        );
    }
  }, [format, config, players, team1]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>New round</Text>

          <SectionLabel>Players</SectionLabel>
          <Card style={styles.playersCard}>
            {players.map((p, i) => (
              <View key={p.id} style={[styles.playerRow, i > 0 && styles.rowDivider]}>
                <Text style={styles.playerNum}>{i + 1}</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder={`Player ${i + 1}`}
                  placeholderTextColor={theme.inkFaint}
                  value={p.name}
                  onChangeText={(t) => setName(p.id, t)}
                />
                {useNet && (
                  <TextInput
                    style={styles.hcpInput}
                    placeholder="HCP"
                    placeholderTextColor={theme.inkFaint}
                    keyboardType="numbers-and-punctuation"
                    value={p.handicapIndex != null ? String(p.handicapIndex) : ''}
                    onChangeText={(t) => setHandicap(p.id, t)}
                  />
                )}
                {players.length > 2 && (
                  <Pressable onPress={() => removePlayer(p.id)}>
                    <Text style={styles.remove}>×</Text>
                  </Pressable>
                )}
              </View>
            ))}
            {players.length < 6 && (
              <Pressable
                style={[styles.addRow, styles.rowDivider]}
                onPress={() => setPlayers((ps) => [...ps, mkPlayer()])}
              >
                <Text style={styles.addText}>+ Add player</Text>
              </Pressable>
            )}
          </Card>

          <SectionLabel>Holes</SectionLabel>
          <View style={styles.holesRow}>
            {([9, 18] as const).map((h) => (
              <Pressable
                key={h}
                style={[styles.holeBtn, numHoles === h && styles.holeBtnSel]}
                onPress={() => setNumHoles(h)}
              >
                <Text style={[styles.holeText, numHoles === h && styles.holeTextSel]}>{h} holes</Text>
              </Pressable>
            ))}
          </View>

          <SectionLabel>Game</SectionLabel>
          <View style={styles.formats}>
            {FORMAT_KEYS.map((k) => {
              const f = FORMATS[k];
              const reason = formatAvailable(k, count, numHoles);
              const sel = format === k;
              return (
                <Pressable
                  key={k}
                  disabled={!!reason}
                  onPress={() => setFormat(k)}
                  style={[styles.formatCard, sel && styles.formatSel, !!reason && styles.formatOff]}
                >
                  <View style={styles.formatHead}>
                    <Text style={[styles.formatLabel, sel && styles.formatLabelSel]}>{f.label}</Text>
                    <Text style={[styles.formatPlayers, sel && styles.formatLabelSel]}>
                      {f.min === f.max ? `${f.min}p` : `${f.min}–${f.max}p`}
                    </Text>
                  </View>
                  <Text style={[styles.formatBlurb, sel && styles.formatLabelSel]}>{f.blurb}</Text>
                  {reason && <Text style={styles.formatReason}>{reason}</Text>}
                </Pressable>
              );
            })}
          </View>

          <SectionLabel>Stakes &amp; house rules</SectionLabel>
          <Card style={styles.knobCard}>{knobs}</Card>

          {format !== 'bingoBangoBongo' && (
            <>
              <SectionLabel>Junk · dots</SectionLabel>
              <Card style={styles.knobCard}>
                <View style={styles.chips}>
                  {JUNK_TYPES.map((j) => (
                    <PillButton
                      key={j.type}
                      label={j.label}
                      selected={junkEnabled.includes(j.type)}
                      selectedColor={j.type === 'snake' ? theme.clay : theme.up}
                      onPress={() => toggleJunkType(j.type)}
                    />
                  ))}
                </View>
                {junkEnabled.map((t) => (
                  <Knob
                    key={t}
                    label={`${JUNK_TYPES.find((j) => j.type === t)!.label} value`}
                    prefix="$"
                    min={1}
                    value={junkValues[t] ?? 1}
                    onChange={(v) => setJunkValues((vals) => ({ ...vals, [t]: v }))}
                  />
                ))}
              </Card>
            </>
          )}

          <Card style={styles.knobCard}>
            <RowToggle label="Net scoring (handicaps)" value={useNet} onChange={setUseNet} />
          </Card>

          <Pressable
            style={[styles.start, !canStart && styles.startOff]}
            disabled={!canStart}
            onPress={start}
          >
            <Text style={[styles.startText, !canStart && styles.startTextOff]}>
              {canStart
                ? 'Start round →'
                : !named
                  ? 'Name all players'
                  : blocked
                    ? 'Pick a valid game'
                    : 'Pick team 1 (2 players)'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RowToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.up, false: theme.boneDim }}
        thumbColor={theme.bone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 48 },
  title: {
    fontFamily: theme.fontDisplay,
    fontSize: 34,
    color: theme.bone,
    textAlign: 'center',
    marginBottom: 20,
  },
  playersCard: { padding: 8, marginBottom: 22 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: theme.inkLine },
  playerNum: { fontFamily: theme.fontMono, fontSize: 14, color: theme.brassDim, width: 20 },
  nameInput: { flex: 1, fontFamily: theme.fontUISemi, fontSize: 16, color: theme.ink, padding: 0 },
  hcpInput: {
    width: 52,
    fontFamily: theme.fontMono,
    fontSize: 14,
    color: theme.ink,
    backgroundColor: theme.boneDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
  },
  remove: { color: theme.clay, fontSize: 22, paddingHorizontal: 6 },
  addRow: { padding: 12, alignItems: 'center' },
  addText: { fontFamily: theme.fontUISemi, fontSize: 14, color: theme.brassDim },
  holesRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  holeBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: theme.boneFaint,
    borderWidth: 1,
    borderColor: theme.line,
  },
  holeBtnSel: { backgroundColor: theme.brass, borderColor: theme.brass },
  holeText: { fontFamily: theme.fontUISemi, fontSize: 16, color: theme.bone },
  holeTextSel: { color: theme.feltDeep },
  formats: { gap: 10, marginBottom: 22 },
  formatCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.boneFaint,
    borderWidth: 1,
    borderColor: theme.line,
  },
  formatSel: { backgroundColor: theme.brass, borderColor: theme.brass },
  formatOff: { opacity: 0.55 },
  formatHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formatLabel: { fontFamily: theme.fontDisplay, fontSize: 20, color: theme.bone },
  formatLabelSel: { color: theme.feltDeep },
  formatPlayers: { fontFamily: theme.fontMono, fontSize: 11, color: theme.bone },
  formatBlurb: { fontFamily: theme.fontUI, fontSize: 13, color: theme.bone, marginTop: 3, opacity: 0.85 },
  formatReason: { fontFamily: theme.fontUI, fontSize: 11, color: theme.down, marginTop: 4 },
  knobCard: { padding: 16, marginBottom: 22, gap: 4 },
  hint: { fontFamily: theme.fontUI, fontSize: 12, color: theme.inkFaint, marginTop: 6, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  toggleLabel: { fontFamily: theme.fontUISemi, fontSize: 14, color: theme.ink, flexShrink: 1, paddingRight: 8 },
  start: { padding: 17, borderRadius: 16, alignItems: 'center', backgroundColor: theme.brass, marginTop: 4 },
  startOff: { backgroundColor: 'rgba(244,239,225,0.12)' },
  startText: { fontFamily: theme.fontUIBold, fontSize: 17, color: theme.feltDeep },
  startTextOff: { color: theme.boneMuted },
});
