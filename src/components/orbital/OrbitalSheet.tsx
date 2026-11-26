import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { VoicePressable } from '../../voice/VoicePressable';

/** A sheet up from the bottom: a title, a Close, and what it holds scrolling under them. */
export function OrbitalSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useTheme();
  const c = t.colors;
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />
      <View style={{ backgroundColor: c.bg, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl, paddingBottom: insets.bottom + t.space.lg, maxHeight: '94%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.lg, borderBottomWidth: t.hairline, borderBottomColor: c.border }}>
          <Text style={[t.type.sectionTitle, { color: c.text, flex: 1 }]} numberOfLines={1}>
            {title}
          </Text>
          <VoicePressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <Ionicons name="close" size={24} color={c.textMuted} />
          </VoicePressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: t.layout.screenPadding, gap: t.space.lg }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
