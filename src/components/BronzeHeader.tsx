import React, { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Bezel, Grain } from './metal';

/**
 * The bar across the top of every screen: a bronze plate with the title set in
 * the middle, back on the left and settings on the right, each in its own
 * bezel. The bezels are forty points — a gloved thumb finds them without
 * looking, which a bare twenty-two point glyph never managed.
 */
export function BronzeHeader({
  title,
  onBack,
  onSettings,
}: {
  title: string;
  onBack?: () => void;
  onSettings?: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const id = 'hdr' + useId().replace(/[^A-Za-z0-9]/g, '');
  const c = t.colors;
  const bar = 60;

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: c.headerLo }}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.headerHi} />
            <Stop offset="1" stopColor={c.headerLo} />
          </LinearGradient>
          <LinearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c.copper} stopOpacity={0.15} />
            <Stop offset="0.5" stopColor={c.copperHi} stopOpacity={0.95} />
            <Stop offset="1" stopColor={c.copper} stopOpacity={0.15} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <Grain strength={1.4} />

      <View style={{ height: bar, flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.space.md }}>
        <View style={{ width: 48, alignItems: 'flex-start' }}>
          {onBack ? <Bezel icon="arrow-back" label="Back" onPress={onBack} /> : null}
        </View>
        <Text
          style={[t.type.screenTitle, { flex: 1, textAlign: 'center', color: c.chrome, fontFamily: t.font.serif }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View style={{ width: 48, alignItems: 'flex-end' }}>
          {onSettings ? <Bezel icon="settings-sharp" label="Settings" onPress={onSettings} /> : null}
        </View>
      </View>

      {/* The trim: a copper rule along the foot, brightest in the middle. */}
      <Svg height={2} width="100%" pointerEvents="none">
        <Rect x="0" y="0" width="100%" height="1" fill={c.copperLo} />
        <Rect x="0" y="1" width="100%" height="1" fill={`url(#${id}t)`} />
      </Svg>
    </View>
  );
}
