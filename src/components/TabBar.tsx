import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { TABS, type Tab, type TabId, type TabRoute } from '../navigation/tabs';
import { TABS_ZONE, scrollToShow } from '../state/layout';
import { useZone } from '../state/layouts';
import { ReorderZone } from './Reorder';
import { ScrollHostContext, type ScrollHost } from './scrollHost';
import { useBarHide } from './barHide';
import { useSettings } from '../state/settings';
import { HANDLE_HEIGHT, handleShows, pullsDown, tucksAt } from '../state/barHide';
import { useVoiceTargets } from '../voice/useVoiceTargets';
import { useSvgIds } from './metal';
import { PLATE, Screw, corners, useBox } from './plates';

export type { TabId } from '../navigation/tabs';

// The tab bar
// -----------
// Seven ways into the app from its foot, the same seven on every tab (tabs.ts
// says which). Where they all stand across at a good size (a tablet, a phone
// on its side) they do; on a phone the bar scrolls sideways instead of
// squeezing them, five and a half in view so the half one says there are more,
// and a fade at an end that runs on. How far it is scrolled carries from one
// tab's page to the next, moved only as far as it takes to show the tab you
// are on. It sits on the tab screens and not on a tool: a tool is where a man
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
/** The tabs keep clear of the screws: they scroll in the window between them. */
const EDGE = 12;
/** Narrower than this a tab's word gets squeezed: past it, the bar scrolls. */
const MIN_TAB = 64;
/** Tabs in view when the bar scrolls: the half one says there are more. */
const PEEK = 5.5;
/** The fade at an end that runs on out of view. */
const FADE = 22;

/** How far the bar is scrolled, carried from one tab's page to the next (each draws its own bar). */
let carriedX = 0;


const tabId = (x: Tab) => x.id;

export function TabBar({ active, tucks = false }: { active: TabId; /** It can be swiped down off the foot, leaving a handle (the Calculator, which doesn't scroll). */ tucks?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { items, move } = useZone(TABS_ZONE, TABS, tabId);
  const [box, onLayout] = useBox();
  const gid = useSvgIds('foot');
  const p = PLATE[t.mode === 'dark' ? 'dark' : 'light'];
  const { width: windowW } = useWindowDimensions();
  // Home sits under every tab's page with a bar of its own: only the page in view moves the shared scroll.
  const focused = useIsFocused();
  // On a tab's page it lies over the foot of the page and slides off it while the page scrolls down (barHide.tsx).
  const bar = useBarHide();
  const slide = bar
    ? {
        position: 'absolute' as const,
        left: 0,
        right: 0,
        bottom: 0,
        transform: [{ translateY: bar.shift.interpolate({ inputRange: [0, 1], outputRange: [0, bar.height + 4] }) }],
      }
    : null;

  // The Calculator's bar can be pulled down off the foot for bigger keys,
  // leaving a handle to bring it back (state/barHide.ts). Kept in the settings.
  const { settings, update } = useSettings();
  const tucked = tucks && settings.calcBarTucked;
  const pull = useRef(new Animated.Value(0)).current;
  const offFoot = TAB_BAR_HEIGHT + insets.bottom + 4;

  // Every tab across if they fit at a good size; else a fixed width, scrolled.
  const n = items.length;
  const view = Math.max(0, (box?.w ?? windowW) - 2 * EDGE);
  const scrolls = n > 0 && view / n < MIN_TAB;
  const tabW = scrolls ? view / PEEK : view / Math.max(1, n);
  const activeAt = items.findIndex((x) => x.id === active);

  const scroller = useRef<ScrollView>(null);
  const frame = useRef<View>(null);
  const x = useRef(carriedX);
  const span = useRef({ left: 0, width: view });
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  lockedRef.current = locked;
  const [ends, setEnds] = useState({ left: false, right: false });
  const showEnds = useCallback(
    (at: number) => {
      const max = tabW * n - view;
      const next = { left: scrolls && at > 2, right: scrolls && at < max - 2 };
      setEnds((e) => (e.left === next.left && e.right === next.right ? e : next));
    },
    [n, scrolls, tabW, view]
  );

  // Where it was on the last page, moved to show this page's tab; again on coming back to this page.
  useEffect(() => {
    if (!focused) return;
    if (!scrolls || activeAt < 0 || view <= 0) return showEnds(0);
    const to = scrollToShow(carriedX, activeAt, tabW, view, n);
    x.current = to;
    carriedX = to;
    scroller.current?.scrollTo({ x: to, animated: false });
    showEnds(to);
  }, [focused, tucked, scrolls, activeAt, tabW, view, n, showEnds]);

  // For a tab carried along the bar: held still under it, and scrolled at the ends.
  const host = useMemo<ScrollHost>(
    () => ({
      axis: 'x',
      lock: (on) => {
        setLocked(on);
        if (on) frame.current?.measureInWindow((left, _y, width) => width > 0 && (span.current = { left, width }));
      },
      y: () => x.current,
      scrollBy: (d) => {
        const to = Math.max(0, Math.min(tabW * n - view, x.current + d));
        if (to === x.current) return;
        x.current = to;
        carriedX = to;
        scroller.current?.scrollTo({ x: to, animated: false });
      },
      viewport: () => ({ top: span.current.left, height: span.current.width }),
    }),
    [n, tabW, view]
  );

  // Tucked: it runs off the foot, then the handle takes its place and the keys grow into the room.
  const tuck = useCallback(() => {
    Animated.timing(pull, { toValue: offFoot, duration: 150, useNativeDriver: false }).start(() => update({ calcBarTucked: true }));
  }, [offFoot, pull, update]);
  // Brought back, here or from Settings: it rises from below the foot.
  const untuck = useCallback(() => {
    pull.setValue(offFoot);
    update({ calcBarTucked: false });
  }, [offFoot, pull, update]);
  useEffect(() => {
    if (!tucked) Animated.timing(pull, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  }, [tucked, pull]);
  // A pull mostly down on the bar follows the finger; far or fast enough, it tucks, else it springs back.
  // Never while a tab is being carried along it.
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) => tucks && !lockedRef.current && pullsDown(g.dx, g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => pull.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => (tucksAt(g.dy, g.vy) ? tuck() : Animated.spring(pull, { toValue: 0, bounciness: 4, useNativeDriver: false }).start()),
        onPanResponderTerminate: () => Animated.spring(pull, { toValue: 0, useNativeDriver: false }).start(),
      }),
    [tucks, pull, tuck]
  );
  // The handle: a tap, or a pull up, brings it back.
  const handle = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderRelease: (_e, g) => {
          if (handleShows(g.dx, g.dy)) untuck();
        },
      }),
    [untuck]
  );
  const said = tucked ? 'Show the tab bar' : 'Tuck the tab bar';
  useVoiceTargets(tucks ? [{ kind: 'press', label: said, run: () => ((tucked ? untuck() : tuck()), said) }] : null);

  const go = useCallback(
    (tab: Tab) => {
      if (tab.id === active) return;
      const routes: TabRoute[] = [{ name: 'Home' }, ...(tab.route ? [tab.route] : [])];
      navigation.reset({ index: routes.length - 1, routes: routes as never });
    },
    [active, navigation]
  );

  if (tucked)
    return (
      <View
        {...handle.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Show the tab bar"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={untuck}
        style={{ height: HANDLE_HEIGHT + insets.bottom, backgroundColor: t.colors.tabBarLo, borderTopWidth: 1, borderTopColor: p.seamDark, alignItems: 'center', paddingTop: 7 }}
      >
        <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: t.colors.onTabBarFaint }} />
      </View>
    );

  return (
    <Animated.View onLayout={onLayout} {...(tucks ? swipe.panHandlers : null)} style={[{ backgroundColor: t.colors.tabBarLo }, slide, tucks ? { transform: [{ translateY: pull }] } : null]}>
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

      <View ref={frame} style={{ marginHorizontal: EDGE, marginBottom: insets.bottom, height: TAB_BAR_HEIGHT }}>
        <ScrollView
          ref={scroller}
          horizontal
          scrollEnabled={scrolls && !locked}
          showsHorizontalScrollIndicator={false}
          style={{ height: TAB_BAR_HEIGHT, flexGrow: 0 }}
          contentContainerStyle={{ width: tabW * n }}
          scrollEventThrottle={16}
          onScroll={(e) => {
            x.current = e.nativeEvent.contentOffset.x;
            if (focused) carriedX = x.current;
            showEnds(x.current);
          }}
        >
          <ScrollHostContext.Provider value={scrolls ? host : null}>
            <ReorderZone
              items={items}
              idOf={tabId}
              layout="row"
              onMove={move}
              style={{ width: tabW * n }}
              render={(tab, hold) => {
                const on = tab.id === active;
                const color = on ? t.colors.onTabBar : t.colors.onTabBarFaint;
                return (
                  <Pressable onPress={() => go(tab)} {...hold} accessibilityRole="tab" accessibilityState={{ selected: on }} aria-selected={on} accessibilityLabel={tab.label} style={styles.tab}>
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
                          style={[t.type.labelSmall, { color, fontSize: 9.5, letterSpacing: 0.2 }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {tab.label}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />
          </ScrollHostContext.Provider>
        </ScrollView>
        {/* A fade at an end that runs on out of view, in the plate's own shades. */}
        {box && (ends.left || ends.right) ? (
          <Svg width={view} height={TAB_BAR_HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id={gid('fv')} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.colors.tabBarHi} />
                <Stop offset="1" stopColor={t.colors.tabBarLo} />
              </LinearGradient>
              <LinearGradient id={gid('fl')} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={1} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id={gid('fr')} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity={1} />
              </LinearGradient>
              <Mask id={gid('ml')} x={0} y={0} width={FADE} height={TAB_BAR_HEIGHT} maskUnits="userSpaceOnUse">
                <Rect x={0} y={0} width={FADE} height={TAB_BAR_HEIGHT} fill={`url(#${gid('fl')})`} />
              </Mask>
              <Mask id={gid('mr')} x={view - FADE} y={0} width={FADE} height={TAB_BAR_HEIGHT} maskUnits="userSpaceOnUse">
                <Rect x={view - FADE} y={0} width={FADE} height={TAB_BAR_HEIGHT} fill={`url(#${gid('fr')})`} />
              </Mask>
            </Defs>
            {ends.left ? <Rect x={0} y={0} width={FADE} height={TAB_BAR_HEIGHT} fill={`url(#${gid('fv')})`} mask={`url(#${gid('ml')})`} /> : null}
            {ends.right ? <Rect x={view - FADE} y={0} width={FADE} height={TAB_BAR_HEIGHT} fill={`url(#${gid('fv')})`} mask={`url(#${gid('mr')})`} /> : null}
          </Svg>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Grows to fill its slot, never `flex: 1`: a zero flex basis is what Yoga
  // takes for the tab's height under a fixed-height page, and the bar then
  // measures as its bottom padding alone and the tabs spill off the screen,
  // under the phone's own navigation buttons. See the note in ToolTile.tsx.
  tab: { flexGrow: 1, flexShrink: 1 },
});
