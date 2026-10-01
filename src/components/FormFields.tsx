import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { DimensionInput } from './DimensionInput';
import { Well } from './metal';
import { clockLabel, dayKey, dayLabel, readClock, readDate, shiftDay, usDate } from '../calc/days';

// The fields a paper form has
// ---------------------------
// A record screen is a form: figures, times, dates, notes and ticks. Each
// field here keeps what is being typed to itself and hands the record only
// what reads — so "22." is not turned into 22 under the thumb, and "9:0" is
// not a time until it is 9:05.

const WEB_INPUT_RESET = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as TextStyle | null;

/** A figure as typed, or null for blank or nonsense. Commas are thousands. */
export function readNumber(s: string): number | null {
  const v = s.trim().replace(/,/g, '');
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Text held while typing, set again from the record only when the record
 * changes from elsewhere — a retest, a hold started — never by our own edit.
 */
function useHeldText<T>(value: T, show: (v: T) => string): [string, (s: string) => void, (v: T) => void] {
  const [text, setText] = useState(() => show(value));
  const mine = useRef(value);
  useEffect(() => {
    if (value !== mine.current) {
      mine.current = value;
      setText(show(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return [text, setText, (v: T) => (mine.current = v)];
}

export function NumField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  readout,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  placeholder?: string;
  readout?: string;
}) {
  const [text, setText, commit] = useHeldText(value, (v) => (v === null ? '' : String(v)));
  return (
    <DimensionInput
      label={label}
      value={text}
      suffix={suffix}
      placeholder={placeholder}
      readout={readout}
      onChangeText={(s) => {
        setText(s);
        const n = readNumber(s);
        commit(n);
        onChange(n);
      }}
    />
  );
}

/** A time of day on a given day: typed as 9:05, 905, 21:05 or 9:05 pm. */
export function ClockField({ label, value, day, onChange }: { label: string; value: number | null; day: string; onChange: (at: number | null) => void }) {
  const [text, setText, commit] = useHeldText(value, (v) => (v === null ? '' : clockLabel(v)));
  const bad = text.trim() !== '' && readClock(text, day) === null;
  return (
    <DimensionInput
      label={label}
      value={text}
      placeholder="9:05"
      keyboardType="numbers-and-punctuation"
      readout={bad ? 'Type a time: 9:05, 905 or 14:30' : undefined}
      onChangeText={(s) => {
        setText(s);
        const at = s.trim() ? readClock(s, day) : null;
        if (at === null && s.trim()) return;
        commit(at);
        onChange(at);
      }}
    />
  );
}

/** A calendar date: typed as 12/31/26, 12/31/2026 or 2026-12-31. */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (day: string) => void }) {
  const [text, setText, commit] = useHeldText(value, (v) => (v ? usDate(v) : ''));
  const bad = text.trim() !== '' && readDate(text) === null;
  return (
    <DimensionInput
      label={label}
      value={text}
      placeholder="12/31/26"
      keyboardType="default"
      readout={bad ? 'Type a date: 12/31/26' : undefined}
      onChangeText={(s) => {
        setText(s);
        const d = s.trim() ? readDate(s) : '';
        if (d === null) return;
        commit(d);
        onChange(d);
      }}
    />
  );
}

/** Words that run to a few lines: what was found, the notes, the lines in a test. */
export function NoteField({
  label,
  value,
  onChangeText,
  placeholder,
  max,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  max: number;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
      <Text style={[t.type.label, { color: t.colors.textMuted, marginBottom: t.space.sm }]}>{label}</Text>
      <Well style={{ borderWidth: focused ? 2 : 1, borderColor: focused ? t.colors.data : t.colors.wellEdge, padding: focused ? t.space.md - 1 : t.space.md }}>
        <TextInput
          multiline
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textFaint}
          maxLength={max}
          accessibilityLabel={label}
          style={[t.type.body, { color: t.colors.text, minHeight: 72, textAlignVertical: 'top', padding: 0 }, WEB_INPUT_RESET]}
        />
      </Well>
    </View>
  );
}

/** One line of a checklist: ticked or not. */
export function CheckRow({ on, text, sub, onPress }: { on: boolean; text: string; sub?: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={text}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: t.space.md,
        paddingHorizontal: t.layout.screenPadding,
        paddingVertical: t.space.md,
        backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
      })}
    >
      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? t.colors.data : t.colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={[t.type.body, { color: on ? t.colors.text : t.colors.textMuted }]}>{text}</Text>
        {sub ? <Text style={[t.type.caption, { color: t.colors.textFaint }]}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

export type BannerTone = 'danger' | 'warn' | 'ok' | 'info';

/** A line of news across the page: something wrong, something to look at, or something done. */
export function Banner({
  tone,
  icon,
  text,
  action,
  onAction,
}: {
  tone: BannerTone;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  const ink = tone === 'danger' ? t.colors.danger : tone === 'warn' ? t.colors.warnText : tone === 'ok' ? t.colors.success : t.colors.textMuted;
  return (
    <View
      style={{
        marginHorizontal: t.layout.screenPadding,
        marginBottom: t.space.md,
        padding: t.space.lg,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: tone === 'danger' ? t.colors.danger : tone === 'warn' ? t.colors.warnBorder : t.colors.border,
        backgroundColor: tone === 'warn' ? t.colors.warnBg : tone === 'ok' ? t.colors.dataSoft : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
      }}
    >
      <Ionicons name={icon} size={18} color={ink} />
      <Text style={[t.type.caption, { color: ink, flex: 1 }]}>{text}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={[t.type.labelSmall, { color: ink }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** The day a record is for, a day at a time. Never past today: nothing is reported before it happens. */
export function DayStepper({ day, onChange, now = Date.now() }: { day: string; onChange: (day: string) => void; now?: number }) {
  const t = useTheme();
  const today = dayKey(now);
  const atToday = day >= today;
  const rel = day === today ? 'Today' : day === shiftDay(today, -1) ? 'Yesterday' : '';
  const arrow = (dir: -1 | 1, off: boolean) => (
    <Pressable
      onPress={() => !off && onChange(shiftDay(day, dir))}
      disabled={off}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? 'Day before' : 'Day after'}
      style={{ padding: t.space.sm, opacity: off ? 0.3 : 1 }}
    >
      <Ionicons name={dir < 0 ? 'chevron-back' : 'chevron-forward'} size={24} color={t.colors.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg, gap: t.space.sm }}>
      {arrow(-1, false)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{dayLabel(day)}</Text>
        {rel ? <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{rel}</Text> : null}
      </View>
      {arrow(1, atToday)}
    </View>
  );
}

/** Re-renders every `every` ms while `on`: a clock on screen, for a hold being timed. */
export function useNow(on: boolean, every = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [on, every]);
  return on ? now : Date.now();
}
