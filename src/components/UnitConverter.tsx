import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useCalcPrefs } from '../state/calcPrefsStore';
import { fromUnitOf } from '../state/calcPrefs';
import { Plate, Well } from './metal';
import { CalcKey } from './CalcKey';
import { CATEGORIES, categoryById, convert, formatConverted, inputText, inputValue, pressConv, unitIn, type ConvKey } from '../calc/convert';
import { formatFeetInch, formatInches, type FracDen } from '../calc/ftin';

// The converter
// -------------
// The phone's unit converter with every unit of the category read at once:
// type the figure in one unit and the rest stand under it, so 3 inches is
// 76.2 mm, 7.62 cm and a quarter of a foot in one look. Tap any of them to
// type in that unit instead. Lengths also come out in feet, inches and
// sixteenths, at the fraction the settings read to, because that is what
// goes on the tape. calc/convert.ts holds the units and does the sums.

const KEYS: { label?: string; icon?: React.ComponentProps<typeof Ionicons>['name']; key: ConvKey; tone?: 'clear' | 'op'; a11y?: string; flex?: number }[][] = [
  [{ label: '7', key: { t: 'digit', d: '7' } }, { label: '8', key: { t: 'digit', d: '8' } }, { label: '9', key: { t: 'digit', d: '9' } }, { label: 'C', key: { t: 'clear' }, tone: 'clear', a11y: 'Clear' }],
  [{ label: '4', key: { t: 'digit', d: '4' } }, { label: '5', key: { t: 'digit', d: '5' } }, { label: '6', key: { t: 'digit', d: '6' } }, { icon: 'backspace-outline', key: { t: 'back' }, tone: 'op', a11y: 'Backspace' }],
  [{ label: '1', key: { t: 'digit', d: '1' } }, { label: '2', key: { t: 'digit', d: '2' } }, { label: '3', key: { t: 'digit', d: '3' } }, { label: '+/−', key: { t: 'sign' }, tone: 'op', a11y: 'Plus or minus' }],
  [{ label: '0', key: { t: 'digit', d: '0' }, flex: 3 }, { label: '.', key: { t: 'dot' }, a11y: 'Point' }],
];

export function UnitConverter({ input, setInput }: { input: string; setInput: (f: (s: string) => string) => void }) {
  const t = useTheme();
  const { settings } = useSettings();
  const den = (settings.fractionDenominator || 16) as FracDen;
  const { prefs, update } = useCalcPrefs();
  const cat = categoryById(prefs.category);
  const from = unitIn(cat, fromUnitOf(prefs, cat.id));
  const value = inputValue(input);

  const pick = (category: string) => update((p) => ({ ...p, category }));
  /** Type in this unit from now on, starting from what it reads. */
  const typeIn = (id: string) => {
    const to = unitIn(cat, id);
    const v = convert(value, from, to);
    update((p) => ({ ...p, from: { ...p.from, [cat.id]: id } }));
    setInput(() => (v === 0 || Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(10)))));
  };

  const inches = cat.id === 'length' ? convert(value, from, unitIn(cat, 'in')) : null;
  const row = (key: string, name: string, figure: string, sym: string, onPress?: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${figure} ${name}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'baseline', paddingVertical: 9, paddingHorizontal: t.space.md, opacity: pressed ? 0.6 : 1, borderBottomWidth: 1, borderBottomColor: t.colors.border })}
    >
      <Text numberOfLines={1} style={[t.type.body, { flex: 1, color: t.colors.textMuted, fontSize: 14.5 }]}>
        {name}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, color: t.colors.text, fontFamily: t.font.sans, ...t.weight('700'), fontSize: 18 }}>
        {figure}
        <Text style={{ color: t.colors.textMuted, ...t.weight('600'), fontSize: 14 }}>{sym ? ` ${sym}` : ''}</Text>
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, gap: t.space.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space.sm }} style={{ flexGrow: 0 }}>
        {CATEGORIES.map((c) => {
          const on = c.id === cat.id;
          return (
            <Pressable key={c.id} onPress={() => pick(c.id)} accessibilityRole="button" accessibilityLabel={c.name} accessibilityState={{ selected: on }}>
              {({ pressed }) => (
                <Plate tone={on ? 'copper' : 'metal'} sunk={pressed} radius={t.radius.pill} style={{ height: 38, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={c.icon} size={16} color={on ? t.colors.onCopper : t.colors.textMuted} />
                  <Text style={[t.type.button, { fontSize: 14, color: on ? t.colors.onCopper : t.colors.text }]}>{c.name}</Text>
                </Plate>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Well trim radius={t.radius.lg} style={{ paddingHorizontal: t.space.md, paddingVertical: t.space.sm }}>
        <Text style={[t.type.labelSmall, { color: t.colors.textFaint, letterSpacing: 1 }]}>{from.name.toUpperCase()}</Text>
        <Text testID="conv-input" numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'right', color: t.colors.text, fontFamily: t.font.sans, ...t.weight('700'), fontSize: 34 }}>
          {inputText(input)}
          <Text style={{ color: t.colors.accent, fontSize: 22 }}> {from.sym}</Text>
        </Text>
      </Well>

      <Well radius={t.radius.lg} style={{ flex: 1 }}>
        <ScrollView>
          {inches !== null ? row('ftin', 'Feet and inches', formatFeetInch(inches, den), '') : null}
          {inches !== null ? row('infrac', `Inches, to 1/${den}`, formatInches(inches, den), '') : null}
          {cat.units
            .filter((x) => x.id !== from.id)
            .map((x) => row(x.id, x.name, formatConverted(convert(value, from, x)), x.sym, () => typeIn(x.id)))}
        </ScrollView>
      </Well>

      <View style={{ gap: 6 }}>
        {KEYS.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
            {r.map((k, j) => (
              <CalcKey key={j} label={k.label} icon={k.icon} tone={k.tone ?? 'digit'} a11y={k.a11y} flex={k.flex} height={46} onPress={() => setInput((s) => pressConv(s, k.key))} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
