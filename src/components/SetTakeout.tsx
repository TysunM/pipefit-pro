// Setting a library fitting's takeout, where it is needed
// --------------------------------------------------------
// PVC socket and no-hub fittings take out the maker's figure, kept in the
// fitting library for the line and size. Wherever a cut waits on one (Cut
// Length, the offsets) this panel sets it there and then: photographed off
// the box or the maker's sheet, typed, or for a socket measured off the
// fitting. Saved on the phone and used every time after.

import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { LIBRARY_FITTINGS } from '../calc/takeoffCatalog';
import { sizeLabel } from '../calc/materials';
import { FittingSheetReader } from './FittingSheetReader';
import { VoicePressable } from '../voice/VoicePressable';
import { useVoiceTargets } from '../voice/useVoiceTargets';
import { AccentButton, GhostButton } from './Buttons';
import { DimensionInput, FieldRow } from './DimensionInput';

/**
 * Setting a socket or no-hub fitting's takeout, once, for the line and size on
 * screen. A socket fitting can be measured: centre to the face, less the
 * socket depth. Saved on the phone and used every time after.
 */
export function SetTakeout({
  fitting,
  nps,
  lineName,
  line,
  wall,
  sizes,
  value,
  onSave,
  onClear,
}: {
  fitting: string;
  nps: number;
  lineName: string;
  line: string;
  wall: string;
  sizes: readonly number[];
  value: number | undefined;
  onSave: (inches: number) => void;
  onClear: () => void;
}) {
  const t = useTheme();
  const u = useUnits();
  const f = LIBRARY_FITTINGS.find((x) => x.id === fitting)!;
  const [editing, setEditing] = useState(false);
  const [reading, setReading] = useState(false);
  // Opened by voice, the camera keeps the mic open for "take it", "save", "cancel".
  const [byVoice, setByVoice] = useState(false);
  // "Read the box" with this on screen opens the camera here, not on the library page.
  const READ = ['Read the box', 'Read this box', 'Scan the box', 'Read the label', 'Scan the label', 'Photograph the box'];
  useVoiceTargets(
    READ.map((label) => ({
      kind: 'press' as const,
      label,
      run: () => {
        setByVoice(true);
        setReading(true);
        return 'Camera up.';
      },
    })),
  );
  const navigation = useNavigation();
  const [takeout, setTake] = useState('');
  const [face, setFace] = useState('');
  const [depth, setDepth] = useState('');
  const socket = f.family === 'socket' && f.id !== 'sockStreet90';
  const fromFace = u.parse(face) - u.parse(depth);
  const typed = u.parse(takeout);
  const next = Number.isFinite(typed) ? typed : Number.isFinite(fromFace) && fromFace > 0 ? fromFace : NaN;
  const title = `${sizeLabel(nps)} ${lineName} ${f.label}`;
  // 1 1/8" in inches; the decimal with its unit otherwise.
  const len = (v: number) => u.frac(v) || u.full(v);

  // Ahead of both views, so it stays put when saving from it folds the panel away.
  const reader = (
    <FittingSheetReader
      visible={reading}
      onClose={() => {
        setReading(false);
        setByVoice(false);
        setEditing(false);
      }}
      listen={byVoice}
      family={f.family}
      line={line}
      lineName={lineName}
      wall={wall}
      sizes={sizes}
    />
  );

  if (value !== undefined && !editing) {
    return (
      <>
        {reader}
        <View style={{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.md, flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>
            {`${title}: takeout ${len(value)}, from your fitting library.`}
          </Text>
          <VoicePressable onPress={() => setEditing(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Change the ${title} takeout`}>
            <Text style={[t.type.captionStrong, { color: t.colors.data }]}>Change</Text>
          </VoicePressable>
        </View>
      </>
    );
  }

  return (
    <>
      {reader}
      <View
        style={{
          marginHorizontal: t.layout.screenPadding,
          marginBottom: t.space.lg,
          padding: t.space.md,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.warnText,
          gap: t.space.sm,
        }}
      >
        <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`Set the ${title} takeout`}</Text>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
          {`Makers differ, so this is set once for this size and kept: ${f.how}. From the maker’s sheet or the box, or measured off the fitting.`}
        </Text>
        <GhostButton label="Photograph the box or sheet" icon="camera-outline" onPress={() => setReading(true)} />
        <Pressable onPress={() => navigation.navigate('FittingLibrary', { line })} accessibilityRole="link" hitSlop={8}>
        <Text style={[t.type.captionStrong, { color: t.colors.data }]}>{`Every saved ${lineName} takeout, and a table at a time →`}</Text>
      </Pressable>
      <Text style={[t.type.caption, { color: t.colors.textMuted }]}>Or type it:</Text>
        <FieldRow>
          <DimensionInput label="Takeout" value={takeout} onChangeText={setTake} suffix={u.suffix} placeholder="0" readout={u.frac(typed)} />
        </FieldRow>
        {socket ? (
          <>
            <Text style={[t.type.caption, { color: t.colors.textMuted }]}>Or measure it: centre to the face of the socket, and how deep the socket is.</Text>
            <FieldRow>
              <DimensionInput label="Centre to face" value={face} onChangeText={setFace} suffix={u.suffix} placeholder="0" />
              <DimensionInput
                label="Socket depth"
                value={depth}
                onChangeText={setDepth}
                suffix={u.suffix}
                placeholder="0"
                readout={Number.isFinite(fromFace) && fromFace > 0 ? `Takeout ${len(fromFace)}` : undefined}
              />
            </FieldRow>
          </>
        ) : null}
        <View style={{ flexDirection: 'row', gap: t.space.md }}>
          <View style={{ flex: 1 }}>
            <AccentButton
              label={Number.isFinite(next) ? `Save ${len(next)}` : 'Save'}
              icon="bookmark-outline"
              onPress={() => {
                if (!Number.isFinite(next) || next < 0) return;
                onSave(next);
                setEditing(false);
                setTake('');
                setFace('');
                setDepth('');
              }}
            />
          </View>
          {value !== undefined ? (
            <View style={{ flex: 1 }}>
              <GhostButton
                label="Remove"
                icon="trash-outline"
                onPress={() => {
                  onClear();
                  setEditing(false);
                }}
              />
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}
