// The fitting library, laid out
// -----------------------------
// Every socket and no-hub takeout saved on the phone, by job line: looked
// over, put right, added to a whole table at a time, photographed in from the
// maker's sheet, or sent to the foreman as text. Cut Length reads the same
// figures (state/fittingLibrary.ts), so a figure changed here is the figure
// the next cut is worked from.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { ChipRow } from '../components/ChipRow';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { FittingSheetReader } from '../components/FittingSheetReader';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { useSettings } from '../state/settings';
import { useFittings } from '../state/fittings';
import { SavedTakeout, clearLine, clearTakeout, entriesFor, libraryText, linesIn, lookup, setTakeout } from '../state/fittingLibrary';
import { LIBRARY_FAMILY, LIBRARY_FITTINGS } from '../calc/takeoffCatalog';
import { material, sizeLabel, sizesFor, wallLabel } from '../calc/materials';

type Props = NativeStackScreenProps<RootStackParamList, 'FittingLibrary'>;

const ORDER = LIBRARY_FITTINGS.map((f) => f.id);
const fittingName = (id: string) => LIBRARY_FITTINGS.find((f) => f.id === id)?.label ?? id;
const materialOf = (line: string) => line.split(':')[0] ?? '';
const wallOf = (line: string) => line.split(':')[1] ?? '';
export const lineTitle = (line: string) => `${material(materialOf(line)).short} ${wallLabel(wallOf(line))}`;

export function FittingLibraryScreen({ route }: Props) {
  const t = useTheme();
  const u = useUnits();
  const { settings } = useSettings();
  const { library, apply } = useFittings();
  const len = (v: number) => u.frac(v) || u.full(v);

  // The job's own line comes first when it is one the library holds.
  const jobLine = `${settings.material}:${settings.wall}`;
  const lines = useMemo(() => {
    const saved = linesIn(library);
    const all = saved.map((x) => x.line);
    if (LIBRARY_FAMILY[settings.material] && !all.includes(jobLine)) all.unshift(jobLine);
    return { all, count: (l: string) => saved.find((x) => x.line === l)?.count ?? 0 };
  }, [library, jobLine, settings.material]);
  const [picked, setPicked] = useState<string | null>(route.params?.line ?? null);
  const line = picked && lines.all.includes(picked) ? picked : (lines.all[0] ?? null);

  const [reading, setReading] = useState(false);
  // "Read this box": opened on the job's line with the camera up and the mic listening.
  const [byVoice, setByVoice] = useState(false);
  const readAt = route.params?.read;
  useEffect(() => {
    if (!readAt) return;
    if (route.params?.line) setPicked(route.params.line);
    setByVoice(true);
    setReading(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readAt]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [clearArmed, setClearArmed] = useState(false);
  const [addFitting, setAddFitting] = useState<string | null>(null);
  const [addSize, setAddSize] = useState<number | null>(null);
  const [addText, setAddText] = useState('');

  if (!line) {
    return (
      <Screen>
        <HintRow text="Socket and no-hub takeouts are the maker’s, so they are saved here once, by line and size, and Cut Length works from them." />
        <Text style={[t.type.body, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>
          Nothing saved yet. Set the job’s pipe to PVC, CPVC or cast iron soil in Settings, then add figures here or from Cut Length.
        </Text>
      </Screen>
    );
  }

  const family = LIBRARY_FAMILY[materialOf(line)];
  const title = lineTitle(line);
  const rows = entriesFor(library, line, ORDER);
  const sizes = sizesFor(material(materialOf(line)));
  const familyFittings = LIBRARY_FITTINGS.filter((f) => f.family === family);
  const byFitting = rows.reduce<Record<string, SavedTakeout[]>>((acc, r) => ({ ...acc, [r.fitting]: [...(acc[r.fitting] ?? []), r] }), {});
  const addValue = u.parse(addText);
  const addExisting = addFitting && addSize !== null ? lookup(library, line, addFitting, addSize) : undefined;
  const addOk = !!addFitting && addSize !== null && Number.isFinite(addValue) && addValue > 0 && addValue < 100;

  const share = () => {
    const text = libraryText(rows, { title, fittingName, size: sizeLabel, length: len });
    void Share.share({ message: text, title: `${title} takeouts` }).catch(() => undefined);
  };

  return (
    <Screen>
      <HintRow text="Your socket and no-hub takeouts, by line. Cut Length works from these; a figure put right here is the one the next cut uses." />

      <ChipRow
        label="Line"
        options={lines.all.map((l) => ({ value: l, label: `${lineTitle(l)}${lines.count(l) ? ` · ${lines.count(l)}` : ''}${l === jobLine ? ' (job)' : ''}` }))}
        selected={line}
        onSelect={(l) => {
          setPicked(l);
          setEditing(null);
          setClearArmed(false);
          setAddFitting(null);
          setAddSize(null);
        }}
      />

      <ControlRow>
        {family ? (
          <AccentButton label="Photograph a sheet" icon="camera-outline" onPress={() => setReading(true)} style={{ flex: 1 }} />
        ) : null}
        {rows.length ? <GhostButton label="Send" icon="share-outline" onPress={share} style={{ flex: family ? undefined : 1 }} /> : null}
      </ControlRow>

      {!rows.length ? (
        <Text style={[t.type.body, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>
          {`Nothing saved for ${title} yet. Photograph the maker’s sheet, or add the figures below.`}
        </Text>
      ) : null}

      {ORDER.filter((id) => byFitting[id]).map((id) => (
        <View key={id}>
          <SectionHeader title={fittingName(id)} meta={`${byFitting[id]!.length} size${byFitting[id]!.length === 1 ? '' : 's'}`} />
          {byFitting[id]!.map((r) => {
            const key = `${r.fitting}|${r.nps}`;
            const open = editing === key;
            const next = u.parse(editText);
            return (
              <View key={key} style={{ borderTopWidth: t.hairline, borderTopColor: t.colors.border, marginHorizontal: t.layout.screenPadding }}>
                <Pressable
                  onPress={() => {
                    setEditing(open ? null : key);
                    setEditText('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${sizeLabel(r.nps)} ${fittingName(r.fitting)}, takeout ${len(r.takeout)}. Change it`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: 52,
                    gap: t.space.md,
                    backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
                  })}
                >
                  <Text style={[t.type.bodyStrong, { color: t.colors.text, width: 72 }]}>{sizeLabel(r.nps)}</Text>
                  <Text style={[t.type.caption, { color: t.colors.textFaint, flex: 1 }]}>{`set ${new Date(r.setAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}</Text>
                  <Text style={[t.type.bodyStrong, { color: t.colors.data }]}>{len(r.takeout)}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'create-outline'} size={18} color={t.colors.textMuted} />
                </Pressable>
                {open ? (
                  <View style={{ paddingBottom: t.space.md, gap: t.space.sm }}>
                    <FieldRow>
                      <DimensionInput label="New takeout" value={editText} onChangeText={setEditText} suffix={u.suffix} placeholder={u.num(r.takeout)} readout={u.frac(next)} />
                    </FieldRow>
                    <ControlRow>
                      <AccentButton
                        label={Number.isFinite(next) && next > 0 ? `Save ${len(next)}` : 'Save'}
                        icon="bookmark-outline"
                        style={{ flex: 1 }}
                        onPress={() => {
                          if (!Number.isFinite(next) || next <= 0 || next >= 100) return;
                          apply((l) => setTakeout(l, line, r.fitting, r.nps, next, Date.now()));
                          setEditing(null);
                        }}
                      />
                      <GhostButton
                        label="Remove"
                        icon="trash-outline"
                        style={{ flex: 1 }}
                        onPress={() => {
                          apply((l) => clearTakeout(l, line, r.fitting, r.nps));
                          setEditing(null);
                        }}
                      />
                    </ControlRow>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      {family ? (
        <>
          <SectionHeader title="Add a figure" meta={title} />
          <ChipRow label="Fitting" options={familyFittings.map((f) => ({ value: f.id, label: f.label }))} selected={addFitting} onSelect={setAddFitting} />
          <ChipRow label="Size" options={sizes.map((n) => ({ value: n, label: sizeLabel(n) }))} selected={addSize} onSelect={setAddSize} />
          {addFitting ? (
            <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.sm }]}>
              {`Takeout is ${familyFittings.find((f) => f.id === addFitting)?.how}.${addExisting !== undefined ? ` Saved now: ${len(addExisting)} — this replaces it.` : ''}`}
            </Text>
          ) : null}
          <FieldRow>
            <DimensionInput label="Takeout" value={addText} onChangeText={setAddText} suffix={u.suffix} placeholder="0" readout={u.frac(addValue)} />
          </FieldRow>
          <ControlRow>
            <AccentButton
              label={addOk ? `Save ${sizeLabel(addSize!)} ${fittingName(addFitting!)} · ${len(addValue)}` : 'Pick fitting and size, then type it'}
              icon="add-circle-outline"
              style={{ flex: 1 }}
              onPress={() => {
                if (!addOk) return;
                apply((l) => setTakeout(l, line, addFitting!, addSize!, addValue, Date.now()));
                setAddText('');
                // The next size up, ready for the next line of the maker's table.
                const i = sizes.indexOf(addSize!);
                if (i >= 0 && i < sizes.length - 1) setAddSize(sizes[i + 1]!);
              }}
            />
          </ControlRow>
        </>
      ) : null}

      {rows.length ? (
        <View style={{ paddingTop: t.space.xl }}>
          <ControlRow>
            <GhostButton
              label={clearArmed ? `Tap again to clear all ${rows.length} for ${title}` : `Clear ${title}`}
              icon={clearArmed ? 'warning-outline' : 'trash-outline'}
              style={{ flex: 1 }}
              onPress={() => {
                if (!clearArmed) return setClearArmed(true);
                apply((l) => clearLine(l, line));
                setClearArmed(false);
              }}
            />
          </ControlRow>
        </View>
      ) : null}

      {family ? (
        <FittingSheetReader
          visible={reading}
          onClose={() => {
            setReading(false);
            setByVoice(false);
          }}
          family={family}
          line={line}
          lineName={title}
          wall={wallOf(line)}
          sizes={sizes}
          listen={byVoice}
        />
      ) : null}
    </Screen>
  );
}
