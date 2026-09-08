import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, StatGrid } from '../components/Results';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { SaddleType, solveSaddle } from '../calc/saddle';

export function SaddleBendScreen() {
  const t = useTheme();
  const u = useUnits();

  const [type, setType] = useState<SaddleType>('three');
  const [depth, setDepth] = useState('');
  const [width, setWidth] = useState('');
  const [distance, setDistance] = useState('');
  const [centerAngle, setCenterAngle] = useState(45);

  const result = useMemo(
    () =>
      solveSaddle({
        type,
        depth: u.parse(depth),
        width: u.parse(width),
        distanceToObstruction: u.parse(distance),
        centerAngle,
      }),
    [type, depth, width, distance, centerAngle, u]
  );

  const pristine = !depth.trim() && !distance.trim();

  return (
    <Screen>
      <HintRow text="Jump a pipe or beam without changing the conduit line. Enter the obstruction depth and how far it sits from your end; get every bend mark in order." />
      <SectionHeader title="Obstruction" meta="Measured from conduit end" />

      <ChipRow
        label="Saddle"
        options={[
          { value: 'three', label: '3 point' },
          { value: 'four', label: '4 point' },
        ]}
        selected={type}
        onSelect={setType}
      />

      <FieldRow>
        <DimensionInput
          label="Depth"
          value={depth}
          onChangeText={setDepth}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(depth))}
        />
        <DimensionInput
          label="To obstruction"
          value={distance}
          onChangeText={setDistance}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(distance))}
        />
        {type === 'four' ? (
          <DimensionInput
            label="Width"
            value={width}
            onChangeText={setWidth}
            suffix={u.suffix}
            placeholder="0"
            readout={u.frac(u.parse(width))}
          />
        ) : null}
      </FieldRow>

      <ChipRow
        label={type === 'three' ? 'Centre bend' : 'Offset angle'}
        options={[
          { value: 45, label: '45°' },
          { value: 30, label: '30°' },
          { value: 22.5, label: '22.5°' },
        ]}
        selected={centerAngle}
        onSelect={setCenterAngle}
      />

      <ControlRow>
        <GhostButton
          label="Clear all"
          icon="refresh-outline"
          onPress={() => {
            setDepth('');
            setWidth('');
            setDistance('');
            setCenterAngle(45);
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <ResultBanner
        label="First mark"
        value={pristine ? '—' : result.error ? result.error : `${u.num(result.marks[0]?.position ?? NaN)} ${u.unitName}`}
        hint={
          pristine
            ? 'Enter the obstruction depth and its distance from the conduit end'
            : result.valid
              ? `Measure from the conduit end · ${result.marks.length} marks · Shrink ${u.num(result.shrink)} ${u.unitName}`
              : undefined
        }
        tone={pristine ? 'idle' : result.error ? 'error' : 'default'}
      />

      <MetaBar
        text={`${type === 'three' ? '3-point saddle' : '4-point saddle'} · ${
          Number.isFinite(result.sideAngle) ? `${result.sideAngle.toFixed(2)}° bends` : '—'
        } · Multiplier ${Number.isFinite(result.multiplier) ? result.multiplier.toFixed(3) : '—'}`}
      />

      <View>
        {result.marks.map((m, i) => (
          <View
            key={m.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
              paddingHorizontal: t.layout.screenPadding,
              paddingVertical: t.space.lg,
              borderBottomWidth: t.hairline,
              borderBottomColor: t.colors.border,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[t.type.captionStrong, { color: t.colors.onPrimary }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`${u.num(m.position)} ${u.unitName}`}</Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{m.note}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[t.type.statValue, { color: t.colors.text }]}>{u.angle(m.angle)}</Text>
              {u.frac(m.position) ? (
                <Text style={[t.type.caption, { color: t.colors.data }]}>{u.frac(m.position)}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <StatGrid
        stats={[
          { label: 'Multiplier', note: '1 / sin of bend angle', value: Number.isFinite(result.multiplier) ? result.multiplier.toFixed(3) : '—' },
          { label: 'Total shrink', note: 'Run lost across both ends', value: result.valid ? u.dual(result.shrink) : '—' },
          { label: 'Shrink per bend pair', value: result.valid ? u.dual(result.shrinkPerBend) : '—' },
          { label: 'Developed length', note: 'Conduit inside the marks', value: result.valid ? u.dual(result.developedLength) : '—' },
          { label: 'Bend angle', value: Number.isFinite(result.sideAngle) ? u.angle(result.sideAngle, 2) : '—' },
          { label: 'Min. clearance', note: 'Obstruction must sit past this', value: Number.isFinite(result.minimumDistance) ? u.dual(result.minimumDistance) : '—' },
        ]}
      />

      <FooterNote text="Marks are centre-of-bend positions measured along the conduit from the end you start your tape on. Multiplier is 1/sin(angle) and shrink is tan(angle/2) per bend pair — exact centreline geometry, not the rounded field table." />
    </Screen>
  );
}
