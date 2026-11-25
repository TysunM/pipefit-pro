import React, { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DerivedField, DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { AccentButton, ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, SpoolBar, StatGrid, SummaryRow, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { RollingDiagram } from '../components/diagram/RollingDiagram';
import { useUnits } from '../hooks/useUnits';
import { figureText, useSpokenFigures } from '../voice/figures';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useSettings } from '../state/settings';
import { StockNote } from '../components/StockNote';
import { solveRolling } from '../calc/rolling';
import { parseNumber } from '../calc/format';
import { useOffsetJoint } from '../hooks/useOffsetJoint';
import { SetTakeout } from '../components/SetTakeout';

type Props = NativeStackScreenProps<RootStackParamList, 'RollingOffset'>;

export function RollingOffsetScreen({ route }: Props) {
  const u = useUnits();
  // Figures handed over by AR measure, in inches, shown in the reader's units.
  const given = route.params;
  const start = (inches: number | undefined) => (inches !== undefined && Number.isFinite(inches) ? u.num(inches) : '');
  const pipe = usePipeConfig();
  const { settings } = useSettings();
  // Butt weld, screwed, PVC socket or no-hub, by what the job's pipe is.
  const fit = useOffsetJoint(pipe.nps, pipe.kind);

  const [rise, setRise] = useState(() => start(given?.rise));
  const [roll, setRoll] = useState(() => start(given?.roll));
  const [run, setRun] = useState(() => start(given?.run));
  const [gap, setGap] = useState('');
  const [angleText, setAngleText] = useState('45');
  // Screwed, socket and no-hub fittings come in set angles, so those open on the angle, not a run.
  const startOnAngle = !fit.welded && given?.run === undefined;
  const [useFittingAngle, setUseFittingAngle] = useState(startOnAngle);
  const [mode, setMode] = useState<'pipe' | 'elbow'>('pipe');

  const fittingAngle = parseNumber(angleText);
  // Spoken: "rolling offset, rise 12, roll 8 and a half, run 30".
  useSpokenFigures('RollingOffset', (f) => {
    const text = (k: keyof typeof f) => figureText(f[k]!, u.num);
    if (f.rise) setRise(text('rise'));
    if (f.roll) setRoll(text('roll'));
    if (f.gap) setGap(text('gap'));
    if (f.run) {
      setRun(text('run'));
      setUseFittingAngle(false);
    }
    if (f.angle) {
      setAngleText(text('angle'));
      if (!f.run) setUseFittingAngle(true);
    }
  });

  // A gap comes off only where the joint leaves one: a weld's root gap, a no-hub coupling's stop.
  const gapInches = fit.hasGap ? (Number.isFinite(u.parse(gap)) ? u.parse(gap) : fit.gapDefault) : 0;

  const result = useMemo(
    () =>
      solveRolling({
        rise: u.parse(rise),
        roll: u.parse(roll),
        run: u.parse(run),
        fittingAngle,
        useFittingAngle,
        gap: gapInches,
        nps: pipe.nps,
        kind: pipe.kind,
        schedule: pipe.schedule,
        elbow: fit.elbow,
      }),
    [rise, roll, run, fittingAngle, useFittingAngle, gapInches, pipe.nps, pipe.kind, pipe.schedule, fit.elbow, u]
  );

  // The library elbow this offset turns through, once there are figures to turn it.
  const libraryFitting = Number.isFinite(result.cutAngle) ? fit.libraryFittingAt(result.cutAngle) : null;
  const pristine = !rise.trim() && !roll.trim();

  const clear = () => {
    setRise('');
    setRoll('');
    setRun('');
    setGap('');
    setUseFittingAngle(!fit.welded);
    setAngleText('45');
  };

  // The throat and heel marks are for a butt weld elbow cut to the angle; nothing else is cut.
  const banner =
    mode === 'elbow' && fit.welded
      ? {
          label: 'Elbow cut — throat arc',
          value: result.valid ? `${u.num(result.throatArc)} ${u.unitName}` : '—',
          inches: result.throatArc,
          hint: result.valid ? `Wrap from throat · Back arc ${u.num(result.backArc)} ${u.unitName}` : undefined,
        }
      : {
          label: 'Pipe cut',
          value: result.valid ? `${u.num(result.pipeCut)} ${u.unitName}` : '—',
          inches: result.pipeCut,
          hint: result.valid ? `Mark & cut this length · Travel ${u.num(result.travel)} ${u.unitName}` : undefined,
        };

  return (
    <Screen>
      <HintRow text="An offset that moves sideways and up at the same time. The true travel is longer than either figure on its own, so a run measured as a plain offset comes up short." />
      <SectionHeader title="Dimensions" meta="Centre-to-centre" />

      <FieldRow>
        <DimensionInput
          label="Rise / set"
          value={rise}
          onChangeText={setRise}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(rise))}
        />
        <DimensionInput
          label="Roll"
          value={roll}
          onChangeText={setRoll}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(roll))}
        />
        {fit.hasGap ? (
          <DimensionInput
            label={fit.gapLabel}
            value={gap}
            onChangeText={setGap}
            suffix={u.suffix}
            placeholder={u.num(fit.gapDefault)}
          />
        ) : null}
      </FieldRow>

      <FieldRow>
        {useFittingAngle ? (
          <DerivedField label="Run (auto)" value={result.valid ? u.num(result.run) : '—'} />
        ) : (
          <DimensionInput
            label="Run"
            value={run}
            onChangeText={setRun}
            suffix={u.suffix}
            placeholder="0"
            readout={u.frac(u.parse(run))}
          />
        )}
        <DerivedField
          label="True offset"
          value={Number.isFinite(result.trueOffset) ? `${u.num(result.trueOffset)} ${u.unitName}` : '—'}
        />
      </FieldRow>

      <FieldRow>
        <DimensionInput
          label="Elbow angle"
          value={angleText}
          onChangeText={(v) => {
            setUseFittingAngle(true);
            setAngleText(v);
          }}
          suffix="°"
          placeholder="45"
          readout={useFittingAngle ? undefined : 'Solved from the run'}
        />
        <DerivedField label="Cut angle" value={result.valid ? u.angle(result.cutAngle, 2) : '—'} />
      </FieldRow>

      <ChipRow
        label="Preset"
        options={fit.presets.map((a) => ({ value: a, label: `${a}°` }))}
        selected={useFittingAngle ? fittingAngle : null}
        onSelect={(a) => {
          setUseFittingAngle(true);
          setAngleText(String(a));
        }}
      />

      <ControlRow>
        <GhostButton
          label={useFittingAngle ? 'Solve from run' : 'Use stock elbow'}
          icon={useFittingAngle ? 'flash-outline' : 'lock-closed-outline'}
          onPress={() => setUseFittingAngle((v) => !v)}
          style={{ flex: 1 }}
        />
        <GhostButton label="Clear all" icon="refresh-outline" onPress={clear} style={{ flex: 1 }} />
      </ControlRow>

      <ControlRow>
        <SelectorButton primary={pipe.label} badge={pipe.kind} onPress={pipe.openSheet} style={{ flex: 1 }} />
        {fit.welded ? (
          <AccentButton
            label={mode === 'pipe' ? 'Elbow cut' : 'Pipe cut'}
            icon="cut-outline"
            onPress={() => setMode((m) => (m === 'pipe' ? 'elbow' : 'pipe'))}
            style={{ flex: 1 }}
          />
        ) : null}
      </ControlRow>

      {result.valid ? (
        <RollingDiagram
          run={result.run}
          roll={Math.abs(u.parse(roll))}
          rise={Math.abs(u.parse(rise))}
          angleLabel={u.angle(result.cutAngle)}
          runLabel={u.num(result.run)}
          riseLabel={`Rise ${u.num(Math.abs(u.parse(rise)))}`}
          rollLabel={`Roll ${u.num(Math.abs(u.parse(roll)))}`}
          cutLabel={u.num(result.pipeCut)}
        />
      ) : null}

      <ResultBanner
        speak={!pristine && !result.error && result.valid ? { inches: banner.inches } : undefined}
        label={pristine ? banner.label : result.error ? 'Cannot solve' : banner.label}
        value={pristine ? '—' : result.error ? result.error : banner.value}
        hint={pristine ? 'Enter rise and roll to solve' : result.error ? undefined : banner.hint}
        tone={pristine ? 'idle' : result.error ? 'error' : 'default'}
      />

      {/* PVC and no-hub: the maker's figure for this elbow, set here (off the box with the camera, typed, or measured) or shown with a Change. */}
      {libraryFitting ? (
        <SetTakeout
          key={`${libraryFitting}-${pipe.nps}`}
          fitting={libraryFitting}
          nps={pipe.nps}
          lineName={fit.pipeName}
          line={fit.line}
          wall={fit.library.wall}
          sizes={fit.library.sizes}
          value={fit.library.value(libraryFitting)}
          onSave={(v) => fit.library.save(libraryFitting, v)}
          onClear={() => fit.library.clear(libraryFitting)}
        />
      ) : null}

      <MetaBar
        text={
          fit.welded
            ? `${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Stock ${u.num(settings.stockLength)} ${u.unitName}`
            : `${pipe.label} ${fit.pipeName} · ${fit.jointName} · Stock ${u.num(settings.stockLength)} ${u.unitName}`
        }
      />
      {result.valid ? (
        <StockNote
          cut={result.pipeCut}
          stock={settings.stockLength}
          kerf={settings.cutAllowance}
          length={(v) => `${u.num(v)} ${u.unitName}`}
        />
      ) : null}

      <SummaryRow
        items={[
          { label: 'Run', value: result.valid ? `${u.num(result.run)} ${u.unitName}` : '—' },
          { label: 'Travel C2C', value: result.valid ? `${u.num(result.travel)} ${u.unitName}` : '—' },
          { label: 'True offset', value: Number.isFinite(result.trueOffset) ? `${u.num(result.trueOffset)} ${u.unitName}` : '—' },
          {
            label: 'Roll angle',
            value: Number.isFinite(result.rollAngle) ? u.angle(result.rollAngle) : '—',
            note: 'Rise toward roll',
          },
        ]}
      />

      {fit.welded && gapInches <= 0 ? <WarningBanner text={`No weld gap set (0 ${u.unitName}). Cut length assumes zero root opening.`} /> : null}

      <StatGrid
        stats={
          fit.welded
            ? [
                { label: 'Cut angle', value: result.valid ? u.angle(result.cutAngle) : '—' },
                { label: 'Inside arc', note: 'Primary — throat', value: result.valid ? u.num(result.throatArc) : '—' },
                { label: 'Setback', note: result.setbackNote, value: result.valid ? u.dual(result.setback) : '—' },
                { label: 'Outside arc', note: 'Alternative', value: result.valid ? u.num(result.backArc) : '—' },
              ]
            : [
                { label: 'Fitting', note: fit.jointName, value: fit.presets.some((x) => Math.abs(x - result.cutAngle) < 1e-6) ? fit.fittingName(result.cutAngle) : '—' },
                { label: 'Setback', note: result.setbackNote || undefined, value: result.valid ? u.dual(result.setback) : '—' },
              ]
        }
      />

      {fit.welded ? <MetaBar text={`Centreline arc ${result.valid ? u.num(result.centerlineArc) : '—'} ${u.unitName}`} /> : null}

      <SpoolBar
        badge={fit.welded ? `SCH ${pipe.schedule}` : fit.pipeName}
        text={
          !result.valid
            ? 'Spool weight unavailable'
            : fit.welded
              ? `Spool weight ${u.weight(result.spoolTotal, 2)} · pipe ${u.weight(result.spoolPipe, 2)} + 2× elbow ${u.weight(
                  result.spoolElbows / 2,
                  2
                )} + 2 welds ${u.weight(result.spoolWelds, 2)}`
              : Number.isFinite(fit.lbPerFt)
                ? `Pipe ${u.weight((result.pipeCut / 12) * fit.lbPerFt, 2)} in ${fit.pipeName} · fittings not counted`
                : 'Pipe weight unavailable for this material and size'
        }
      />

      <FooterNote
        text={
          fit.welded
            ? 'Centre-to-centre (C2C) geometry. Bought elbows take out the handbook figure (2-42) at 90° and 45°, the same as Cut Length; any other angle is an elbow cut down to it, worked from the bend radius. Non-standard cut angles require rolling-offset elbows or mitred fabrication.'
            : fit.joint === 'screwed'
              ? 'Centre-to-centre (C2C) geometry. Galvanised is made up with screwed elbows: the takeout is the handbook\'s, centre to the end of the pipe made up tight (4-37, 4-39), so no gap comes off. Screwed elbows are made at 90° and 45°: set the elbow angle to one of them.'
              : `Centre-to-centre (C2C) geometry. ${fit.joint === 'socket' ? 'PVC and CPVC are made up with socket elbows: the pipe bottoms in the socket, so no gap comes off' : 'Cast iron soil pipe is made up with no-hub bends: the centre stop of each coupling comes off if you enter it'}. The takeouts are the maker's, from your fitting library for this line, the same ones Cut Length uses. Set the elbow angle to one the fittings are made in.`
        }
      />

      <PipeSheet
        visible={pipe.sheetOpen}
        onClose={pipe.closeSheet}
        nps={pipe.nps}
        kind={pipe.kind}
        schedule={pipe.schedule}
        onChange={pipe.change}
      />
    </Screen>
  );
}
