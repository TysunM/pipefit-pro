import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DerivedField, DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { AngleFromPipe } from '../components/AngleFromPipe';
import { FooterNote, MetaBar, ResultBanner, StatGrid, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { MiterDiagram } from '../components/diagram/MiterDiagram';
import { useUnits } from '../hooks/useUnits';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { bendRadius, findSize } from '../calc/pipe';
import { solveMiter } from '../calc/miter';
import { parseNumber } from '../calc/format';

export function MiterBendScreen() {
  const [readAngle, setReadAngle] = useState(false);
  const u = useUnits();
  const pipe = usePipeConfig();

  const [angleText, setAngleText] = useState('90');
  const [segments, setSegments] = useState(3);
  const [radiusOverride, setRadiusOverride] = useState('');

  const totalAngle = parseNumber(angleText);
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

      <FieldRow>
        <DimensionInput
          label="Total turn"
          value={angleText}
          onChangeText={setAngleText}
          suffix="°"
          placeholder="90"
        />
        <DerivedField label="Cut angle" value={result.valid ? u.angle(result.cutAngle, 2) : '—'} />
      </FieldRow>

      <ChipRow
        label="Preset"
        options={[90, 60, 45, 30, 22.5, 11.25].map((a) => ({ value: a, label: `${a}°` }))}
        selected={totalAngle}
        onSelect={(a) => setAngleText(String(a))}
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
        <GhostButton
          label="Off the pipe"
          icon="compass-outline"
          onPress={() => setReadAngle(true)}
          style={{ flex: 1 }}
        />
        <SelectorButton primary={pipe.label} badge={pipe.kind} onPress={pipe.openSheet} style={{ flex: 1 }} />
        <GhostButton
          label="Clear all"
          icon="refresh-outline"
          onPress={() => {
            setAngleText('90');
            setSegments(3);
            setRadiusOverride('');
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      {result.valid ? (
        <MiterDiagram
          totalAngle={totalAngle}
          segments={segments}
          radius={centerlineRadius}
          od={findSize(pipe.nps).od}
          cutLabel={u.angle(result.cutAngle, 2)}
          throatLabel={u.num(result.throatLength)}
          backLabel={u.num(result.backLength)}
        />
      ) : null}

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
      <AngleFromPipe
        visible={readAngle}
        onClose={() => setReadAngle(false)}
        title="Total turn"
        onUse={(deg) => setAngleText(deg.toFixed(1))}
      />

    </Screen>
  );
}
