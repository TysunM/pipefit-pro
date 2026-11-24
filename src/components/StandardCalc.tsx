import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Well } from './metal';
import { CalcKey, type KeyTone } from './CalcKey';
import { UnitConverter } from './UnitConverter';
import { equalsBasic, previewBasic, pressBasic, remember, tokText, type BasicKey, type BasicState } from '../calc/basic';
import { useCalcPrefs } from '../state/calcPrefsStore';
import { useVoiceTargets } from '../voice/useVoiceTargets';
import type { StandardPanel } from '../state/calcPrefs';

// The phone calculator
// --------------------
// Laid out the way the phone's own one is, so nobody has to learn it: the sum
// and its answer at the top, a strip with History, the converter and the
// scientific keys and backspace, then the pad. calc/basic.ts does the
// working; this file only draws it. The sum lives with the calculator tab
// (CalculatorScreen.tsx), so switching to the trade calculator and back finds
// it where it was left.

type K = { label?: string; icon?: React.ComponentProps<typeof Ionicons>['name']; key: BasicKey; tone?: KeyTone; a11y?: string };

const d = (n: string): K => ({ label: n, key: { t: 'digit', d: n } });

const PAD: K[][] = [
  [
    { label: 'C', key: { t: 'clear' }, tone: 'clear', a11y: 'Clear' },
    { label: '( )', key: { t: 'paren' }, tone: 'op', a11y: 'Brackets' },
    { label: '%', key: { t: 'post', p: '%' }, tone: 'op', a11y: 'Percent' },
    { label: '÷', key: { t: 'op', op: '÷' }, tone: 'op', a11y: 'Divide' },
  ],
  [d('7'), d('8'), d('9'), { label: '×', key: { t: 'op', op: '×' }, tone: 'op', a11y: 'Multiply' }],
  [d('4'), d('5'), d('6'), { label: '−', key: { t: 'op', op: '−' }, tone: 'op', a11y: 'Minus' }],
  [d('1'), d('2'), d('3'), { label: '+', key: { t: 'op', op: '+' }, tone: 'op', a11y: 'Plus' }],
  [{ label: '+/−', key: { t: 'sign' }, a11y: 'Plus or minus' }, d('0'), { label: '.', key: { t: 'dot' }, a11y: 'Point' }],
];

/** The scientific keys, their second functions behind 2nd. */
function sciRows(second: boolean, angle: 'deg' | 'rad'): K[][] {
  const op = (x: Omit<K, 'tone'>): K => ({ ...x, tone: 'op' });
  return [
    [
      { label: '2nd', key: { t: 'second' }, tone: second ? 'on' : 'op', a11y: 'Second functions' },
      op({ label: angle === 'deg' ? 'Deg' : 'Rad', key: { t: 'angle' }, a11y: angle === 'deg' ? 'Degrees, switch to radians' : 'Radians, switch to degrees' }),
      second ? op({ label: '∛', key: { t: 'fn', fn: 'cbrt' }, a11y: 'Cube root' }) : op({ label: '√', key: { t: 'fn', fn: 'sqrt' }, a11y: 'Square root' }),
      second ? op({ label: 'sin⁻¹', key: { t: 'fn', fn: 'asin' }, a11y: 'Arcsine' }) : op({ label: 'sin', key: { t: 'fn', fn: 'sin' }, a11y: 'Sine' }),
      second ? op({ label: 'cos⁻¹', key: { t: 'fn', fn: 'acos' }, a11y: 'Arccosine' }) : op({ label: 'cos', key: { t: 'fn', fn: 'cos' }, a11y: 'Cosine' }),
    ],
    [
      second ? op({ label: 'tan⁻¹', key: { t: 'fn', fn: 'atan' }, a11y: 'Arctangent' }) : op({ label: 'tan', key: { t: 'fn', fn: 'tan' }, a11y: 'Tangent' }),
      second ? op({ label: 'eˣ', key: { t: 'fn', fn: 'exp' }, a11y: 'e to the power' }) : op({ label: 'ln', key: { t: 'fn', fn: 'ln' }, a11y: 'Natural log' }),
      second ? op({ label: '10ˣ', key: { t: 'fn', fn: 'pow10' }, a11y: 'Ten to the power' }) : op({ label: 'log', key: { t: 'fn', fn: 'log' }, a11y: 'Log' }),
      op({ label: '1/x', key: { t: 'post', p: '⁻¹' }, a11y: 'Reciprocal' }),
      second ? op({ label: 'x³', key: { t: 'post', p: '³' }, a11y: 'Cube' }) : op({ label: 'x²', key: { t: 'post', p: '²' }, a11y: 'Square' }),
    ],
    [
      op({ label: 'xʸ', key: { t: 'op', op: '^' }, a11y: 'Power' }),
      op({ label: '|x|', key: { t: 'fn', fn: 'abs' }, a11y: 'Absolute value' }),
      op({ label: 'π', key: { t: 'const', c: 'π' }, a11y: 'Pi' }),
      op({ label: 'e', key: { t: 'const', c: 'e' }, a11y: 'Euler number' }),
      op({ label: 'x!', key: { t: 'post', p: '!' }, a11y: 'Factorial' }),
    ],
  ];
}

const GAP = 6;

export function StandardCalc({
  state,
  setState,
  convInput,
  setConvInput,
}: {
  state: BasicState;
  setState: (f: (s: BasicState) => BasicState) => void;
  convInput: string;
  setConvInput: (f: (s: string) => string) => void;
}) {
  const t = useTheme();
  const { prefs, update } = useCalcPrefs();
  const [room, setRoom] = useState<number | null>(null);
  const panel = prefs.panel;
  const sci = prefs.scientific;

  const press = (key: BasicKey) => {
    if (key.t === 'angle') update((p) => ({ ...p, angle: p.angle === 'deg' ? 'rad' : 'deg' }));
    setState((s) => pressBasic(s, key));
  };
  const equals = () =>
    setState((s) => {
      const r = equalsBasic(s);
      if (r.entry) {
        const entry = r.entry;
        update((p) => ({ ...p, history: remember(p.history, entry) }));
      }
      return r.state;
    });
  const show = (next: StandardPanel) => update((p) => ({ ...p, panel: p.panel === next ? 'keys' : next }));
  const scientific = () => update((p) => ({ ...p, scientific: p.panel !== 'keys' ? true : !p.scientific, panel: 'keys' }));
  // The strip by voice: "history", "unit converter", "scientific keys"; "keypad" goes back to the keys.
  useVoiceTargets([
    { kind: 'press', label: 'History', run: () => (show('history'), panel === 'history' ? 'Keypad.' : 'History.') },
    { kind: 'press', label: 'Unit converter', run: () => (show('convert'), panel === 'convert' ? 'Keypad.' : 'Unit converter.') },
    { kind: 'press', label: 'Scientific keys', run: () => (scientific(), 'Scientific keys.') },
    { kind: 'press', label: 'Keypad', run: () => (update((p) => ({ ...p, panel: 'keys' })), 'Keypad.') },
  ]);

  const rows = [...(sci && panel === 'keys' ? sciRows(state.second, state.angle) : []), ...PAD];
  // The pad fills the room under the display, as the phone's does: taller keys on a tall phone, shorter on a short one.
  const keyHeight = room === null ? 56 : Math.max(32, Math.min(88, Math.floor((room - GAP * (rows.length - 1)) / rows.length)));
  const preview = previewBasic(state);
  const opColor = t.colors.accent;

  const tool = (icon: React.ComponentProps<typeof Ionicons>['name'], label: string, on: boolean, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} hitSlop={6} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.md, backgroundColor: on ? t.colors.primary : 'transparent' }}>
      <Ionicons name={icon} size={22} color={on ? t.colors.onPrimary : t.colors.textMuted} />
    </Pressable>
  );

  const strip = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {tool('time-outline', 'History', panel === 'history', () => show('history'))}
      {tool('swap-horizontal-outline', 'Unit converter', panel === 'convert', () => show('convert'))}
      {tool('flask-outline', 'Scientific keys', sci && panel === 'keys', scientific)}
      <View style={{ flex: 1 }} />
      {panel === 'keys' ? tool('backspace-outline', 'Backspace', false, () => press({ t: 'back' })) : null}
    </View>
  );

  if (panel === 'convert')
    return (
      <View style={{ flex: 1, gap: t.space.sm }}>
        {strip}
        <UnitConverter input={convInput} setInput={setConvInput} />
      </View>
    );

  return (
    <View style={{ flex: 1, gap: t.space.sm }}>
      <Well radius={t.radius.lg} style={{ padding: t.space.md, minHeight: sci ? 104 : 132, justifyContent: 'flex-end' }}>
        <View style={{ flexDirection: 'row', gap: 10, position: 'absolute', top: t.space.sm, left: t.space.md }}>
          {sci || state.angle === 'rad' ? <Text style={[t.type.labelSmall, { color: t.colors.textFaint, letterSpacing: 1 }]}>{state.angle === 'deg' ? 'DEG' : 'RAD'}</Text> : null}
          {state.second ? <Text style={[t.type.labelSmall, { color: t.colors.accent, letterSpacing: 1 }]}>2ND</Text> : null}
        </View>
        <Text
          testID="calc-expression"
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.45}
          style={{ textAlign: 'right', color: t.colors.text, fontFamily: t.font.sans, ...t.weight('600'), fontSize: state.toks.length > 18 ? 28 : 38, lineHeight: state.toks.length > 18 ? 34 : 46 }}
        >
          {state.toks.length ? state.toks.map((x, i) => (
            <Text key={i} style={x.k === 'op' || x.k === 'post' ? { color: opColor } : undefined}>
              {tokText(x)}
            </Text>
          )) : '0'}
        </Text>
        <Text testID="calc-preview" numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'right', fontFamily: t.font.sans, fontSize: state.error ? 16 : 24, minHeight: 30, color: state.error ? t.colors.danger : t.colors.textMuted }}>
          {state.error ?? preview ?? ' '}
        </Text>
      </Well>

      {strip}

      {panel === 'history' ? (
        <Well radius={t.radius.lg} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.space.md, paddingTop: t.space.sm }}>
            <Text style={[t.type.label, { color: t.colors.textMuted }]}>HISTORY</Text>
            {prefs.history.length ? (
              <Pressable onPress={() => update((p) => ({ ...p, history: [] }))} accessibilityRole="button" hitSlop={8}>
                <Text style={[t.type.button, { color: t.colors.danger, fontSize: 14 }]}>Clear history</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView contentContainerStyle={{ padding: t.space.md, gap: t.space.md }}>
            {prefs.history.length ? (
              prefs.history.map((h, i) => (
                <Pressable
                  key={`${i}-${h.expr}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${h.expr} equals ${h.result}, use this answer`}
                  onPress={() => {
                    setState((s) => pressBasic(s, { t: 'insert', value: h.value }));
                    update((p) => ({ ...p, panel: 'keys' }));
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignItems: 'flex-end' })}
                >
                  <Text numberOfLines={2} style={{ color: t.colors.textMuted, fontFamily: t.font.sans, fontSize: 15, textAlign: 'right' }}>
                    {h.expr}
                  </Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: t.colors.text, fontFamily: t.font.sans, ...t.weight('700'), fontSize: 22 }}>
                    = {h.result}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={[t.type.body, { color: t.colors.textMuted, textAlign: 'center', marginTop: t.space.xl }]}>No history yet. Every sum you finish with = lands here; tap one to use its answer.</Text>
            )}
          </ScrollView>
        </Well>
      ) : (
        <View style={{ flex: 1, gap: GAP }} onLayout={(e) => setRoom(e.nativeEvent.layout.height)}>
          {rows.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: GAP }}>
              {row.map((k, c) => (
                <CalcKey key={c} label={k.label} icon={k.icon} tone={k.tone} a11y={k.a11y} height={keyHeight} small={r < rows.length - PAD.length} onPress={() => press(k.key)} />
              ))}
              {r === rows.length - 1 ? <CalcKey label="=" tone="eq" a11y="Equals" height={keyHeight} onPress={equals} /> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

