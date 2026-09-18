import React, { useCallback, useMemo, useState } from 'react';
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
import { MAX_LEGS, solveSpool } from '../calc/spool';
import {
  COMPASS,
  DirLeg,
  LegDir,
  SLOPE_PRESETS,
  bearingLabel,
  dirLabel,
  dirShort,
  fittingFor,
  flipDirs,
  isVertical,
  mirrorDirs,
  rotateDirs,
  solveDirections,
  turnDeg,
} from '../calc/direction';
import { parseNumber } from '../calc/format';
import { fromInches } from '../calc/units';

let counter = 0;
const nextId = () => `leg${(counter += 1)}`;

const dirLeg = (length: number, bearing: number, slope: number): DirLeg => ({
  id: nextId(),
  length,
  dir: { bearing, slope },
});

/** Along, up, and across: the spool everybody draws first. */
const START = (): DirLeg[] => [dirLeg(36, 90, 0), dirLeg(24, 0, 90), dirLeg(30, 0, 0)];

const tidy = (n: number): string => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

export function SpoolBuilderScreen() {
  const t = useTheme();
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();

  const [legs, setLegs] = useState<DirLeg[]>(START);
  const [gap, setGap] = useState('');
  const [open, setOpen] = useState<number | null>(0);

  const gapInches = Number.isFinite(u.parse(gap)) ? u.parse(gap) : settings.defaultGap;

  // Each leg is aimed at the compass, and the bends and rolls the engine walks
  // are worked out from where consecutive legs point. Nobody types a roll.
  const turns = useMemo(() => solveDirections(legs), [legs]);

  const spool = useMemo(() => {
    if (!turns.ok)
      return solveSpool({ legs: [], nps: pipe.nps, kind: pipe.kind, schedule: pipe.schedule, gap: gapInches });
    return solveSpool({
      legs: turns.legs,
      start: turns.start,
      nps: pipe.nps,
      kind: pipe.kind,
      schedule: pipe.schedule,
      gap: gapInches,
    });
  }, [turns, pipe.nps, pipe.kind, pipe.schedule, gapInches]);

  const error = turns.ok ? spool.error : turns.error;
  const valid = turns.ok && spool.valid;

  const patch = (id: string, next: Partial<DirLeg>) =>
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...next } : l)));

  const aim = (id: string, next: Partial<LegDir>) =>
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, dir: { ...l.dir, ...next } } : l)));

  const setLength = useCallback((index: number, inches: number) => {
    setLegs((prev) => prev.map((l, i) => (i === index ? { ...l, length: Math.round(inches * 16) / 16 } : l)));
  }, []);

  const reaim = (f: (dirs: LegDir[]) => LegDir[]) =>
    setLegs((prev) => {
      const next = f(prev.map((l) => l.dir));
      return prev.map((l, i) => ({ ...l, dir: next[i] ?? l.dir }));
    });

  const addLeg = () => {
    if (legs.length >= MAX_LEGS) return;
    // A new leg heads somewhere the last one does not, so it is a leg and not
    // a continuation: square off it, level if the last one rose, up if it ran.
    const last = legs[legs.length - 1]?.dir ?? { bearing: 0, slope: 0 };
    const next: LegDir = isVertical(last) ? { bearing: 0, slope: 0 } : { bearing: last.bearing, slope: 90 };
    setLegs((prev) => [...prev, { id: nextId(), length: 24, dir: next }]);
    setOpen(legs.length);
  };

  const removeLeg = (id: string) =>
    setLegs((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));

  // What goes on the drawing. Centre to centre, the way a spool is dimensioned,
  // and where the leg runs — which for a leg square on to the viewer is the
  // only thing on the page that says anything about it at all.
  // A drawing carries a figure, not a readout: 36", not 36.00 inch. Whole
  // numbers stay whole, a fractional imperial figure is the fraction a tape
  // has on it, and metric keeps the one decimal that means anything.
  const figure = useCallback(
    (inches: number) => {
      const f = u.frac(inches);
      if (f) return `${f}${u.suffix}`;
      const shown = fromInches(inches, u.system);
      return `${u.num(inches, Math.abs(shown - Math.round(shown)) < 0.005 ? 0 : 1)}${u.suffix}`;
    },
    [u]
  );

  const legText = useCallback(
    (i: number) => {
      const r = spool.runs[i];
      const leg = legs[i];
      if (!r || !leg) return [''];
      return [figure(r.centerToCenter), dirShort(leg.dir)];
    },
    [spool.runs, legs, figure]
  );

  const elbowText = useCallback(
    (i: number) => {
      const e = spool.elbows[i];
      if (!e) return [''];
      const f = fittingFor(e.angle);
      return f.stock ? [`${tidy(e.angle)}°`] : [`${tidy(e.angle)}°`, 'cut to suit'];
    },
    [spool.elbows]
  );

  const odd = turns.ok ? turns.legs.filter((l, i) => i > 0 && !fittingFor(l.bend).stock).length : 0;

  return (
    <Screen>
      <HintRow text="Say where each leg runs and how far — east, up, north. The app works out every bend for you and tells you what fitting it takes." />

      {valid ? (
        <SpoolView
          spool={spool}
          showLabels
          selectedRun={open}
          onPickRun={setOpen}
          onResizeLeg={setLength}
          lengthLabel={(v) => `${u.num(v)} ${u.unitName}`}
          legText={legText}
          elbowText={elbowText}
        />
      ) : null}

      <ResultBanner
        label="Total pipe"
        value={valid ? `${u.num(spool.totalCut)} ${u.unitName}` : error ?? '—'}
        hint={
          valid
            ? `${spool.runs.length} leg${spool.runs.length === 1 ? '' : 's'} · ${spool.elbows.length} elbow${
                spool.elbows.length === 1 ? '' : 's'
              } · C2C ${u.num(spool.totalCenterToCenter)} ${u.unitName}`
            : undefined
        }
        tone={valid ? 'default' : 'error'}
      />

      <MetaBar text={`${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Gap ${u.num(gapInches)} ${u.unitName}`} />
      {gapInches <= 0 ? <WarningBanner text={`No weld gap set (0 ${u.unitName}).`} /> : null}
      {odd > 0 ? (
        <WarningBanner
          text={`${odd} turn${odd === 1 ? '' : 's'} on this spool ${odd === 1 ? 'is' : 'are'} not a stock elbow. Check the Elbows list before you order.`}
        />
      ) : null}

      <SectionHeader title="Legs" meta={`${legs.length} of ${MAX_LEGS}`} />

      {legs.map((l, i) => {
        const run = valid ? spool.runs[i] : undefined;
        const turn = turns.ok ? turns.legs[i] : undefined;
        const expanded = open === i;
        const vertical = isVertical(l.dir);
        const fitting = turn && i > 0 ? fittingFor(turn.bend) : null;
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
                  {`${u.num(l.length)} ${u.unitName} ${dirLabel(l.dir)}`}
                  {fitting ? ` · ${fitting.stock ? fitting.label : `${tidy(turn!.bend)}° turn`}` : ' · start of the spool'}
                </Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={t.colors.textFaint} />
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
                  <DimensionInput
                    label="Bearing"
                    value={String(Math.round(turnDeg(l.dir.bearing)))}
                    onChangeText={(v) => aim(l.id, { bearing: parseNumber(v) })}
                    suffix="°"
                    placeholder="0"
                    readout={vertical ? 'not used' : bearingLabel(l.dir.bearing)}
                  />
                  <DimensionInput
                    label="Slope"
                    value={String(l.dir.slope)}
                    onChangeText={(v) => aim(l.id, { slope: Math.max(-90, Math.min(90, parseNumber(v))) })}
                    suffix="°"
                    placeholder="0"
                    readout={l.dir.slope === 0 ? 'level' : l.dir.slope > 0 ? 'rising' : 'falling'}
                  />
                </FieldRow>

                <ChipRow
                  label="Runs"
                  options={COMPASS.map((c) => ({ value: c.bearing, label: c.id }))}
                  selected={vertical ? null : turnDeg(l.dir.bearing)}
                  onSelect={(b) => aim(l.id, { bearing: b, slope: vertical ? 0 : l.dir.slope })}
                />
                <ChipRow
                  label="Rise"
                  options={SLOPE_PRESETS.map((s) => ({ value: s.slope, label: s.label }))}
                  selected={l.dir.slope}
                  onSelect={(s) => aim(l.id, { slope: s })}
                />

                {/* The bend is a result here, not an entry. It is shown because
                    it is what gets ordered, and because a number nobody typed
                    is a number somebody should be able to see. */}
                {turn && i > 0 && fitting ? (
                  <View
                    style={{
                      marginHorizontal: t.layout.screenPadding,
                      padding: t.space.md,
                      borderRadius: t.radius.sm,
                      backgroundColor: fitting.stock ? t.colors.dataSoft : t.colors.accentSoft,
                    }}
                  >
                    <Text style={[t.type.captionStrong, { color: fitting.stock ? t.colors.data : t.colors.accent }]}>
                      {`Turns ${tidy(turn.bend)}° off leg ${i} — ${fitting.label}`}
                    </Text>
                  </View>
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
            setLegs(START());
            setOpen(0);
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      {/* Turning a spool over is a reflection, and a reflection keeps every
          angle it finds — so none of these changes a single cut. */}
      <ControlRow>
        <GhostButton
          label="Mirror"
          icon="git-compare-outline"
          onPress={() => reaim(mirrorDirs)}
          style={{ flex: 1 }}
        />
        <GhostButton
          label="Turn over"
          icon="swap-vertical-outline"
          onPress={() => reaim(flipDirs)}
          style={{ flex: 1 }}
        />
        <GhostButton
          label="Swing 90°"
          icon="refresh-circle-outline"
          onPress={() => reaim((d) => rotateDirs(d, 90))}
          style={{ flex: 1 }}
        />
      </ControlRow>
      <HintRow text="Mirror gives the opposite hand. Turn over swaps every rise for a drop. Swing turns the whole spool a quarter round the compass. None of the three changes a cut." />

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

      {valid && spool.elbows.length ? (
        <>
          <SectionHeader title="Elbows" meta="In order along the spool" />
          {spool.elbows.map((e, i) => {
            const f = fittingFor(e.angle);
            const from = legs[e.legIndex - 1];
            const to = legs[e.legIndex];
            return (
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
                  <Text
                    style={[t.type.caption, { color: f.stock ? t.colors.data : t.colors.text, marginTop: 2 }]}
                  >
                    {f.label}
                  </Text>
                  {from && to ? (
                    <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                      {`${dirLabel(from.dir)} → ${dirLabel(to.dir)}`}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{`Takeoff ${u.num(e.takeoff)}`}</Text>
                  <Text style={[t.type.caption, { color: t.colors.data, marginTop: 2 }]}>{`Throat ${u.num(e.throatArc)}`}</Text>
                  <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>{`Back ${u.num(e.backArc)}`}</Text>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      <StatGrid
        stats={[
          { label: 'Total cut', note: 'Pipe to buy', value: valid ? u.dual(spool.totalCut) : '—' },
          { label: 'Centre to centre', value: valid ? u.dual(spool.totalCenterToCenter) : '—' },
          { label: 'Legs', value: String(legs.length) },
          { label: 'Elbows', value: valid ? String(spool.elbows.length) : '—' },
          {
            label: 'Envelope',
            note: 'E × UP × N',
            value: valid
              ? `${u.num(spool.bounds.size.x, 0)}×${u.num(spool.bounds.size.y, 0)}×${u.num(spool.bounds.size.z, 0)}`
              : '—',
          },
          { label: 'Longest leg', value: valid ? u.dual(Math.max(...spool.runs.map((r) => r.cutLength))) : '—' },
        ]}
      />

      <SpoolBar
        badge={`SCH ${pipe.schedule}`}
        text={valid ? `Pipe weight ${u.weight(spool.weight, 2)} for ${u.num(spool.totalCut)} ${u.unitName}` : 'Weight unavailable'}
      />

      <FooterNote text="A leg is where it runs and how far: a bearing off the compass and a slope off level, so straight up is a slope of 90 and the bearing stops mattering. Lengths on the drawing are centre-to-centre; each cut deducts the takeoff at both ends plus the weld gap." />

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
