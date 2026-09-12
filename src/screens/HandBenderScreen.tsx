import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, StatGrid } from '../components/Results';
import { useUnits } from '../hooks/useUnits';
import { BenderDiagram } from '../components/diagram/BenderDiagram';
import { RADIUS_RULES, radiusFromRule, solveBender } from '../calc/bender';
import { PIPE_SIZES, findSize } from '../calc/pipe';
import { parseNumber } from '../calc/format';

export function HandBenderScreen() {
  const u = useUnits();
  const [nps, setNps] = useState(2);
  const [ruleId, setRuleId] = useState(RADIUS_RULES[1]!.id);
  const [angleText, setAngleText] = useState('90');
  const [radiusOverride, setRadiusOverride] = useState('');
  const [springbackText, setSpringbackText] = useState('');
  const [leg, setLeg] = useState('');

  const rule = RADIUS_RULES.find((r) => r.id === ruleId) ?? RADIUS_RULES[1]!;
  const ruleRadius = radiusFromRule(nps, rule.multiple);
  const radius = Number.isFinite(u.parse(radiusOverride)) ? u.parse(radiusOverride) : ruleRadius;
  const angleValue = parseNumber(angleText);
  const springback = parseNumber(springbackText);

  const result = useMemo(
    () => solveBender({ angle: angleValue, radius, springback, legLength: u.parse(leg) }),
    [angleValue, radius, springback, leg, u]
  );

  const size = findSize(nps);
  const marked = Number.isFinite(result.markFromEnd);

  return (
    <Screen>
      <HintRow text="Any angle, any radius. Enter the bend and get setback, arc length and gain so your marks land where you want them." />
      <SectionHeader title="Bend" meta="Free angle" />

      <ChipRow
        label="Size"
        options={PIPE_SIZES.map((s) => ({ value: s.nps, label: s.label }))}
        selected={nps}
        onSelect={(v) => {
          setNps(v);
          setRadiusOverride('');
        }}
      />

      <ChipRow
        label="Radius"
        options={RADIUS_RULES.map((r) => ({ value: r.id, label: r.label }))}
        selected={ruleId}
        onSelect={(id) => {
          setRuleId(id);
          setRadiusOverride('');
        }}
      />

      <FieldRow>
        <DimensionInput label="Angle" value={angleText} onChangeText={setAngleText} suffix="°" placeholder="90" />
        <DimensionInput
          label="Radius"
          value={radiusOverride}
          onChangeText={setRadiusOverride}
          suffix={u.suffix}
          placeholder={u.num(ruleRadius)}
        />
        <DimensionInput
          label="Springback"
          value={springbackText}
          onChangeText={setSpringbackText}
          suffix="°"
          placeholder="0"
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
          label="Leg length"
          value={leg}
          onChangeText={setLeg}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(leg))}
        />
      </FieldRow>

      <ControlRow>
        <GhostButton
          label="Clear all"
          icon="refresh-outline"
          onPress={() => {
            setAngleText('90');
            setRadiusOverride('');
            setSpringbackText('');
            setLeg('');
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      {result.valid ? (
        <BenderDiagram
          angleDeg={angleValue}
          radius={radius}
          setbackLabel={u.num(result.setback)}
          arcLabel={u.num(result.arcLength)}
          angleLabel={u.angle(angleValue)}
        />
      ) : null}

      <ResultBanner
        label={result.error ?? result.legError ? 'Cannot solve' : marked ? 'Mark from end' : 'Setback'}
        value={
          result.error
            ? result.error
            : result.legError
              ? result.legError
              : marked
                ? `${u.num(result.markFromEnd)} ${u.unitName}`
                : `${u.num(result.setback)} ${u.unitName}`
        }
        hint={
          result.error || result.legError
            ? undefined
            : marked
              ? `Leg minus setback ${u.num(result.setback)} ${u.unitName} · Arc ${u.num(result.arcLength)} ${u.unitName}`
              : `Measure back from the point of intersection · Arc ${u.num(result.arcLength)} ${u.unitName}`
        }
        tone={result.error || result.legError ? 'error' : 'default'}
      />

      <MetaBar
        text={`${size.label} · ${rule.label} ${rule.note} · R ${u.num(radius)} ${u.unitName}${
          Number.isFinite(result.overbendAngle) && result.overbendAngle !== angleValue
            ? ` · bend to ${u.angle(result.overbendAngle)}`
            : ''
        }`}
      />

      <StatGrid
        stats={[
          { label: 'Setback', note: 'Per tangent', value: result.valid ? u.dual(result.setback) : '—' },
          { label: 'Arc length', note: 'Material in the bend', value: result.valid ? u.dual(result.arcLength) : '—' },
          { label: 'Gain', note: 'Tangents minus arc', value: result.valid ? u.dual(result.gain) : '—' },
          { label: 'Tangent total', value: result.valid ? u.dual(result.tangentTotal) : '—' },
        ]}
      />

      <FooterNote text="Setback is R·tan(θ/2); arc length is R·θ. Radius rules are multiples of nominal size — confirm the die you are using and the minimum radius the line spec allows. Springback varies with material, wall and temperature; enter what your own test bend gave you." />
    </Screen>
  );
}
