import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, SpoolBar, StatGrid } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { useUnits } from '../hooks/useUnits';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useSettings } from '../state/settings';
import { StockNote } from '../components/StockNote';
import { END_FITTINGS, EndFitting, FITTING_SOURCE, endHasGap, solveCutLength } from '../calc/cutLength';
import { JointKind, TAKEOFF_FAMILIES, optionsForFamily } from '../calc/takeoffCatalog';
import { FlangeClass, flangedClasses } from '../calc/flangedFitting';

export function CutLengthScreen() {
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();

  const [c2c, setC2c] = useState('');
  const [gap, setGap] = useState('');
  const [family, setFamily] = useState<JointKind>('welded');
  const [flangeClass, setFlangeClass] = useState<FlangeClass>('150');
  const [endA, setEndA] = useState<EndFitting>('weld90');
  const [endB, setEndB] = useState<EndFitting>('weld90');
  const [customA, setCustomA] = useState('');
  const [customB, setCustomB] = useState('');

  const gapInches = Number.isFinite(u.parse(gap)) ? u.parse(gap) : settings.defaultGap;

  const result = useMemo(
    () =>
      solveCutLength({
        centerToCenter: u.parse(c2c),
        endA,
        endB,
        customA: u.parse(customA),
        customB: u.parse(customB),
        gap: gapInches,
        nps: pipe.nps,
        kind: pipe.kind,
        schedule: pipe.schedule,
        flangeClass,
      }),
    [c2c, endA, endB, customA, customB, gapInches, flangeClass, pipe.nps, pipe.kind, pipe.schedule, u]
  );

  const pristine = !c2c.trim();

  // The fittings offered follow how the run is being joined. Switching the
  // family moves both ends onto something that family actually makes.
  const options = useMemo(
    () => optionsForFamily(family).map((f) => ({ value: f.id, label: f.label })),
    [family]
  );
  const familyOptions = TAKEOFF_FAMILIES.map((f) => ({ value: f.id, label: f.label }));
  const classOptions = flangedClasses().map((c) => ({ value: c, label: `${c} lb` }));
  const gapApplies = endHasGap(endA) || endHasGap(endB);
  const gapNote = TAKEOFF_FAMILIES.find((f) => f.id === family)?.gapLabel ?? '';

  const pickFamily = (next: JointKind) => {
    setFamily(next);
    const first = optionsForFamily(next).find((o) => o.id !== 'none' && o.id !== 'custom');
    if (first) {
      setEndA((prev) => (optionsForFamily(next).some((o) => o.id === prev) ? prev : first.id));
      setEndB((prev) => (optionsForFamily(next).some((o) => o.id === prev) ? prev : first.id));
    }
  };

  return (
    <Screen>
      <HintRow text="Turn a centre-to-centre dimension into a pipe cut. Pick how it is joined and what is on each end; the takeouts come straight out of the handbook tables." />
      <SectionHeader title="Dimensions" meta="Centre-to-centre" />

      <FieldRow>
        <DimensionInput
          label="C2C length"
          value={c2c}
          onChangeText={setC2c}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(c2c))}
        />
        <DimensionInput
          label="Gap/joint"
          value={gap}
          onChangeText={setGap}
          suffix={u.suffix}
          placeholder={gapApplies ? u.num(settings.defaultGap) : '—'}
          editable={gapApplies}
        />
      </FieldRow>

      <ChipRow label="Joint" options={familyOptions} selected={family} onSelect={pickFamily} />
      {family === 'flanged' ? (
        <ChipRow label="Class" options={classOptions} selected={flangeClass} onSelect={setFlangeClass} />
      ) : null}

      <ChipRow label="End A" options={options} selected={endA} onSelect={setEndA} />
      {endA === 'custom' ? (
        <FieldRow>
          <DimensionInput label="End A takeout" value={customA} onChangeText={setCustomA} suffix={u.suffix} placeholder="0" />
        </FieldRow>
      ) : null}

      <ChipRow label="End B" options={options} selected={endB} onSelect={setEndB} />
      {endB === 'custom' ? (
        <FieldRow>
          <DimensionInput label="End B takeout" value={customB} onChangeText={setCustomB} suffix={u.suffix} placeholder="0" />
        </FieldRow>
      ) : null}

      <ControlRow>
        <SelectorButton primary={pipe.label} badge={pipe.kind} onPress={pipe.openSheet} style={{ flex: 1 }} />
        <GhostButton
          label="Clear all"
          icon="refresh-outline"
          onPress={() => {
            setC2c('');
            setGap('');
            setCustomA('');
            setCustomB('');
            setFamily('welded');
            setEndA('weld90');
            setEndB('weld90');
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <ResultBanner
        label="Pipe cut"
        value={pristine ? '—' : result.error ? result.error : `${u.num(result.pipeCut)} ${u.unitName}`}
        hint={
          pristine
            ? `Enter a centre-to-centre dimension · Deduction ${u.num(result.totalDeduction)} ${u.unitName}`
            : result.valid
              ? `Mark & cut this length · Total deduction ${u.num(result.totalDeduction)} ${u.unitName}`
              : undefined
        }
        tone={pristine ? 'idle' : result.error ? 'error' : 'default'}
      />

      <MetaBar text={`${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Stock ${u.num(settings.stockLength)} ${u.unitName}`} />
      {result.valid ? (
        <StockNote
          cut={result.pipeCut}
          stock={settings.stockLength}
          kerf={settings.cutAllowance}
          length={(v) => `${u.num(v)} ${u.unitName}`}
        />
      ) : null}

      <StatGrid
        stats={[
          { label: 'End A takeout', note: END_FITTINGS.find((f) => f.id === endA)?.label, value: u.dual(result.takeoffA) },
          { label: 'End B takeout', note: END_FITTINGS.find((f) => f.id === endB)?.label, value: u.dual(result.takeoffB) },
          { label: 'Joint gaps', note: gapApplies ? `${result.gapEnds} end${result.gapEnds === 1 ? '' : 's'}` : 'none', value: gapApplies ? u.num(gapInches) : '—' },
          { label: 'Total deduction', value: u.dual(result.totalDeduction) },
        ]}
      />

      <SpoolBar
        badge={`SCH ${pipe.schedule}`}
        text={result.valid ? `Pipe weight ${u.weight(result.weight, 2)} for this cut` : 'Pipe weight unavailable'}
      />

      <FooterNote
        text={`End A — ${FITTING_SOURCE[endA]}.  End B — ${FITTING_SOURCE[endB]}.  ${gapNote}.  Every takeout is shown above; check it against the fitting in your hand before you cut.`}
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
