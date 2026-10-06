// Backup and restore
// ------------------
// One button makes a file of everything on the phone and hands it to the
// share sheet. Restoring reads a file back, says exactly what it would add,
// store by store, and adds only that — nothing on the phone is overwritten.
// The reasoning is in state/backup.ts.
import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { useTheme } from '../theme/ThemeProvider';
import { DEFAULT_SETTINGS, useSettings } from '../state/settings';
import { readSettings } from '../state/readSettings';
import { useJoints } from '../state/joints';
import { useHeats } from '../state/heats';
import { useSpools } from '../state/spools';
import { useSketches } from '../state/sketches';
import { useLevels } from '../state/levels';
import { usePressureTests } from '../state/pressureTests';
import { useShifts } from '../state/shifts';
import { useFittings } from '../state/fittings';
import { useCuts } from '../state/cuts';
import { ReadBackup, backupFileName, counted, backupSummary, makeBackup, mergeStore, readBackup, restorePlan } from '../state/backup';
import { pickBackupText, shareBackup } from '../state/backupFile';
import { backupAge, useLastBackup } from '../state/lastBackup';

type Read = Extract<ReadBackup, { ok: true }>;

export function BackupScreen() {
  const t = useTheme();
  const { settings, update } = useSettings();
  const joints = useJoints();
  const heats = useHeats();
  const spools = useSpools();
  const sketches = useSketches();
  const levels = useLevels();
  const tests = usePressureTests();
  const shifts = useShifts();
  const fittings = useFittings();
  const cuts = useCuts();
  const last = useLastBackup();

  // Each store: what it holds now, and how to change it.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const stores: Record<string, { value: any; apply: (f: (v: any) => any) => void }> = {
    'pipefit.pressure.v1': { value: tests.log, apply: tests.apply as any },
    'pipefit.joints.v1': { value: joints.register, apply: joints.apply as any },
    'pipefit.heats.v1': { value: heats.book, apply: heats.apply as any },
    'pipefit.spools.v1': { value: spools.shelf, apply: spools.apply as any },
    'pipefit.sketches.v1': { value: sketches.book, apply: sketches.apply as any },
    'pipefit.levels.v1': { value: levels.log, apply: levels.apply as any },
    'pipefit.shifts.v1': { value: shifts.log, apply: shifts.apply as any },
    'pipefit.fittings.v1': { value: fittings.library, apply: fittings.apply as any },
    'pipefit.cuts.v1': { value: cuts.log, apply: cuts.apply as any },
  };
  const values = Object.fromEntries(Object.entries(stores).map(([k, s]) => [k, s.value]));
  const summary = backupSummary(values);
  const total = summary.reduce((n, s) => n + s.count, 0);
  const age = backupAge(last.at, Date.now());

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [withSettings, setWithSettings] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');

  const plan = useMemo(() => (read ? restorePlan(read, values) : []), [read, values]);
  const adds = plan.reduce((n, p) => n + p.adds, 0);

  const backUp = async () => {
    setBusy(true);
    setNote(null);
    const now = new Date();
    const out = await shareBackup(makeBackup(values, settings, now), backupFileName(now, settings.projectId));
    setBusy(false);
    if (!out.ok) return setNote({ text: out.why, warn: true });
    last.mark(now.getTime());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setNote({ text: 'Backup made. Keep it somewhere off this phone — email it to yourself, or put it in Drive.', warn: false });
  };

  const take = (text: string | null) => {
    if (text === null) return;
    const r = readBackup(text);
    if (!r.ok) return setNote({ text: r.why, warn: true });
    setNote(r.newer.length ? { text: `Left out, written by a newer app: ${r.newer.join(', ')}.`, warn: true } : null);
    setPasting(false);
    setPasted('');
    setRead(r);
  };

  const pick = async () => {
    setNote(null);
    try {
      take(await pickBackupText());
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : 'That file could not be opened.', warn: true });
    }
  };

  const restore = () => {
    if (!read) return;
    let added = 0;
    for (const p of plan) {
      if (!p.adds) continue;
      const incoming = read.stores[p.key]!;
      stores[p.key]!.apply((cur: any) => mergeStore(p.key, cur, incoming).value);
      added += p.adds;
    }
    if (withSettings && read.settings && typeof read.settings === 'object') {
      update(readSettings(JSON.stringify(read.settings), DEFAULT_SETTINGS).settings);
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setRead(null);
    setWithSettings(false);
    setNote({ text: `Restored: ${added} record${added === 1 ? '' : 's'} added${withSettings ? ', and the settings' : ''}. Nothing on the phone was changed.`, warn: false });
  };

  const made = read?.made ? new Date(read.made) : null;

  return (
    <Screen>
      <HintRow text="Everything on this phone — tests, joints, heats, spools, isos, readings, reports, takeouts and cuts — in one file. Lose the phone, keep the records." />

      <SectionHeader title="Back up" meta={last.at ? (age.days === 0 ? 'Last: today' : `Last: ${age.days} day${age.days === 1 ? '' : 's'} ago`) : 'Never backed up'} />
      <Text style={[t.type.body, { color: age.due ? t.colors.warnText : t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md }]}>
        {total
          ? `On this phone: ${summary.map((s) => counted(s.count, s.label)).join(', ')}.`
          : 'Nothing saved on this phone yet.'}
        {age.due && total ? ' Not backed up in a week or more.' : ''}
      </Text>
      <ControlRow>
        <AccentButton label={busy ? 'Making the backup…' : 'Back up now'} icon="cloud-upload-outline" onPress={() => void (busy ? undefined : backUp())} style={{ flex: 1 }} />
      </ControlRow>

      <SectionHeader title="Restore" meta="Adds, never overwrites" />
      {!read ? (
        <>
          <ControlRow>
            <GhostButton label="Restore from a backup file" icon="folder-open-outline" onPress={() => void pick()} style={{ flex: 1 }} />
          </ControlRow>
          <Pressable onPress={() => setPasting((p) => !p)} accessibilityRole="button" style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
            <Text style={[t.type.captionStrong, { color: t.colors.data }]}>{pasting ? 'Hide the paste box' : 'Or paste a backup that came as text →'}</Text>
          </Pressable>
          {pasting ? (
            <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.md }}>
              <TextInput
                value={pasted}
                onChangeText={setPasted}
                multiline
                placeholder="Paste the whole backup here"
                placeholderTextColor={t.colors.textFaint}
                accessibilityLabel="Backup text"
                style={[t.type.caption, { minHeight: 120, maxHeight: 220, color: t.colors.text, borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.md, padding: t.space.md, textAlignVertical: 'top' }]}
              />
              <GhostButton label="Read it" icon="checkmark-outline" onPress={() => take(pasted)} />
            </View>
          ) : null}
        </>
      ) : (
        <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.md }}>
          <Text style={[t.type.body, { color: t.colors.text }]}>
            {`Backup from ${made && !Number.isNaN(made.getTime()) ? made.toLocaleString() : 'an unknown date'}. Restoring adds what this phone does not have; anything already here stays as it is.`}
          </Text>
          {plan.filter((p) => p.inFile > 0).map((p) => (
            <View key={p.key} style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: t.hairline, borderTopColor: t.colors.border, paddingTop: t.space.sm }}>
              <Text style={[t.type.body, { color: t.colors.text }]}>{p.label}</Text>
              <Text style={[t.type.bodyStrong, { color: p.adds ? t.colors.data : t.colors.textFaint }]}>
                {p.adds ? `+${p.adds}${p.inFile > p.adds ? ` (${p.inFile - p.adds} already here)` : ''}` : p.inFile ? 'all already here' : 'none'}
              </Text>
            </View>
          ))}
          <Pressable
            onPress={() => setWithSettings((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: withSettings }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.sm }}
          >
            <Ionicons name={withSettings ? 'checkbox' : 'square-outline'} size={24} color={withSettings ? t.colors.accent : t.colors.textMuted} />
            <Text style={[t.type.body, { color: t.colors.text, flex: 1 }]}>Also put back the settings (units, job, pipe, name). Replaces this phone's.</Text>
          </Pressable>
          <ControlRow>
            <AccentButton
              label={adds || withSettings ? `Restore ${adds} record${adds === 1 ? '' : 's'}${withSettings ? ' + settings' : ''}` : 'Nothing new to add'}
              icon="cloud-download-outline"
              onPress={() => (adds || withSettings ? restore() : setRead(null))}
              style={{ flex: 1 }}
            />
            <GhostButton label="Cancel" onPress={() => setRead(null)} style={{ flex: 1 }} />
          </ControlRow>
        </View>
      )}

      {note ? (
        <Text style={[t.type.bodyStrong, { color: note.warn ? t.colors.warnText : t.colors.accent, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg }]}>{note.text}</Text>
      ) : null}
    </Screen>
  );
}
