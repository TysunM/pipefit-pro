// The skills passport
// -------------------
// Every skill in the catalogue, where it stands, and the work behind it. Tap
// one for the records that show it and the sign-offs on it, and to have a
// foreman sign it off here on this phone. The reasoning is in state/passport.ts.
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { Banner, NoteField } from '../components/FormFields';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { Chip } from '../components/JobChips';
import { SignatureSheet, SignatureView } from '../components/SignatureSheet';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { usePassport } from '../state/passports';
import { useJoints } from '../state/joints';
import { usePressureTests } from '../state/pressureTests';
import { useWelds } from '../state/welds';
import { useCuts } from '../state/cuts';
import { useSketches } from '../state/sketches';
import { useSpools } from '../state/spools';
import { useLevels } from '../state/levels';
import { useHeats } from '../state/heats';
import { useInstruments } from '../state/instruments';
import { useShifts } from '../state/shifts';
import { useFittings } from '../state/fittings';
import { useOrientationDone } from '../state/orientations';
import { listed } from '../state/register';
import { AREAS, AREA_TITLES, ROLES, Role, STANDING_WORDS, SkillStanding, Standing, attest, recordCode, revoke, standingSummary, standings } from '../state/passport';
import { dayKey, usDate } from '../calc/days';
import { shareSheet } from '../print/share';
import { passportHtml } from '../print/passport';

type Props = NativeStackScreenProps<RootStackParamList, 'Passport'>;

const SHOWN = 8;

export function PassportScreen(_: Props) {
  const t = useTheme();
  const { settings } = useSettings();
  const { passport, apply, saveError, takeOver } = usePassport();
  const { register } = useJoints();
  const { log: tests } = usePressureTests();
  const { log: welds } = useWelds();
  const { log: cuts } = useCuts();
  const { book: sketches } = useSketches();
  const { shelf } = useSpools();
  const { log: levels } = useLevels();
  const { book: heats } = useHeats();
  const { register: instruments } = useInstruments();
  const { log: shifts } = useShifts();
  const { library } = useFittings();
  const { done } = useOrientationDone();
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const holder = settings.fitterName.trim();
  const rows = useMemo(
    () =>
      standings(
        {
          joints: listed(register),
          tests: tests.tests,
          welds: welds.welds,
          cuts: cuts.cuts,
          sketches: sketches.sketches,
          spools: shelf.spools,
          readings: levels.readings,
          heats: heats.heats,
          instruments: instruments.instruments,
          reports: shifts.reports,
          fittings: library.entries,
          orientations: done.completions,
        },
        passport,
      ),
    [register, tests.tests, welds.welds, cuts.cuts, sketches.sketches, shelf.spools, levels.readings, heats.heats, instruments.instruments, shifts.reports, library.entries, done.completions, passport],
  );
  const shown = rows.find((r) => r.skill.id === open) ?? null;

  const print = async () => {
    setNote(null);
    const out = await shareSheet(passportHtml({ holder, standings: rows, today: dayKey(Date.now()) }), `Skills passport ${holder || ''}`.trim());
    if (!out.ok) setNote(out.why);
  };

  return (
    <Screen>
      {passport.foreign ? (
        <Banner tone="danger" icon="alert-circle" text="This phone's passport was written by a newer version of the app, so nothing is being saved. Update the app, or start a new passport and lose its sign-offs." action="Start new" onAction={takeOver} />
      ) : null}
      {saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last sign-off could not be saved to this phone. What is on screen is ahead of what is stored." /> : null}
      {!holder ? <Banner tone="warn" icon="person-outline" text="Put your name in Settings so the passport is yours: it goes on every page and into every record code." /> : null}

      <HintRow text="What you can do, proved by the work saved on this phone and signed off by whoever watched it done. It is yours: it goes with you from job to job." />
      <Text style={[t.type.sectionTitle, { color: t.colors.text, paddingHorizontal: t.layout.screenPadding }]}>{holder || 'Skills passport'}</Text>
      <Text style={[t.type.bodyStrong, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md }]}>{standingSummary(rows)}</Text>
      <ControlRow>
        <AccentButton label="Share passport PDF" icon="share-outline" style={{ flex: 1 }} onPress={() => void print()} />
      </ControlRow>
      {note ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}

      {AREAS.map((area) => {
        const xs = rows.filter((r) => r.skill.area === area);
        if (!xs.length) return null;
        return (
          <View key={area}>
            <SectionHeader title={AREA_TITLES[area]} meta={`${xs.filter((x) => x.standing === 'competent').length} of ${xs.length} signed off`} />
            {xs.map((r) => (
              <Pressable
                key={r.skill.id}
                onPress={() => setOpen(r.skill.id)}
                accessibilityRole="button"
                accessibilityLabel={`${r.skill.title}, ${STANDING_WORDS[r.standing]}`}
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
                  <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{r.skill.title}</Text>
                  <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
                    {`Level ${r.skill.level} · ${r.skill.nccer}`}
                  </Text>
                </View>
                <Text style={[t.type.captionStrong, { color: ink(t, r.standing), textAlign: 'right' }]}>
                  {STANDING_WORDS[r.standing]}
                  {r.skill.needs ? `\n${r.evidence.length} of ${r.skill.needs}` : r.attestations.length ? `\n${r.attestations.length} ${r.attestations.length === 1 ? 'sign-off' : 'sign-offs'}` : ''}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
              </Pressable>
            ))}
          </View>
        );
      })}

      <SkillSheet row={shown} holder={holder} project={settings.projectId} onClose={() => setOpen(null)} apply={apply} />
    </Screen>
  );
}

const ink = (t: ReturnType<typeof useTheme>, s: Standing) => (s === 'competent' ? t.colors.success : s === 'practised' ? t.colors.accent : s === 'started' ? t.colors.warnText : t.colors.textFaint);

/** One skill: the records that show it, the sign-offs on it, and a foreman's signature taken here. */
function SkillSheet({
  row,
  holder,
  project,
  onClose,
  apply,
}: {
  row: SkillStanding | null;
  holder: string;
  project: string;
  onClose: () => void;
  apply: (f: (p: Parameters<typeof attest>[0]) => Parameters<typeof attest>[0]) => void;
}) {
  const t = useTheme();
  const [by, setBy] = useState('');
  const [role, setRole] = useState<Role>('Foreman');
  const [note, setNote] = useState('');
  const [signing, setSigning] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const skillId = row?.skill.id ?? '';

  // A fresh form for each skill opened.
  const [formFor, setFormFor] = useState('');
  if (row && formFor !== skillId) {
    setFormFor(skillId);
    setBy('');
    setRole('Foreman');
    setNote('');
    setWhy(null);
    setArmed(null);
  }

  const sign = () => {
    if (!by.trim()) return setWhy('Give the name of who is signing.');
    setWhy(null);
    setSigning(true);
  };

  const signed = (sig: string) => {
    setSigning(false);
    if (!row) return;
    apply((p) => {
      const out = attest(p, { skill: row.skill.id, by, role, sig, project, note }, Date.now());
      if (!out.ok) setWhy(out.why);
      return out.passport;
    });
    setBy('');
    setNote('');
  };

  return (
    <Modal visible={row !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ margin: t.space.lg, maxHeight: '92%', borderRadius: t.radius.xl, backgroundColor: t.colors.bg }}>
          {row ? (
            <ScrollView contentContainerStyle={{ paddingVertical: t.space.xl, gap: t.space.sm }} keyboardShouldPersistTaps="handled">
              <Text style={[t.type.sectionTitle, { color: t.colors.text, paddingHorizontal: t.space.xl }]}>{row.skill.title}</Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.space.xl }]}>{`NCCER level ${row.skill.level} · ${row.skill.nccer}`}</Text>
              <Text style={[t.type.captionStrong, { color: ink(t, row.standing), paddingHorizontal: t.space.xl }]}>
                {STANDING_WORDS[row.standing]}
                {row.skill.needs ? ` · ${row.evidence.length} of ${row.skill.needs} records` : ''}
              </Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.space.xl }]}>{row.skill.what}</Text>

              {row.evidence.length ? (
                <View style={{ paddingHorizontal: t.space.xl, paddingTop: t.space.md, gap: 2 }}>
                  <Text style={[t.type.label, { color: t.colors.textMuted }]}>On this phone</Text>
                  {row.evidence.slice(0, SHOWN).map((e, i) => (
                    <Text key={`${e.at}-${i}`} style={[t.type.caption, { color: t.colors.text }]}>{`${usDate(dayKey(e.at))} · ${e.what}${e.project ? ` · ${e.project}` : ''}`}</Text>
                  ))}
                  {row.evidence.length > SHOWN ? <Text style={[t.type.caption, { color: t.colors.textFaint }]}>{`and ${row.evidence.length - SHOWN} more`}</Text> : null}
                </View>
              ) : null}

              {row.attestations.length ? (
                <View style={{ paddingHorizontal: t.space.xl, paddingTop: t.space.md, gap: t.space.sm }}>
                  <Text style={[t.type.label, { color: t.colors.textMuted }]}>Signed off</Text>
                  {row.attestations.map((a) => (
                    <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
                      <SignatureView sig={a.sig} height={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={[t.type.captionStrong, { color: t.colors.text }]}>{`${a.by}, ${a.role}`}</Text>
                        <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{`${usDate(dayKey(a.at))}${a.project ? ` · ${a.project}` : ''} · code ${recordCode(a, holder)}`}</Text>
                        {a.note ? <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{a.note}</Text> : null}
                      </View>
                      <Pressable
                        onPress={() => (armed === a.id ? (apply((p) => revoke(p, a.id)), setArmed(null)) : setArmed(a.id))}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={armed === a.id ? 'Tap again to remove this sign-off' : 'Remove this sign-off'}
                      >
                        <Ionicons name={armed === a.id ? 'warning-outline' : 'trash-outline'} size={20} color={armed === a.id ? t.colors.danger : t.colors.textFaint} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={[t.type.label, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>Sign it off</Text>
              <FieldRow>
                <DimensionInput label="Signed by" value={by} onChangeText={setBy} placeholder="Who watched it done" keyboardType="default" autoCapitalize="words" />
              </FieldRow>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
                {ROLES.map((r) => (
                  <Chip key={r} label={r} on={role === r} onPress={() => setRole(r)} />
                ))}
              </View>
              <NoteField label="Note" value={note} onChangeText={setNote} placeholder="What was done, where, anything to say" max={200} />
              {why ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{why}</Text> : null}
              <View style={{ gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
                <AccentButton label="Sign on this phone" icon="create-outline" onPress={sign} />
                <GhostButton label="Close" onPress={onClose} />
              </View>
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
      <SignatureSheet visible={signing} title={`${row?.skill.title ?? ''} — signed off by`} name={`${by.trim()}${by.trim() ? ', ' : ''}${role}`} onCancel={() => setSigning(false)} onDone={signed} />
    </Modal>
  );
}
