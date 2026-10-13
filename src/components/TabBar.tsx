import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { TABS, type Tab, type TabId, type TabRoute } from '../navigation/tabs';
import { TABS_ZONE } from '../state/layout';
import { useZone } from '../state/layouts';
import { ReorderZone } from './Reorder';

export type { TabId } from '../navigation/tabs';

// The tab bar
// -----------
// Six ways into the app from its foot, the same six on every tab (tabs.ts says
// which). It sits on the tab screens and not on a tool: a tool is where a man
// is working, and the level's dial and the spool's model want every point of
// the screen they can get. The calculator is the exception because it is a
// tab, the one tool used all day long.
//
// A tab is a place, not a step. Pressing one sets the stack to Home with that
// tab on it, so back from any tab lands on Home, never on a tab two presses
// ago.
//
// Held, a tab lifts and can be carried along the bar; the order it is left in
// is kept (state/layout.ts) and is the same on every screen.

export const TAB_BAR_HEIGHT = 62;

const tabId = (x: Tab) => x.id;

export function TabBar({ active }: { active: TabId }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { items, move } = useZone(TABS_ZONE, TABS, tabId);

  const go = useCallback(
    (tab: Tab) => {
      if (tab.id === active) return;
      const routes: TabRoute[] = [{ name: 'Home' }, ...(tab.route ? [tab.route] : [])];
      navigation.reset({ index: routes.length - 1, routes: routes as never });
    },
    [active, navigation]
  );

  return (
    <ReorderZone
      items={items}
      idOf={tabId}
      layout="row"
      onMove={move}
      style={{
        backgroundColor: t.colors.tabBar,
        borderTopWidth: t.hairline,
        borderTopColor: t.colors.border,
        paddingBottom: insets.bottom,
      }}
      render={(tab, hold) => {
        const on = tab.id === active;
        const color = on ? t.colors.text : t.colors.textFaint;
        return (
          <Pressable onPress={() => go(tab)} {...hold} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab.label} style={{ flex: 1 }}>
            {({ pressed }) => (
              <View
                style={{
                  height: TAB_BAR_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  opacity: pressed ? 0.6 : 1,
                }}
              >
                {on ? (
                  <View style={{ position: 'absolute', top: 0, left: '14%', right: '14%', height: 3, borderRadius: 2, backgroundColor: t.colors.chrome }} />
                ) : null}
                <Ionicons name={on ? tab.on : tab.icon} size={23} color={color} />
                <Text
                  style={[t.type.labelSmall, { color, fontSize: 10.5, letterSpacing: 0.4 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {tab.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}
