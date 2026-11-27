import React, { useEffect, useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, RigSpoolShape } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { HintRow } from '../components/HintRow';
import { FieldRow } from '../components/DimensionInput';
import { Banner, NumField } from '../components/FormFields';
import { ChipRow } from '../components/ChipRow';
import { Segmented } from '../components/Segmented';
import { FooterNote, ResultBanner, StatGrid, WarningBanner } from '../components/Results';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { RigDiagram, type RigPoint } from '../components/RigDiagram';
import { ListRow } from './OrbitalScreen';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { useSpools } from '../state/spools';
import { getSpool } from '../state/spoolStore';
import { solveDirections } from '../calc/direction';
import { findSize } from '../calc/pipe';
import { add, elbowCenterline, scale, solveSpool, type Vec3 } from '../calc/spool';
import { fromInches, toInches } from '../calc/units';
import { hookHeightFor, pointAt, rig, spoolWeight, suggestPicks, type At, type Extra } from '../calc/rig';
import { angleText } from '../calc/sling';

// Rig this spool: the spool from the 3D page weighed, its centre of gravity
// found, and a two-sling pick worked out: where to pick it, how long each
// sling, the angle, and what each one pulls. A check for the hand on the
// ground, not a lift plan.

type Props = NativeStackScreenProps<RootStackParamList, 'RigSpool'>;

const LB_PER_KG = 1 / 0.45359237;

export function RigSpoolScreen({ route, navigation }: Props) {
  const t = useTheme();
  const c = t.colors;
  const u = useUnits();
  const { width } = useWindowDimensions();
  const { shelf } = useSpools();
  const metric = u.system === 'metric';

  const [shape, setShape] = useState<RigSpoolShape | null>(route.params?.spool ?? null);
  useEffect(() => {
    const id = route.params?.spoolId;
    if (!id) return;
    const s = getSpool(shelf, id);
    if (s) setShape({ name: s.name, nps: s.nps, kind: s.kind, schedule: s.schedule, gap: s.gap, legs: s.legs });
  }, [route.params?.spoolId, shelf]);

  const [water, setWater] = useState(false);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [picks, setPicks] = useState<[At, At] | null>(null);
  const [hook, setHook] = useState<number | null>(null);
  // Adding something hung on the spool: what it is, what it weighs, where.
  const [xName, setXName] = useState('Valve');
  const [xWeight, setXWeight] = useState<number | null>(null);
  const [xRun, setXRun] = useState(0);
  const [xAlong, setXAlong] = useState<number | null>(null);

  const spool = useMemo(() => {
    if (!shape) return null;
    const d = solveDirections(shape.legs.map((l, i) => ({ id: `rig${i}`, length: l.length, dir: { bearing: l.bearing, slope: l.slope } })));
    if (!d.ok) return null;
    const s = solveSpool({ legs: d.legs, start: d.start, nps: shape.nps, kind: shape.kind, schedule: shape.schedule, gap: shape.gap });
    return s.valid ? s : null;
  }, [shape]);
  const pipe = shape ? { nps: shape.nps, kind: shape.kind, schedule: shape.schedule } : null;
  const weight = useMemo(() => (spool && pipe ? spoolWeight(spool, pipe, { water, extras }) : null), [spool, pipe?.nps, pipe?.kind, pipe?.schedule, water, extras]);

  // Picks to start from, chosen once there is a spool to pick.
  useEffect(() => {
    if (spool && weight && !picks) setPicks(suggestPicks(spool, weight.cg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spool, weight]);

  const p1 = spool && picks ? pointAt(spool, picks[0]) : null;
  const p2 = spool && picks ? pointAt(spool, picks[1]) : null;
  const for60 = p1 && p2 && weight ? hookHeightFor(p1, p2, weight.cg) : null;
  const hookIn = hook ?? (for60 !== null ? Math.ceil(for60) : null);
  const result = p1 && p2 && weight && hookIn !== null ? rig(p1, p2, weight.total, weight.cg, hookIn) : null;

  const len = (inches: number) => {
    if (metric) return `${Math.round(inches * 25.4)} mm`;
    const q = Math.round(inches * 4) / 4;
    const ft = Math.floor(q / 12);
    const rem = q - ft * 12;
    const whole = Math.floor(rem);
    const frac = rem - whole;
    const f = frac === 0.25 ? ' 1/4' : frac === 0.5 ? ' 1/2' : frac === 0.75 ? ' 3/4' : '';
    return ft ? `${ft}' ${whole}${f}"` : `${whole}${f}"`;
  };
  // Light spools to a tenth, so the slings' shares visibly add up to the weight.
  const W = (lb: number) => u.weight(lb, metric || lb < 100 ? 1 : 0);
  const inUser = (inches: number) => Math.round(fromInches(inches, u.system) * 100) / 100;
  const fromUser = (v: number) => toInches(v, u.system);

  // The drawing: the spool seen square on to the line between the picks.
  const drawing = useMemo(() => {
    if (!spool || !result || !result.ok || !p1 || !p2) return null;
    const span = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const e = { x: (p2.x - p1.x) / span, z: (p2.z - p1.z) / span };
    const proj = (p: Vec3): RigPoint => ({ s: (p.x - p1.x) * e.x + (p.z - p1.z) * e.z, y: p.y });
    const runs = spool.runs.map((r) => [proj(add(r.from, scale(r.direction, r.takeoffStart))), proj(add(r.from, scale(r.direction, r.centerToCenter - r.takeoffEnd)))]);
    const elbows = spool.elbows.map((el) => {
      const into = spool.runs[el.index - 1]!;
      const out = spool.runs[el.index]!;
      return elbowCenterline(spool.points[el.index]!, into.direction, out.direction, el.takeoff).map(proj);
    });
    return { pipe: [...runs, ...elbows], od: findSize(shape!.nps).od };
  }, [spool, result, p1, p2, shape]);

  if (!shape || !spool) {
    return (
      <Screen>
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: t.space.sm, alignItems: 'center' }}>
          <Ionicons name="git-pull-request-outline" size={40} color={c.glow} />
          <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 26, textAlign: 'center' }]}>Rig this spool</Text>
          <Text style={[t.type.body, { color: c.textMuted, textAlign: 'center' }]}>
            {shape && !spool ? "That spool doesn't build: open it in 3D spool and fix it first." : 'What the spool weighs, where its centre of gravity is, and a two-sling pick: where to pick it, how long each sling, and what each one pulls.'}
          </Text>
        </View>
        <ControlRow>
          <AccentButton label="Build one in 3D spool" icon="cube-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('SpoolBuilder')} />
        </ControlRow>
        {shelf.spools.length ? <SectionHeader title="Or rig a saved spool" /> : null}
        {shelf.spools.map((s) => (
          <ListRow
            key={s.id}
            voice={s.name}
            title={s.name}
            sub={`${findSize(s.nps).label} SCH ${s.schedule} · ${s.legs.length} leg${s.legs.length === 1 ? '' : 's'}${s.place ? ` · ${s.place}` : ''}`}
            onPress={() => {
              setPicks(null);
              setHook(null);
              setExtras([]);
              setShape({ name: s.name, nps: s.nps, kind: s.kind, schedule: s.schedule, gap: s.gap, legs: s.legs });
            }}
            right={<Ionicons name="chevron-forward" size={20} color={c.textFaint} />}
          />
        ))}
      </Screen>
    );
  }

  const legChips = spool.runs.map((_, i) => ({ value: i, label: `Leg ${i + 1}` }));
  const setPick = (k: 0 | 1, next: Partial<At>) => {
    if (!picks) return;
    const p = [...picks] as [At, At];
    const r = spool.runs[next.run ?? p[k].run]!;
    const along = next.along ?? (next.run !== undefined && next.run !== p[k].run ? r.centerToCenter / 2 : p[k].along);
    p[k] = { run: next.run ?? p[k].run, along: Math.max(0, Math.min(r.centerToCenter, along)) };
    setPicks(p);
  };
  const addExtra = () => {
    if (!(xWeight !== null && xWeight > 0)) return;
    const r = spool.runs[xRun]!;
    const along = xAlong === null ? r.centerToCenter / 2 : Math.max(0, Math.min(r.centerToCenter, fromUser(xAlong)));
    setExtras((xs) => [...xs, { name: xName.trim() || 'Item', weight: metric ? xWeight * LB_PER_KG : xWeight, at: { run: xRun, along } }]);
    setXWeight(null);
    setXAlong(null);
  };
  const cgWords = weight
    ? `${len(Math.abs(weight.cg.x))} ${weight.cg.x >= 0 ? 'east' : 'west'}, ${len(Math.abs(weight.cg.z))} ${weight.cg.z >= 0 ? 'north' : 'south'}, ${len(Math.abs(weight.cg.y))} ${weight.cg.y >= 0 ? 'up' : 'down'} from the start of leg 1`
    : '';

  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: 2 }}>
        <Text style={[t.type.sectionTitle, { color: c.text }]}>{shape.name ?? 'The spool on the 3D page'}</Text>
        <Text style={[t.type.caption, { color: c.textMuted }]}>{`${findSize(shape.nps).label} SCH ${shape.schedule} · ${spool.runs.length} leg${spool.runs.length === 1 ? '' : 's'} · ${spool.elbows.length} elbow${spool.elbows.length === 1 ? '' : 's'}`}</Text>
      </View>

      {drawing && result?.ok ? (
        <View style={{ paddingVertical: t.space.md, alignItems: 'center' }}>
          <RigDiagram
            width={Math.min(width - 2 * t.layout.screenPadding, 460)}
            pipe={drawing.pipe}
            od={drawing.od}
            hook={result.hook}
            cg={result.cg}
            legs={result.legs.map((l, i) => ({ at: { s: l.s, y: l.y }, band: l.band, label: `${i + 1}: ${W(l.tension)}`, angle: angleText(l.angle) }))}
          />
        </View>
      ) : null}

      {weight ? <ResultBanner icon="barbell-outline" label="The spool weighs" value={W(weight.total)} hint={`Centre of gravity ${cgWords}.`} /> : null}

      {result?.ok ? (
        <>
          {result.legs.map((l, i) => (
            <ResultBanner key={i} icon="git-pull-request-outline" label={`Sling ${i + 1} pulls`} value={W(l.tension)} hint={`${len(l.length)} long, pick to hook · ${angleText(l.angle)} from horizontal · takes ${W(l.share)} of the weight`} />
          ))}
          {result.warnings.map((w) => (
            <WarningBanner key={w.id} tone={w.id === 'flat' || w.id === 'overturns' ? 'danger' : 'warn'} text={w.text} />
          ))}
          <StatGrid
            stats={[
              { label: 'Hook above top pick', value: len(hookIn!) },
              { label: 'Between the picks', value: len(result.span) },
              { label: 'Pull in at a pick', value: W(result.legs[0].sideways), note: 'sideways, on the pipe' },
              { label: 'CG off the pick line', value: len(result.offPlane), note: result.offPlane > Math.max(0.5, result.span * 0.02) ? 'it rolls' : 'hangs as it sits' },
            ]}
          />
        </>
      ) : result && !result.ok ? (
        <Banner tone="danger" icon="alert-circle-outline" text={result.why} />
      ) : null}

      <SectionHeader title="Where it is picked" />
      {picks
        ? ([0, 1] as const).map((k) => (
            <View key={k} style={{ gap: t.space.xs, marginBottom: t.space.sm }}>
              <ChipRow label={`Pick ${k + 1}`} options={legChips} selected={picks[k].run} onSelect={(run) => setPick(k, { run })} />
              <FieldRow>
                <NumField label={`Pick ${k + 1}, from the start of leg ${picks[k].run + 1}`} value={inUser(picks[k].along)} onChange={(v) => v !== null && setPick(k, { along: fromUser(v) })} suffix={u.unitName} />
              </FieldRow>
            </View>
          ))
        : null}
      <ControlRow>
        <GhostButton
          label="Suggest picks"
          icon="sparkles-outline"
          style={{ flex: 1 }}
          onPress={() => {
            if (weight) setPicks(suggestPicks(spool, weight.cg));
            setHook(null);
          }}
        />
      </ControlRow>
      <HintRow text="Suggested picks hang the spool as it sits, the centre of gravity well inside them. Pick on the pipe, clear of the fittings and the welds." />

      <SectionHeader title="The hook" />
      <FieldRow>
        <NumField label="Hook above the higher pick" value={hookIn === null ? null : inUser(hookIn)} onChange={(v) => setHook(v === null ? null : fromUser(v))} suffix={u.unitName} />
      </FieldRow>
      <ControlRow>
        <GhostButton label={for60 !== null ? `Set for 60° (${len(Math.ceil(for60))})` : 'Set for 60°'} icon="resize-outline" style={{ flex: 1 }} onPress={() => setHook(null)} />
      </ControlRow>
      <HintRow text="60° from horizontal on the flatter sling: each leg pulls 1.155 times its share. Lower the hook and the slings flatten and pull harder. Never under 30°." />

      <SectionHeader title="What it weighs" />
      <Segmented
        label="Lifted"
        options={[
          { value: 'empty', label: 'Empty' },
          { value: 'full', label: 'Full of water' },
        ]}
        selected={water ? 'full' : 'empty'}
        onSelect={(v) => setWater(v === 'full')}
      />
      {weight ? (
        <StatGrid
          stats={[
            { label: 'Pipe', value: W(weight.pipe) },
            { label: 'Elbows', value: W(weight.elbows) },
            { label: 'Water', value: water ? W(weight.water) : 'empty' },
            { label: 'Valves and the rest', value: W(weight.extras) },
          ]}
        />
      ) : null}
      {extras.map((x, i) => (
        <ListRow
          key={`${x.name}-${i}`}
          voice={`remove ${x.name}`}
          title={`${x.name}: ${W(x.weight)}`}
          sub={`On leg ${x.at.run + 1}, ${len(x.at.along)} from its start · tap to take it off`}
          onPress={() => setExtras((xs) => xs.filter((_, j) => j !== i))}
          right={<Ionicons name="close-circle-outline" size={22} color={c.textFaint} />}
        />
      ))}
      <ChipRow
        label="Add"
        options={[
          { value: 'Valve', label: 'Valve' },
          { value: 'Flange', label: 'Flange' },
          { value: 'Fitting', label: 'Fitting' },
          { value: 'Insulation', label: 'Insulation' },
        ]}
        selected={xName}
        onSelect={setXName}
      />
      <FieldRow>
        <NumField label={`${xName}: weight off the tag or the drawing`} value={xWeight} onChange={setXWeight} suffix={metric ? 'kg' : 'lb'} />
      </FieldRow>
      <ChipRow label="On" options={legChips} selected={xRun} onSelect={setXRun} />
      <FieldRow>
        <NumField label={`From the start of leg ${xRun + 1} (blank: the middle)`} value={xAlong} onChange={setXAlong} suffix={u.unitName} />
      </FieldRow>
      <ControlRow>
        <GhostButton label={`Add the ${xName.toLowerCase()}`} icon="add-circle-outline" style={{ flex: 1 }} onPress={addExtra} />
      </ControlRow>

      {result?.ok && weight ? (
        <ControlRow>
          <AccentButton
            label="Check the gear for this pick"
            icon="shield-checkmark-outline"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate('GearCheck', { load: weight.total, legs: result.legs.map((l) => l.tension), angle: Math.min(...result.legs.map((l) => l.angle)) })}
          />
        </ControlRow>
      ) : null}

      <FooterNote text="Pipe and elbow weights are carbon steel from the pipe size and schedule; anything else is the weight you type off its tag or the drawing. This checks a pick, it doesn't plan a lift: a qualified rigger rigs it, the slings and hardware are rated for it, and a critical lift gets an engineered lift plan." />
    </Screen>
  );
}
