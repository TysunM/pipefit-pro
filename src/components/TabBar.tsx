import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../navigation/types';

// The tab bar
// -----------
// Five ways into the app from its foot, the same five on every tab: home,
// projects, tools, logs and the calculator. It sits on the tab screens and not
// on a tool: a tool is where a man is working, and the level's dial and the
// spool's model want every point of the screen they can get. The calculator is
// the exception because it is a tab, the one tool used all day long.
//
// A tab is a place, not a step. Pressing one sets the stack to Home with that
// tab on it, so back from any tab lands on Home, never on a tab two presses
// ago.

export type TabId = 'home' | 'projects' | 'tools' | 'logs' | 'calc';

type Route = { name: keyof RootStackParamList; params?: object };

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; on: keyof typeof Ionicons.glyphMap; route: Route | null }[] = [
  { id: 'home', label: 'Home', icon: 'home-outline', on: 'home', route: null },
  { id: 'projects', label: 'Projects', icon: 'folder-outline', on: 'folder', route: { name: 'Projects' } },
  { id: 'tools', label: 'Tools', icon: 'construct-outline', on: 'construct', route: { name: 'Group', params: { id: 'tools' } } },
  { id: 'logs', label: 'Logs', icon: 'journal-outline', on: 'journal', route: { name: 'Group', params: { id: 'logs' } } },
  { id: 'calc', label: 'Calculator', icon: 'calculator-outline', on: 'calculator', route: { name: 'Calculator' } },
];

export const TAB_BAR_HEIGHT = 62;

export function TabBar({ active }: { active: TabId }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const go = (tab: (typeof TABS)[number]) => {
    if (tab.id === active) return;
    const routes: Route[] = [{ name: 'Home' }, ...(tab.route ? [tab.route] : [])];
    navigation.reset({ index: routes.length - 1, routes: routes as never });
  };

  return (
    <View
      style={{
        backgroundColor: t.colors.tabBar,
        borderTopWidth: t.hairline,
        borderTopColor: t.colors.border,
        paddingBottom: insets.bottom,
        flexDirection: 'row',
      }}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const on = tab.id === active;
        const color = on ? t.colors.text : t.colors.textFaint;
        return (
          <Pressable
            key={tab.id}
            onPress={() => go(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            style={{ flex: 1 }}
          >
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
      })}
    </View>
  );
}
