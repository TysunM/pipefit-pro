import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { EMPTY_ENTRY, Entry, GloveKey, entryLabel, fieldValue, isEmpty, press } from '../calc/gloveEntry';
import { useSettings } from '../state/settings';
import { useRecentFigures } from '../state/figures';

/** Tall enough for a knuckle or a stylus to land on without hitting its neighbour. */
const KEY_H = 64;

const EIGHTHS: { n: number; d: number; label: string }[] = [
  { n: 1, d: 8, label: '1/8' },
  { n: 1, d: 4, label: '1/4' },
  { n: 3, d: 8, label: '3/8' },
  { n: 1, d: 2, label: '1/2' },
  { n: 5, d: 8, label: '5/8' },
  { n: 3, d: 4, label: '3/4' },
  { n: 7, d: 8, label: '7/8' },
];

type KeyTone = 'plain' | 'frac' | 'act' | 'done';

/** One key. Its own component, so a press never lands on a key being rebuilt under it. */
function Key({
  text,
  icon,
  onPress,
  tone = 'plain',
  grow = 1,
  a11y,
}: {
  text?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: KeyTone;
  grow?: number;
  a11y: string;
}) {
  const t = useTheme();
  const bg = tone === 'done' ? t.colors.primary : tone === 'frac' ? t.colors.accentSoft : tone === 'act' ? t.colors.bgSubtle : t.colors.bgRaised;
  const fg = tone === 'done' ? t.colors.onPrimary : tone === 'frac' ? t.colors.accent : t.colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => ({
        flex: grow,
        height: KEY_H,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.primary : bg,
        borderWidth: 1,
        borderColor: tone === 'frac' ? t.colors.accent : t.colors.borderStrong,
      })}
    >
      {({ pressed }) =>
        icon ? (
          <Ionicons name={icon} size={28} color={pressed ? t.colors.onPrimary : fg} />
        ) : (
          <Text style={[t.type.fieldValue, { fontSize: tone === 'frac' ? 24 : 30, color: pressed ? t.colors.onPrimary : fg }]}>{text}</Text>
        )
      }
    </Pressable>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>;
}

/**
 * The glove keypad: every key a thumb-width tall and high in contrast, a tick
 * under the finger on every press, the figures used lately along the top.
 * On an imperial length it keys feet, inches and a fraction the way a tape is
 * read; on anything else, digits and a point. Nothing reaches the field until
 * Done.
 */
export function GloveKeypad({
  visible,
  label,
  tape,
  unit,
  current,
  onDone,
  onClose,
}: {
  visible: boolean;
  label: string;
  /** An imperial length: feet and fraction keys. */
  tape: boolean;
  /** What the field is measured in, shown after the figure. */
  unit?: string;
  current: string;
  onDone: (value: string) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [entry, setEntry] = useState<Entry>(EMPTY_ENTRY);
  const [recent, remember] = useRecentFigures(settings.unitSystem);

  // A fresh start each time it opens; the field's figure shows until a key is pressed.
  useEffect(() => {
    if (visible) setEntry(EMPTY_ENTRY);
  }, [visible]);

  const tap = (key: GloveKey) => {
    void Haptics.selectionAsync();
    setEntry((e) => press(e, key, tape));
  };
  const finish = (value: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (value) remember(value);
    onDone(value);
  };
  const done = () => (isEmpty(entry) ? onClose() : finish(fieldValue(entry)));

  const shown = entryLabel(entry, tape);
  const inches = tape && entry.feet !== null ? fieldValue(entry) : '';

  const digit = (x: string) => <Key text={x} a11y={x} onPress={() => tap({ k: 'digit', d: x })} />;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay }} onPress={onClose} accessibilityLabel="Close the keypad" />
      <View
        style={{
          backgroundColor: t.colors.bg,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          paddingHorizontal: t.space.lg,
          paddingTop: t.space.lg,
          paddingBottom: insets.bottom + t.space.lg,
          gap: 8,
        }}
      >
        <Text style={[t.type.label, { color: t.colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={{ minHeight: 56, justifyContent: 'center' }}>
          <Text
            style={[t.type.displaySmall, { color: shown ? t.colors.text : t.colors.textFaint }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLiveRegion="polite"
          >
            {shown || (current ? `${current}${unit ? ` ${unit}` : ''}` : '—')}
          </Text>
          {inches ? <Text style={[t.type.bodyStrong, { color: t.colors.data }]}>{`= ${inches}"`}</Text> : null}
        </View>

        {recent.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
            {recent.map((r) => (
              <Pressable
                key={r}
                onPress={() => finish(r)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${r}${unit ? ` ${unit}` : ''}`}
                style={({ pressed }) => ({
                  minWidth: 76,
                  height: 48,
                  paddingHorizontal: t.space.md,
                  borderRadius: t.radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? t.colors.primary : t.colors.bgSubtle,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                })}
              >
                {({ pressed }) => (
                  <Text style={[t.type.bodyStrong, { fontSize: 20, color: pressed ? t.colors.onPrimary : t.colors.text }]}>
                    {tape ? `${r}"` : r}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {tape ? (
          <>
            <Row>
              {EIGHTHS.slice(0, 4).map((f) => (
                <Key key={f.label} text={f.label} tone="frac" a11y={f.label} onPress={() => tap({ k: 'frac', n: f.n, d: f.d })} />
              ))}
            </Row>
            <Row>
              {EIGHTHS.slice(4).map((f) => (
                <Key key={f.label} text={f.label} tone="frac" a11y={f.label} onPress={() => tap({ k: 'frac', n: f.n, d: f.d })} />
              ))}
              <Key text="+1/16" tone="frac" a11y="Add a sixteenth" onPress={() => tap({ k: 'sixteenth' })} />
            </Row>
          </>
        ) : null}
        <Row>
          {digit('7')}
          {digit('8')}
          {digit('9')}
          <Key icon="backspace-outline" tone="act" a11y="Delete" onPress={() => tap({ k: 'back' })} />
        </Row>
        <Row>
          {digit('4')}
          {digit('5')}
          {digit('6')}
          {tape ? <Key text="ft" tone="act" a11y="Feet" onPress={() => tap({ k: 'feet' })} /> : <Key text="." tone="act" a11y="Point" onPress={() => tap({ k: 'dot' })} />}
        </Row>
        <Row>
          {digit('1')}
          {digit('2')}
          {digit('3')}
          {tape ? <Key text="." tone="act" a11y="Point" onPress={() => tap({ k: 'dot' })} /> : <Key text="C" tone="act" a11y="Clear" onPress={() => tap({ k: 'clear' })} />}
        </Row>
        <Row>
          {tape ? <Key text="C" tone="act" a11y="Clear" onPress={() => tap({ k: 'clear' })} /> : null}
          <Key text="0" grow={tape ? 1 : 2} a11y="0" onPress={() => tap({ k: 'digit', d: '0' })} />
          <Key text="Done" tone="done" grow={2} a11y="Done" onPress={done} />
        </Row>
      </View>
    </Modal>
  );
}
