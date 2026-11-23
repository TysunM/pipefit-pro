// Heat input
// ----------
// The figure a WPS sets a range on, worked at the bench: volts, amps, the
// length welded and the arc time, or a newer machine's total energy and the
// length. Time it with the timer or type it. The length is a straight run or,
// for a pass all the way round, the pipe's diameter. Save the result with the
// job's own fields (Settings → Welding) and the history goes out as a
// spreadsheet. calc/heatInput.ts does the sums; heatInputLog.ts keeps them.

import React, { useMemo, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { ChipRow } from '../components/ChipRow';
import { Segmented } from '../components/Segmented';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { Banner, NumField, useNow, type BannerTone } from '../components/FormFields';
import { FooterNote, ResultBanner } from '../components/Results';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useHeatInputs } from '../state/heatInputs';
import { addHeatInput, deleteHeatInput, FIELD_VALUE_MAX, type HeatInputEntry } from '../state/heatInputLog';
import { shareTextFile } from '../state/backupFile';
import { heatInputCsv } from '../print/heatInputCsv';
import {
  PROCESSES,
  figure,
  formatDuration,
  heatInput,
  heatUnitFor,
  inHeatUnit,
  inSpeedUnit,
  MM_PER_IN,
  parseDuration,
  processOf,
  speedUnitFor,
  weldLength,
  type ArcMode,
} from '../calc/heatInput';

type Props = NativeStackScreenProps<RootStackParamList, 'HeatInput'>;

/** How many saved results the page lists; the export carries them all. */
const SHOWN = 30;

export function HeatInputScreen({ navigation }: Props) {
  const t = useTheme();
  const { settings, update } = useSettings();
  const { log, apply } = useHeatInputs();
  const imperial = settings.unitSystem === 'imperial';
  const lengthSuffix = imperial ? 'in' : 'mm';
  const hu = heatUnitFor(settings.heatUnit, imperial);
  const su = speedUnitFor(settings.speedUnit, imperial);
  const mode = settings.arcMode;

  const [amps, setAmps] = useState<number | null>(null);
  const [volts, setVolts] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [length, setLength] = useState<number | null>(null);
  const [around, setAround] = useState(false);
  const [timeText, setTimeText] = useState('');
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [process, setProcess] = useState('none');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [note, setNote] = useState<{ tone: BannerTone; text: string } | null>(null);
  const [armed, setArmed] = useState<string | null>(null);

  const running = timerStart !== null;
  const now = useNow(running, 200);
  const elapsed = running ? (now - timerStart) / 1000 : null;
  const seconds = elapsed ?? parseDuration(timeText);
  const lengthMm = weldLength(length, imperial, around);
  const k = processOf(process).k;
  const res = heatInput({ mode, amps, volts, energyKJ: energy, lengthMm, seconds, k });

  const heat = res ? `${figure(inHeatUnit(res.heatInput, hu))} ${hu}` : '—';
  const travel = res?.travel != null ? `${figure(inSpeedUnit(res.travel, su))} ${su}` : null;
  const hint = res
    ? [travel ? `Travel speed ${travel}` : mode === 'energy' ? 'Add the arc time for the travel speed' : null, k < 1 ? `Arc energy ${figure(inHeatUnit(res.arcEnergy, hu))} ${hu} × k ${k}` : null]
        .filter(Boolean)
        .join(' · ')
    : mode === 'energy'
      ? "The machine's total energy and the length welded"
      : 'Volts, amps, the length welded and the arc time';
  const roundNote = around && lengthMm !== null ? `Round the pipe: π × D = ${figure(imperial ? lengthMm / MM_PER_IN : lengthMm)} ${lengthSuffix} welded.` : undefined;

  const say = (tone: BannerTone, text: string) => {
    setNote({ tone, text });
    setTimeout(() => setNote((n) => (n?.text === text ? null : n)), 4000);
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (running) {
      setTimeText(formatDuration((Date.now() - timerStart) / 1000));
      setTimerStart(null);
    } else {
      setTimeText('');
      setTimerStart(Date.now());
    }
  };

  const entryFields = settings.weldFields.map((name) => ({ name, value: (fields[name] ?? '').trim().slice(0, FIELD_VALUE_MAX) })).filter((f) => f.value);

  const save = () => {
    if (!res || lengthMm === null) return;
    apply((l) =>
      addHeatInput(
        l,
        {
          project: settings.projectId,
          mode,
          amps: mode === 'va' ? amps : null,
          volts: mode === 'va' ? volts : null,
          energyKJ: mode === 'energy' ? energy : null,
          lengthMm,
          around,
          seconds: seconds ?? null,
          process,
          k,
          arcEnergy: res.arcEnergy,
          heatInput: res.heatInput,
          travel: res.travel,
          fields: entryFields,
        },
        Date.now()
      )
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    say('ok', `Saved: ${heat}${entryFields.length ? `, ${entryFields.map((f) => `${f.name} ${f.value}`).join(', ')}` : ''}.`);
  };

  const describe = (e: Pick<HeatInputEntry, 'mode' | 'amps' | 'volts' | 'energyKJ' | 'lengthMm' | 'seconds' | 'process' | 'around'>): string =>
    [
      e.mode === 'energy' ? `${figure(e.energyKJ ?? 0)} kJ` : `${figure(e.amps ?? 0)} A × ${figure(e.volts ?? 0)} V`,
      `${figure(imperial ? e.lengthMm / MM_PER_IN : e.lengthMm)} ${lengthSuffix}${e.around ? ' round' : ''}`,
      e.seconds ? formatDuration(e.seconds) : null,
      processOf(e.process).label,
    ]
      .filter(Boolean)
      .join(' · ');

  const share = () => {
    if (!res) return;
    const lines = [`Heat input ${heat}`, travel ? `Travel speed ${travel}` : '', describe({ mode, amps, volts, energyKJ: energy, lengthMm: lengthMm ?? 0, seconds: seconds ?? null, process, around }), ...entryFields.map((f) => `${f.name}: ${f.value}`)];
    Share.share({ message: lines.filter(Boolean).join('\n') }).catch(() => {});
  };

  const exportCsv = async () => {
    const csv = heatInputCsv(log.entries, { heat: hu, speed: su, imperial, fieldNames: settings.weldFields });
    const d = new Date();
    const name = `heat-input-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`;
    const out = await shareTextFile(csv, name, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Heat input history', failed: 'The spreadsheet could not be made.' });
    if (!out.ok) say('warn', out.why);
  };

  const shown = useMemo(() => log.entries.slice(0, SHOWN), [log.entries]);

  return (
    <Screen>
      <Segmented<ArcMode>
        options={[
          { value: 'va', label: 'Volts & amps' },
          { value: 'energy', label: 'Total energy' },
        ]}
        selected={mode}
        onSelect={(m) => update({ arcMode: m })}
      />

      <ResultBanner label="Heat input" value={heat} hint={hint} meta={roundNote} tone={res ? 'default' : 'idle'} />
      <ControlRow>
        <GhostButton label="Share" icon="share-outline" onPress={share} style={{ flex: 1, opacity: res ? 1 : 0.5 }} />
        <AccentButton label="Save" icon="save-outline" onPress={save} style={{ flex: 1, opacity: res ? 1 : 0.5 }} />
      </ControlRow>
      {note ? <Banner tone={note.tone} icon={note.tone === 'ok' ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={note.text} /> : null}

      {mode === 'va' ? (
        <FieldRow>
          <NumField label="Amperage" value={amps} onChange={setAmps} suffix="A" />
          <NumField label="Voltage" value={volts} onChange={setVolts} suffix="V" />
        </FieldRow>
      ) : (
        <FieldRow>
          <NumField label="Total energy, as the machine shows it" value={energy} onChange={setEnergy} suffix="kJ" />
        </FieldRow>
      )}

      <Segmented<'length' | 'diameter'>
        label="Weld"
        options={[
          { value: 'length', label: 'Length' },
          { value: 'diameter', label: 'Round a pipe' },
        ]}
        selected={around ? 'diameter' : 'length'}
        onSelect={(v) => setAround(v === 'diameter')}
      />
      <FieldRow>
        <NumField label={around ? 'Pipe OD' : 'Length welded'} value={length} onChange={setLength} suffix={lengthSuffix} />
        <DimensionInput
          label={mode === 'energy' ? 'Arc time (for speed)' : 'Arc time'}
          value={running ? formatDuration(elapsed ?? 0) : timeText}
          onChangeText={running ? undefined : setTimeText}
          editable={!running}
          placeholder="m:ss or sec"
          keyboardType="numbers-and-punctuation"
        />
      </FieldRow>
      <ControlRow>
        {running ? (
          <AccentButton label="Stop the timer" icon="stop-circle-outline" onPress={toggleTimer} style={{ flex: 1 }} />
        ) : (
          <GhostButton label={timeText ? 'Time it again' : 'Start the timer'} icon="timer-outline" onPress={toggleTimer} style={{ flex: 1 }} />
        )}
      </ControlRow>

      <ChipRow label="Process" options={PROCESSES.map((p) => ({ value: p.id, label: p.k === 1 && p.id === 'none' ? p.label : `${p.label} ${p.k}` }))} selected={process} onSelect={setProcess} />
      <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>
        {process === 'none'
          ? 'No thermal efficiency: heat input as ASME IX and AWS D1.1 take it. Pick the process to apply its k, as EN and ISO procedures do.'
          : `Thermal efficiency k = ${k} for ${processOf(process).label}, ISO/TR 17671-1.`}
      </Text>

      {settings.weldFields.length ? (
        <>
          <SectionHeader title="Saved with it" />
          {chunk(settings.weldFields, 2).map((pair) => (
            <FieldRow key={pair.join('|')}>
              {pair.map((name) => (
                <DimensionInput key={name} label={name} value={fields[name] ?? ''} onChangeText={(v) => setFields((f) => ({ ...f, [name]: v.slice(0, FIELD_VALUE_MAX) }))} keyboardType="default" autoCapitalize="characters" />
              ))}
            </FieldRow>
          ))}
        </>
      ) : null}
      <ControlRow>
        <GhostButton label={settings.weldFields.length ? 'Units and fields' : 'Units, and fields to save with it'} icon="options-outline" onPress={() => navigation.navigate('Settings', { open: 'welding' })} style={{ flex: 1 }} />
      </ControlRow>

      <SectionHeader title="History" meta={log.entries.length ? `${log.entries.length} saved` : undefined} />
      {shown.length ? (
        <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.sm, marginBottom: t.space.md }}>
          {shown.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.sm, borderBottomWidth: t.hairline, borderBottomColor: t.colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.bodyStrong, { color: t.colors.text, fontSize: 18 }]}>
                  {figure(inHeatUnit(e.heatInput, hu))} {hu}
                  {e.travel !== null ? <Text style={[t.type.body, { color: t.colors.textMuted, fontSize: 14 }]}>{`  ${figure(inSpeedUnit(e.travel, su))} ${su}`}</Text> : null}
                </Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={2}>
                  {[describe(e), ...e.fields.map((f) => `${f.name} ${f.value}`), e.project ? `Job ${e.project}` : null, when(e.createdAt)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (armed === e.id) {
                    apply((l) => deleteHeatInput(l, e.id));
                    setArmed(null);
                  } else setArmed(e.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={armed === e.id ? 'Tap again to delete' : 'Delete'}
                hitSlop={8}
                style={{ padding: 6, borderRadius: t.radius.md, backgroundColor: armed === e.id ? t.colors.danger : 'transparent' }}
              >
                <Ionicons name="trash-outline" size={20} color={armed === e.id ? t.colors.onAccent : t.colors.textFaint} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <FooterNote text="Nothing saved yet. Save a result and it lands here, with its figures and the job's fields, ready to send as a spreadsheet." />
      )}
      {log.entries.length ? (
        <ControlRow>
          <GhostButton label="Send the history as a spreadsheet" icon="document-text-outline" onPress={() => void exportCsv()} style={{ flex: 1 }} />
        </ControlRow>
      ) : null}

      <FooterNote
        text={
          'Arc energy = volts × amps × arc time ÷ length welded, or a waveform-controlled machine\'s total energy ÷ length (ASME IX QW-409.1). ' +
          'Heat input = arc energy × k, the process\'s thermal efficiency, where the procedure applies one. Travel speed = length ÷ arc time. ' +
          'Round a pipe takes the length as π × the diameter, for a pass all the way round. Check the result against the WPS range.'
        }
      />
    </Screen>
  );
}

function chunk<T>(xs: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

function when(at: number): string {
  const d = new Date(at);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
