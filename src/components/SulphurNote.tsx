import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useHeats } from '../state/heats';
import { useSettings } from '../state/settings';
import { findHeat } from '../state/heatBook';
import { sulphurCheck, sulphurWords } from '../calc/sulphur';

// The heats on a weld checked against each other for sulphur, off the heat
// book (calc/sulphur.ts), at the crew's line from Settings → Welding. Loud
// when they are apart; a quiet line when they match or a figure is missing.

/** The check's words for the heats named, or null when fewer than two are. */
export function useSulphurWords(heats: readonly string[], quietMissing = false) {
  const { book } = useHeats();
  const { settings } = useSettings();
  const read = heats
    .map((h) => h.trim())
    .filter(Boolean)
    .map((heat) => {
      const found = findHeat(book, heat);
      return { heat, s: found?.sulphur ?? null, inBook: !!found };
    });
  const check = sulphurCheck(quietMissing ? read.filter((h) => h.inBook) : read, settings.sulphurGap);
  return check ? sulphurWords(check, settings.sulphurGap) : null;
}

export function SulphurNote({ heats, quietMissing = false }: { heats: readonly string[]; quietMissing?: boolean }) {
  const t = useTheme();
  const c = t.colors;
  const w = useSulphurWords(heats, quietMissing);
  if (!w) return null;
  if (w.tone !== 'warn') {
    return (
      <Text style={[t.type.caption, { color: w.tone === 'ok' ? c.success : c.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }]}>
        {w.text}
      </Text>
    );
  }
  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: 'row', gap: t.space.md, marginHorizontal: t.layout.screenPadding, marginBottom: t.space.lg, padding: t.space.md, borderRadius: t.radius.lg, backgroundColor: c.warnBg, borderWidth: t.hairline, borderColor: c.warnBorder }}
    >
      <Ionicons name="git-compare-outline" size={22} color={c.warnText} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.type.bodyStrong, { color: c.warnText }]}>Heats apart on sulphur</Text>
        <Text style={[t.type.caption, { color: c.text }]}>{w.text}</Text>
      </View>
    </View>
  );
}
