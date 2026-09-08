import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DerivedField, DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { AccentButton, ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, SpoolBar, StatGrid, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { useUnits } from '../hooks/useUnits';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useSettings } from '../state/settings';
import { FITTING_ANGLES } from '../calc/pipe';
import { solveOffset } from '../calc/offset';

export function SimpleOffsetScreen() {
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();

  const [offset, setOffset] = useState('');
  const [runOverride, setRunOverride] = useState('');
  const [gap, setGap] = useState('');
  const [fittingAngle, setFittingAngle] = useState<number>(45);
  const [lockRun, setLockRun] = useState(false);
  const [mode, setMode] = useState<'pipe' | 'elbow'>('pipe');

  const result = useMemo(
    () =>
      solveOffset({
        offset: u.parse(offset),
        run: u.parse(runOverride),
        fittingAngle,
        gap: Number.isFinite(u.parse(gap)) ? u.parse(gap) : settings.defaultGap,
        nps: pipe.nps,
        kind: pipe.kind,
        schedule: pipe.schedule,
        lockRun,
      }),
    [offset, runOverride, gap, fittingAngle, lockRun, pipe.nps, pipe.kind, pipe.schedule, settings.defaultGap, u]
  );

  const gapInches = Number.isFinite(u.parse(gap)) ? u.parse(gap) : settings.defaultGap;
  const pristine = !offset.trim();

  const clear = () => {
    setOffset('');
    setRunOverride('');
    setGap('');
    setLockRun(false);
    setFittingAngle(45);
  };

  const banner =
    mode === 'elbow'
      ? {
          label: 'Elbow cut — throat arc',
          value: result.valid ? `${u.num(result.throatArc)} ${u.unitName}` : '—',
          hint: result.valid ? `Wrap from throat · Back arc ${u.num(result.backArc)} ${u.unitName}` : undefined,
        }
      : {
          label: 'Pipe cut',
          value: result.valid ? `${u.num(result.pipeCut)} ${u.unitName}` : '—',
          hint: result.valid ? `Mark & cut this length · Travel ${u.num(result.travel)} ${u.unitName}` : undefined,
        };

  return (
    <Screen>
      <HintRow text="Get around an obstruction in one plane. Enter the run and the offset; get the pipe length to cut, weld gaps deducted." />
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
        <DimensionInput
          label="Gap/joint"
          value={gap}
          onChangeText={setGap}
          suffix={u.suffix}
          placeholder={u.num(settings.defaultGap)}
        />
      </FieldRow>

      <ChipRow
        label="Fitting"
        options={FITTING_ANGLES.map((a) => ({ value: a, label: `${a}°` }))}
        selected={lockRun ? null : fittingAngle}
        onSelect={(a) => {
          setLockRun(false);
          setFittingAngle(a);
        }}
      />

      <ControlRow>
        <GhostButton
          label={lockRun ? 'Auto angle' : 'Set run'}
          icon={lockRun ? 'flash-outline' : 'lock-closed-outline'}
          onPress={() => setLockRun((v) => !v)}
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
        <AccentButton
          label={mode === 'pipe' ? 'Elbow cut' : 'Pipe cut'}
          icon="cut-outline"
          onPress={() => setMode((m) => (m === 'pipe' ? 'elbow' : 'pipe'))}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <ResultBanner
        label={pristine ? banner.label : result.error ? 'Cannot solve' : banner.label}
        value={pristine ? '—' : result.error ? result.error : banner.value}
        hint={pristine ? 'Enter an offset to solve this run' : result.error ? undefined : banner.hint}
        tone={pristine ? 'idle' : result.error ? 'error' : 'default'}
      />

      <MetaBar
        text={`${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Stock ${u.num(settings.stockLength)} ${u.unitName}`}
      />

      {gapInches <= 0 ? <WarningBanner text={`No weld gap set (0 ${u.unitName}). Cut length assumes zero root opening.`} /> : null}

      <StatGrid
        stats={[
          { label: 'Cut angle', value: result.valid ? u.angle(result.cutAngle) : '—' },
          { label: 'Inside arc', note: 'Primary — throat', value: result.valid ? u.num(result.throatArc) : '—' },
          { label: 'Setback', value: result.valid ? u.dual(result.setback) : '—' },
          { label: 'Outside arc', note: 'Alternative', value: result.valid ? u.num(result.backArc) : '—' },
          { label: 'Travel', value: result.valid ? u.dual(result.travel) : '—' },
          { label: 'Shrink', value: result.valid ? u.dual(result.shrink) : '—' },
        ]}
      />

      <MetaBar text={`Centreline arc ${result.valid ? u.num(result.centerlineArc) : '—'} ${u.unitName}`} />

      <SpoolBar
        badge={`SCH ${pipe.schedule}`}
        text={
          result.valid
            ? `Spool weight ${u.weight(result.spoolTotal, 2)} · pipe ${u.weight(result.spoolPipe, 2)} + 2× elbow ${u.weight(
                result.spoolElbows / 2,
                2
              )} + 2 welds ${u.weight(result.spoolWelds, 2)}`
            : 'Spool weight unavailable'
        }
      />

      <FooterNote text="Centre-to-centre (C2C) geometry. Elbow takeouts from ASME B16.9 bend radii. Fitting weights are estimates." />

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
