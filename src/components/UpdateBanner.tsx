import React from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useOtaUpdate } from '../state/updates';

/**
 * Shown only once a new bundle is already downloaded, so tapping it is a
 * restart and not a download — it works with no signal. Dismissing hides it
 * until the next launch; the update stays downloaded either way and applies
 * the next time the app is opened cold.
 *
 * It reports its own height so the navigator above it can be shrunk by exactly
 * that much. Overlaying would have put it across the bottom row of the
 * calculator keypad, which reaches the bottom of the frame.
 */
export function UpdateBanner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { visible, apply, dismiss, setBannerHeight } = useOtaUpdate();

  const onLayout = React.useCallback(
    (e: LayoutChangeEvent) => setBannerHeight(e.nativeEvent.layout.height),
    [setBannerHeight]
  );

  React.useEffect(() => {
    if (!visible) setBannerHeight(0);
  }, [visible, setBannerHeight]);

  if (!visible) return null;

  return (
    <View
      onLayout={onLayout}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom + t.space.sm,
        paddingTop: t.space.sm,
        paddingHorizontal: t.layout.screenPadding,
        alignItems: 'center',
        backgroundColor: t.colors.bg,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          width: '100%',
          maxWidth: t.layout.maxContentWidth,
          paddingLeft: t.space.lg,
          paddingRight: t.space.sm,
          paddingVertical: t.space.sm,
          borderRadius: t.radius.pill,
          backgroundColor: t.colors.primary,
        }}
      >
        <Ionicons name="arrow-down-circle-outline" size={20} color={t.colors.onPrimary} />
        <Text style={[t.type.body, { color: t.colors.onPrimary, flex: 1 }]} numberOfLines={1}>
          Update ready
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restart to apply the update"
          onPress={apply}
          hitSlop={8}
          style={({ pressed }) => ({
            paddingHorizontal: t.space.lg,
            paddingVertical: t.space.sm,
            borderRadius: t.radius.pill,
            backgroundColor: pressed ? t.colors.primaryPressed : 'rgba(255,255,255,0.16)',
          })}
        >
          <Text style={[t.type.label, { color: t.colors.onPrimary }]}>Restart</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={dismiss}
          hitSlop={10}
          style={{ padding: t.space.sm }}
        >
          <Ionicons name="close" size={18} color={t.colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}
