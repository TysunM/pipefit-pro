import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { edgeScroll, nearestSlot, previewFrames, type Rect, type SlotMode } from '../state/layout';
import { useScrollHost } from './scrollHost';
import { useTheme } from '../theme/ThemeProvider';

// Carrying a tile
// ---------------
// Hold a tab, a tile or a card until it lifts, then carry it where you want
// it; the others step out of its way as it goes, and it drops into the gap
// when the finger comes up. Where it lands is the zone's business (the
// layout store, or the recents strip); this is only the carrying.
//
// Built on the responder system and Animated and nothing else. A gesture
// library would do it in fewer lines, but it is native code, and native code
// cannot go out over the air: every phone would need a new APK before it
// could take another update. This can go out tonight.
//
// How the hand-over works. The tile's own Pressable takes the touch, as it
// does for a tap. Holding still long enough fires its long press, which arms
// the zone; from then on the zone claims every move of that touch (a
// PanResponder on the zone, capturing on move), the page's scroll is held
// still, and the tile follows the finger. Lifting without moving just sets
// it down. A finger that drifts while holding is a scroll, not a hold, and
// the Pressable cancels its long press the way it always has.
//
// Where the slots are is measured when the tile lifts, each one against the
// zone, rather than tracked by onLayout: the web only reports a resize, not
// a move, and a tile that has moved slot is exactly the case that matters.

/** What a tile or card spreads onto its Pressable so a long hold picks it up. */
export type Hold = {
  onLongPress: (e: GestureResponderEvent) => void;
  onPressOut: () => void;
  delayLongPress: number;
};

export type ReorderLayout = 'row' | 'grid' | 'stack';

/**
 * How long a finger holds still before a tile lifts. Long enough that a slow,
 * gloved tap is still a tap (a tap that lifts the tile opens nothing), short
 * enough not to feel like waiting.
 */
export const HOLD_MS = 400;
/** A finger this close to the top or foot of the page carries the scroll with it. */
const EDGE = 72;
/** The most the page scrolls per frame under a carried tile. */
const EDGE_STEP = 12;

type Armed = {
  id: string;
  from: number;
  to: number;
  ids: string[];
  /** Where the finger was when the tile lifted, and where it is now, in page coordinates. */
  page0: { x: number; y: number };
  last: { x: number; y: number };
  /** How far the page was scrolled when the tile lifted. */
  y0: number;
  /** Every slot against the zone, once measured. */
  rects: Rect[] | null;
  /** The zone has taken the touch from the tile's Pressable. */
  taken: boolean;
};

const MEASURE_FAIL: Rect = { x: 0, y: 0, width: 0, height: 0 };

function buzz(kind: 'lift' | 'slot' | 'drop') {
  const p =
    kind === 'lift'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      : kind === 'slot'
        ? Haptics.selectionAsync()
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  void p.catch(() => undefined);
}

type SlotHandle = { measureLayout: (relativeTo: unknown, onSuccess: (x: number, y: number, w: number, h: number) => void, onFail?: () => void) => void };

export function ReorderZone<T>({
  items,
  idOf,
  layout,
  onMove,
  render,
  style,
  gap = 14,
  enabled = true,
}: {
  items: readonly T[];
  idOf: (x: T) => string;
  layout: ReorderLayout;
  /** Called with indexes in `items` when a carried item is dropped somewhere else. */
  onMove: (from: number, to: number) => void;
  /** Draws one item; spread `hold` onto its Pressable. */
  render: (item: T, hold: Hold, carried: boolean) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  /** Off, holding does nothing and the zone is a plain layout. */
  enabled?: boolean;
}) {
  const t = useTheme();
  const host = useScrollHost();
  const zone = useRef<View>(null);
  const slots = useRef(new Map<string, SlotHandle | null>());
  const offset = useRef(new Animated.ValueXY()).current;
  const shifts = useRef(new Map<string, Animated.ValueXY>()).current;
  const armed = useRef<Armed | null>(null);
  const frame = useRef<number | null>(null);
  const [carried, setCarried] = useState<string | null>(null);
  const live = useRef(items);
  live.current = items;
  const mode: SlotMode = layout === 'stack' ? 'stack' : 'slots';

  const shiftOf = useCallback(
    (id: string) => {
      let v = shifts.get(id);
      if (!v) {
        v = new Animated.ValueXY();
        shifts.set(id, v);
      }
      return v;
    },
    [shifts]
  );

  /** Put the carried tile under the finger, step the others aside, and carry the scroll at the edges. */
  const place = useCallback(() => {
    const a = armed.current;
    if (!a || !a.rects) return;
    if (host) {
      const { top, height } = host.viewport();
      const step = edgeScroll(a.last.y - top, height, EDGE, EDGE_STEP);
      if (step) host.scrollBy(step);
    }
    const dx = layout === 'stack' ? 0 : a.last.x - a.page0.x;
    const dy = layout === 'row' ? 0 : a.last.y - a.page0.y + ((host?.y() ?? 0) - a.y0);
    offset.setValue({ x: dx, y: dy });
    const home = a.rects[a.from] as Rect;
    const to = nearestSlot(a.rects, { x: home.x + home.width / 2 + dx, y: home.y + home.height / 2 + dy });
    if (to < 0 || to === a.to) return;
    a.to = to;
    const frames = previewFrames(a.rects, a.from, to, mode);
    a.ids.forEach((id, i) => {
      if (i === a.from) return;
      const r = a.rects?.[i] as Rect;
      const f = frames[i] as Rect;
      Animated.spring(shiftOf(id), { toValue: { x: f.x - r.x, y: f.y - r.y }, useNativeDriver: false, speed: 40, bounciness: 2 }).start();
    });
    buzz('slot');
  }, [host, layout, mode, offset, shiftOf]);

  const stopFrames = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  /** Set the tile down: where it is if it has been carried somewhere, else where it was. */
  const drop = useCallback(() => {
    const a = armed.current;
    if (!a) return;
    armed.current = null;
    stopFrames();
    offset.setValue({ x: 0, y: 0 });
    shifts.forEach((v) => {
      v.stopAnimation();
      v.setValue({ x: 0, y: 0 });
    });
    setCarried(null);
    host?.lock(false);
    if (a.rects && a.to !== a.from) {
      onMove(a.from, a.to);
      buzz('drop');
    }
  }, [host, offset, onMove, shifts, stopFrames]);

  const arm = useCallback(
    (id: string, e: GestureResponderEvent) => {
      if (!enabled || armed.current) return;
      const ids = live.current.map(idOf);
      const from = ids.indexOf(id);
      if (from < 0 || ids.length < 2) return;
      const { pageX, pageY } = e.nativeEvent;
      const a: Armed = { id, from, to: from, ids, page0: { x: pageX, y: pageY }, last: { x: pageX, y: pageY }, y0: host?.y() ?? 0, rects: null, taken: false };
      armed.current = a;
      offset.setValue({ x: 0, y: 0 });
      setCarried(id);
      host?.lock(true);
      buzz('lift');
      // Every slot against the zone. The callbacks come back a tick later; a
      // move before then waits, and a slot that cannot be measured drops the lift.
      const rects: Rect[] = ids.map(() => MEASURE_FAIL);
      let left = ids.length;
      const here = zone.current;
      ids.forEach((sid, i) => {
        const node = slots.current.get(sid);
        const done = (r: Rect) => {
          rects[i] = r;
          left -= 1;
          if (left === 0 && armed.current === a) a.rects = rects.some((x) => x.width === 0 && x.height === 0) ? null : rects;
        };
        if (!node || !here) return done(MEASURE_FAIL);
        node.measureLayout(here, (x, y, width, height) => done({ x, y, width, height }), () => done(MEASURE_FAIL));
      });
      const tick = () => {
        if (!armed.current) return;
        place();
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [enabled, host, idOf, offset, place]
  );

  /** The tile's Pressable let go: a hold set down without moving, unless the zone has the touch now. */
  const released = useCallback(
    (id: string) => {
      setTimeout(() => {
        const a = armed.current;
        if (a && a.id === id && !a.taken) drop();
      }, 0);
    },
    [drop]
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: () => armed.current !== null,
        onMoveShouldSetPanResponderCapture: () => armed.current !== null,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          if (armed.current) armed.current.taken = true;
        },
        onPanResponderMove: (e) => {
          const a = armed.current;
          if (!a) return;
          const touch = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
          a.last = { x: touch.pageX, y: touch.pageY };
          place();
        },
        onPanResponderRelease: () => drop(),
        onPanResponderTerminate: () => drop(),
      }),
    [drop, place]
  );

  useEffect(() => () => stopFrames(), [stopFrames]);

  const holds = useMemo(() => {
    const m = new Map<string, Hold>();
    for (const x of items) {
      const id = idOf(x);
      m.set(id, { onLongPress: (e) => arm(id, e), onPressOut: () => released(id), delayLongPress: HOLD_MS });
    }
    return m;
  }, [items, idOf, arm, released]);

  const lift = t.mode === 'dark' ? styles.liftDark : styles.liftLight;
  // The zone stands over its neighbours while a tile is carried, so the tile
  // is not drawn under the next section as it crosses the zone's edge.
  const over = { zIndex: carried ? 30 : 0 };
  const slot = (x: T, slotStyle?: StyleProp<ViewStyle>) => {
    const id = idOf(x);
    const up = carried === id;
    const shift = shiftOf(id);
    return (
      <Animated.View
        key={id}
        ref={(n: unknown) => {
          slots.current.set(id, n as SlotHandle | null);
        }}
        style={[
          slotStyle,
          styles.noSelect,
          up ? lift : null,
          {
            zIndex: up ? 30 : 0,
            transform: [{ translateX: up ? offset.x : shift.x }, { translateY: up ? offset.y : shift.y }, { scale: up ? 1.04 : 1 }],
          },
        ]}
      >
        {render(x, holds.get(id) as Hold, up)}
      </Animated.View>
    );
  };

  if (layout === 'row')
    return (
      <View ref={zone} style={[style, over, { flexDirection: 'row' }]} {...pan.panHandlers}>
        {items.map((x) => slot(x, styles.fill))}
      </View>
    );

  if (layout === 'stack')
    return (
      <View ref={zone} style={[style, over, { gap }]} {...pan.panHandlers}>
        {items.map((x) => slot(x))}
      </View>
    );

  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View ref={zone} style={[style, over, { gap }]} {...pan.panHandlers}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap, alignItems: 'stretch', zIndex: carried && row.some((x) => idOf(x) === carried) ? 30 : 0 }}>
          {row.map((x) => slot(x, styles.fill))}
          {row.length === 1 ? <View style={styles.fill} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // On the web a mouse held on a tile would otherwise start selecting its words.
  noSelect: Platform.OS === 'web' ? ({ userSelect: 'none' } as unknown as ViewStyle) : {},
  liftDark: { shadowColor: '#000000', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  liftLight: { shadowColor: '#2A3A4F', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
});
