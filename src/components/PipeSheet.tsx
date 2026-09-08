import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { ElbowRadius, PIPE_SIZES, Schedule } from '../calc/pipe';

export function PipeSheet({
  visible,
  onClose,
  nps,
  kind,
  schedule,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
  onChange: (patch: { nps?: number; kind?: ElbowRadius; schedule?: Schedule }) => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.colors.bg,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          paddingBottom: insets.bottom + t.space.lg,
          maxHeight: '78%',
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
          <Text style={[t.type.sectionTitle, { color: t.colors.text, fontFamily: t.font.serif, flex: 1 }]}>
            Pipe &amp; fitting
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={t.colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: t.space.xl }}>
          <Group label="Elbow radius">
            <Segmented
              options={[
                { value: 'LR', label: 'Long radius (1.5D)' },
                { value: 'SR', label: 'Short radius (1.0D)' },
              ]}
              selected={kind}
              onSelect={(v) => onChange({ kind: v as ElbowRadius })}
            />
          </Group>

          <Group label="Schedule">
            <Segmented
              options={[
                { value: '10', label: 'SCH 10' },
                { value: '40', label: 'SCH 40' },
                { value: '80', label: 'SCH 80' },
              ]}
              selected={schedule}
              onSelect={(v) => onChange({ schedule: v as Schedule })}
            />
          </Group>

          <Group label="Nominal size">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
              {PIPE_SIZES.map((s) => {
                const active = s.nps === nps;
                return (
                  <Pressable
                    key={s.nps}
                    onPress={() => onChange({ nps: s.nps })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      paddingHorizontal: t.space.lg,
                      height: t.layout.chipHeight,
                      justifyContent: 'center',
                      borderRadius: t.radius.md,
                      borderWidth: 1,
                      borderColor: active ? t.colors.primary : t.colors.border,
                      backgroundColor: active ? t.colors.primary : t.colors.bgRaised,
                    }}
                  >
                    <Text style={[t.type.bodyStrong, { color: active ? t.colors.onPrimary : t.colors.text }]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Group>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ paddingTop: t.space.xl }}>
      <Text
        style={[
          t.type.label,
          { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.md },
        ]}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function Segmented({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              height: t.layout.chipHeight,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: active ? t.colors.primary : t.colors.border,
              backgroundColor: active ? t.colors.primary : t.colors.bgRaised,
              paddingHorizontal: t.space.sm,
            }}
          >
            <Text
              style={[t.type.captionStrong, { color: active ? t.colors.onPrimary : t.colors.text, textAlign: 'center' }]}
              numberOfLines={2}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
