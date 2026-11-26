import React, { useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Segmented } from '../components/Segmented';
import { ChipRow } from '../components/ChipRow';
import { HintRow } from '../components/HintRow';
import { FieldRow } from '../components/DimensionInput';
import { Banner, NumField } from '../components/FormFields';
import { FooterNote, ResultBanner, StatGrid, WarningBanner } from '../components/Results';
import { ControlRow, GhostButton } from '../components/Buttons';
import { SlingDiagram } from '../components/SlingDiagram';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { shareSheet } from '../print/share';
import { slingHtml } from '../print/sling';
import { dayKey, usDate } from '../calc/days';
import { FACTORS, LENGTH_UNITS, LOAD_UNITS, againstTag, angleFrom, angleText, evenLift, lengthText, loadText, offCentre, type Band, type LengthUnit, type LoadUnit } from '../calc/sling';

// Sling angles: what each leg really pulls, from the load, the legs and their
// angle, or from where the centre of gravity sits between two pick points.
// The maths is calc/sling.ts.

type Props = NativeStackScreenProps<RootStackParamList, 'SlingAngle'>;
type Mode = 'even' | 'off';
type By = 'angle' | 'height' | 'reach';
type Legs = 1 | 2 | 3 | 4;

const MODES: { value: Mode; label: string }[] = [
  { value: 'even', label: 'Equal legs' },
  { value: 'off', label: 'CG off centre' },
];
const LEGS: { value: Legs; label: string }[] = [
  { value: 1, label: '1 leg' },
  { value: 2, label: '2 legs' },
  { value: 3, label: '3 legs' },
  { value: 4, label: '4 legs' },
];
const BY: { value: By; label: string }[] = [
  { value: 'angle', label: 'Angle' },
  { value: 'height', label: 'Length & height' },
  { value: 'reach', label: 'Length & reach' },
];

/** What an angle means for the lift, in words. */
function angleWords(band: Band, factor: number): { text: string; tone: 'warn' | 'danger' } | null {
  if (band === 'danger')
    return {
      tone: 'danger',
      text: `Under 30° from horizontal: don't, unless the sling's maker or a qualified person says so. Each leg pulls ${factor.toFixed(2)} times its share. Longer slings, or pick points closer together, raise the angle.`,
    };
  if (band === 'caution')
    return {
      tone: 'warn',
      text: `Shallow: each leg pulls ${factor.toFixed(2)} times its share, and the load is squeezed in hard between the pick points. 60° or more is better: longer slings, or pick points closer together.`,
    };
  return null;
}

export function SlingAngleScreen(_: Props) {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const metric = settings.unitSystem === 'metric';
  const [mode, setMode] = useState<Mode>('even');
  const [load, setLoad] = useState<number | null>(null);
  const [loadUnit, setLoadUnit] = useState<LoadUnit>(metric ? 'kg' : 'lb');
  const [rated, setRated] = useState<number | null>(null);
  const [legs, setLegs] = useState<Legs>(2);
  const [allShare, setAllShare] = useState(false);
  const [by, setBy] = useState<By>('angle');
  const [angle, setAngle] = useState<number | null>(60);
  const [from, setFrom] = useState<'horizontal' | 'vertical'>('horizontal');
  const [len, setLen] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [reach, setReach] = useState<number | null>(null);
  const [lenUnit, setLenUnit] = useState<LengthUnit>(metric ? 'm' : 'ft');
  const [dA, setDA] = useState<number | null>(null);
  const [dB, setDB] = useState<number | null>(null);
  const [hookH, setHookH] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const size = Math.min(width - 2 * t.layout.screenPadding, 440);
  const L = (v: number) => loadText(v, loadUnit);

  const ang = useMemo(() => (by === 'angle' ? angleFrom({ by, angle, from }) : by === 'height' ? angleFrom({ by, length: len, height }) : angleFrom({ by, length: len, reach })), [by, angle, from, len, height, reach]);
  const even = mode === 'even' && ang.ok && load !== null && load > 0 ? evenLift(load, legs, allShare, ang.deg) : null;
  const off = mode === 'off' && load !== null && load > 0 && dA !== null && dB !== null && hookH !== null ? offCentre(load, dA, dB, hookH) : null;
  const shownAngle = legs === 1 ? 90 : ang.ok ? ang.deg : null;

  // Dragging the hook sets the angle: it puts the screen into angle-from-horizontal.
  const dragTo = (d: number) => {
    setBy('angle');
    setFrom('horizontal');
    setAngle(d);
  };

  const tagWords = (tension: number, who: string) => {
    const tag = againstTag(tension, rated);
    if (!tag) return null;
    return tag.over
      ? {
          tone: 'danger' as const,
          text: `${who} over the tag: ${L(tension)} on a sling rated ${L(rated!)} straight. A heavier sling, longer slings for a steeper angle, or more legs that carry.`,
        }
      : {
          tone: 'ok' as const,
          text: `${who}: ${Math.round(tag.pct)}% of the tag's ${L(rated!)}.`,
        };
  };

  const share = async () => {
    setNote(null);
    const inputs: string[][] = [['Load, with the rigging under the hook', load !== null ? L(load) : '—']];
    const results: string[][] = [];
    const warnings: string[] = [];
    if (even) {
      inputs.push(['Legs', `${legs}${legs > 2 ? `, ${even.carrying} taken to carry it${allShare ? ' (rated or equalised to share)' : ' (rigid load)'}` : ''}`]);
      inputs.push(['Sling angle', `${angleText(even.angle)} from horizontal, ${angleText(90 - even.angle)} from vertical`]);
      if (by !== 'angle' && len !== null) inputs.push(['Sling length', lengthText(len, lenUnit)]);
      if (by === 'height' && height !== null) inputs.push(['Hook above the pick points', lengthText(height, lenUnit)]);
      if (by === 'reach' && reach !== null) inputs.push(['Reach from the hook', lengthText(reach, lenUnit)]);
      results.push(['Tension in each carrying leg', L(even.tension)], ['Angle factor', even.factor.toFixed(3)], ['Share of the load, each', L(even.share)], ['Pull in on each pick point', L(even.sideways)]);
      const w = angleWords(even.band, even.factor);
      if (w) warnings.push(w.text);
      const tw = tagWords(even.tension, 'Each leg');
      if (tw?.tone === 'danger') warnings.push(tw.text);
      else if (tw) results.push(['Against the tag', tw.text]);
    } else if (off?.ok) {
      inputs.push(['Pick point A from the CG', lengthText(off.a.reach, lenUnit)], ['Pick point B from the CG', lengthText(off.b.reach, lenUnit)], ['Hook above the pick points', lengthText(hookH!, lenUnit)]);
      for (const [n, g] of [
        ['A', off.a],
        ['B', off.b],
      ] as const) {
        results.push([`Leg ${n}`, g.slack ? 'carries nothing' : `${L(g.tension)} at ${angleText(g.angle)}; sling ${lengthText(g.length, lenUnit)} to hang level`]);
        const w = angleWords(g.band, 1 / Math.sin((g.angle * Math.PI) / 180));
        if (w && !g.slack) warnings.push(`Leg ${n}: ${w.text}`);
        const tw = tagWords(g.tension, `Leg ${n}`);
        if (tw?.tone === 'danger') warnings.push(tw.text);
      }
    }
    if (rated !== null) inputs.push(['Sling rated load, straight (tag)', L(rated)]);
    const out = await shareSheet(
      slingHtml({
        when: usDate(dayKey(Date.now())),
        inputs,
        results,
        warnings,
        angle: even ? even.angle : null,
      }),
      'Sling angle check',
    );
    if (!out.ok) setNote(out.why);
  };

  const evenWarn = even && legs > 1 ? angleWords(even.band, even.factor) : null;
  const evenTag = even ? tagWords(even.tension, legs === 1 ? 'The sling' : 'Each leg') : null;
  const nearest = shownAngle === null ? null : FACTORS.reduce((b, f) => (Math.abs(f.angle - shownAngle) < Math.abs(b.angle - shownAngle) ? f : b));

  return (
    <Screen>
      <View style={{ paddingTop: t.space.md }}>
        <Segmented options={MODES} selected={mode} onSelect={setMode} />
      </View>

      <View style={{ paddingVertical: t.space.md }}>
        {mode === 'even' ? (
          <SlingDiagram
            kind="even"
            size={size}
            legs={legs}
            carrying={even?.carrying ?? (legs > 2 && !allShare ? 2 : legs)}
            angle={shownAngle}
            band={even?.band ?? (shownAngle !== null ? (legs === 1 ? 'good' : null) : null)}
            tension={even ? L(even.tension) : ''}
            load={load !== null && load > 0 ? L(load) : 'Load'}
            onAngle={dragTo}
          />
        ) : off?.ok ? (
          <SlingDiagram kind="off" size={size} a={off.a} b={off.b} tensionA={off.a.slack ? 'slack' : L(off.a.tension)} tensionB={off.b.slack ? 'slack' : L(off.b.tension)} load={L(load!)} />
        ) : null}
        {mode === 'even' && legs > 1 ? (
          <Text
            style={[
              t.type.caption,
              {
                color: c.textFaint,
                textAlign: 'center',
                marginTop: t.space.xs,
              },
            ]}
          >
            Drag the hook up or down to try another angle.
          </Text>
        ) : null}
      </View>

      {mode === 'even' ? (
        even ? (
          <>
            <ResultBanner
              icon="barbell-outline"
              label={legs === 1 ? 'The sling carries' : `Each ${legs > 2 && even.carrying < legs ? 'carrying ' : ''}leg pulls`}
              value={L(even.tension)}
              hint={legs === 1 ? 'Straight down: the whole load.' : `${angleText(even.angle)} from horizontal · factor ${even.factor.toFixed(3)}`}
            />
            {evenWarn ? <WarningBanner tone={evenWarn.tone} text={evenWarn.text} /> : null}
            {evenTag ? <Banner tone={evenTag.tone === 'danger' ? 'danger' : 'ok'} icon={evenTag.tone === 'danger' ? 'alert-circle-outline' : 'checkmark-circle-outline'} text={evenTag.text} /> : null}
            {legs > 1 ? (
              <StatGrid
                stats={[
                  { label: 'From horizontal', value: angleText(even.angle) },
                  { label: 'From vertical', value: angleText(90 - even.angle) },
                  { label: 'Angle factor', value: even.factor.toFixed(3) },
                  {
                    label: 'Share of the load',
                    value: L(even.share),
                    note: 'each carrying leg',
                  },
                  {
                    label: 'Pull in on each pick',
                    value: L(even.sideways),
                    note: 'sideways, on the lug',
                  },
                  { label: 'All carrying legs', value: L(even.total) },
                ]}
              />
            ) : null}
          </>
        ) : (
          <ResultBanner icon="barbell-outline" label="Each leg pulls" value="—" tone={ang.ok || ang.why === null ? 'idle' : 'error'} hint={!ang.ok && ang.why ? ang.why : 'Put in the load, the legs and the angle.'} />
        )
      ) : off?.ok ? (
        <>
          {(['a', 'b'] as const).map((k) => {
            const g = off[k];
            const n = k.toUpperCase();
            const tw = g.slack ? null : tagWords(g.tension, `Leg ${n}`);
            const w = g.slack ? null : angleWords(g.band, 1 / Math.sin((g.angle * Math.PI) / 180));
            return (
              <View key={k}>
                <ResultBanner
                  icon="barbell-outline"
                  label={`Leg ${n} pulls`}
                  value={g.slack ? 'nothing' : L(g.tension)}
                  hint={g.slack ? `The CG is right under ${n === 'A' ? 'B' : 'A'}: this leg only steadies the load.` : `${angleText(g.angle)} from horizontal · takes ${L(g.share)} of the load`}
                />
                {w ? <WarningBanner tone={w.tone} text={`Leg ${n}: ${w.text}`} /> : null}
                {tw ? <Banner tone={tw.tone === 'danger' ? 'danger' : 'ok'} icon={tw.tone === 'danger' ? 'alert-circle-outline' : 'checkmark-circle-outline'} text={tw.text} /> : null}
              </View>
            );
          })}
          <StatGrid
            stats={[
              {
                label: 'Sling A to hang level',
                value: lengthText(off.a.length, lenUnit),
              },
              {
                label: 'Sling B to hang level',
                value: lengthText(off.b.length, lenUnit),
              },
              {
                label: 'Pull in on each pick',
                value: L(off.a.sideways),
                note: 'sideways, equal and opposite',
              },
              {
                label: 'Nearer pick point',
                value: off.a.share >= off.b.share ? 'A' : 'B',
                note: 'takes the bigger share',
              },
            ]}
          />
          <HintRow text="Slings of these lengths hang the load level with the hook over the CG. With equal slings it tilts until the CG is under the hook, and the legs carry something else." />
        </>
      ) : (
        <ResultBanner icon="barbell-outline" label="Leg tensions" value="—" tone={off && !off.ok ? 'error' : 'idle'} hint={off && !off.ok ? off.why : 'Put in the load, both distances from the CG and the hook height.'} />
      )}

      <FieldRow>
        <NumField label="Load, with the rigging under the hook" value={load} onChange={setLoad} suffix={LOAD_UNITS.find((u) => u.value === loadUnit)!.label} />
      </FieldRow>
      <ChipRow label="Units" options={LOAD_UNITS} selected={loadUnit} onSelect={setLoadUnit} />

      {mode === 'even' ? (
        <>
          <Segmented label="Legs" options={LEGS} selected={legs} onSelect={setLegs} />
          {legs > 2 ? (
            <>
              <Segmented
                label="Carry"
                options={[
                  { value: 'two', label: 'Two legs (rigid)' },
                  { value: 'all', label: `All ${legs} (rated)` },
                ]}
                selected={allShare ? 'all' : 'two'}
                onSelect={(v) => setAllShare(v === 'all')}
              />
              <HintRow
                text={`On a rigid load, two legs can end up carrying it all while the others only balance it, so two legs is the safe way to work it. Use all ${legs} only when the assembly is rated, or rigged with an equaliser, for them to share.`}
              />
            </>
          ) : null}
          {legs > 1 ? (
            <>
              <Segmented label="From" options={BY} selected={by} onSelect={setBy} />
              {by === 'angle' ? (
                <>
                  <FieldRow>
                    <NumField label={from === 'horizontal' ? 'Sling angle from horizontal' : 'Sling angle from vertical'} value={angle} onChange={setAngle} suffix="°" />
                  </FieldRow>
                  <ChipRow
                    label="Measured"
                    options={[
                      { value: 'horizontal', label: 'From horizontal' },
                      { value: 'vertical', label: 'From vertical' },
                    ]}
                    selected={from}
                    onSelect={(v) => {
                      // The same sling, the angle said the other way.
                      if (angle !== null && angle > 0 && angle < 90 && v !== from) setAngle(Math.round((90 - angle) * 10) / 10);
                      setFrom(v);
                    }}
                  />
                </>
              ) : (
                <>
                  <FieldRow>
                    <NumField label="Sling length, pick point to hook" value={len} onChange={setLen} suffix={lenUnit} />
                  </FieldRow>
                  <FieldRow>
                    {by === 'height' ? (
                      <NumField label="Hook above the pick points" value={height} onChange={setHeight} suffix={lenUnit} />
                    ) : (
                      <NumField label="Reach, out from under the hook" value={reach} onChange={setReach} suffix={lenUnit} />
                    )}
                  </FieldRow>
                  <ChipRow label="Length in" options={LENGTH_UNITS} selected={lenUnit} onSelect={setLenUnit} />
                </>
              )}
            </>
          ) : null}
        </>
      ) : (
        <>
          <HintRow text="Two legs, the centre of gravity nearer one pick point. Measure each pick point's distance from the CG level, and how high the hook sits above them. The hook settles over the CG." />
          <FieldRow>
            <NumField label="Pick point A from the CG" value={dA} onChange={setDA} suffix={lenUnit} />
          </FieldRow>
          <FieldRow>
            <NumField label="Pick point B from the CG" value={dB} onChange={setDB} suffix={lenUnit} />
          </FieldRow>
          <FieldRow>
            <NumField label="Hook above the pick points" value={hookH} onChange={setHookH} suffix={lenUnit} />
          </FieldRow>
          <ChipRow label="Length in" options={LENGTH_UNITS} selected={lenUnit} onSelect={setLenUnit} />
        </>
      )}
      <FieldRow>
        <NumField label="Sling rated load, straight (off the tag)" value={rated} onChange={setRated} suffix={LOAD_UNITS.find((u) => u.value === loadUnit)!.label} placeholder="Optional" />
      </FieldRow>

      <SectionHeader title="Angle factors" meta="from horizontal" />
      {FACTORS.map((f) => {
        const on = nearest === f && mode === 'even' && legs > 1;
        return (
          <View
            key={f.angle}
            style={{
              flexDirection: 'row',
              paddingHorizontal: t.layout.screenPadding,
              paddingVertical: 8,
              borderTopWidth: t.hairline,
              borderTopColor: c.border,
              backgroundColor: on ? c.accentSoft : 'transparent',
            }}
          >
            <Text style={[t.type.bodyStrong, { color: f.angle < 45 ? c.warnText : c.text, width: 70 }]}>{`${f.angle}°`}</Text>
            <Text style={[t.type.body, { color: c.text, width: 80 }]}>{`× ${f.factor.toFixed(3)}`}</Text>
            <Text style={[t.type.caption, { color: c.textMuted, flex: 1 }]}>{f.angle === 30 ? 'the least that is used' : f.angle >= 60 ? 'good' : f.angle >= 45 ? '' : 'shallow'}</Text>
          </View>
        );
      })}

      <ControlRow>
        <GhostButton label="Print / PDF" icon="print-outline" style={{ flex: 1 }} onPress={() => void share()} />
      </ControlRow>
      {note ? <Text style={[t.type.caption, { color: c.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}
      <FooterNote text="Forces, not a lift plan: the lift is planned and the rigging chosen by a qualified person, to the load's weight and the slings' tags. Choker and basket ratings, D/d and edge protection are on the tag and from the maker, and not in this. Under 30° from horizontal a sling is not used unless its maker or a qualified person says so (ASME B30.9)." />
    </Screen>
  );
}
