import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AccentButton, GhostButton } from './Buttons';
import { DimensionInput, FieldRow } from './DimensionInput';
import { CheckRow, DateField, NumField } from './FormFields';
import { Chip } from './JobChips';
import {
  CalibrationRegister,
  INSTRUMENT_KINDS,
  Instrument,
  InstrumentKind,
  STATE_WORDS,
  calState,
  calibrate,
  deleteInstrument,
  kindOf,
  putInstrument,
  setOut,
} from '../state/calibration';
import { addMonths } from '../state/weldLog';
import { dayKey, usDate } from '../calc/days';

/** An instrument added or changed, and a calibration recorded against it. */
export function InstrumentSheet({
  instrument,
  register,
  onClose,
  apply,
}: {
  /** The instrument to change, 'new' to add one, or null for closed. */
  instrument: Instrument | 'new' | null;
  register: CalibrationRegister;
  onClose: () => void;
  apply: (f: (r: CalibrationRegister) => CalibrationRegister) => void;
}) {
  const t = useTheme();
  const had = instrument && instrument !== 'new' ? instrument : null;
  const today = dayKey(Date.now());
  const [tag, setTag] = useState('');
  const [kind, setKind] = useState<InstrumentKind>('gauge');
  const [name, setName] = useState('');
  const [max, setMax] = useState<number | null>(null);
  const [months, setMonths] = useState<number | null>(6);
  const [on, setOn] = useState(today);
  const [cert, setCert] = useState('');
  const [lab, setLab] = useState('');
  const [why, setWhy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!instrument) return;
    setTag(had?.tag ?? '');
    setKind(had?.kind ?? 'gauge');
    setName(had?.name ?? '');
    setMax(had?.max ?? null);
    setMonths(had?.months ?? kindOf('gauge').months);
    setOn(today);
    setCert('');
    setLab(had?.history[0]?.lab ?? '');
    setWhy(null);
    setArmed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrument]);

  const unit = kindOf(kind).unit;
  const every = months && months >= 1 ? Math.round(months) : kindOf(kind).months;
  const st = had ? calState(had, today) : null;

  /** Saved, and calibrated too when a certificate was entered. */
  const save = (recordCal: boolean) => {
    const now = Date.now();
    const out = putInstrument(register, { id: had?.id, tag, kind, name, max, months: every, note: had?.note ?? '' }, now);
    if (!out.ok) return setWhy(out.why);
    let next = out.register;
    if (recordCal) {
      if (!on) return setWhy('Give the day it was calibrated.');
      next = calibrate(next, out.id, { on, cert, lab }, now);
    }
    apply(() => next);
    onClose();
  };

  return (
    <Modal visible={instrument !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ margin: t.space.lg, maxHeight: '92%', borderRadius: t.radius.xl, backgroundColor: t.colors.bg }}>
          <ScrollView contentContainerStyle={{ paddingVertical: t.space.xl, gap: t.space.sm }} keyboardShouldPersistTaps="handled">
            <Text style={[t.type.sectionTitle, { color: t.colors.text, paddingHorizontal: t.space.xl }]}>{had ? had.tag : 'Add an instrument'}</Text>
            {st ? (
              <Text style={[t.type.captionStrong, { color: st.state === 'ok' ? t.colors.success : st.state === 'soon' ? t.colors.warnText : t.colors.danger, paddingHorizontal: t.space.xl }]}>
                {`${STATE_WORDS[st.state]}${st.due ? ` · due ${usDate(st.due)}` : ''}`}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm }}>
              {INSTRUMENT_KINDS.map((k) => (
                <Chip
                  key={k.id}
                  label={k.label}
                  on={kind === k.id}
                  onPress={() => {
                    setKind(k.id);
                    if (!had) setMonths(k.months);
                  }}
                />
              ))}
            </View>
            <FieldRow>
              <DimensionInput label="Tag or serial" value={tag} onChangeText={setTag} placeholder="PG-104" keyboardType="default" autoCapitalize="characters" />
              <NumField label="Full scale" suffix={unit} value={max} onChange={setMax} />
            </FieldRow>
            <FieldRow>
              <DimensionInput label="Make and model" value={name} onChangeText={setName} placeholder="Ashcroft 1279, 4½ in" keyboardType="default" autoCapitalize="words" />
              <NumField label="Every" suffix="months" value={months} onChange={setMonths} />
            </FieldRow>

            <Text style={[t.type.label, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>{had ? 'Calibrated again' : 'Last calibrated'}</Text>
            <FieldRow>
              <DateField label="On" value={on} onChange={setOn} />
              <DimensionInput label="Certificate no." value={cert} onChangeText={setCert} placeholder="C-22841" keyboardType="default" autoCapitalize="characters" />
            </FieldRow>
            <FieldRow>
              <DimensionInput label="Lab" value={lab} onChangeText={setLab} placeholder="Who calibrated it" keyboardType="default" autoCapitalize="words" />
            </FieldRow>
            {on ? <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>{`Due ${usDate(addMonths(on, every))}, ${every} months on.`}</Text> : null}

            {had?.history.length ? (
              <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: 2 }}>
                <Text style={[t.type.label, { color: t.colors.textMuted }]}>History</Text>
                {had.history.map((c) => (
                  <Text key={c.on} style={[t.type.caption, { color: t.colors.textMuted }]}>{`${usDate(c.on)} to ${usDate(c.due)}${c.cert ? ` · ${c.cert}` : ''}${c.lab ? ` · ${c.lab}` : ''}`}</Text>
                ))}
              </View>
            ) : null}
            {had ? <CheckRow on={had.out} text="Out of service" sub="Damaged, lost or sent away: nothing is read off it until it is calibrated again." onPress={() => apply((r) => setOut(r, had.id, !had.out, Date.now()))} /> : null}

            {why ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{why}</Text> : null}
            <View style={{ gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
              <AccentButton label={had ? `Record calibration · due ${on ? usDate(addMonths(on, every)) : '—'}` : 'Save with this calibration'} icon="checkmark-done-outline" onPress={() => save(true)} />
              <View style={{ flexDirection: 'row', gap: t.space.md }}>
                {had ? (
                  <GhostButton
                    label={armed ? 'Tap again to remove' : 'Remove'}
                    icon={armed ? 'warning-outline' : 'trash-outline'}
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (!armed) return setArmed(true);
                      apply((r) => deleteInstrument(r, had.id));
                      onClose();
                    }}
                  />
                ) : (
                  <GhostButton label="Cancel" style={{ flex: 1 }} onPress={onClose} />
                )}
                <GhostButton label={had ? 'Save details' : 'Save, not calibrated'} icon="save-outline" style={{ flex: 1 }} onPress={() => save(false)} />
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
