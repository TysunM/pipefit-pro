import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Plate } from '../components/metal';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { HintRow } from '../components/HintRow';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { useSketches } from '../state/sketches';
import { SavedSketch, deleteSketch, newSketch, renameSketch, saveSketch } from '../state/sketchStore';

type Props = NativeStackScreenProps<RootStackParamList, 'IsoSketch'>;

const when = (at: number): string =>
  new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
  ' ' +
  new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

function count(s: SavedSketch): string {
  let runs = 0, pen = 0, notes = 0;
  for (const st of s.strokes) {
    if (st.kind === 'run') runs += 1;
    else if (st.kind === 'pen') pen += 1;
    else notes += 1;
  }
  if (!s.strokes.length) return 'Blank';
  const parts: string[] = [];
  if (runs) parts.push(`${runs} run ${runs === 1 ? 'line' : 'lines'}`);
  if (pen) parts.push(`${pen} pen ${pen === 1 ? 'stroke' : 'strokes'}`);
  if (notes) parts.push(`${notes} ${notes === 1 ? 'note' : 'notes'}`);
  return parts.join(' · ');
}

/** The sketch book: every iso on the phone, newest first. */
export function IsoSketchScreen({ navigation }: Props) {
  const t = useTheme();
  const { book, hydrated, saveError, apply, takeOver } = useSketches();
  const [naming, setNaming] = useState<SavedSketch | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const open = (id: string) => navigation.navigate('IsoDraw', { id });

  const create = () => {
    const now = Date.now();
    const s = newSketch(book, now);
    apply((b) => saveSketch(b, s, now));
    open(s.id);
  };

  return (
    <Screen>
      {book.foreign ? (
        <Warn
          t={t}
          text="This phone's sketch book was written by a newer version of the app, so nothing is being saved. Update the app, or start a new book and lose what it held."
          action="Start new"
          onAction={takeOver}
        />
      ) : null}
      {saveError ? <Warn t={t} text="The last change could not be saved to this phone. What is on screen is ahead of what is stored." /> : null}

      <HintRow text="Iso paper on the phone. A run line snaps to the three axes and the diagonals between them, so a finger draws it straight. The pen draws anything else: a tie-in box, a valve, a cloud. Notes are typed, so a measurement stays readable." />

      <ControlRow>
        <AccentButton label="New sketch" icon="add" style={{ flex: 1 }} onPress={create} />
      </ControlRow>

      <SectionHeader title="Sketches" meta={hydrated ? `${book.sketches.length} kept` : 'loading'} />

      {hydrated && book.sketches.length === 0 ? (
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.lg }}>
          <Text style={[t.type.body, { color: t.colors.textMuted, textAlign: 'center' }]}>
            Nothing drawn yet. A sketch is kept on the phone as it is drawn, and comes back exactly as it was left.
          </Text>
        </View>
      ) : null}

      {book.sketches.map((s) => (
        <View key={s.id} style={{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.md }}>
          <Pressable onPress={() => open(s.id)} accessibilityRole="button" accessibilityLabel={`Open ${s.name}`}>
            {({ pressed }) => (
              <Plate sunk={pressed} radius={t.radius.lg} style={{ padding: t.space.lg, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
                  <Ionicons name="pencil-outline" size={20} color={t.colors.accent} />
                  <Text style={[t.type.bodyStrong, { color: t.colors.text, flex: 1 }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={[t.type.labelSmall, { color: t.colors.textFaint }]}>{when(s.updatedAt)}</Text>
                </View>
                <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
                  {[s.place, count(s)].filter(Boolean).join(' · ')}
                </Text>
              </Plate>
            )}
          </Pressable>
          {confirm === s.id ? (
            <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
              <GhostButton label="Keep" style={{ flex: 1 }} onPress={() => setConfirm(null)} />
              <GhostButton
                label="Delete"
                icon="trash-outline"
                style={{ flex: 1 }}
                onPress={() => {
                  setConfirm(null);
                  apply((b) => deleteSketch(b, s.id));
                }}
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
              <GhostButton label="Name" icon="create-outline" style={{ flex: 1 }} onPress={() => setNaming(s)} />
              <GhostButton label="Delete" icon="trash-outline" style={{ flex: 1 }} onPress={() => setConfirm(s.id)} />
            </View>
          )}
        </View>
      ))}

      <NameSheet
        t={t}
        sketch={naming}
        onCancel={() => setNaming(null)}
        onSave={(name, place) => {
          const id = naming?.id;
          setNaming(null);
          if (id) apply((b) => renameSketch(b, id, name, place, Date.now()));
        }}
      />
    </Screen>
  );
}

function Warn({ t, text, action, onAction }: { t: Theme; text: string; action?: string; onAction?: () => void }) {
  return (
    <View
      style={{
        marginHorizontal: t.layout.screenPadding,
        marginTop: t.space.md,
        padding: t.space.lg,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.warnBorder,
        backgroundColor: t.colors.warnBg,
        gap: t.space.md,
      }}
    >
      <View style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'flex-start' }}>
        <Ionicons name="alert-circle" size={18} color={t.colors.warnText} />
        <Text style={[t.type.caption, { color: t.colors.warnText, flex: 1 }]}>{text}</Text>
      </View>
      {action && onAction ? <GhostButton label={action} onPress={onAction} /> : null}
    </View>
  );
}

export function NameSheet({
  t,
  sketch,
  onCancel,
  onSave,
}: {
  t: Theme;
  sketch: SavedSketch | null;
  onCancel: () => void;
  onSave: (name: string, place: string) => void;
}) {
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  useEffect(() => {
    if (sketch) {
      setName(sketch.name);
      setPlace(sketch.place);
    }
  }, [sketch]);

  const field = {
    height: t.layout.fieldHeight,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.bgRaised,
    color: t.colors.text,
    paddingHorizontal: t.space.lg,
    fontFamily: t.font.sansMedium,
    fontSize: 17,
    ...t.weight('600'),
  };

  return (
    <Modal visible={sketch !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ margin: t.space.xxl, padding: t.space.xxl, borderRadius: t.radius.xl, backgroundColor: t.colors.bg, gap: t.space.md }}
        >
          <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>Name this sketch</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Line number, spool mark, or what it is"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Sketch name"
            autoCorrect={false}
            style={field}
          />
          <TextInput
            value={place}
            onChangeText={setPlace}
            placeholder="Where it is, or anything worth remembering"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Sketch note"
            style={field}
          />
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
            <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
            <AccentButton label="Save" icon="checkmark" style={{ flex: 1 }} onPress={() => onSave(name.trim(), place.trim())} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
