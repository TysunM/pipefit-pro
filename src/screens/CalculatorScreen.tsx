import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Keypad } from '../components/keypad/Keypad';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { displayText, initialState, press, type CalcState } from '../calc/engine';
import { entryUnitWord, isEntryEmpty } from '../calc/ftin';
import type { KeyAction } from '../calc/keys';
import type { FracDen } from '../calc/ftin';

export function CalculatorScreen() {
  const t = useTheme();
  const { settings } = useSettings();
  const den = (settings.fractionDenominator || 16) as FracDen;

  const [state, setState] = useState<CalcState>(() =>
    initialState(den, settings.lengthReadout === 'feetInches' ? 'ft' : 'in')
  );

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

  const handle = (action: KeyAction, arg?: string) => setState((s) => press(s, action, arg));

  return (
    <Screen scroll={false}>
      <View style={[styles.wrap, { padding: t.space.md, gap: t.space.md }]}>
        <View
          style={[
            styles.lcd,
            {
              backgroundColor: t.mode === 'dark' ? '#101A16' : '#C9D4C2',
              // Trimmed in copper like every other readout in the app.
              borderColor: t.colors.copper,
              borderRadius: t.radius.lg,
              padding: t.space.md,
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

        <Keypad onPress={handle} shift={state.shift} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  lcd: { borderWidth: 2, minHeight: 124, justifyContent: 'space-between' },
  annunciators: { flexDirection: 'row', gap: 10, minHeight: 14 },
  annunciator: { fontSize: 10.5, letterSpacing: 1 },
  readout: { textAlign: 'right', fontWeight: '700' },
  unitWord: { textAlign: 'right', fontSize: 11.5, letterSpacing: 1.4, minHeight: 15 },
});
