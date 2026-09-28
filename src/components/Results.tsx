import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { spokenAngle, spokenLength, spokenResult } from '../calc/spoken';
import { say } from '../audio/say';
import { GlowBar, Well } from './metal';

/** What a result reads aloud: a length in inches, or an angle in degrees. */
export type Speak = { inches: number } | { degrees: number };

/** How long the inputs have to sit still before a result is spoken on its own. */
const SETTLE_MS = 1500;

export function ResultBanner({
  label,
  value,
  hint,
  meta,
  tone = 'default',
  speak,
}: {
  label: string;
  value: string;
  hint?: string;
  meta?: string;
  tone?: 'default' | 'idle' | 'error';
  /** The figure to read aloud, when there is a real one. */
  speak?: Speak;
}) {
  const t = useTheme();
  const { settings } = useSettings();
  const isError = tone === 'error';
  const isIdle = tone === 'idle';

  // Said the way a fitter reads a tape, and only a real answer: nothing while
  // the fields are empty or the inputs cannot be solved.
  const figure = !speak
    ? ''
    : 'inches' in speak
      ? spokenLength(speak.inches, settings.unitSystem, settings.fractionDenominator)
      : spokenAngle(speak.degrees);
  const phrase = settings.readAloud !== 'off' && !isError && !isIdle ? spokenResult(label, figure) : '';

  // Auto: spoken once the inputs settle, never twice for the same figure,
  // and only from the screen that is showing.
  const focused = useIsFocused();
  const lastSaid = useRef('');
  useEffect(() => {
    if (settings.readAloud !== 'auto' || !phrase || !focused || phrase === lastSaid.current) return;
    const timer = setTimeout(() => {
      lastSaid.current = phrase;
      say(phrase);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [phrase, focused, settings.readAloud]);
  // The answer is the instrument's readout: let into the plate, trimmed in
  // copper, and lit underneath when there is a figure in it to read.
  return (
    <View style={{ paddingHorizontal: t.space.md, paddingTop: t.space.sm, paddingBottom: t.space.md }}>
      <Well
        trim
        radius={t.radius.lg}
        style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <Ionicons
            name={isError ? 'alert-circle-outline' : isIdle ? 'ellipsis-horizontal-outline' : 'cut-outline'}
            size={18}
            color={t.colors.textMuted}
          />
          <Text style={[t.type.label, { color: t.colors.textMuted, flex: 1 }]}>{label}</Text>
          {phrase ? (
            <Pressable
              onPress={() => {
                lastSaid.current = phrase;
                say(phrase);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Read aloud: ${phrase}`}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                marginVertical: -10,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? t.colors.primary : 'transparent',
              })}
            >
              {({ pressed }) => <Ionicons name="volume-high-outline" size={22} color={pressed ? t.colors.onPrimary : t.colors.data} />}
            </Pressable>
          ) : null}
        </View>
        <Text
          style={[
            isError ? t.type.displaySmall : t.type.display,
            { color: isError ? t.colors.danger : isIdle ? t.colors.textMuted : t.colors.text, marginTop: t.space.xs },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
        {hint ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: t.space.sm }}>
            <Ionicons name="resize-outline" size={16} color={isIdle ? t.colors.textMuted : t.colors.data} />
            <Text
              style={[t.type.bodyStrong, { color: isIdle ? t.colors.textMuted : t.colors.data, flexShrink: 1 }]}
              numberOfLines={2}
            >
              {hint}
            </Text>
          </View>
        ) : null}
        {meta ? (
          <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.sm }]}>{meta}</Text>
        ) : null}
      </Well>
      {isIdle || isError ? null : <GlowBar width={120} style={{ marginTop: -6 }} />}
    </View>
  );
}

export function MetaBar({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.bgSubtle,
        borderTopWidth: t.hairline,
        borderTopColor: t.colors.border,
        paddingHorizontal: t.layout.screenPadding,
        paddingVertical: t.space.md,
        alignItems: 'center',
      }}
    >
      <Text style={[t.type.bodyStrong, { color: t.colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
        {text}
      </Text>
    </View>
  );
}

export function WarningBanner({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'danger' }) {
  const t = useTheme();
  const danger = tone === 'danger';
  return (
    <View
      style={{
        backgroundColor: danger ? t.colors.accentSoft : t.colors.warnBg,
        borderTopWidth: t.hairline,
        borderBottomWidth: t.hairline,
        borderColor: danger ? t.colors.accent : t.colors.warnBorder,
        paddingHorizontal: t.layout.screenPadding,
        paddingVertical: t.space.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: t.space.sm,
      }}
    >
      <Ionicons name="warning-outline" size={17} color={danger ? t.colors.danger : t.colors.warnText} style={{ marginTop: 1 }} />
      <Text style={[t.type.body, { color: danger ? t.colors.danger : t.colors.warnText, flex: 1 }]}>{text}</Text>
    </View>
  );
}

export type Stat = { label: string; value: string; note?: string };

export function StatGrid({ stats }: { stats: Stat[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={{
            width: '50%',
            paddingHorizontal: t.layout.screenPadding,
            paddingVertical: t.space.lg,
            borderBottomWidth: t.hairline,
            borderBottomColor: t.colors.border,
            borderRightWidth: i % 2 === 0 ? t.hairline : 0,
            borderRightColor: t.colors.border,
          }}
        >
          <Text style={[t.type.label, { color: t.colors.textMuted }]} numberOfLines={1}>
            {s.label}
          </Text>
          {s.note ? (
            <Text style={[t.type.italicNote, { color: t.colors.textFaint, marginTop: 2 }]} numberOfLines={1}>
              {s.note}
            </Text>
          ) : null}
          <Text style={[t.type.statValue, { color: t.colors.text, marginTop: t.space.sm }]} numberOfLines={1} adjustsFontSizeToFit>
            {s.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function SummaryRow({ items }: { items: Stat[] }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.bgSubtle,
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingVertical: t.space.xs,
      }}
    >
      {items.map((s) => (
        <View key={s.label} style={{ width: '50%', paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.md }}>
          <Text style={[t.type.label, { color: t.colors.textMuted }]} numberOfLines={1}>
            {s.label}
          </Text>
          <Text style={[t.type.statValue, { color: t.colors.text, marginTop: t.space.xs }]} numberOfLines={1} adjustsFontSizeToFit>
            {s.value}
          </Text>
          {s.note ? (
            <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
              {s.note}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function FooterNote({ text }: { text: string }) {
  const t = useTheme();
  return (
    <Text
      style={[
        t.type.caption,
        {
          color: t.colors.textFaint,
          textAlign: 'center',
          paddingHorizontal: t.layout.screenPadding,
          paddingTop: t.space.lg,
        },
      ]}
    >
      {text}
    </Text>
  );
}

export function SpoolBar({ text, badge }: { text: string; badge: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.bgSubtle,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        paddingHorizontal: t.layout.screenPadding,
        paddingVertical: t.space.lg,
      }}
    >
      <Ionicons name="scale-outline" size={18} color={t.colors.textMuted} />
      <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>{text}</Text>
      <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>{badge}</Text>
    </View>
  );
}
