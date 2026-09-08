import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Divider({ inset = 0, spacing = 0 }: { inset?: number; spacing?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        height: t.hairline,
        backgroundColor: t.colors.border,
        marginLeft: inset,
        marginVertical: spacing,
      }}
    />
  );
}
