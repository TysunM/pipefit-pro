// One equation
// ------------
// Open to anyone: the formula as typed, the answer it gives and a box for
// each name it uses, each with a sample value it is worked out on as it is
// typed. An equation is kept only once its samples give a number, so what
// is kept has been tested. A built-in can be changed like any other, and put
// back as it shipped. The reading is calc/orbitalFormula.ts: arithmetic
// only, never the phone's own code.

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { HintRow } from '../components/HintRow';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { NoteField, NumField, Banner } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { useTheme } from '../theme/ThemeProvider';
import { useOrbitalEquations } from '../state/orbital';
import { putEquation, removeEquation } from '../state/orbitalBook';
import {
  EQUATION_NAME_MAX,
  EQUATION_NOTE_MAX,
  LABEL_MAX,
  UNIT_MAX,
  builtInById,
  editedFromShipped,
  equationId,
  equationProblem,
  equationSet,
  inputsFor,
  newEquation,
  tidyEquation,
  type EqInput,
  type Equation,
} from '../calc/orbitalEquations';
import { FUNCTIONS, MAX_FORMULA, evaluate, parseFormula } from '../calc/orbitalFormula';
import { fig } from './OrbitalProgramScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'OrbitalEquation'>;

export function OrbitalEquationScreen({ navigation, route }: Props) {
  const t = useTheme();
  const c = t.colors;
  const book = useOrbitalEquations();
  const { id } = route.params;
  const all = equationSet(book.value.equations);
  const shipped = builtInById(id);
  const current = all.find((e) => e.id === id);
  const [draft, setDraft] = useState<Equation | null>(id === 'new' ? newEquation(Date.now()) : (current ?? null));
  const [formFor, setFormFor] = useState<string | null>(id === 'new' ? 'new' : null);
  const [why, setWhy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  if (id !== 'new' && formFor !== id && book.hydrated) {
    setFormFor(id);
    setDraft(current ?? null);
  }

  if (!draft) {
    return (
      <Screen>
        <Text style={[t.type.body, { color: c.textMuted, padding: t.layout.screenPadding }]}>{book.hydrated ? 'That equation is not in the book any more.' : 'Opening…'}</Text>
      </Screen>
    );
  }

  const e = draft;
  const parsed = parseFormula(e.expr);
  const inputs = inputsFor(e.expr, e.inputs);
  const result = parsed.ok ? evaluate(parsed.node, Object.fromEntries(inputs.map((i) => [i.key, i.sample]))) : null;
  const changed = !!shipped && editedFromShipped(e);
  const saved = book.value.equations.find((x) => x.id === e.id);
  const patch = (x: Partial<Equation>) => {
    setWhy(null);
    setDraft((d) => (d ? { ...d, ...x } : d));
  };
  const setInput = (key: string, x: Partial<EqInput>) => patch({ inputs: inputs.map((i) => (i.key === key ? { ...i, ...x } : i)) });

  const save = () => {
    const others = all.filter((o) => o.id !== e.id);
    const problem = equationProblem({ ...e, inputs }, others);
    if (problem) return setWhy(problem);
    const now = Date.now();
    const kept = tidyEquation({ ...e, inputs, id: e.id === 'new' ? equationId(e.name, now) : e.id, createdAt: e.id === 'new' ? now : e.createdAt }, now);
    const out = putEquation(book.value, kept);
    if (!out.ok) return setWhy('The equation book is full. Delete one the crew no longer uses.');
    book.apply((b) => putEquation(b, kept).book);
    navigation.goBack();
  };

  return (
    <Screen>
      {shipped ? (
        <Banner
          tone={changed ? 'warn' : 'info'}
          icon={changed ? 'create-outline' : 'information-circle-outline'}
          text={changed ? 'Changed from how it shipped. Every program works it out the changed way.' : 'Ships with the app. Change it if the crew works it differently: every program then uses the change, and it can be put back as shipped.'}
          action={saved ? 'Put back' : undefined}
          onAction={
            saved
              ? () => {
                  book.apply((b) => removeEquation(b, e.id));
                  setDraft(shipped);
                }
              : undefined
          }
        />
      ) : null}
      <HintRow text="Write it the way it is worked: names for the figures, + − × ÷ ^ and brackets. Give each name a sample value; the answer shows as you type, and the equation is kept only once the samples work it out." />

      <FieldRow>
        <DimensionInput label="Name" value={e.name} onChangeText={(v) => patch({ name: v.slice(0, EQUATION_NAME_MAX) })} placeholder="Tungsten length" keyboardType="default" autoCapitalize="sentences" />
      </FieldRow>
      <FieldRow>
        <DimensionInput label="Answer's name" value={e.out.key} onChangeText={(v) => patch({ out: { ...e.out, key: v.replace(/[^A-Za-z0-9_]/g, '').slice(0, 16) } })} placeholder="L" keyboardType="default" autoCapitalize="none" />
        <DimensionInput label="Its unit" value={e.out.unit} onChangeText={(v) => patch({ out: { ...e.out, unit: v.slice(0, UNIT_MAX) } })} placeholder="in" keyboardType="default" autoCapitalize="none" />
      </FieldRow>
      <FieldRow>
        <DimensionInput label="What the answer is" value={e.out.label} onChangeText={(v) => patch({ out: { ...e.out, label: v.slice(0, LABEL_MAX) } })} placeholder="Electrode length" keyboardType="default" autoCapitalize="sentences" />
      </FieldRow>
      <FieldRow>
        <DimensionInput label={`${e.out.key || 'Answer'} =`} value={e.expr} onChangeText={(v) => patch({ expr: v.slice(0, MAX_FORMULA), inputs: inputsFor(v, inputs) })} placeholder="C - OD / 2 - gap" keyboardType="default" autoCapitalize="none" />
      </FieldRow>
      <Text style={[t.type.caption, { color: parsed.ok ? c.success : e.expr.trim() ? c.danger : c.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm }]}>
        {parsed.ok ? `Reads. It needs ${parsed.vars.length ? parsed.vars.join(', ') : 'nothing'}.` : e.expr.trim() ? `${parsed.why} (at character ${parsed.at + 1})` : 'Type the formula.'}
      </Text>

      {inputs.length ? <SectionHeader title="Its figures" meta="with a sample each" /> : null}
      {inputs.map((i) => (
        <View key={i.key}>
          <Text style={[t.type.bodyStrong, { color: c.text, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.sm }]}>{i.key}</Text>
          <FieldRow>
            <DimensionInput label="What it is" value={i.label} onChangeText={(v) => setInput(i.key, { label: v.slice(0, LABEL_MAX) })} placeholder={`What ${i.key} stands for`} keyboardType="default" autoCapitalize="sentences" />
            <DimensionInput label="Unit" value={i.unit} onChangeText={(v) => setInput(i.key, { unit: v.slice(0, UNIT_MAX) })} placeholder="none" keyboardType="default" autoCapitalize="none" />
          </FieldRow>
          <FieldRow>
            <NumField label={`Sample ${i.key}`} value={i.sample} onChange={(v) => setInput(i.key, { sample: v })} suffix={i.unit} />
          </FieldRow>
        </View>
      ))}

      <View style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.md, padding: t.space.lg, borderRadius: t.radius.lg, borderWidth: t.hairline, borderColor: c.border, backgroundColor: c.bgRaised, gap: 4 }}>
        <Text style={[t.type.label, { color: c.textMuted }]}>With the samples</Text>
        <Text style={[t.type.statValue, { color: result?.ok ? c.text : c.textMuted }]}>
          {result?.ok ? `${e.out.key || 'Answer'} = ${fig(result.value)}${e.out.unit ? ` ${e.out.unit}` : ''}` : result ? result.why : '—'}
        </Text>
      </View>

      <NoteField label="Where it comes from" value={e.note} onChangeText={(v) => patch({ note: v.slice(0, EQUATION_NOTE_MAX) })} placeholder="The head's manual, page 12; or the crew's own rule" max={EQUATION_NOTE_MAX} />
      <Text style={[t.type.caption, { color: c.textFaint, paddingHorizontal: t.layout.screenPadding }]}>
        {`Functions: ${Object.keys(FUNCTIONS).join(', ')}, and pi. Angles in degrees. Names are matched whatever their case. A program offers OD, wall, gap, C, overlap, V and CFH, and each level deg, RPM, Ip, Ib, tp and tb.`}
      </Text>

      {why ? <Text style={[t.type.bodyStrong, { color: c.danger, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>{why}</Text> : null}
      <ControlRow>
        <AccentButton label="Save the equation" icon="checkmark-outline" onPress={save} style={{ flex: 1 }} />
        <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
      </ControlRow>
      {!shipped && e.id !== 'new' ? (
        <ControlRow>
          <GhostButton
            label={armed ? 'Tap again to delete it' : 'Delete this equation'}
            icon="trash-outline"
            style={{ flex: 1 }}
            onPress={() => {
              if (!armed) return setArmed(true);
              book.apply((b) => removeEquation(b, e.id));
              navigation.goBack();
            }}
          />
        </ControlRow>
      ) : null}
    </Screen>
  );
}
