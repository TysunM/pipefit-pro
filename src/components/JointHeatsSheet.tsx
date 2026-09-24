// Which heats went into this joint
// --------------------------------
// The record that makes a turnover package possible, and the one nobody wants
// to keep: for every weld and every bolt-up, which certified material it was
// made of.
//
// It is a pick list rather than a text field on purpose. Typing a heat number
// onto a joint is a second transcription of a string that was already
// transcribed once off the steel, and each transcription is another chance to
// turn a Z into a 2. The heats are already in the book; this points at them.
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { Heat, normaliseHeat } from '../calc/heat';

export function JointHeatsSheet({
  visible,
  onClose,
  tag,
  heats,
  book,
  onToggle,
}: {
  visible: boolean;
  onClose: () => void;
  /** What the joint is called, for the heading. */
  tag: string;
  /** The heat numbers already on this joint. */
  heats: readonly string[];
  /** Every heat the book holds. */
  book: readonly Heat[];
  onToggle: (heat: string, on: boolean) => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const on = new Set(heats.map(normaliseHeat));
  const owed = book.filter((h) => on.has(normaliseHeat(h.heat)) && !h.certified).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.colors.bg,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          paddingBottom: insets.bottom + t.space.lg,
          maxHeight: '80%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: t.layout.screenPadding,
            paddingVertical: t.space.lg,
            borderBottomWidth: t.hairline,
            borderBottomColor: t.colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>{`Heats in ${tag || 'this joint'}`}</Text>
            <Text style={[t.type.caption, { color: owed ? t.colors.warnText : t.colors.textMuted }]}>
              {heats.length === 0
                ? 'None recorded — this joint cannot be proved'
                : owed
                  ? `${heats.length} on the joint · ${owed} cert${owed > 1 ? 's' : ''} still owed`
                  : `${heats.length} on the joint · every cert in hand`}
            </Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={t.colors.textMuted} />
          </Pressable>
        </View>

        {book.length === 0 ? (
          <Text style={[t.type.body, { color: t.colors.textMuted, padding: t.layout.screenPadding }]}>
            The heat book is empty. Add the heats off the stencils in Heat book, then come back and tick the
            ones that went into this joint.
          </Text>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            {book.map((h) => {
              const ticked = on.has(normaliseHeat(h.heat));
              return (
                <Pressable
                  key={h.heat}
                  onPress={() => {
                    onToggle(h.heat, !ticked);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ticked }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.space.md,
                    paddingHorizontal: t.layout.screenPadding,
                    paddingVertical: t.space.lg,
                    borderTopWidth: t.hairline,
                    borderTopColor: t.colors.border,
                    backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
                  })}
                >
                  <Ionicons
                    name={ticked ? 'checkbox' : 'square-outline'}
                    size={23}
                    color={ticked ? t.colors.primary : t.colors.borderStrong}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{h.heat}</Text>
                    <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                      {[h.material || 'material not set', h.certified ? 'cert in hand' : 'cert owed']
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {h.certified ? null : (
                    <Ionicons name="alert-circle-outline" size={19} color={t.colors.accent} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
