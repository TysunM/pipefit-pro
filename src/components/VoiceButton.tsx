// The mic, on every screen
// ------------------------
// A big round button low on the right, where a thumb lands with the phone in
// one hand, sized for a gloved knuckle. Tap it and talk; what was heard and
// what the app did comes up in a panel along the foot of the screen, with
// Undo on anything written to a record.

import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useVoice } from '../voice/VoiceProvider';
import { TAB_BAR_HEIGHT } from './TabBar';

const SIZE = 64;

export function VoiceButton() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const v = useVoice();
  const s = v.sheet;

  // A finished answer goes away on its own; one with an Undo stays longer.
  useEffect(() => {
    if (!s || s.phase !== 'done' || v.handsFree) return;
    const id = setTimeout(v.dismiss, s.undo ? 15_000 : 7_000);
    return () => clearTimeout(id);
  }, [s, v.dismiss, v.handsFree]);

  if (!v.enabled) return null;

  const bottom = insets.bottom + TAB_BAR_HEIGHT + 14;

  if (!s) {
    return (
      <Pressable
        onPress={v.talk}
        accessibilityRole="button"
        accessibilityLabel="Speak a command"
        hitSlop={8}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 16,
          bottom,
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: pressed ? t.colors.primaryPressed : t.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: t.colors.onPrimary,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 8,
        })}
      >
        <Ionicons name="mic" size={30} color={t.colors.onPrimary} />
      </Pressable>
    );
  }

  const label =
    s.phase === 'listening' ? (v.handsFree ? 'HANDS-FREE · LISTENING' : 'LISTENING') : s.phase === 'thinking' ? 'ASKING CLAUDE' : 'VOICE';
  const listening = s.phase === 'listening';

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom + t.space.md,
        paddingTop: t.space.lg,
        paddingHorizontal: t.layout.screenPadding,
        backgroundColor: t.colors.bgRaised,
        borderTopWidth: 1,
        borderTopColor: t.colors.borderStrong,
        gap: t.space.sm,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <Ionicons
          name={listening ? 'mic' : s.phase === 'thinking' ? 'sparkles-outline' : s.tone === 'warn' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
          size={18}
          color={listening ? t.colors.danger : s.tone === 'warn' ? t.colors.warnText : t.colors.data}
        />
        <Text style={[t.type.label, { color: t.colors.textMuted, flex: 1 }]}>{label}</Text>
        <Pressable onPress={v.handsFree ? () => v.setHandsFree(false) : v.dismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={t.colors.textMuted} />
        </Pressable>
      </View>

      <Text style={[t.type.bodyStrong, { color: t.colors.text, fontSize: 20 }]} numberOfLines={3}>
        {s.heard ? `“${s.heard}”` : listening ? 'Say a tool, a figure, a weld or a test reading…' : ''}
      </Text>
      {s.reply ? (
        <Text style={[t.type.body, { color: s.tone === 'warn' ? t.colors.warnText : t.colors.data }]} numberOfLines={5}>
          {s.reply}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
        {s.undo ? <PanelButton icon="arrow-undo-outline" label="Undo" onPress={s.undo} /> : null}
        {s.open ? <PanelButton icon="open-outline" label={s.open.label} onPress={() => (s.open!.go(), v.dismiss())} /> : null}
        {v.handsFree ? (
          <PanelButton icon="stop-circle-outline" label="Stop hands-free" strong onPress={() => v.setHandsFree(false)} />
        ) : (
          <PanelButton
            icon={listening ? 'stop' : 'mic'}
            label={listening ? 'Stop' : s.phase === 'thinking' ? 'Wait…' : 'Talk'}
            strong
            onPress={s.phase === 'thinking' ? () => undefined : v.talk}
          />
        )}
      </View>
    </View>
  );
}

function PanelButton({ icon, label, onPress, strong }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; strong?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 56,
        borderRadius: t.radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space.sm,
        paddingHorizontal: t.space.sm,
        borderWidth: strong ? 0 : 1,
        borderColor: t.colors.border,
        backgroundColor: strong ? (pressed ? t.colors.primaryPressed : t.colors.primary) : pressed ? t.colors.bgSubtle : t.colors.bg,
      })}
    >
      <Ionicons name={icon} size={20} color={strong ? t.colors.onPrimary : t.colors.text} />
      <Text style={[t.type.button, { color: strong ? t.colors.onPrimary : t.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
