import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useVoiceMaybe } from '../voice/VoiceProvider';
import { TAB_BAR_HEIGHT } from './TabBar';
import { ScrollHostContext, type ScrollHost } from './scrollHost';

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

  const frame = useRef<View>(null);
  const scroller = useRef<ScrollView>(null);
  const yRef = useRef(0);
  const heightRef = useRef(0);
  const contentRef = useRef(0);
  const topRef = useRef(0);
  const [locked, setLocked] = useState(false);
  const host = useMemo<ScrollHost>(
    () => ({
      lock: (on) => {
        setLocked(on);
        if (on)
          frame.current?.measureInWindow((_x, y, _w, h) => {
            topRef.current = y;
            if (h > 0) heightRef.current = h;
          });
      },
      y: () => yRef.current,
      scrollBy: (dy) => {
        const max = Math.max(0, contentRef.current - heightRef.current);
        const next = Math.max(0, Math.min(max, yRef.current + dy));
        if (next === yRef.current) return;
        yRef.current = next;
        scroller.current?.scrollTo({ y: next, animated: false });
      },
      viewport: () => ({ top: topRef.current, height: heightRef.current }),
    }),
    []
  );

  if (!scroll)
    return (
      <View style={[base, style]}>
        {children}
      </View>
    );

  return (
    <View ref={frame} style={base} onLayout={(e) => (heightRef.current = e.nativeEvent.layout.height)}>
      <ScrollHostContext.Provider value={host}>
        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentContainerStyle={[{ paddingBottom: (tabbed ? 0 : insets.bottom) + t.space.xxxl + mic }, style]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEnabled={!locked}
          scrollEventThrottle={16}
          onScroll={(e) => (yRef.current = e.nativeEvent.contentOffset.y)}
          onContentSizeChange={(_w, h) => (contentRef.current = h)}
        >
          <View style={[styles.content, { maxWidth: t.layout.maxContentWidth }]}>{children}</View>
        </ScrollView>
      </ScrollHostContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({ content: { width: '100%', alignSelf: 'center' } });
