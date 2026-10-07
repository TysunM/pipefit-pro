// The calibration register
// ------------------------
// Every instrument on the job, worst first: overdue, never calibrated, due
// soon, then good, then out of service. Tap one to change it or to record a
// new calibration. The reasoning is in state/calibration.ts.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { Banner } from '../components/FormFields';
import { Chip } from '../components/JobChips';
import { InstrumentSheet } from '../components/InstrumentSheet';
import { useTheme } from '../theme/ThemeProvider';
import { useInstruments } from '../state/instruments';
import { CalState, INSTRUMENT_KINDS, Instrument, InstrumentKind, STATE_WORDS, byUrgency, calState, kindOf } from '../state/calibration';
import { dayKey, usDate } from '../calc/days';
import { shareSheet } from '../print/share';
import { calibrationHtml } from '../print/calibration';

type Props = NativeStackScreenProps<RootStackParamList, 'Calibration'>;

const SECTIONS: { state: CalState; title: string }[] = [
  { state: 'overdue', title: 'Overdue' },
  { state: 'never', title: 'Never calibrated' },
  { state: 'soon', title: 'Due soon' },
  { state: 'ok', title: 'In calibration' },
  { state: 'out', title: 'Out of service' },
];

export function CalibrationScreen(_: Props) {
  const t = useTheme();
  const { register, apply, saveError, takeOver } = useInstruments();
  const today = dayKey(Date.now());
  const [kind, setKind] = useState<InstrumentKind | null>(null);
  const [open, setOpen] = useState<Instrument | 'new' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const shown = byUrgency(register.instruments.filter((i) => !kind || i.kind === kind), today);
  const kinds = INSTRUMENT_KINDS.filter((k) => register.instruments.some((i) => i.kind === k.id));
  const count = (s: CalState) => register.instruments.filter((i) => calState(i, today).state === s).length;
  const ink = (s: CalState) => (s === 'ok' ? t.colors.success : s === 'soon' ? t.colors.warnText : s === 'out' ? t.colors.textFaint : t.colors.danger);

  const print = async () => {
    setNote(null);
    const out = await shareSheet(calibrationHtml({ title: 'Calibration register', instruments: register.instruments, today }), 'Calibration register');
    if (!out.ok) setNote(out.why);
  };

  return (
    <Screen>
      {register.foreign ? (
        <Banner tone="danger" icon="alert-circle" text="This phone's calibration register was written by a newer version of the app, so nothing is being saved. Update the app, or start a new register and lose what it held." action="Start new" onAction={takeOver} />
      ) : null}
      {saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last change could not be saved to this phone. What is on screen is ahead of what is stored." /> : null}
      {count('overdue') ? <Banner tone="danger" icon="alert-circle" text={`${count('overdue')} overdue. Take ${count('overdue') === 1 ? 'it' : 'them'} out of use until calibrated: a test read off an overdue gauge does not stand.`} /> : null}

      <HintRow text="Every gauge, wrench and instrument a record is read off, with the calibration in force. Pressure tests and bolt-ups pick from here, and the phone alerts a month before anything is due." />
      <Text style={[t.type.bodyStrong, { color: t.colors.text, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md }]}>
        {register.instruments.length
          ? [count('overdue') && `${count('overdue')} overdue`, count('never') && `${count('never')} never calibrated`, count('soon') && `${count('soon')} due soon`, `${count('ok')} in calibration`].filter(Boolean).join(' · ')
          : 'Nothing on the register yet.'}
      </Text>
      <ControlRow>
        <AccentButton label="Add an instrument" icon="add" style={{ flex: 1 }} onPress={() => setOpen('new')} />
        {register.instruments.length ? <GhostButton label="Print / PDF" icon="print-outline" onPress={() => void print()} /> : null}
      </ControlRow>
      {note ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}
      {kinds.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
          <Chip label="Everything" on={kind === null} onPress={() => setKind(null)} />
          {kinds.map((k) => (
            <Chip key={k.id} label={k.label} on={kind === k.id} onPress={() => setKind(k.id)} />
          ))}
        </View>
      ) : null}

      {SECTIONS.map(({ state, title }) => {
        const xs = shown.filter((i) => calState(i, today).state === state);
        if (!xs.length) return null;
        return (
          <View key={state}>
            <SectionHeader title={title} meta={`${xs.length}`} />
            {xs.map((i) => {
              const s = calState(i, today);
              const k = kindOf(i.kind);
              return (
                <Pressable
                  key={i.id}
                  onPress={() => setOpen(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${i.tag}, ${STATE_WORDS[s.state]}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.space.md,
                    marginHorizontal: t.layout.screenPadding,
                    minHeight: 56,
                    paddingVertical: t.space.sm,
                    borderTopWidth: t.hairline,
                    borderTopColor: t.colors.border,
                    backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{i.tag}</Text>
                    <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
                      {[k.label, i.max ? `${i.max} ${k.unit}`.trim() : '', i.name].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={[t.type.captionStrong, { color: ink(s.state), textAlign: 'right' }]}>
                    {s.due ? `${s.state === 'overdue' ? 'was due' : 'due'} ${usDate(s.due)}` : STATE_WORDS[s.state]}
                    {s.daysLeft !== null && s.state === 'soon' ? `\n${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}` : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <InstrumentSheet instrument={open} register={register} onClose={() => setOpen(null)} apply={apply} />
    </Screen>
  );
}
