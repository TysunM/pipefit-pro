import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DerivedField, DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { AccentButton, ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, SpoolBar, StatGrid, SummaryRow, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { useUnits } from '../hooks/useUnits';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useSettings } from '../state/settings';
import { FITTING_ANGLES } from '../calc/pipe';
import { solveRolling } from '../calc/rolling';

export function RollingOffsetScreen() {
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();

  const [rise, setRise] = useState('');
  const [roll, setRoll] = useState('');
  const [run, setRun] = useState('');
  const [gap, setGap] = useState('');
  const [fittingAngle, setFittingAngle] = useState<number>(45);
  const [useFittingAngle, setUseFittingAngle] = useState(false);
  const [mode, setMode] = useState<'pipe' | 'elbow'>('pipe');

  const gapInches = Number.isFinite(u.parse(gap)) ? u.parse(gap) : settings.defaultGap;

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
      }),
    [rise, roll, run, fittingAngle, useFittingAngle, gapInches, pipe.nps, pipe.kind, pipe.schedule, u]
  );

  const pristine = !rise.trim() && !roll.trim();

  const clear = () => {
    setRise('');
    setRoll('');
    setRun('');
    setGap('');
    setUseFittingAngle(false);
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
      <HintRow text="Get around an obstruction that shifts in two planes at once. Enter rise and roll; get the true offset and the pipe length to cut." />
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
        <DimensionInput
          label="Gap/joint"
          value={gap}
          onChangeText={setGap}
          suffix={u.suffix}
          placeholder={u.num(settings.defaultGap)}
        />
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

      <ChipRow
        label="Elbow"
        options={FITTING_ANGLES.map((a) => ({ value: a, label: `${a}°` }))}
        selected={useFittingAngle ? fittingAngle : null}
        onSelect={(a) => {
          setUseFittingAngle(true);
          setFittingAngle(a);
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
        hint={pristine ? 'Enter rise and roll to solve' : result.error ? undefined : banner.hint}
        tone={pristine ? 'idle' : result.error ? 'error' : 'default'}
      />

      <MetaBar text={`${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Stock ${u.num(settings.stockLength)} ${u.unitName}`} />

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

      {gapInches <= 0 ? <WarningBanner text={`No weld gap set (0 ${u.unitName}). Cut length assumes zero root opening.`} /> : null}

      <StatGrid
        stats={[
          { label: 'Cut angle', value: result.valid ? u.angle(result.cutAngle) : '—' },
          { label: 'Inside arc', note: 'Primary — throat', value: result.valid ? u.num(result.throatArc) : '—' },
          { label: 'Setback', value: result.valid ? u.dual(result.setback) : '—' },
          { label: 'Outside arc', note: 'Alternative', value: result.valid ? u.num(result.backArc) : '—' },
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

      <FooterNote text="Centre-to-centre (C2C) geometry. Non-standard cut angles require rolling-offset elbows or mitred fabrication." />

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
