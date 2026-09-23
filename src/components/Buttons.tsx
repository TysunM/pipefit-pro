import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Plate } from './metal';

// Buttons are plates. A plain one is bronze-dark metal; the one thing on a
// screen worth pressing is copper. Pressed, either one sinks — the sheen turns
// over — so a thumb in a glove can feel by eye that it landed.

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
};

function PlateButton({ label, onPress, icon, style, tone }: Props & { tone: 'metal' | 'copper' }) {
  const t = useTheme();
  const ink = tone === 'copper' ? t.colors.onCopper : t.colors.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={style}>
      {({ pressed }) => (
        <Plate
          tone={tone}
          sunk={pressed}
          radius={t.radius.md}
          style={{
            height: t.layout.controlHeight,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: t.space.sm,
            paddingHorizontal: t.space.lg,
          }}
        >
          {icon ? <Ionicons name={icon} size={19} color={tone === 'copper' ? ink : t.colors.textMuted} /> : null}
          <Text style={[t.type.button, { color: ink, flexShrink: 1 }]} numberOfLines={2}>
            {label}
          </Text>
        </Plate>
      )}
    </Pressable>
  );
}

export function GhostButton(props: Props) {
  return <PlateButton {...props} tone="metal" />;
}

export function AccentButton(props: Props) {
  return <PlateButton {...props} tone="copper" />;
}

export function SelectorButton({
  primary,
  badge,
  onPress,
  icon = 'build-outline',
  style,
}: {
  primary: string;
  badge?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${primary}${badge ? ` ${badge}` : ''}`} style={style}>
      {({ pressed }) => (
        <Plate
          sunk={pressed}
          radius={t.radius.md}
          style={{
            height: t.layout.controlHeight,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.sm,
            paddingHorizontal: t.space.lg,
          }}
        >
          <Ionicons name={icon} size={18} color={t.colors.textMuted} />
          <Text
            style={[t.type.bodyStrong, { color: t.colors.text, fontSize: 18, fontFamily: t.font.serif, flexShrink: 1 }]}
            numberOfLines={1}
          >
            {primary}
          </Text>
          {badge ? (
            <View
              style={{
                backgroundColor: t.colors.well,
                borderRadius: t.radius.sm,
                borderWidth: 1,
                borderColor: t.colors.wellEdge,
                paddingHorizontal: t.space.sm,
                paddingVertical: 2,
              }}
            >
              <Text style={[t.type.captionStrong, { color: t.colors.textMuted }]}>{badge}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-down" size={15} color={t.colors.textMuted} style={{ marginLeft: 'auto' }} />
        </Plate>
      )}
    </Pressable>
  );
}

export function ControlRow({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.space.md,
        paddingHorizontal: t.layout.screenPadding,
        marginBottom: t.space.xl,
      }}
    >
      {children}
    </View>
  );
}
