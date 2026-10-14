import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { DimensionInput, FieldRow } from './DimensionInput';
import { NoteField, NumField } from './FormFields';
import { ChipRow } from './ChipRow';
import { SectionHeader } from './SectionHeader';
import { AccentButton, ControlRow, GhostButton } from './Buttons';
import { GASKETS, METHODS, type Gasket, type MethodId } from '../calc/boltUpSequence';
import { isCastIron, type JointClass } from '../state/register';
import {
  CLASSES,
  LUBE_MAX,
  LUBRICANTS,
  NAME_MAX,
  NOTE_MAX,
  STUD_GRADES,
  STUD_MAX,
  gasketLabel,
  methodLabel,
  specProblem,
  type BoltingSpec,
  type ClassRule,
} from '../state/boltingSpec';

// The company's bolting spec, as a form.
//
// One sheet, everything the spec says, in the order a bolting engineer writes
// it: what the document is, what the studs are and what they are pulled to,
// what is on the threads, what is between the flanges, how the flange is
// worked, and the dwell before the retightening round. Then any class that is
// bolted differently. A chip fills a figure in; the figure is always the one
// that counts, and the box takes whatever the spec actually says.

const classLabel = (c: JointClass) => (isCastIron(c) ? `Class ${c} cast iron` : `Class ${c}`);
const AS_SPEC = 'spec';

export function BoltingSpecSheet({
  spec,
  onClose,
  onSave,
  onDelete,
}: {
  /** The spec being edited, or null when the sheet is closed. */
  spec: BoltingSpec | null;
  onClose: () => void;
  onSave: (spec: BoltingSpec) => void;
  /** Offered on a spec already saved. */
  onDelete?: (id: string) => void;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState<BoltingSpec | null>(null);
  const [formFor, setFormFor] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [open, setOpen] = useState<JointClass | null>(null);
  const [armed, setArmed] = useState(false);
  const key = spec ? spec.id : null;
  if (key !== null && formFor !== key) {
    setFormFor(key);
    setDraft(spec);
    setWhy(null);
    setOpen(null);
    setArmed(false);
  }
  if (key === null && formFor !== null) setFormFor(null);
  const d = draft ?? spec;
  const patch = (p: Partial<BoltingSpec>) => setDraft((prev) => ({ ...(prev ?? (spec as BoltingSpec)), ...p }));
  const rule = (cls: JointClass, p: Partial<ClassRule> | null) =>
    setDraft((prev) => {
      const base = prev ?? (spec as BoltingSpec);
      const byClass = { ...base.byClass };
      const next: ClassRule = { ...(byClass[cls] ?? {}), ...(p ?? {}) };
      for (const k of Object.keys(next) as (keyof ClassRule)[]) if (next[k] === undefined) delete next[k];
      if (p === null || !Object.keys(next).length) delete byClass[cls];
      else byClass[cls] = next;
      return { ...base, byClass };
    });

  const save = () => {
    if (!d) return;
    const problem = specProblem(d);
    if (problem) return setWhy(problem);
    onSave({ ...d, name: d.name.trim(), stud: d.stud.trim(), lubricant: d.lubricant.trim(), note: d.note.trim(), updatedAt: Date.now() });
    onClose();
  };

  const grade = STUD_GRADES.find((g) => g.stud === d?.stud);
  const lube = LUBRICANTS.find((l) => l.lubricant === d?.lubricant && l.k === d?.nutFactor);
  const cap = (text: string) => <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>{text}</Text>;

  return (
    <Modal visible={spec !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ margin: t.space.lg, maxHeight: '92%', borderRadius: t.radius.xl, backgroundColor: t.colors.bg }}>
          {d ? (
            <ScrollView contentContainerStyle={{ paddingVertical: t.space.xl }} keyboardShouldPersistTaps="handled">
              <Text style={[t.type.sectionTitle, { color: t.colors.text, paddingHorizontal: t.space.xl }]}>{d.name.trim() ? d.name : 'The bolting spec'}</Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.space.xl, marginBottom: t.space.lg }]}>
                What the job's bolted-joint specification says, entered once. Every joint takes its stud, stress, lubricant, gasket and method from here, works out its own
                torque by the PCC-1 Appendix K formula, and keeps a copy of these figures on its record.
              </Text>

              <FieldRow>
                <DimensionInput label="Spec" value={d.name} onChangeText={(v) => patch({ name: v.slice(0, NAME_MAX) })} placeholder="BJ-01 Rev C" keyboardType="default" autoCapitalize="characters" />
              </FieldRow>

              <SectionHeader title="Studs" meta="grade · target stress" />
              <ChipRow label="Grade" options={STUD_GRADES.map((g) => ({ value: g.stud, label: g.label }))} selected={grade?.stud ?? null} onSelect={(stud) => patch({ stud })} />
              <FieldRow>
                <DimensionInput label="Stud grade" value={d.stud} onChangeText={(v) => patch({ stud: v.slice(0, STUD_MAX) })} placeholder="ASTM A193 B7" keyboardType="default" autoCapitalize="characters" />
                <NumField label="Target stress" value={d.stressKsi} onChange={(v) => patch({ stressKsi: v ?? 0 })} suffix="ksi" placeholder="50" />
              </FieldRow>
              {cap(grade?.words ?? 'The stress on the root area the studs are pulled to. 50 ksi is the usual owner figure for B7; stainless and cast iron run lower.')}

              <SectionHeader title="Lubricant" meta="nut factor K" />
              <ChipRow label="Threads" options={LUBRICANTS.map((l) => ({ value: l.id, label: l.label }))} selected={lube?.id ?? null} onSelect={(id) => {
                const l = LUBRICANTS.find((x) => x.id === id);
                if (l) patch({ lubricant: l.lubricant, nutFactor: l.k });
              }} />
              <FieldRow>
                <DimensionInput label="Lubricant" value={d.lubricant} onChangeText={(v) => patch({ lubricant: v.slice(0, LUBE_MAX) })} placeholder="Moly-based anti-seize" keyboardType="default" autoCapitalize="sentences" />
                <NumField label="Nut factor K" value={d.nutFactor} onChange={(v) => patch({ nutFactor: v ?? 0 })} placeholder="0.16" />
              </FieldRow>
              {cap('K is the tested figure for the lubricant on the job, from its maker; the chips give PCC-1 Appendix J typical values. Torque goes up with K, so a higher K than the real one under-loads the studs and a lower one over-loads them.')}

              <SectionHeader title="Every joint" meta="unless its class says otherwise" />
              <ChipRow label="Gasket" options={GASKETS.map((g) => ({ value: g.id, label: g.label }))} selected={d.gasket} onSelect={(gasket) => patch({ gasket })} />
              <ChipRow label="Method" options={METHODS.map((m) => ({ value: m.id, label: m.short }))} selected={d.method} onSelect={(method) => patch({ method })} />
              {cap(`${METHODS.find((m) => m.id === d.method)?.name ?? ''}. A flange that cannot take it (too few bolts, the wrong gasket) is bolted by the Legacy pattern instead, and the screen says so.`)}
              <FieldRow>
                <NumField label="Retighten after" value={d.retightenHours} onChange={(v) => patch({ retightenHours: v ?? 0 })} suffix="h" placeholder="4" />
              </FieldRow>
              {cap('The dwell before the retightening round at 100%. PCC-1 asks for at least four hours; 0 where the spec asks for none.')}

              <SectionHeader title="By class" meta="where a class differs" />
              {CLASSES.map((cls) => {
                const r = d.byClass[cls];
                const summary = r
                  ? [r.method ? methodLabel(r.method) : null, r.gasket ? gasketLabel(r.gasket) : null, r.stressKsi ? `${r.stressKsi} ksi` : null].filter(Boolean).join(' · ')
                  : 'As the spec';
                const on = open === cls;
                return (
                  <View key={cls}>
                    <Pressable
                      onPress={() => setOpen(on ? null : cls)}
                      accessibilityRole="button"
                      accessibilityLabel={`${classLabel(cls)}: ${summary}`}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.md, backgroundColor: pressed || on ? t.colors.bgSubtle : 'transparent' })}
                    >
                      <Text style={[t.type.body, { color: t.colors.text, width: 150 }]}>{classLabel(cls)}</Text>
                      <Text style={[t.type.caption, { color: r ? t.colors.data : t.colors.textMuted, flex: 1 }]}>{summary}</Text>
                    </Pressable>
                    {on ? (
                      <View style={{ paddingTop: t.space.md, backgroundColor: t.colors.bgSubtle, paddingBottom: t.space.sm }}>
                        <ChipRow label="Method" options={[{ value: AS_SPEC, label: 'As spec' }, ...METHODS.map((m) => ({ value: m.id as string, label: m.short }))]} selected={r?.method ?? AS_SPEC} onSelect={(v) => rule(cls, { method: v === AS_SPEC ? undefined : (v as MethodId) })} />
                        <ChipRow label="Gasket" options={[{ value: AS_SPEC, label: 'As spec' }, ...GASKETS.map((g) => ({ value: g.id as string, label: g.label }))]} selected={r?.gasket ?? AS_SPEC} onSelect={(v) => rule(cls, { gasket: v === AS_SPEC ? undefined : (v as Gasket) })} />
                        <FieldRow>
                          <NumField label="Target stress" value={r?.stressKsi ?? null} onChange={(v) => rule(cls, { stressKsi: v === null ? undefined : v })} suffix="ksi" placeholder={`${d.stressKsi} as spec`} />
                        </FieldRow>
                        {r ? (
                          <ControlRow>
                            <GhostButton label="Back to the spec's figures" icon="refresh-outline" onPress={() => rule(cls, null)} style={{ flex: 1 }} />
                          </ControlRow>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}

              <SectionHeader title="Anything else" />
              <NoteField label="Note" value={d.note} onChangeText={(v) => patch({ note: v.slice(0, NOTE_MAX) })} placeholder="Hydraulic torque above 1-1/8 in. studs. No retightening on ring joints." max={NOTE_MAX} />

              {why ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.md }]}>{why}</Text> : null}
              <ControlRow>
                <AccentButton label="Save the spec" icon="checkmark-outline" onPress={save} style={{ flex: 1 }} />
                <GhostButton label="Cancel" onPress={onClose} />
              </ControlRow>
              {onDelete && spec && spec.name ? (
                <ControlRow>
                  <GhostButton
                    label={armed ? 'Tap again to delete it' : 'Delete this spec'}
                    icon="trash-outline"
                    onPress={() => {
                      if (!armed) return setArmed(true);
                      onDelete(spec.id);
                      onClose();
                    }}
                    style={{ flex: 1 }}
                  />
                </ControlRow>
              ) : null}
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
