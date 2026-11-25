import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DerivedField, DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { AngleFromPipe } from '../components/AngleFromPipe';
import { AccentButton, ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, SpoolBar, StatGrid, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { OffsetDiagram } from '../components/diagram/OffsetDiagram';
import { useUnits } from '../hooks/useUnits';
import { figureText, useSpokenFigures } from '../voice/figures';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useSettings } from '../state/settings';
import { StockNote } from '../components/StockNote';
import { solveOffset } from '../calc/offset';
import { parseNumber } from '../calc/format';
import { useOffsetJoint } from '../hooks/useOffsetJoint';
import { SetTakeout } from '../components/SetTakeout';

export function SimpleOffsetScreen() {
  const [readAngle, setReadAngle] = useState(false);
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();
  // Butt weld, screwed, PVC socket or no-hub, by what the job's pipe is.
  const fit = useOffsetJoint(pipe.nps, pipe.kind);

  const [offset, setOffset] = useState('');
  const [runOverride, setRunOverride] = useState('');
  const [gap, setGap] = useState('');
  const [angleText, setAngleText] = useState('45');
  const [lockRun, setLockRun] = useState(false);
  const [mode, setMode] = useState<'pipe' | 'elbow'>('pipe');

  const fittingAngle = parseNumber(angleText);
  // Spoken: "simple offset, 14 and a half at 22 and a half degrees".
  useSpokenFigures('SimpleOffset', (f) => {
    const text = (k: keyof typeof f) => figureText(f[k]!, u.num);
    if (f.offset) setOffset(text('offset'));
    if (f.angle) setAngleText(text('angle'));
    if (f.gap) setGap(text('gap'));
    if (f.run) {
      setRunOverride(text('run'));
      setLockRun(true);
    } else if (f.angle) setLockRun(false);
  });

  // A gap comes off only where the joint leaves one: a weld's root gap, a no-hub coupling's stop.
  const gapInches = fit.hasGap ? (Number.isFinite(u.parse(gap)) ? u.parse(gap) : fit.gapDefault) : 0;
  const result = useMemo(
    () =>
      solveOffset({
        offset: u.parse(offset),
        run: u.parse(runOverride),
        fittingAngle,
        gap: gapInches,
        nps: pipe.nps,
        kind: pipe.kind,
        schedule: pipe.schedule,
        lockRun,
        elbow: fit.elbow,
      }),
    [offset, runOverride, gapInches, fittingAngle, lockRun, pipe.nps, pipe.kind, pipe.schedule, fit.elbow, u]
  );

  // The library elbow this offset turns through, once there are figures to turn it.
  const libraryFitting = Number.isFinite(result.cutAngle) ? fit.libraryFittingAt(result.cutAngle) : null;
  const pristine = !offset.trim();

  const clear = () => {
    setOffset('');
    setRunOverride('');
    setGap('');
    setLockRun(false);
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
      <HintRow text="Step the line sideways round an obstruction and pick the same heading back up. The figure is the piece between the two fittings with the weld gaps already out — mark it straight onto the pipe." />
      <SectionHeader title="Dimensions" meta="Centre-to-centre" />

      <FieldRow>
        {lockRun ? (
          <DimensionInput
            label="Run"
            value={runOverride}
            onChangeText={setRunOverride}
            suffix={u.suffix}
            placeholder="0"
            readout={u.frac(u.parse(runOverride))}
          />
        ) : (
          <DerivedField label="Run (auto)" value={result.valid ? u.num(result.run) : '—'} />
        )}
        <DimensionInput
          label="Offset"
          value={offset}
          onChangeText={setOffset}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(offset))}
        />
      </FieldRow>

      <FieldRow>
        <DimensionInput
          label="Fitting angle"
          value={angleText}
          onChangeText={(v) => {
            setLockRun(false);
            setAngleText(v);
          }}
          suffix="°"
          placeholder="45"
          editable={!lockRun}
          readout={lockRun ? 'Solved from the run' : undefined}
        />
        {fit.hasGap ? (
          <DimensionInput
            label={fit.gapLabel}
            value={gap}
            onChangeText={setGap}
            suffix={u.suffix}
            placeholder={u.num(fit.gapDefault)}
          />
        ) : (
          <DerivedField label="Joint" value={fit.jointName} />
        )}
      </FieldRow>

      <ChipRow
        label="Preset"
        options={fit.presets.map((a) => ({ value: a, label: `${a}°` }))}
        selected={lockRun ? null : fittingAngle}
        onSelect={(a) => {
          setLockRun(false);
          setAngleText(String(a));
        }}
      />

      <ControlRow>
        <GhostButton
          label={lockRun ? 'Auto angle' : 'Set run'}
          icon={lockRun ? 'flash-outline' : 'lock-closed-outline'}
          onPress={() => setLockRun((v) => !v)}
          style={{ flex: 1 }}
        />
        <GhostButton
          label="Off the pipe"
          icon="compass-outline"
          onPress={() => setReadAngle(true)}
          style={{ flex: 1 }}
        />
        <GhostButton label="Clear all" icon="refresh-outline" onPress={clear} style={{ flex: 1 }} />
      </ControlRow>

      <ControlRow>
        <SelectorButton
          primary={pipe.label}
          badge={pipe.kind}
          onPress={pipe.openSheet}
          style={{ flex: 1 }}
        />
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
        <OffsetDiagram
          run={result.run}
          offset={result.offset}
          angleLabel={u.angle(result.cutAngle)}
          offsetLabel={`Offset ${u.num(result.offset)}`}
          runLabel={u.num(result.run)}
          travelLabel={u.num(result.travel)}
          cutLabel={u.num(result.pipeCut)}
        />
      ) : null}

      <ResultBanner
        speak={!pristine && !result.error && result.valid ? { inches: banner.inches } : undefined}
        label={pristine ? banner.label : result.error ? 'Cannot solve' : banner.label}
        value={pristine ? '—' : result.error ? result.error : banner.value}
        hint={pristine ? 'Enter an offset to solve this run' : result.error ? undefined : banner.hint}
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

      {fit.welded && gapInches <= 0 ? <WarningBanner text={`No weld gap set (0 ${u.unitName}). Cut length assumes zero root opening.`} /> : null}

      <StatGrid
        stats={
          fit.welded
            ? [
                { label: 'Cut angle', value: result.valid ? u.angle(result.cutAngle) : '—' },
                { label: 'Inside arc', note: 'Primary — throat', value: result.valid ? u.num(result.throatArc) : '—' },
                { label: 'Setback', note: result.setbackNote, value: result.valid ? u.dual(result.setback) : '—' },
                { label: 'Outside arc', note: 'Alternative', value: result.valid ? u.num(result.backArc) : '—' },
                { label: 'Travel', value: result.valid ? u.dual(result.travel) : '—' },
                { label: 'Shrink', value: result.valid ? u.dual(result.shrink) : '—' },
              ]
            : [
                { label: 'Fitting', note: fit.jointName, value: fit.presets.some((x) => Math.abs(x - result.cutAngle) < 1e-6) ? fit.fittingName(result.cutAngle) : '—' },
                { label: 'Setback', note: result.setbackNote || undefined, value: result.valid ? u.dual(result.setback) : '—' },
                { label: 'Travel', value: result.valid ? u.dual(result.travel) : '—' },
                { label: 'Shrink', value: result.valid ? u.dual(result.shrink) : '—' },
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
            ? 'Centre-to-centre (C2C) geometry. Bought elbows take out the handbook figure (2-42) at 90° and 45°, the same as Cut Length; any other angle is an elbow cut down to it, worked from the bend radius. Bending the pipe instead? Use Pipe bend. Fitting weights are estimates.'
            : fit.joint === 'screwed'
              ? 'Centre-to-centre (C2C) geometry. Galvanised is made up with screwed elbows: the takeout is the handbook\'s, centre to the end of the pipe made up tight (4-37, 4-39), so no gap comes off. Screwed elbows are made at 90° and 45°.'
              : `Centre-to-centre (C2C) geometry. ${fit.joint === 'socket' ? 'PVC and CPVC are made up with socket elbows: the pipe bottoms in the socket, so no gap comes off' : 'Cast iron soil pipe is made up with no-hub bends: the centre stop of each coupling comes off if you enter it'}. The takeouts are the maker's, from your fitting library for this line, the same ones Cut Length uses.`
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
      <AngleFromPipe
        visible={readAngle}
        onClose={() => setReadAngle(false)}
        title="Fitting angle"
        onUse={(deg) => {
          setLockRun(false);
          setAngleText(deg.toFixed(1));
        }}
      />

    </Screen>
  );
}
