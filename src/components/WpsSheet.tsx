import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { DimensionInput, FieldRow } from './DimensionInput';
import { NoteField, NumField } from './FormFields';
import { ChipRow } from './ChipRow';
import { SectionHeader } from './SectionHeader';
import { AccentButton, ControlRow, GhostButton } from './Buttons';
import { processOf } from '../calc/heatInput';
import {
  BASES,
  PARAMS,
  PARAM_LABEL,
  WPS_NAME_MAX,
  WPS_NOTE_MAX,
  WPS_PROCESSES,
  fromUnits,
  inUnits,
  processShort,
  unitOf,
  wpsProblem,
  type Basis,
  type Param,
  type Units,
  type Wps,
} from '../state/wpsBook';

// One WPS's window, as a form: the number, the process and how it takes heat
// input, then a minimum and a maximum for each figure it limits, in the
// reader's units. A blank box is no limit. The figures are the WPS's; the
// form never suggests one.

export function WpsSheet({
  wps,
  units,
  onClose,
  onSave,
  onDelete,
}: {
  /** The WPS being edited, or null when the sheet is closed. */
  wps: Wps | null;
  units: Units;
  onClose: () => void;
  onSave: (wps: Wps) => void;
  /** Offered on a WPS already saved. */
  onDelete?: (id: string) => void;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState<Wps | null>(null);
  const [formFor, setFormFor] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const key = wps ? `${wps.id}:${wps.updatedAt}` : null;
  if (key !== null && formFor !== key) {
    setFormFor(key);
    setDraft(wps);
    setWhy(null);
    setArmed(false);
  }
  if (key === null && formFor !== null) setFormFor(null);
  const d = draft ?? wps;
  const patch = (p: Partial<Wps>) => setDraft((prev) => ({ ...(prev ?? (wps as Wps)), ...p }));
  const limit = (p: Param, side: 'min' | 'max', v: number | null) =>
    setDraft((prev) => {
      const base = prev ?? (wps as Wps);
      return { ...base, [p]: { ...base[p], [side]: v === null ? null : fromUnits(p, v, units) } };
    });
  const shown = (p: Param, v: number | null) => (v === null ? null : Number(inUnits(p, v, units).toPrecision(9)));

  const save = () => {
    if (!d) return;
    const problem = wpsProblem(d);
    if (problem) return setWhy(problem);
    onSave({ ...d, name: d.name.trim(), note: d.note.trim(), updatedAt: Date.now() });
    onClose();
  };

  const cap = (text: string) => <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>{text}</Text>;

  return (
    <Modal visible={wps !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ margin: t.space.lg, maxHeight: '92%', borderRadius: t.radius.xl, backgroundColor: t.colors.bg }}>
          {d ? (
            <ScrollView contentContainerStyle={{ paddingVertical: t.space.xl }} keyboardShouldPersistTaps="handled">
              <Text style={[t.type.sectionTitle, { color: t.colors.text, paddingHorizontal: t.space.xl }]}>{d.name.trim() ? d.name : 'A WPS'}</Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.space.xl, marginBottom: t.space.lg }]}>
                The window the WPS sets for a pass, off its parameter table. Where it gives a different window per pass or process, enter each as its own: WPS-101 GTAW root, WPS-101 SMAW fill.
              </Text>

              <FieldRow>
                <DimensionInput label="WPS" value={d.name} onChangeText={(v) => patch({ name: v.slice(0, WPS_NAME_MAX) })} placeholder="WPS-101 GTAW root" keyboardType="default" autoCapitalize="characters" />
              </FieldRow>
              <ChipRow label="Process" options={WPS_PROCESSES.map((p) => ({ value: p.id, label: processShort(p.id) }))} selected={d.process} onSelect={(process) => patch({ process })} />
              <ChipRow label="Heat input as" options={BASES.map((b) => ({ value: b.id, label: b.label }))} selected={d.basis} onSelect={(basis) => patch({ basis: basis as Basis })} />
              {cap(
                d.basis === 'asme'
                  ? 'Volts × amps × time ÷ length, no efficiency: how ASME IX QW-409.1 and AWS D1.1 take it. The check uses this whatever the Process chip on the heat input screen says.'
                  : `The arc energy × k = ${processOf(d.process).k} for ${processShort(d.process)}, ISO/TR 17671-1: how EN ISO 15614-1 takes it.`,
              )}

              <SectionHeader title="Limits" meta="blank is no limit" />
              {PARAMS.map((p) => (
                <FieldRow key={p}>
                  <NumField label={`${PARAM_LABEL[p]} min`} value={shown(p, d[p].min)} onChange={(v) => limit(p, 'min', v)} suffix={unitOf(p, units)} />
                  <NumField label={`${PARAM_LABEL[p]} max`} value={shown(p, d[p].max)} onChange={(v) => limit(p, 'max', v)} suffix={unitOf(p, units)} />
                </FieldRow>
              ))}
              {cap(`Travel speed and heat input go in in the units set in Settings → Welding (${units.speed}, ${units.heat}), and change with them.`)}

              <NoteField label="Note" value={d.note} onChangeText={(v) => patch({ note: v.slice(0, WPS_NOTE_MAX) })} placeholder="Impact tested: max heat input applies. Stringer beads only." max={WPS_NOTE_MAX} />

              {why ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.md }]}>{why}</Text> : null}
              <ControlRow>
                <AccentButton label="Save the WPS" icon="checkmark-outline" onPress={save} style={{ flex: 1 }} />
                <GhostButton label="Cancel" onPress={onClose} />
              </ControlRow>
              {onDelete && wps && wps.id !== 'new' ? (
                <ControlRow>
                  <GhostButton
                    label={armed ? 'Tap again to delete it' : 'Delete this WPS'}
                    icon="trash-outline"
                    onPress={() => {
                      if (!armed) return setArmed(true);
                      onDelete(wps.id);
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
