import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Whether one cut comes off one stick, and what is left when it does.
 *
 * The stock length has been on these screens all along, sitting in the meta
 * bar and meaning nothing — a figure on a screen that no calculation touches
 * is a figure that gets believed and should not be. This is the calculation
 * that makes it true: the cut against the rack, and the drop it leaves.
 */
export function StockNote({
  cut,
  stock,
  kerf,
  length,
}: {
  cut: number;
  stock: number;
  /** What the saw takes. The drop is short by it, not long by it. */
  kerf: number;
  length: (inches: number) => string;
}) {
  const t = useTheme();
  if (!Number.isFinite(cut) || cut <= 0 || !Number.isFinite(stock) || stock <= 0) return null;

  const saw = Number.isFinite(kerf) && kerf > 0 ? kerf : 0;
  const over = cut + saw > stock;
  const drop = stock - cut - saw;
  const keeper = !over && drop >= 12;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.space.md,
        alignItems: 'flex-start',
        marginHorizontal: t.layout.screenPadding,
        marginTop: t.space.md,
        padding: t.space.lg,
        borderRadius: t.radius.lg,
        backgroundColor: over ? t.colors.accentSoft : t.colors.bgSubtle,
      }}
    >
      <Ionicons
        name={over ? 'alert-circle-outline' : keeper ? 'archive-outline' : 'cut-outline'}
        size={18}
        color={over ? t.colors.accent : t.colors.textMuted}
      />
      <Text style={[t.type.caption, { color: over ? t.colors.text : t.colors.textMuted, flex: 1 }]}>
        {over
          ? `This cut is ${length(cut)} and a stick is ${length(stock)}. It has to be joined, or bought longer.`
          : keeper
            ? `One ${length(stock)} stick, and ${length(drop)} back on the rack.`
            : `One ${length(stock)} stick, with ${length(drop)} left — not enough to keep.`}
      </Text>
    </View>
  );
}
