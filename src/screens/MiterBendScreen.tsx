import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, StatGrid, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { useUnits } from '../hooks/useUnits';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { bendRadius } from '../calc/pipe';
import { solveMiter } from '../calc/miter';

export function MiterBendScreen() {
  const u = useUnits();
  const pipe = usePipeConfig();

  const [totalAngle, setTotalAngle] = useState(90);
  const [segments, setSegments] = useState(3);
  const [radiusOverride, setRadiusOverride] = useState('');

  const defaultRadius = bendRadius(pipe.nps, pipe.kind);
  const centerlineRadius = Number.isFinite(u.parse(radiusOverride)) ? u.parse(radiusOverride) : defaultRadius;

  const result = useMemo(
    () => solveMiter({ totalAngle, segments, nps: pipe.nps, schedule: pipe.schedule, centerlineRadius }),
    [totalAngle, segments, pipe.nps, pipe.schedule, centerlineRadius]
  );

  return (
    <Screen>
      <HintRow text="Fabricate an elbow from straight pipe. Enter the total turn and how many segments you want; get the cut angle and the throat and back lengths for each segment." />
      <SectionHeader title="Bend" meta="Centreline geometry" />

      <ChipRow
        label="Turn"
        options={[
          { value: 90, label: '90°' },
          { value: 60, label: '60°' },
          { value: 45, label: '45°' },
          { value: 30, label: '30°' },
          { value: 22.5, label: '22.5°' },
        ]}
        selected={totalAngle}
        onSelect={setTotalAngle}
      />

      <ChipRow
        label="Segments"
        options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
        selected={segments}
        onSelect={setSegments}
      />

      <FieldRow>
        <DimensionInput
          label="Centreline radius"
          value={radiusOverride}
          onChangeText={setRadiusOverride}
          suffix={u.suffix}
          placeholder={u.num(defaultRadius)}
          readout={radiusOverride ? u.frac(u.parse(radiusOverride)) : `Default ${pipe.kind} = ${u.num(defaultRadius)} ${u.unitName}`}
        />
      </FieldRow>

      <ControlRow>
        <SelectorButton primary={pipe.label} badge={pipe.kind} onPress={pipe.openSheet} style={{ flex: 1 }} />
        <GhostButton
          label="Clear all"
          icon="refresh-outline"
          onPress={() => {
            setTotalAngle(90);
            setSegments(3);
            setRadiusOverride('');
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <ResultBanner
        label={result.error ? 'Cannot solve' : 'Cut angle'}
        value={result.error ? result.error : u.angle(result.cutAngle, 2)}
        hint={
          result.valid
            ? `${result.cuts} cut${result.cuts === 1 ? '' : 's'} · Set the saw to this angle from square`
            : undefined
        }
        tone={result.error ? 'error' : 'default'}
      />

      <MetaBar text={`${pipe.label} · SCH ${pipe.schedule} · ${segments} segments · ${u.num(centerlineRadius)} ${u.unitName} CLR`} />

      {result.codeWarning ? <WarningBanner text={result.codeWarning} tone="danger" /> : null}

      <StatGrid
        stats={[
          { label: 'Throat length', note: 'Short side of segment', value: result.valid ? u.dual(result.throatLength) : '—' },
          { label: 'Back length', note: 'Long side of segment', value: result.valid ? u.dual(result.backLength) : '—' },
          { label: 'End segment', note: 'One mitred face', value: result.valid ? u.angle(result.endSegmentAngle, 2) : '—' },
          { label: 'Mid segment', note: 'Two mitred faces', value: result.valid ? u.angle(result.midSegmentAngle, 2) : '—' },
          { label: 'Cutback', value: result.valid ? u.dual(result.cutbackMax) : '—' },
          { label: 'Centreline arc', value: result.valid ? u.dual(result.centerlineArc) : '—' },
        ]}
      />

      <FooterNote text="Throat and back lengths are measured along the pipe wall between adjacent cuts. Miter joints in pressure piping must satisfy ASME B31.3 §304.2.3." />

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
