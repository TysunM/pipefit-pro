// The notice line (state/notice.ts): high on the screen, clear of the mic and
// its sheet, in the warning colours, with a buzz. Tap it away, or it goes on
// its own after a few seconds.
import React, { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { clearNotice, useNotice } from '../state/notice';

const SHOW_MS = 7000;
/** Below the screen's own title bar. */
const HEADER = 60;

export function NoticeToast() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const notice = useNotice();

  useEffect(() => {
    if (!notice) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    const timer = setTimeout(() => clearNotice(notice.id), SHOW_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;
  return (
    <Pressable
      onPress={() => clearNotice(notice.id)}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${notice.text} Tap to close.`}
      style={{
        position: 'absolute',
        top: insets.top + HEADER,
        left: t.layout.screenPadding,
        right: t.layout.screenPadding,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        padding: t.space.md,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.warnBg,
        borderWidth: 1,
        borderColor: t.colors.warnText,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 8,
      }}
    >
      <Ionicons name="swap-horizontal" size={22} color={t.colors.warnText} />
      <Text style={[t.type.bodyStrong, { color: t.colors.warnText, flex: 1 }]}>{notice.text}</Text>
      <Ionicons name="close" size={18} color={t.colors.warnText} />
    </Pressable>
  );
}
