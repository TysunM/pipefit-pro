import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useVoiceMaybe } from '../voice/VoiceProvider';
import { TAB_BAR_HEIGHT } from './TabBar';

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
  // The mic floats over the foot of every page; room to scroll the last button clear of it.
  const mic = useVoiceMaybe()?.enabled ? (tabbed ? 0 : TAB_BAR_HEIGHT) + 84 : 0;

  if (!scroll)
    return (
      <View style={[base, style]}>
        {children}
      </View>
    );

  return (
    <View style={base}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingBottom: (tabbed ? 0 : insets.bottom) + t.space.xxxl + mic }, style]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.content, { maxWidth: t.layout.maxContentWidth }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ content: { width: '100%', alignSelf: 'center' } });
