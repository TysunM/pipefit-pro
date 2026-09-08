import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Divider } from './Divider';

export function HintRow({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: t.layout.screenPadding,
          paddingTop: t.space.lg,
          paddingBottom: t.space.xl,
          gap: t.space.md,
        }}
      >
        <Ionicons name="bulb-outline" size={19} color={t.colors.textMuted} style={{ marginTop: 2 }} />
        <Text style={[t.type.body, { color: t.colors.textMuted, flex: 1 }]}>{text}</Text>
      </View>
      <View style={{ paddingHorizontal: t.layout.screenPadding }}>
        <Divider />
      </View>
    </View>
  );
}
