import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { TABS, type Tab, type TabId, type TabRoute } from '../navigation/tabs';
import { TABS_ZONE } from '../state/layout';
import { useZone } from '../state/layouts';
import { ReorderZone } from './Reorder';
import { useSvgIds } from './metal';
import { PLATE, Screw, corners, useBox } from './plates';

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
//
// It is drawn as the header is (AppHeader.tsx): a brushed steel plate screwed
// to the foot of the screen, so the two ends of a tab screen match. The plate
// is a shade darker than the header's, being lower down, and the labels on it
// are checked at both ends of its sheen (contrast.test.ts). The plate is drawn
// at the size the bar measures, for the reason plates.tsx gives.

export const TAB_BAR_HEIGHT = 62;
/** Where the screws sit, in from the plate's corners. */
const INSET = 11;
/** The tabs keep clear of the screws. */
const EDGE = 18;

const tabId = (x: Tab) => x.id;

export function TabBar({ active }: { active: TabId }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { items, move } = useZone(TABS_ZONE, TABS, tabId);
  const [box, onLayout] = useBox();
  const gid = useSvgIds('foot');
  const p = PLATE[t.mode === 'dark' ? 'dark' : 'light'];

  const go = useCallback(
    (tab: Tab) => {
      if (tab.id === active) return;
      const routes: TabRoute[] = [{ name: 'Home' }, ...(tab.route ? [tab.route] : [])];
      navigation.reset({ index: routes.length - 1, routes: routes as never });
    },
    [active, navigation]
  );

  return (
    <View onLayout={onLayout} style={{ backgroundColor: t.colors.tabBarLo }}>
      {box ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={gid('p')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.colors.tabBarHi} />
              <Stop offset="1" stopColor={t.colors.tabBarLo} />
            </LinearGradient>
            <RadialGradient id={gid('r')} cx="38%" cy="35%" rx="65%" ry="65%">
              <Stop offset="0" stopColor={p.rivetHi} />
              <Stop offset="1" stopColor={p.rivetLo} />
            </RadialGradient>
          </Defs>

          {/* The plate, lit at the top. Below the tabs it runs on in shadow, under the phone's own buttons. */}
          <Rect x={0} y={0} width={box.w} height={TAB_BAR_HEIGHT} fill={`url(#${gid('p')})`} />
          {box.h > TAB_BAR_HEIGHT ? <Rect x={0} y={TAB_BAR_HEIGHT} width={box.w} height={box.h - TAB_BAR_HEIGHT} fill={t.colors.tabBarLo} /> : null}
          {[0.3, 0.55, 0.8].map((f) => (
            <Rect key={f} x={0} y={TAB_BAR_HEIGHT * f} width={box.w} height={1} fill={t.mode === 'dark' ? '#ffffff' : '#000000'} opacity={0.045} />
          ))}

          {/* The seam where the plate meets the page, and its lit edge. */}
          <Rect x={0} y={0} width={box.w} height={1} fill={p.seamDark} />
          <Rect x={0} y={1} width={box.w} height={1} fill={p.seamLight} opacity={0.7} />

          {/* The screws. */}
          {corners(box.w, TAB_BAR_HEIGHT, INSET).map(([cx, cy]) => (
            <Screw key={`${cx}-${cy}`} cx={cx} cy={cy} face={`url(#${gid('r')})`} ring={p.rivetRing} slot={p.slot} />
          ))}
        </Svg>
      ) : null}

      <ReorderZone
        items={items}
        idOf={tabId}
        layout="row"
        onMove={move}
        style={{ paddingBottom: insets.bottom, paddingHorizontal: EDGE }}
        render={(tab, hold) => {
          const on = tab.id === active;
          const color = on ? t.colors.onTabBar : t.colors.onTabBarFaint;
          return (
            <Pressable onPress={() => go(tab)} {...hold} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab.label} style={styles.tab}>
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
                    <View style={{ position: 'absolute', top: 3, left: '14%', right: '14%', height: 3, borderRadius: 2, backgroundColor: p.copper[1] }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  // Grows to fill its slot, never `flex: 1`: a zero flex basis is what Yoga
  // takes for the tab's height under a fixed-height page, and the bar then
  // measures as its bottom padding alone and the tabs spill off the screen,
  // under the phone's own navigation buttons. See the note in ToolTile.tsx.
  tab: { flexGrow: 1, flexShrink: 1 },
});
