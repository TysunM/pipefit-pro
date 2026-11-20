import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useVoiceMaybe } from '../voice/VoiceProvider';
import { hideFloatingMic } from '../voice/micSpot';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { KEY_HEIGHT, Keypad, ROW_EXTRA } from '../components/keypad/Keypad';
import { KEYPAD } from '../calc/keys';
import { TabBar } from '../components/TabBar';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { displayText, initialState, press, type CalcState } from '../calc/engine';
import { entryUnitWord, isEntryEmpty } from '../calc/ftin';
import type { KeyAction } from '../calc/keys';
import type { FracDen } from '../calc/ftin';
import { Well } from '../components/metal';
import { StandardCalc } from '../components/StandardCalc';
import { initialBasic, type BasicState } from '../calc/basic';
import { useCalcPrefs } from '../state/calcPrefsStore';
import type { CalcMode } from '../state/calcPrefs';

// The calculator tab holds two calculators: the trade one, which works in
// feet, inches and fractions and knows pipe, and the phone one, with its
// scientific keys and unit converter (StandardCalc.tsx). The switch at the
// top picks between them and is remembered. Each keeps its own sum, so going
// to one and back finds the other as it was left.

/** Trade or Standard, the one showing lit. */
function ModeSwitch({ mode, onChange }: { mode: CalcMode; onChange: (m: CalcMode) => void }) {
  const t = useTheme();
  const options: { value: CalcMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { value: 'trade', label: 'Trade', icon: 'construct-outline' },
    { value: 'standard', label: 'Standard', icon: 'calculator-outline' },
  ];
  return (
    <Well radius={t.radius.pill} style={{ flexDirection: 'row', padding: 3, height: 40 }}>
      {options.map((o) => {
        const on = o.value === mode;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityLabel={`${o.label} calculator`}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', gap: 6, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? (pressed ? t.colors.primaryPressed : t.colors.primary) : pressed ? t.colors.bgSubtle : 'transparent' })}
          >
            <Ionicons name={o.icon} size={16} color={on ? t.colors.onPrimary : t.colors.textMuted} />
            <Text style={[t.type.button, { fontSize: 15, color: on ? t.colors.onPrimary : t.colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Well>
  );
}

export function CalculatorScreen() {
  const t = useTheme();
  const { settings } = useSettings();
  const den = (settings.fractionDenominator || 16) as FracDen;

  const [state, setState] = useState<CalcState>(() =>
    initialState(den, settings.lengthReadout === 'feetInches' ? 'ft' : 'in')
  );
  const { prefs, hydrated, update } = useCalcPrefs();
  const [basic, setBasic] = useState<BasicState>(() => initialBasic(prefs.angle));
  const [convInput, setConvInput] = useState('1');
  // The angle the phone calculator was left in, once the remembered settings are read.
  useEffect(() => {
    if (hydrated) setBasic((b) => (b.angle === prefs.angle ? b : { ...b, angle: prefs.angle }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  const mode = prefs.mode;
  // Both pads run to the corner the floating mic stands in, = on the phone one, so
  // while this tab is in front the mic stands in the top row instead.
  const voice = useVoiceMaybe();
  useFocusEffect(useCallback(() => hideFloatingMic(), []));

  const shown = displayText(state);
  const unitWord = isEntryEmpty(state.entry) ? '' : entryUnitWord(state.entry);

  const annunciators = useMemo(() => {
    const out: string[] = [];
    // Which unit the answer is being read in, so it is never a guess.
    out.push(state.displayUnit.linear === 'ft' ? 'FT-IN' : 'IN');
    if (state.shift) out.push('CONV');
    if (state.pending === 'store') out.push('STO');
    if (state.pending === 'recall') out.push('RCL');
    if (state.memory.value !== 0) out.push('M');
    if (state.frames.length) out.push('( '.repeat(state.frames.length).trim());
    if (state.dmsMode) out.push('DMS');
    if (state.costTotal !== null) out.push('TTL$');
    return out;
  }, [state]);

  // The pad is fitted to the room left under the readout, so on a short
  // phone the keys get shorter rather than running under the tab bar.
  const short = useWindowDimensions().height < 760;
  const [room, setRoom] = useState<number | null>(null);
  const keyHeight = room === null ? KEY_HEIGHT : Math.max(34, Math.min(KEY_HEIGHT, Math.floor(room / KEYPAD.length - ROW_EXTRA)));

  const handle = (action: KeyAction, arg?: string) => setState((s) => press(s, action, arg));

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
    <Screen scroll={false}>
      <View style={[styles.wrap, { padding: t.space.md, gap: t.space.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <View style={{ flex: 1 }}>
            <ModeSwitch mode={mode} onChange={(m) => update((p) => ({ ...p, mode: m }))} />
          </View>
          {voice?.enabled ? (
            <Pressable
              onPress={voice.talk}
              accessibilityRole="button"
              accessibilityLabel="Speak a command"
              hitSlop={6}
              style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.colors.primaryPressed : t.colors.primary })}
            >
              <Ionicons name="mic" size={21} color={t.colors.onPrimary} />
            </Pressable>
          ) : null}
        </View>
        {mode === 'standard' ? (
          <StandardCalc state={basic} setState={setBasic} convInput={convInput} setConvInput={setConvInput} />
        ) : (
        <>
        <View
          style={[
            styles.lcd,
            {
              backgroundColor: t.mode === 'dark' ? '#101A16' : '#C9D4C2',
              // Trimmed in copper like every other readout in the app.
              borderColor: t.colors.copper,
              borderRadius: t.radius.lg,
              padding: t.space.md,
              minHeight: short ? 96 : 124,
            },
          ]}
        >
          <View style={styles.annunciators}>
            {annunciators.map((a) => (
              <Text key={a} style={[styles.annunciator, t.weight('700'), { fontFamily: t.font.sans, color: t.mode === 'dark' ? '#7FA890' : '#4A5A44' }]}>
                {a}
              </Text>
            ))}
          </View>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.readout,
              {
                color: state.error ? t.colors.danger : t.mode === 'dark' ? '#DCF0E2' : '#16231B',
                fontFamily: t.font.mono,
                fontSize: state.error ? 17 : 40,
              },
            ]}
          >
            {shown}
          </Text>

          <Text style={[styles.unitWord, t.weight('700'), { fontFamily: t.font.sans, color: t.mode === 'dark' ? '#7FA890' : '#4A5A44' }]}>
            {unitWord || ' '}
          </Text>
        </View>

        <View style={{ flex: 1 }} onLayout={(e) => setRoom(e.nativeEvent.layout.height)}>
          <Keypad onPress={handle} shift={state.shift} keyHeight={keyHeight} />
        </View>
        </>
        )}
      </View>
    </Screen>
    <TabBar active="calc" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  lcd: { borderWidth: 2, justifyContent: 'space-between' },
  annunciators: { flexDirection: 'row', gap: 10, minHeight: 14 },
  annunciator: { fontSize: 10.5, letterSpacing: 1 },
  readout: { textAlign: 'right', fontWeight: '700' },
  unitWord: { textAlign: 'right', fontSize: 11.5, letterSpacing: 1.4, minHeight: 15 },
});
