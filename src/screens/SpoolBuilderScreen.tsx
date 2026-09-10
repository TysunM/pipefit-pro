import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { AccentButton, ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, SpoolBar, StatGrid, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { SpoolView } from '../components/spool3d/SpoolView';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useSettings } from '../state/settings';
import { CARDINALS, Cardinal, SpoolSegment, makeSegment, solveSpool } from '../calc/spool';
import { parseNumber } from '../calc/format';

let counter = 0;
const nextId = () => `s${(counter += 1)}`;

export function SpoolBuilderScreen() {
  const t = useTheme();
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();

  const [segments, setSegments] = useState<SpoolSegment[]>([
    makeSegment(nextId(), 'N', 36),
    makeSegment(nextId(), 'U', 24),
    makeSegment(nextId(), 'E', 30),
  ]);
  const [gap, setGap] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  const gapInches = Number.isFinite(u.parse(gap)) ? u.parse(gap) : settings.defaultGap;

  const spool = useMemo(
    () => solveSpool({ segments, nps: pipe.nps, kind: pipe.kind, schedule: pipe.schedule, gap: gapInches }),
    [segments, pipe.nps, pipe.kind, pipe.schedule, gapInches]
  );

  const patch = (id: string, next: Partial<SpoolSegment>) =>
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const addRun = () => {
    const last = segments[segments.length - 1];
    const nextDir: Cardinal = last?.cardinal === 'N' ? 'U' : last?.cardinal === 'U' ? 'E' : 'N';
    setSegments((prev) => [...prev, makeSegment(nextId(), nextDir, 24)]);
  };

  const removeRun = (id: string) => setSegments((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  return (
    <Screen>
      <HintRow text="Build the spool one run at a time, then spin it with your finger until it matches what you are looking at. Every cut length and elbow comes out the far side." />

      {spool.valid ? (
        <SpoolView spool={spool} showLabels={showLabels} onPickRun={setSelected} selectedRun={selected} />
      ) : null}

      <ResultBanner
        label="Total pipe"
        value={spool.valid ? `${u.num(spool.totalCut)} ${u.unitName}` : spool.error ?? '—'}
        hint={
          spool.valid
            ? `${spool.runs.length} run${spool.runs.length === 1 ? '' : 's'} · ${spool.elbows.length} elbow${
                spool.elbows.length === 1 ? '' : 's'
              } · C2C ${u.num(spool.totalCenterToCenter)} ${u.unitName}`
            : undefined
        }
        tone={spool.valid ? 'default' : 'error'}
      />

      <MetaBar text={`${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Gap ${u.num(gapInches)} ${u.unitName}`} />

      {gapInches <= 0 ? <WarningBanner text={`No weld gap set (0 ${u.unitName}).`} /> : null}

      <SectionHeader title="Runs" meta="Centre-to-centre" />

      {segments.map((s, i) => (
        <View
          key={s.id}
          style={{
            borderBottomWidth: t.hairline,
            borderBottomColor: t.colors.border,
            backgroundColor: selected === i ? t.colors.bgSubtle : 'transparent',
            paddingBottom: t.space.md,
          }}
        >
          <Pressable
            onPress={() => setSelected(selected === i ? null : i)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
              paddingHorizontal: t.layout.screenPadding,
              paddingTop: t.space.lg,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: selected === i ? t.colors.accent : t.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[t.type.captionStrong, { color: t.colors.onPrimary }]}>{i + 1}</Text>
            </View>
            <Text style={[t.type.bodyStrong, { color: t.colors.text, flex: 1 }]}>
              {spool.valid ? `Cut ${u.num(spool.runs[i]?.cutLength ?? NaN)} ${u.unitName}` : `Run ${i + 1}`}
            </Text>
            <Pressable onPress={() => removeRun(s.id)} hitSlop={10} accessibilityLabel={`Remove run ${i + 1}`}>
              <Ionicons name="trash-outline" size={18} color={t.colors.textFaint} />
            </Pressable>
          </Pressable>

          <ChipRow
            options={[
              ...CARDINALS.map((c) => ({ value: c.id as string, label: c.label })),
              { value: 'polar', label: 'Custom' },
            ]}
            selected={s.mode === 'polar' ? 'polar' : s.cardinal}
            onSelect={(v) =>
              v === 'polar'
                ? patch(s.id, { mode: 'polar' })
                : patch(s.id, { mode: 'cardinal', cardinal: v as Cardinal })
            }
          />

          <FieldRow>
            <DimensionInput
              label="Length"
              value={String(s.length)}
              onChangeText={(v) => patch(s.id, { length: parseNumber(v) })}
              suffix={u.suffix}
              placeholder="0"
              readout={u.frac(s.length)}
            />
            {s.mode === 'polar' ? (
              <>
                <DimensionInput
                  label="Azimuth"
                  value={String(s.azimuth)}
                  onChangeText={(v) => patch(s.id, { azimuth: parseNumber(v) })}
                  suffix="°"
                  placeholder="0"
                />
                <DimensionInput
                  label="Elevation"
                  value={String(s.elevation)}
                  onChangeText={(v) => patch(s.id, { elevation: parseNumber(v) })}
                  suffix="°"
                  placeholder="0"
                />
              </>
            ) : null}
          </FieldRow>
        </View>
      ))}

      <ControlRow>
        <AccentButton label="Add run" icon="add-outline" onPress={addRun} style={{ flex: 1 }} />
        <GhostButton
          label={showLabels ? 'Hide numbers' : 'Show numbers'}
          icon="pricetag-outline"
          onPress={() => setShowLabels((v) => !v)}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <ControlRow>
        <SelectorButton primary={pipe.label} badge={pipe.kind} onPress={pipe.openSheet} style={{ flex: 1 }} />
        <DimensionInput
          label="Gap/joint"
          value={gap}
          onChangeText={setGap}
          suffix={u.suffix}
          placeholder={u.num(settings.defaultGap)}
          style={{ flex: 1 }}
        />
      </ControlRow>

      {spool.valid && spool.elbows.length ? (
        <>
          <SectionHeader title="Elbows" meta="In order along the spool" />
          {spool.elbows.map((e, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: t.space.md,
                paddingHorizontal: t.layout.screenPadding,
                paddingVertical: t.space.lg,
                borderBottomWidth: t.hairline,
                borderBottomColor: t.colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[t.type.label, { color: t.colors.textMuted }]}>{`Elbow ${i + 1}`}</Text>
                <Text style={[t.type.statValue, { color: t.colors.text, marginTop: 2 }]}>{u.angle(e.angle, 1)}</Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                  {Number.isFinite(e.planeChangeFromPrevious)
                    ? `Roll ${u.angle(e.planeChangeFromPrevious, 1)} from the last elbow`
                    : 'First elbow — sets the plane'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{`Takeoff ${u.num(e.takeoff)}`}</Text>
                <Text style={[t.type.caption, { color: t.colors.data, marginTop: 2 }]}>
                  {`Throat ${u.num(e.throatArc)}`}
                </Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                  {`Back ${u.num(e.backArc)}`}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <StatGrid
        stats={[
          { label: 'Total cut', note: 'Pipe to buy', value: spool.valid ? u.dual(spool.totalCut) : '—' },
          { label: 'Centre to centre', value: spool.valid ? u.dual(spool.totalCenterToCenter) : '—' },
          { label: 'Runs', value: spool.valid ? String(spool.runs.length) : '—' },
          { label: 'Elbows', value: spool.valid ? String(spool.elbows.length) : '—' },
          {
            label: 'Envelope',
            note: 'E × Up × N',
            value: spool.valid
              ? `${u.num(spool.bounds.size.x, 0)}×${u.num(spool.bounds.size.y, 0)}×${u.num(spool.bounds.size.z, 0)}`
              : '—',
          },
          { label: 'Longest run', value: spool.valid ? u.dual(Math.max(...spool.runs.map((r) => r.cutLength))) : '—' },
        ]}
      />

      <SpoolBar
        badge={`SCH ${pipe.schedule}`}
        text={spool.valid ? `Pipe weight ${u.weight(spool.weight, 2)} for ${u.num(spool.totalCut)} ${u.unitName}` : 'Weight unavailable'}
      />

      <FooterNote text="Runs are centre-to-centre. Each cut deducts the takeoff of the fitting at each end plus the weld gap, using the same ASME B16.9 geometry as the other calculators. Roll is the angle between one elbow's bend plane and the last one's." />

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
