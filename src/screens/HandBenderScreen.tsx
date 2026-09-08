import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, StatGrid } from '../components/Results';
import { useUnits } from '../hooks/useUnits';
import { BENDER_PRESETS, solveBender } from '../calc/bender';
import { parseNumber } from '../calc/format';

export function HandBenderScreen() {
  const u = useUnits();
  const [presetId, setPresetId] = useState(BENDER_PRESETS[0]!.id);
  const [angleText, setAngleText] = useState('90');
  const [radiusOverride, setRadiusOverride] = useState('');
  const [takeUpOverride, setTakeUpOverride] = useState('');
  const [stub, setStub] = useState('');

  const preset = BENDER_PRESETS.find((p) => p.id === presetId) ?? BENDER_PRESETS[0]!;
  const radius = Number.isFinite(u.parse(radiusOverride)) ? u.parse(radiusOverride) : preset.radius;
  const takeUp = Number.isFinite(u.parse(takeUpOverride)) ? u.parse(takeUpOverride) : preset.takeUp;
  const angleValue = parseNumber(angleText);

  const result = useMemo(
    () => solveBender({ angle: angleValue, radius, takeUp, stubHeight: u.parse(stub) }),
    [angleValue, radius, takeUp, stub, u]
  );

  return (
    <Screen>
      <HintRow text="Any angle, any tool. Enter the bend angle and radius; get setback, arc length and gain so your marks land where you want them." />
      <SectionHeader title="Bend" meta="Free angle" />

      <ChipRow
        label="Tool"
        options={BENDER_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
        selected={presetId}
        onSelect={(id) => {
          setPresetId(id);
          setRadiusOverride('');
          setTakeUpOverride('');
        }}
      />

      <FieldRow>
        <DimensionInput label="Angle" value={angleText} onChangeText={setAngleText} suffix="°" placeholder="90" />
        <DimensionInput
          label="Radius"
          value={radiusOverride}
          onChangeText={setRadiusOverride}
          suffix={u.suffix}
          placeholder={u.num(preset.radius)}
        />
        <DimensionInput
          label="Take-up"
          value={takeUpOverride}
          onChangeText={setTakeUpOverride}
          suffix={u.suffix}
          placeholder={u.num(preset.takeUp)}
        />
      </FieldRow>

      <ChipRow
        label="Preset"
        options={[10, 22.5, 30, 45, 60, 90].map((a) => ({ value: a, label: `${a}°` }))}
        selected={angleValue}
        onSelect={(a) => setAngleText(String(a))}
      />

      <FieldRow>
        <DimensionInput
          label="Stub height"
          value={stub}
          onChangeText={setStub}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(stub))}
        />
      </FieldRow>

      <ControlRow>
        <GhostButton
          label="Clear all"
          icon="refresh-outline"
          onPress={() => {
            setAngleText('90');
            setRadiusOverride('');
            setTakeUpOverride('');
            setStub('');
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <ResultBanner
        label={result.error ? 'Cannot solve' : Number.isFinite(result.stubMark) ? 'Stub mark' : 'Setback'}
        value={
          result.error
            ? result.error
            : Number.isFinite(result.stubMark)
              ? `${u.num(result.stubMark)} ${u.unitName}`
              : `${u.num(result.setback)} ${u.unitName}`
        }
        hint={
          result.valid
            ? Number.isFinite(result.stubMark)
              ? `Stub height minus take-up ${u.num(takeUp)} ${u.unitName} · Setback ${u.num(result.setback)} ${u.unitName}`
              : `Measure back from the point of intersection · Arc ${u.num(result.arcLength)} ${u.unitName}`
            : undefined
        }
        tone={result.error ? 'error' : 'default'}
      />

      <MetaBar text={`${preset.label} · ${preset.note} · R ${u.num(radius)} ${u.unitName}`} />

      <StatGrid
        stats={[
          { label: 'Setback', note: 'Per tangent', value: result.valid ? u.dual(result.setback) : '—' },
          { label: 'Arc length', note: 'Material in the bend', value: result.valid ? u.dual(result.arcLength) : '—' },
          { label: 'Gain', note: 'Tangents minus arc', value: result.valid ? u.dual(result.gain) : '—' },
          { label: 'Tangent total', value: result.valid ? u.dual(result.tangentTotal) : '—' },
        ]}
      />

      <FooterNote text="Setback is R·tan(θ/2); arc length is R·θ. Take-up values are tool-specific — confirm against the marks stamped on your bender." />
    </Screen>
  );
}
