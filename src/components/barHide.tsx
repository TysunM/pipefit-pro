import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { BAR_START, HANDLE_HEIGHT, barAfterScroll, barShown } from '../state/barHide';

// A tab's page and its bar, talking. The page (Screen.tsx) says where it is
// scrolled to; the bar (TabBar.tsx) slides off the foot of the screen and back
// as state/barHide.ts says. While it can hide, the bar lies over the page
// rather than under it, so nothing above it moves as it goes: the page is
// padded at the foot to scroll clear of it.
//
// It slides only with Settings → Layout → Tab bar set to hide as you scroll,
// and not with a screen reader on, where a bar that comes and goes is a bar
// you cannot find. With Reduce Motion on it goes and comes without sliding.
// Tucked away by hand (TabBar.tsx), only its handle lies over the page.

export type BarHide = {
  /** 0 shown, 1 hidden. */
  shift: Animated.Value;
  /** How much of the foot of the page the bar covers now, in points. */
  cover: () => number;
  /** The page is scrolled to `y`, `content` tall in a window `view` tall. */
  scrolled: (y: number, content: number, view: number) => void;
  show: () => void;
  /** A tile carried on the page: the bar holds still, so the page scrolls under the finger at the speed it always has. Let go, it starts counting from `y`. */
  hold: (on: boolean, y: number) => void;
  /** The bar lies over the page and pads it at the foot: how tall it is, home indicator and all. */
  height: number;
};

const BarHideContext = createContext<BarHide | null>(null);

/** The page's bar, on a tab's page; null anywhere else. */
export const useBarHide = (): BarHide | null => useContext(BarHideContext);

/** A tab's page: its Screen and its TabBar go inside. */
export function TabPage({ children, barHeight }: { children: React.ReactNode; /** The bar's own height, without the home indicator. */ barHeight: number }) {
  const t = useTheme();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [reader, setReader] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    let live = true;
    // A browser can't tell whether a screen reader is on (react-native-web says yes, always): there, only the phone's setting counts.
    const web = Platform.OS === 'web';
    if (!web)
      AccessibilityInfo.isScreenReaderEnabled()
        .then((r) => live && setReader(r))
        .catch(() => undefined);
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => live && setStill(r))
      .catch(() => undefined);
    const a = web ? null : AccessibilityInfo.addEventListener('screenReaderChanged', setReader);
    const b = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    return () => {
      live = false;
      a?.remove();
      b.remove();
    };
  }, []);

  // Tucked away (TabBar.tsx), only the handle lies over the page, and the scroll moves nothing.
  const tucked = settings.barTucked;
  const on = settings.barMode === 'scroll' && !tucked && !reader;
  const height = (tucked ? HANDLE_HEIGHT : barHeight) + insets.bottom;
  const shift = useRef(new Animated.Value(0)).current;
  const state = useRef(BAR_START);
  const held = useRef(false);
  const move = useCallback(
    (hidden: boolean) => {
      // Driven from JS, as the bar's pull is (TabBar.tsx): the two are added on the one transform.
      Animated.timing(shift, { toValue: hidden ? 1 : 0, duration: still ? 0 : 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    },
    [shift, still]
  );
  const show = useCallback(() => {
    if (state.current.hidden) move(false);
    state.current = barShown(state.current);
  }, [move]);

  const value = useMemo<BarHide>(
    () => ({
      shift,
      height,
      cover: () => (state.current.hidden ? 0 : height),
      scrolled: (y, content, view) => {
        if (!on || held.current) return;
        const next = barAfterScroll(state.current, y, content, view);
        if (next.hidden !== state.current.hidden) move(next.hidden);
        state.current = next;
      },
      show,
      hold: (h, y) => {
        held.current = h;
        if (!h) state.current = { ...state.current, last: y, turn: y };
      },
    }),
    [shift, height, on, move, show]
  );

  // Kept on, a screen reader coming on, or back on this page from a tool: the bar is there.
  useEffect(() => {
    if (!on || focused) show();
  }, [on, focused, show]);

  return (
    <BarHideContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>{children}</View>
    </BarHideContext.Provider>
  );
}
