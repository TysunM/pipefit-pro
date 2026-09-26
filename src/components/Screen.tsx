import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Grain } from './metal';

export function Screen({
  children,
  scroll = true,
  style,
  tabbed = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  /** A tab bar sits under the page and takes the home indicator, so the page does not. */
  tabbed?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const base: ViewStyle = { flex: 1, backgroundColor: t.colors.bg };

  // The grain stays put while the page scrolls over it, the way a sheet of
  // brushed plate would under a card slid across it.
  if (!scroll)
    return (
      <View style={[base, style]}>
        <Grain />
        {children}
      </View>
    );

  return (
    <View style={base}>
      <Grain />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingBottom: (tabbed ? 0 : insets.bottom) + t.space.xxxl }, style]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.content, { maxWidth: t.layout.maxContentWidth }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ content: { width: '100%', alignSelf: 'center' } });
