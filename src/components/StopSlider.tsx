import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { nearestStop } from '../calc/stops';

/**
 * A slider that only lands on the values that exist.
 *
 * Bolt counts come in steps — four, eight, twelve — and a slider that could
 * be left at eleven would be a slider that lies. So the track carries a dot at
 * every real value, the knob sits on one of them, and a tap anywhere on the
 * track goes to the nearest. Tapping rather than dragging is deliberate: it
 * works in a glove, on the web build, and needs no native module, so it rides
 * over the air.
 */
export function StopSlider({
  label,
  stops,
  selected,
  onSelect,
  format = String,
}: {
  label?: string;
  stops: readonly number[];
  selected: number;
  onSelect: (value: number) => void;
  format?: (v: number) => string;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const pad = 14;
  const inner = Math.max(0, width - pad * 2);
  const n = stops.length;
  const xAt = (i: number) => pad + (n > 1 ? (inner * i) / (n - 1) : inner / 2);
  const idx = Math.max(0, stops.indexOf(selected));
  const track = useRef<View>(null);

  const land = (x: number) => {
    const next = stops[nearestStop(n, (x - pad) / Math.max(1, inner))];
    if (next !== undefined) onSelect(next);
  };

  // Native hands over where the tap fell inside the track. A browser hands
  // over a DOM event with no such thing, so the track is measured and the
  // viewport coordinate is taken back to it. Without this every tap on the
  // web build reads as the first stop.
  const onPress = (e: { nativeEvent: { locationX?: number; clientX?: number; pageX?: number } }) => {
    const ne = e.nativeEvent;
    if (typeof ne.locationX === 'number' && Number.isFinite(ne.locationX)) {
      land(ne.locationX);
      return;
    }
    const px = typeof ne.clientX === 'number' ? ne.clientX : ne.pageX;
    if (typeof px !== 'number' || !track.current) return;
    track.current.measureInWindow((wx) => land(px - wx));
  };
  // Label every stop when there is room, otherwise every other, so the end
  // values are always named and nothing overlaps.
  const every = n > 8 ? 2 : 1;

  return (
    <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        {label ? <Text style={[t.type.label, { color: t.colors.textMuted, width: 64 }]}>{label}</Text> : null}
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={`${label ?? 'Value'} ${format(selected)}`}
          accessibilityValue={{ text: format(selected) }}
          ref={track}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onPress={onPress}
          style={{ flex: 1, height: 56, justifyContent: 'center' }}
        >
          {/* the track — nothing inside it takes the touch, so the tap is always measured against the whole track */}
          <View pointerEvents="none" style={{ position: 'absolute', left: pad, right: pad, height: 6, borderRadius: 3, backgroundColor: t.colors.well, borderWidth: 1, borderColor: t.colors.wellEdge }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: pad, width: Math.max(0, xAt(idx) - pad), height: 6, borderRadius: 3, backgroundColor: t.colors.primary, opacity: 0.55 }} />
          {stops.map((s, i) => (
            <View key={s} pointerEvents="none" style={{ position: 'absolute', left: xAt(i) - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: i <= idx ? t.colors.data : t.colors.borderStrong }} />
          ))}
          {/* the knob */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: xAt(idx) - 13,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: t.colors.primary,
              borderWidth: 3,
              borderColor: t.colors.onPrimary,
            }}
          />
          {/* the value, over the knob */}
          <View pointerEvents="none" style={{ position: 'absolute', left: xAt(idx) - 22, top: -2, width: 44, alignItems: 'center' }}>
            <Text style={[t.type.captionStrong, { color: t.colors.data, fontSize: 13 }]}>{format(selected)}</Text>
          </View>
          {/* the scale */}
          {stops.map((s, i) =>
            i % every === 0 || i === n - 1 ? (
              <View key={`l${s}`} pointerEvents="none" style={{ position: 'absolute', left: xAt(i) - 16, bottom: -2, width: 32, alignItems: 'center' }}>
                <Text style={[t.type.labelSmall, { color: i === idx ? t.colors.text : t.colors.textFaint, fontSize: 10.5 }]}>{format(s)}</Text>
              </View>
            ) : null
          )}
        </Pressable>
      </View>
    </View>
  );
}
