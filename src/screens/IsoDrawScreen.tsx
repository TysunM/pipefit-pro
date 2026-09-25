import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Segmented } from '../components/Segmented';
import { AccentButton, GhostButton } from '../components/Buttons';
import { IsoCanvas, SketchMode } from '../components/sketch/IsoCanvas';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { useSketches } from '../state/sketches';
import { ISO_GRID, Pt } from '../calc/iso';
import { MAX_NOTE, Stroke, getSketch, sketchToSvg, withStrokes } from '../state/sketchStore';
import { shareSheet } from '../print/share';

type Props = NativeStackScreenProps<RootStackParamList, 'IsoDraw'>;

const HINT: Record<SketchMode, string> = {
  run: 'Drag to draw a line; it follows the nearest axis. Start near the end of a line to carry on from it.',
  pen: 'Draw freehand: a tie-in box, a valve, a cloud round a problem.',
  note: 'Tap where a word or a measurement goes. Tap a word to change it.',
};

/** One sketch, open on the paper. Every stroke is kept as it lands. */
export function IsoDrawScreen({ navigation, route }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const { book, hydrated, apply } = useSketches();
  const sketch = getSketch(book, id);

  const [mode, setMode] = useState<SketchMode>('run');
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [note, setNote] = useState<{ at: Pt; index: number | undefined } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [word, setWord] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: sketch?.name ?? 'Sketch' });
  }, [navigation, sketch?.name]);

  useEffect(() => {
    if (!word) return;
    const h = setTimeout(() => setWord(null), 4000);
    return () => clearTimeout(h);
  }, [word]);

  const edit = (f: (strokes: Stroke[]) => Stroke[]) =>
    apply((b) => {
      const s = getSketch(b, id);
      return s ? withStrokes(b, id, f(s.strokes), Date.now()) : b;
    });

  if (hydrated && !sketch) {
    return (
      <Screen>
        <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
          <Text style={[t.type.body, { color: t.colors.textMuted }]}>That sketch is not in the book any more.</Text>
          <GhostButton label="Back to the sketches" icon="arrow-back" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  const strokes = sketch?.strokes ?? [];

  const share = async () => {
    if (!sketch) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${sketch.name}</title><style>body{margin:0;padding:12px;font-family:Helvetica,Arial,sans-serif}h1{font-size:16px;margin:0 0 8px}svg{max-width:100%;height:auto}</style></head><body><h1>${sketch.name}${sketch.place ? ' · ' + sketch.place : ''}</h1>${sketchToSvg(sketch, ISO_GRID)}</body></html>`;
    const r = await shareSheet(html, sketch.name);
    if (!r.ok) setWord(r.why);
  };

  return (
    <Screen scroll={false}>
      <View style={{ paddingTop: t.space.md }}>
        <Segmented
          options={[
            { value: 'run' as SketchMode, label: 'Run' },
            { value: 'pen' as SketchMode, label: 'Pen' },
            { value: 'note' as SketchMode, label: 'Note' },
          ]}
          selected={mode}
          onSelect={setMode}
        />
        <Text style={[t.type.caption, { color: word ? t.colors.warnText : t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }]} numberOfLines={2}>
          {word ?? HINT[mode]}
        </Text>
      </View>

      <View
        onLayout={(e) => setSize({ w: Math.floor(e.nativeEvent.layout.width), h: Math.floor(e.nativeEvent.layout.height) })}
        style={{
          flex: 1,
          marginHorizontal: t.layout.screenPadding,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.wellEdge,
          overflow: 'hidden',
          backgroundColor: t.colors.well,
        }}
      >
        {size.w > 0 && size.h > 0 ? (
          <IsoCanvas
            width={size.w}
            height={size.h}
            strokes={strokes}
            mode={mode}
            onStroke={(s) => edit((prev) => [...prev, s])}
            onNote={(at, index) => setNote({ at, index })}
          />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, paddingBottom: insets.bottom + t.space.md }}>
        {confirmClear ? (
          <>
            <GhostButton label="Keep" style={{ flex: 1 }} onPress={() => setConfirmClear(false)} />
            <GhostButton
              label="Clear the page"
              icon="trash-outline"
              style={{ flex: 2 }}
              onPress={() => {
                setConfirmClear(false);
                edit(() => []);
              }}
            />
          </>
        ) : (
          <>
            <GhostButton label="Undo" icon="arrow-undo-outline" style={{ flex: 1 }} onPress={() => edit((prev) => prev.slice(0, -1))} />
            <GhostButton label="Clear" icon="trash-outline" style={{ flex: 1 }} onPress={() => setConfirmClear(true)} />
            <AccentButton label="Share" icon="share-outline" style={{ flex: 1 }} onPress={() => void share()} />
          </>
        )}
      </View>

      <NoteSheet
        t={t}
        open={note}
        existing={note?.index !== undefined ? (strokes[note.index] as { kind: 'note'; text: string } | undefined)?.text ?? '' : ''}
        onCancel={() => setNote(null)}
        onSave={(text) => {
          const n = note;
          setNote(null);
          if (!n) return;
          const clean = text.trim().slice(0, MAX_NOTE);
          edit((prev) => {
            if (n.index !== undefined) {
              const cur = prev[n.index];
              if (!cur || cur.kind !== 'note') return prev;
              return clean ? prev.map((s, i) => (i === n.index ? { ...cur, text: clean } : s)) : prev.filter((_, i) => i !== n.index);
            }
            return clean ? [...prev, { kind: 'note', at: [Math.round(n.at[0] * 10) / 10, Math.round(n.at[1] * 10) / 10], text: clean }] : prev;
          });
        }}
      />
    </Screen>
  );
}

function NoteSheet({
  t,
  open,
  existing,
  onCancel,
  onSave,
}: {
  t: Theme;
  open: { at: Pt; index: number | undefined } | null;
  existing: string;
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText(existing);
  }, [open, existing]);
  const editing = open?.index !== undefined;

  return (
    <Modal visible={open !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ margin: t.space.xxl, padding: t.space.xxl, borderRadius: t.radius.xl, backgroundColor: t.colors.bg, gap: t.space.md }}
        >
          <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>{editing ? 'Change the note' : 'Add a note'}</Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            {editing ? 'Leave it empty to take the note off the page.' : "A measurement, a tag, a word. It goes where you tapped."}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={'4\'-6 1/2"'}
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Note text"
            autoFocus
            maxLength={MAX_NOTE}
            onSubmitEditing={() => onSave(text)}
            style={{
              height: t.layout.fieldHeight,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.bgRaised,
              color: t.colors.text,
              paddingHorizontal: t.space.lg,
              fontFamily: t.font.sansMedium,
              fontSize: 17,
              fontWeight: '600',
            }}
          />
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
            <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
            <AccentButton label={editing ? 'Save' : 'Place it'} icon="checkmark" style={{ flex: 1 }} onPress={() => onSave(text)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
