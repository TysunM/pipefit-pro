import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const base: ViewStyle = { flex: 1, backgroundColor: t.colors.bg };

  if (!scroll) return <View style={[base, style]}>{children}</View>;

  return (
    <ScrollView
      style={base}
      contentContainerStyle={[{ paddingBottom: insets.bottom + t.space.xxxl }, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={[styles.content, { maxWidth: t.layout.maxContentWidth }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { width: '100%', alignSelf: 'center' } });
