import { LinearGradient } from 'expo-linear-gradient';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Knob } from '@/components/Knob';
import { PillButton } from '@/components/PillButton';
import { Plaque } from '@/components/Plaque';
import { Rule } from '@/components/Rule';
import type { FormatConfig, FormatKey, JunkType, Player } from '@/engine/types';
import { buildRound, defaultConfig, FORMAT_KEYS, FORMATS, formatAvailable, JUNK_TYPES } from '@/lib/formats';
import { newId } from '@/lib/id';
import { useRoundStore } from '@/store/roundStore';
import { BRASS_GRADIENT, theme } from '@/theme';

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
          <Animated.View entering={FadeInDown.springify()}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
            <Text style={styles.kicker}>OPEN THE BOOK</Text>
            <Text style={styles.title}>New round</Text>
          </Animated.View>

          <Rule label="Players" />
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Card framed style={styles.playersCard}>
              {players.map((p, i) => (
                <View key={p.id} style={[styles.playerRow, i > 0 && styles.rowDivider]}>
                  <Text style={styles.playerNum}>{String(i + 1).padStart(2, '0')}</Text>
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
                    <Pressable onPress={() => removePlayer(p.id)} hitSlop={8}>
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
          </Animated.View>

          <Rule label="Holes" />
          <View style={styles.holesRow}>
            {([9, 18] as const).map((h) => {
              const sel = numHoles === h;
              return (
                <Pressable key={h} style={styles.holeWrap} onPress={() => setNumHoles(h)}>
                  {sel ? (
                    <LinearGradient colors={BRASS_GRADIENT} style={styles.holeBtnSel}>
                      <Text style={styles.holeTextSel}>{h} HOLES</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.holeBtn}>
                      <Text style={styles.holeText}>{h} HOLES</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Rule label="The game" />
          <View style={styles.formats}>
            {FORMAT_KEYS.map((k) => {
              const f = FORMATS[k];
              const reason = formatAvailable(k, count, numHoles);
              const sel = format === k;
              const inner = (
                <>
                  <View style={styles.formatHead}>
                    <Text style={[styles.formatLabel, sel && styles.onBrass]}>{f.label}</Text>
                    <Text style={[styles.formatPlayers, sel ? styles.onBrass : null]}>
                      {f.min === f.max ? `${f.min}P` : `${f.min}–${f.max}P`}
                    </Text>
                  </View>
                  <Text style={[styles.formatBlurb, sel && styles.onBrassSoft]}>{f.blurb}</Text>
                  {reason && <Text style={styles.formatReason}>{reason}</Text>}
                </>
              );
              return (
                <Pressable key={k} disabled={!!reason} onPress={() => setFormat(k)}>
                  {sel ? (
                    <LinearGradient colors={BRASS_GRADIENT} locations={[0, 0.6, 1]} style={styles.formatSel}>
                      {inner}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.formatCard, !!reason && styles.formatOff]}>{inner}</View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Rule label="Stakes & house rules" />
          <Card framed style={styles.knobCard}>{knobs}</Card>

          {format !== 'bingoBangoBongo' && (
            <>
              <Rule label="Junk · dots" />
              <Card framed style={styles.knobCard}>
                <View style={styles.chips}>
                  {JUNK_TYPES.map((j) => (
                    <PillButton
                      key={j.type}
                      label={j.label}
                      selected={junkEnabled.includes(j.type)}
                      selectedColor={j.type === 'snake' ? theme.wax : theme.up}
                      onPress={() => toggleJunkType(j.type)}
                    />
                  ))}
                </View>
                {junkEnabled.map((t) => (
                  <Knob
                    key={t}
                    label={
                      t === 'snake'
                        ? 'Snake pot per hole'
                        : `${JUNK_TYPES.find((j) => j.type === t)!.label} value`
                    }
                    prefix="$"
                    min={1}
                    value={junkValues[t] ?? 1}
                    onChange={(v) => setJunkValues((vals) => ({ ...vals, [t]: v }))}
                  />
                ))}
              </Card>
            </>
          )}

          <Card framed style={[styles.knobCard, styles.netCard]}>
            <RowToggle label="Net scoring (handicaps)" value={useNet} onChange={setUseNet} />
          </Card>

          <Plaque
            label={
              canStart
                ? 'Start round'
                : !named
                  ? 'Name all players'
                  : blocked
                    ? 'Pick a valid game'
                    : 'Pick team 1 (2 players)'
            }
            disabled={!canStart}
            onPress={start}
            style={styles.start}
          />
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
  scroll: { padding: 20, paddingBottom: 52 },
  close: { position: 'absolute', left: 2, top: 2, zIndex: 2, padding: 6 },
  closeGlyph: { color: theme.boneMuted, fontSize: 20 },
  kicker: {
    fontFamily: theme.fontMonoLight,
    fontSize: 11,
    letterSpacing: 4,
    color: theme.brass,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: theme.fontDisplayBlack,
    fontSize: 38,
    color: theme.bone,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  playersCard: { padding: 10, marginBottom: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.inkHairline },
  playerNum: { fontFamily: theme.fontMonoLight, fontSize: 12, color: theme.brassDeep, width: 22 },
  nameInput: { flex: 1, fontFamily: theme.fontUISemi, fontSize: 16, color: theme.ink, padding: 0 },
  hcpInput: {
    width: 54,
    fontFamily: theme.fontMono,
    fontSize: 14,
    color: theme.ink,
    backgroundColor: theme.boneDim,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.inkHairline,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
  },
  remove: { color: theme.clay, fontSize: 22, paddingHorizontal: 6 },
  addRow: { padding: 12, alignItems: 'center' },
  addText: { fontFamily: theme.fontUISemi, fontSize: 14, color: theme.brassDeep },
  holesRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  holeWrap: { flex: 1 },
  holeBtn: {
    padding: 15,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    backgroundColor: theme.boneFaint,
    borderWidth: 1,
    borderColor: theme.line,
  },
  holeBtnSel: {
    padding: 15,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(36,27,8,0.5)',
  },
  holeText: { fontFamily: theme.fontUISemi, fontSize: 14, letterSpacing: 2, color: theme.bone },
  holeTextSel: { fontFamily: theme.fontUIBold, fontSize: 14, letterSpacing: 2, color: theme.brassInk },
  formats: { gap: 10, marginBottom: 8 },
  formatCard: {
    padding: 16,
    borderRadius: theme.radius.card,
    backgroundColor: theme.boneFaint,
    borderWidth: 1,
    borderColor: theme.line,
  },
  formatSel: {
    padding: 16,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: 'rgba(36,27,8,0.5)',
  },
  formatOff: { opacity: 0.5 },
  formatHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formatLabel: { fontFamily: theme.fontDisplay, fontSize: 21, color: theme.bone },
  formatPlayers: { fontFamily: theme.fontMonoLight, fontSize: 11, letterSpacing: 1, color: theme.boneMuted },
  formatBlurb: { fontFamily: theme.fontDisplayItalic, fontSize: 13, color: theme.boneMuted, marginTop: 4 },
  formatReason: { fontFamily: theme.fontUI, fontSize: 11, color: theme.down, marginTop: 5 },
  onBrass: { color: theme.brassInk },
  onBrassSoft: { color: 'rgba(36,27,8,0.7)' },
  knobCard: { padding: 16, marginBottom: 8, gap: 4 },
  netCard: { marginTop: 14 },
  hint: { fontFamily: theme.fontDisplayItalic, fontSize: 12, color: theme.inkSoft, marginTop: 6, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  toggleLabel: { fontFamily: theme.fontUISemi, fontSize: 14, color: theme.ink, flexShrink: 1, paddingRight: 8 },
  start: { marginTop: 18 },
});
