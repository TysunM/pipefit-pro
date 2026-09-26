import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Bezel, Grain } from './metal';

/**
 * The bar across the top of every screen: the title set in the serif in the
 * middle, back on the left (on the front page, your projects) and settings on
 * the right. Flat — the only thing under it is a hairline so the page has an
 * edge to start from. The controls keep a forty-point hit box a gloved thumb
 * can find.
 */
export function AppHeader({
  title,
  onBack,
  onSettings,
  onProfile,
}: {
  title: string;
  onBack?: () => void;
  onSettings?: () => void;
  /** The front page's left-hand control: the man's own records. */
  onProfile?: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const c = t.colors;

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: c.headerLo,
        borderBottomWidth: t.hairline,
        borderBottomColor: c.border,
      }}
    >
      <Grain strength={0.8} />
      <View style={{ height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.space.md }}>
        <View style={{ width: 48, alignItems: 'flex-start' }}>
          {onBack ? (
            <Bezel icon="arrow-back" label="Back" onPress={onBack} />
          ) : onProfile ? (
            <Bezel icon="person-circle-outline" label="Your projects" onPress={onProfile} />
          ) : null}
        </View>
        <Text
          style={[t.type.screenTitle, { flex: 1, textAlign: 'center', color: c.chrome }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View style={{ width: 48, alignItems: 'flex-end' }}>
          {onSettings ? <Bezel icon="settings-outline" label="Settings" onPress={onSettings} /> : null}
        </View>
      </View>
    </View>
  );
}
