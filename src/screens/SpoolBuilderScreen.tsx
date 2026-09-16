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
import { BEND_PRESETS, MAX_LEGS, ROLL_PRESETS, SpoolLeg, flipAll, flipLeg, makeLeg, mirrorLegs, rollLabel, solveSpool } from '../calc/spool';
import { parseNumber } from '../calc/format';

let counter = 0;
const nextId = () => `leg${(counter += 1)}`;

export function SpoolBuilderScreen() {
  const t = useTheme();
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();

  const [legs, setLegs] = useState<SpoolLeg[]>([
    makeLeg(nextId(), 36, 0, 0),
    makeLeg(nextId(), 24, 90, 0),
    makeLeg(nextId(), 30, 90, 90),
  ]);
  const [gap, setGap] = useState('');
  const [open, setOpen] = useState<number | null>(0);
  // Roll is what handedness lives in, so a spool with none is flat and is its
  // own mirror. Worth saying, or Mirror looks broken on the default spool.
  const rolled = legs.some((l, i) => i > 0 && ((l.roll % 360) + 360) % 360 !== 0);

  const gapInches = Number.isFinite(u.parse(gap)) ? u.parse(gap) : settings.defaultGap;

  const spool = useMemo(
    () => solveSpool({ legs, nps: pipe.nps, kind: pipe.kind, schedule: pipe.schedule, gap: gapInches }),
    [legs, pipe.nps, pipe.kind, pipe.schedule, gapInches]
  );

  const patch = (id: string, next: Partial<SpoolLeg>) =>
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...next } : l)));

  const setLength = (index: number, inches: number) =>
    setLegs((prev) => prev.map((l, i) => (i === index ? { ...l, length: Math.round(inches * 16) / 16 } : l)));

  const addLeg = () => {
    if (legs.length >= MAX_LEGS) return;
    setLegs((prev) => [...prev, makeLeg(nextId(), 24, 90, 0)]);
    setOpen(legs.length);
  };

  const removeLeg = (id: string) =>
    setLegs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((l) => l.id !== id);
      return next.map((l, i) => (i === 0 ? { ...l, bend: 0, roll: 0 } : l));
    });

  return (
    <Screen>
      <HintRow text="Each leg turns off the last one by a bend angle and a roll. Hold a leg in the picture and drag along it to stretch or shorten it." />

      {spool.valid ? (
        <SpoolView
          spool={spool}
          showLabels
          selectedRun={open}
          onPickRun={setOpen}
          onResizeLeg={setLength}
          lengthLabel={(v) => `${u.num(v)} ${u.unitName}`}
        />
      ) : null}

      <ResultBanner
        label="Total pipe"
        value={spool.valid ? `${u.num(spool.totalCut)} ${u.unitName}` : spool.error ?? '—'}
        hint={
          spool.valid
            ? `${spool.runs.length} leg${spool.runs.length === 1 ? '' : 's'} · ${spool.elbows.length} elbow${
                spool.elbows.length === 1 ? '' : 's'
              } · C2C ${u.num(spool.totalCenterToCenter)} ${u.unitName}`
            : undefined
        }
        tone={spool.valid ? 'default' : 'error'}
      />

      <MetaBar text={`${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Gap ${u.num(gapInches)} ${u.unitName}`} />
      {gapInches <= 0 ? <WarningBanner text={`No weld gap set (0 ${u.unitName}).`} /> : null}

      <SectionHeader title="Legs" meta={`${legs.length} of ${MAX_LEGS}`} />

      {legs.map((l, i) => {
        const run = spool.valid ? spool.runs[i] : undefined;
        const expanded = open === i;
        return (
          <View
            key={l.id}
            style={{
              borderBottomWidth: t.hairline,
              borderBottomColor: t.colors.border,
              backgroundColor: expanded ? t.colors.bgSubtle : 'transparent',
            }}
          >
            <Pressable
              onPress={() => setOpen(expanded ? null : i)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.md,
                paddingHorizontal: t.layout.screenPadding,
                paddingVertical: t.space.lg,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: expanded ? t.colors.accent : t.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[t.type.captionStrong, { color: t.colors.onPrimary }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>
                  {run ? `Cut ${u.num(run.cutLength)} ${u.unitName}` : `Leg ${i + 1}`}
                </Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                  {i === 0
                    ? `${u.num(l.length)} ${u.unitName} · start of the spool`
                    : `${u.num(l.length)} ${u.unitName} · ${l.bend}° bend rolled ${rollLabel(l.roll)}`}
                </Text>
              </View>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={t.colors.textFaint}
              />
              {i > 0 ? (
                <Pressable
                  onPress={() => setLegs((ls) => flipLeg(ls, i))}
                  hitSlop={12}
                  accessibilityLabel={`Flip leg ${i + 1} the other way`}
                >
                  <Ionicons name="swap-vertical-outline" size={18} color={t.colors.textFaint} />
                </Pressable>
              ) : null}
              {legs.length > 1 ? (
                <Pressable onPress={() => removeLeg(l.id)} hitSlop={12} accessibilityLabel={`Remove leg ${i + 1}`}>
                  <Ionicons name="trash-outline" size={18} color={t.colors.textFaint} />
                </Pressable>
              ) : null}
            </Pressable>

            {expanded ? (
              <View style={{ paddingBottom: t.space.md }}>
                <FieldRow>
                  <DimensionInput
                    label="Length"
                    value={String(l.length)}
                    onChangeText={(v) => patch(l.id, { length: parseNumber(v) })}
                    suffix={u.suffix}
                    placeholder="0"
                    readout={u.frac(l.length)}
                  />
                  {i > 0 ? (
                    <>
                      <DimensionInput
                        label="Bend"
                        value={String(l.bend)}
                        onChangeText={(v) => patch(l.id, { bend: parseNumber(v) })}
                        suffix="°"
                        placeholder="90"
                      />
                      <DimensionInput
                        label="Roll"
                        value={String(l.roll)}
                        onChangeText={(v) => patch(l.id, { roll: parseNumber(v) })}
                        suffix="°"
                        placeholder="0"
                        readout={rollLabel(l.roll)}
                      />
                    </>
                  ) : null}
                </FieldRow>

                {i > 0 ? (
                  <>
                    <ChipRow
                      label="Bend"
                      options={BEND_PRESETS.map((b) => ({ value: b, label: `${b}°` }))}
                      selected={l.bend}
                      onSelect={(b) => patch(l.id, { bend: b })}
                    />
                    <ChipRow
                      label="Roll"
                      options={ROLL_PRESETS.map((r) => ({ value: r, label: `${r}°` }))}
                      selected={((l.roll % 360) + 360) % 360}
                      onSelect={(r) => patch(l.id, { roll: r })}
                    />
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <ControlRow>
        <AccentButton
          label={legs.length >= MAX_LEGS ? `Max ${MAX_LEGS} legs` : 'Add leg'}
          icon="add-outline"
          onPress={addLeg}
          style={{ flex: 1 }}
        />
        <GhostButton
          label="Reset"
          icon="refresh-outline"
          onPress={() => {
            setLegs([makeLeg(nextId(), 36, 0, 0), makeLeg(nextId(), 24, 90, 0), makeLeg(nextId(), 30, 90, 90)]);
            setOpen(0);
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      {/* Turning the spool over. Neither of these changes a cut — the cut comes
          from the leg length and the bend, and both are left alone. */}
      <ControlRow>
        <GhostButton
          label="Mirror"
          icon="git-compare-outline"
          onPress={() => setLegs(mirrorLegs)}
          style={{ flex: 1 }}
        />
        <GhostButton
          label="Flip all"
          icon="swap-vertical-outline"
          onPress={() => setLegs(flipAll)}
          style={{ flex: 1 }}
        />
      </ControlRow>
      <HintRow
        text={
          rolled
            ? 'Mirror gives the opposite hand — same lengths, same bends, every roll reversed. Flip all turns every leg the other way. Neither changes a cut.'
            : 'This spool lies flat, so it is already its own mirror — use Flip all to fold it the other way, or the arrows on a leg to turn just that one.'
        }
      />

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
                <Text style={[t.type.label, { color: t.colors.textMuted }]}>
                  {`Joint ${e.legIndex} → leg ${e.legIndex + 1}`}
                </Text>
                <Text style={[t.type.statValue, { color: t.colors.text, marginTop: 2 }]}>{u.angle(e.angle, 1)}</Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                  {`Rolled ${e.roll.toFixed(0)}° — ${rollLabel(e.roll)}`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{`Takeoff ${u.num(e.takeoff)}`}</Text>
                <Text style={[t.type.caption, { color: t.colors.data, marginTop: 2 }]}>{`Throat ${u.num(e.throatArc)}`}</Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>{`Back ${u.num(e.backArc)}`}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <StatGrid
        stats={[
          { label: 'Total cut', note: 'Pipe to buy', value: spool.valid ? u.dual(spool.totalCut) : '—' },
          { label: 'Centre to centre', value: spool.valid ? u.dual(spool.totalCenterToCenter) : '—' },
          { label: 'Legs', value: String(legs.length) },
          { label: 'Elbows', value: spool.valid ? String(spool.elbows.length) : '—' },
          {
            label: 'Envelope',
            note: 'Bounding box',
            value: spool.valid
              ? `${u.num(spool.bounds.size.x, 0)}×${u.num(spool.bounds.size.y, 0)}×${u.num(spool.bounds.size.z, 0)}`
              : '—',
          },
          { label: 'Longest leg', value: spool.valid ? u.dual(Math.max(...spool.runs.map((r) => r.cutLength))) : '—' },
        ]}
      />

      <SpoolBar
        badge={`SCH ${pipe.schedule}`}
        text={spool.valid ? `Pipe weight ${u.weight(spool.weight, 2)} for ${u.num(spool.totalCut)} ${u.unitName}` : 'Weight unavailable'}
      />

      <FooterNote text="Bend is how far the leg turns off the one before it. Roll is which way that turn points around the pipe: 0 is up, 90 right, 180 down, 270 left. Lengths are centre-to-centre; each cut deducts the takeoff at both ends plus the weld gap." />

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
