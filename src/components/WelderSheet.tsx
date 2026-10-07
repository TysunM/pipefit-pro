import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AccentButton, GhostButton } from './Buttons';
import { DimensionInput, FieldRow } from './DimensionInput';
import { DateField } from './FormFields';
import { Chip } from './JobChips';
import { PROCESSES, Process, Qual, Welder, WelderRoster, deleteWelder, putWelder } from '../state/weldLog';
import { dayKey } from '../calc/days';

/** A welder added or changed: the stamp, the name, and each process qualified with the day continuity was last shown. */
export function WelderSheet({
  welder,
  roster,
  onClose,
  apply,
}: {
  /** The welder to change, a stamp to start a new one from, or null for closed. */
  welder: Welder | { stamp: string } | null;
  roster: WelderRoster;
  onClose: () => void;
  apply: (f: (r: WelderRoster) => WelderRoster) => void;
}) {
  const t = useTheme();
  const had = welder && 'id' in welder ? welder : null;
  const [stamp, setStamp] = useState('');
  const [name, setName] = useState('');
  const [quals, setQuals] = useState<Qual[]>([]);
  const [why, setWhy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!welder) return;
    setStamp(welder.stamp);
    setName(had?.name ?? '');
    setQuals(had?.quals ?? []);
    setWhy(null);
    setArmed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welder]);

  const toggle = (p: Process) =>
    setQuals((qs) => (qs.some((q) => q.process === p) ? qs.filter((q) => q.process !== p) : [...qs, { process: p, since: dayKey(Date.now()), note: '' }]));

  const save = () => {
    const out = putWelder(roster, { id: had?.id, stamp, name, quals }, Date.now());
    if (!out.ok) return setWhy(out.why ?? 'That welder could not be saved.');
    apply(() => out.roster);
    onClose();
  };

  return (
    <Modal visible={welder !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ margin: t.space.lg, maxHeight: '90%', borderRadius: t.radius.xl, backgroundColor: t.colors.bg }}>
          <ScrollView contentContainerStyle={{ paddingVertical: t.space.xl, gap: t.space.sm }} keyboardShouldPersistTaps="handled">
            <Text style={[t.type.sectionTitle, { color: t.colors.text, paddingHorizontal: t.space.xl }]}>{had ? `Welder ${had.stamp}` : 'Add a welder'}</Text>
            <FieldRow>
              <DimensionInput label="Stamp" value={stamp} onChangeText={setStamp} placeholder="W-12" keyboardType="default" autoCapitalize="characters" />
              <DimensionInput label="Name" value={name} onChangeText={setName} placeholder="R. Diaz" keyboardType="default" autoCapitalize="words" />
            </FieldRow>
            <Text style={[t.type.label, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>Qualified on</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md }}>
              {PROCESSES.map((p) => (
                <Chip key={p} label={p} on={quals.some((q) => q.process === p)} onPress={() => toggle(p)} />
              ))}
            </View>
            {quals.map((q) => (
              <FieldRow key={q.process}>
                <DateField label={`${q.process}: continuity last shown`} value={q.since} onChange={(d) => setQuals((qs) => qs.map((x) => (x.process === q.process ? { ...x, since: d || x.since } : x)))} />
              </FieldRow>
            ))}
            {quals.length ? (
              <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>
                The day of the test, or the last signed continuity record. Every weld logged with the process after it carries continuity on.
              </Text>
            ) : null}
            {why ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{why}</Text> : null}
            <View style={{ flexDirection: 'row', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
              {had ? (
                <GhostButton
                  label={armed ? 'Tap again to remove' : 'Remove'}
                  icon={armed ? 'warning-outline' : 'trash-outline'}
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (!armed) return setArmed(true);
                    apply((r) => deleteWelder(r, had.id));
                    onClose();
                  }}
                />
              ) : (
                <GhostButton label="Cancel" style={{ flex: 1 }} onPress={onClose} />
              )}
              <AccentButton label="Save" icon="checkmark" style={{ flex: 1 }} onPress={save} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
