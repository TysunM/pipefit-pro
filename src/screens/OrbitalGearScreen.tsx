// One piece of orbital equipment
// ------------------------------
// A power supply, a weld head or a module, filled in from its own manual.
// New, it starts with the kind: each kind shows only the boxes it needs (a
// closed head its OD range, rotor and electrode constant; a track head its
// carriage; a power supply its amps and levels). The figures are the
// maker's, typed in here; the app ships none of its own.

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Segmented } from '../components/Segmented';
import { SectionHeader } from '../components/SectionHeader';
import { HintRow } from '../components/HintRow';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { CheckRow, DateField, NoteField, NumField } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { useTheme } from '../theme/ThemeProvider';
import { useOrbitalGear, useOrbitalPrograms } from '../state/orbital';
import { GEAR_FLAG, GEAR_NUM, NOTE_MAX, TEXT_MAX, familiesOf, familyOf, gearName, gearProblem, idFor, newGear, putGear, removeGear, type Gear, type GearKind } from '../state/orbitalBook';
import { VoicePressable } from '../voice/VoicePressable';

type Props = NativeStackScreenProps<RootStackParamList, 'OrbitalGear'>;

const KINDS: { value: GearKind; label: string }[] = [
  { value: 'head', label: 'Weld head' },
  { value: 'supply', label: 'Power supply' },
  { value: 'module', label: 'Module' },
];

const ICON: Record<GearKind, React.ComponentProps<typeof Ionicons>['name']> = { head: 'aperture-outline', supply: 'flash-outline', module: 'extension-puzzle-outline' };

export function OrbitalGearScreen({ navigation, route }: Props) {
  const t = useTheme();
  const c = t.colors;
  const gear = useOrbitalGear();
  const programs = useOrbitalPrograms();
  const { id } = route.params;
  const saved = gear.value.gear.find((g) => g.id === id);
  const [kind, setKind] = useState<GearKind>('head');
  const [draft, setDraft] = useState<Gear | null>(id === 'new' ? null : (saved ?? null));
  const [formFor, setFormFor] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  if (id !== 'new' && formFor !== id && saved) {
    setFormFor(id);
    setDraft(saved);
  }
  const usedBy = programs.value.programs.filter((p) => p.headId === id || p.supplyId === id);

  // New: the kind first, then which of it.
  if (!draft) {
    if (id !== 'new') {
      return (
        <Screen>
          <Text style={[t.type.body, { color: c.textMuted, padding: t.layout.screenPadding }]}>{gear.hydrated ? 'That equipment is not in the book any more.' : 'Opening…'}</Text>
        </Screen>
      );
    }
    return (
      <Screen>
        <HintRow text="What is it? Pick the kind, and the form asks only for what that kind needs." />
        <Segmented options={KINDS} selected={kind} onSelect={setKind} />
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: t.space.md }}>
          {familiesOf(kind).map((f) => (
            <VoicePressable
              key={f.id}
              voiceLabel={f.label}
              onPress={() => setDraft(newGear(f.id, Date.now()))}
              accessibilityRole="button"
              accessibilityLabel={`${f.label}. ${f.blurb}`}
              style={({ pressed }) => ({ flexDirection: 'row', gap: t.space.md, padding: t.space.lg, borderRadius: t.radius.lg, borderWidth: t.hairline, borderColor: c.border, backgroundColor: pressed ? c.bgSubtle : c.bgRaised })}
            >
              <Ionicons name={ICON[f.kind]} size={26} color={c.accent} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[t.type.bodyStrong, { color: c.text }]}>{f.label}</Text>
                <Text style={[t.type.caption, { color: c.textMuted }]}>{f.blurb}</Text>
                {f.examples ? <Text style={[t.type.caption, { color: c.textFaint, fontStyle: 'italic' }]}>{`e.g. ${f.examples}`}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
            </VoicePressable>
          ))}
        </View>
      </Screen>
    );
  }

  const g = draft;
  const f = familyOf(g.family);
  const patch = (x: Partial<Gear>) => {
    setWhy(null);
    setDraft((d) => (d ? { ...d, ...x } : d));
  };
  const save = () => {
    const problem = gearProblem(g);
    if (problem) return setWhy(problem);
    const now = Date.now();
    const kept: Gear = { ...g, id: g.id === 'new' ? idFor('gear', `${g.make} ${g.model}`, now) : g.id, make: g.make.trim(), model: g.model.trim(), serial: g.serial.trim(), note: g.note.trim(), updatedAt: now };
    const out = putGear(gear.value, kept);
    if (!out.ok) return setWhy('The equipment book is full. Delete something no longer on the job.');
    gear.apply((b) => putGear(b, kept).book);
    navigation.goBack();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'center', paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg }}>
        <Ionicons name={ICON[f.kind]} size={30} color={c.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[t.type.sectionTitle, { color: c.text }]}>{g.make || g.model ? gearName(g) : f.label}</Text>
          <Text style={[t.type.caption, { color: c.textMuted }]}>{f.blurb}</Text>
        </View>
      </View>

      <SectionHeader title="Which one" />
      <FieldRow>
        <DimensionInput label="Make" value={g.make} onChangeText={(v) => patch({ make: v.slice(0, TEXT_MAX) })} placeholder="AMI" keyboardType="default" autoCapitalize="words" />
        <DimensionInput label="Model" value={g.model} onChangeText={(v) => patch({ model: v.slice(0, TEXT_MAX) })} placeholder={f.kind === 'head' ? 'Model 9-750' : 'Model 217'} keyboardType="default" />
      </FieldRow>
      <FieldRow>
        <DimensionInput label="Serial" value={g.serial} onChangeText={(v) => patch({ serial: v.slice(0, TEXT_MAX) })} placeholder="From the plate" keyboardType="default" autoCapitalize="characters" />
      </FieldRow>

      {f.nums.length ? (
        <>
          <SectionHeader title="From its manual" />
          {Array.from({ length: Math.ceil(f.nums.length / 2) }, (_, r) => f.nums.slice(r * 2, r * 2 + 2)).map((pair) => (
            <FieldRow key={pair.join()}>
              {pair.map((k) => (
                <NumField key={k} label={GEAR_NUM[k].label} value={g[k]} onChange={(v) => patch({ [k]: v === null ? null : GEAR_NUM[k].whole ? Math.round(v) : v } as Partial<Gear>)} suffix={GEAR_NUM[k].unit} />
              ))}
            </FieldRow>
          ))}
          {f.nums.includes('constant') ? (
            <Text style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }]}>
              The electrode constant C sets the tungsten length: C − OD ÷ 2 − arc gap. Take it from the head's manual, or measure it once off a good setup: that electrode's length + OD ÷ 2 + its gap.
            </Text>
          ) : null}
        </>
      ) : null}
      {f.flags.length ? (
        <>
          <SectionHeader title="It has" />
          {f.flags.map((k) => (
            <CheckRow key={k} on={g[k]} text={GEAR_FLAG[k]} onPress={() => patch({ [k]: !g[k] } as Partial<Gear>)} />
          ))}
        </>
      ) : null}
      {f.cal ? (
        <>
          <SectionHeader title="Calibration" />
          <DateField label="Due" value={g.calDue} onChange={(day) => patch({ calDue: day })} />
          {g.calDue ? (
            <ControlRow>
              <GhostButton label="No date" icon="close" onPress={() => patch({ calDue: '' })} />
            </ControlRow>
          ) : null}
        </>
      ) : null}
      <NoteField label="Note" value={g.note} onChangeText={(v) => patch({ note: v.slice(0, NOTE_MAX) })} placeholder="Inserts on hand: 1/4, 3/8, 1/2" max={NOTE_MAX} />

      {why ? <Text style={[t.type.bodyStrong, { color: c.danger, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md }]}>{why}</Text> : null}
      <ControlRow>
        <AccentButton label={g.id === 'new' ? 'Add it' : 'Save'} icon="checkmark-outline" onPress={save} style={{ flex: 1 }} />
        <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
      </ControlRow>
      {g.id !== 'new' ? (
        <>
          {usedBy.length ? (
            <Text style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding }]}>
              {`Named on ${usedBy.length} program${usedBy.length === 1 ? '' : 's'}: ${usedBy.map((p) => p.name).join(', ')}.`}
            </Text>
          ) : null}
          <ControlRow>
            <GhostButton
              label={armed ? (usedBy.length ? 'Tap again: its programs lose it' : 'Tap again to delete it') : 'Delete it'}
              icon="trash-outline"
              style={{ flex: 1 }}
              onPress={() => {
                if (!armed) return setArmed(true);
                gear.apply((b) => removeGear(b, g.id));
                navigation.goBack();
              }}
            />
          </ControlRow>
        </>
      ) : (
        <ControlRow>
          <GhostButton label="A different kind" icon="arrow-back" onPress={() => setDraft(null)} style={{ flex: 1 }} />
        </ControlRow>
      )}
    </Screen>
  );
}

