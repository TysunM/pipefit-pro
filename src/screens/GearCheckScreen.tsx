import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { HintRow } from '../components/HintRow';
import { FieldRow } from '../components/DimensionInput';
import { Banner, NumField } from '../components/FormFields';
import { ChipRow } from '../components/ChipRow';
import { Segmented } from '../components/Segmented';
import { FooterNote, ResultBanner } from '../components/Results';
import { ControlRow, GhostButton } from '../components/Buttons';
import { VoicePressable } from '../voice/VoicePressable';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { CRITICAL, GEAR_KINDS, HITCHES, checkGear, isCritical, legTensions, type GearItem, type GearKind, type GearLine } from '../calc/gear';

// The gear check: everything below the hook against the rating on its own
// tag, the piece working hardest picked out, and the questions that make a
// lift critical. From Rig this spool it starts with that pick's legs.

type Props = NativeStackScreenProps<RootStackParamList, 'GearCheck'>;

const KG_PER_LB = 0.45359237;
let made = 0;
const fresh = (kind: GearKind, hitch?: GearItem['hitch']): GearItem => ({ id: `g${(made += 1)}`, kind, hitch, rated: null });
const STARTER = (): GearItem[] => [fresh('sling', 'choker'), fresh('shackle'), fresh('hook')];
const ADD: { value: GearKind; label: string }[] = (Object.keys(GEAR_KINDS) as GearKind[]).map((k) => ({ value: k, label: GEAR_KINDS[k].label }));

export function GearCheckScreen({ route }: Props) {
  const t = useTheme();
  const c = t.colors;
  const u = useUnits();
  const metric = u.system === 'metric';
  const toLb = (v: number | null) => (v === null ? null : metric ? v / KG_PER_LB : v);
  const fromLb = (v: number | null) => (v === null ? null : Math.round((metric ? v * KG_PER_LB : v) * 10) / 10);
  const W = (lb: number) => u.weight(lb, metric || lb < 100 ? 1 : 0);
  const p = route.params;

  // A pick hands over pounds; the field is in the units on screen.
  const pickLoad = p?.load !== undefined ? fromLb(p.load) : null;
  const [load, setLoad] = useState<number | null>(pickLoad);
  const [rigging, setRigging] = useState<number | null>(null);
  const fromPick = !!p?.legs?.length;
  const [legsN, setLegsN] = useState<1 | 2 | 3 | 4>(p?.legs?.length === 1 ? 1 : 2);
  const [angle, setAngle] = useState<number | null>(Math.round((p?.angle ?? 60) * 10) / 10);
  const [items, setItems] = useState<GearItem[]>(STARTER);
  const [critical, setCritical] = useState<Record<string, boolean>>({});

  // A pick from Rig this spool brings its own leg tensions; otherwise the
  // legs carrying it and their angle. On a rigid load, two legs carry it.
  const legs = useMemo(() => {
    if (fromPick && load === pickLoad) return p!.legs!;
    const lb = toLb(load);
    if (lb === null) return [];
    return legsN === 1 ? [lb] : legTensions(lb, Math.min(legsN, 2), angle ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPick, load, legsN, angle, metric]);
  const result = useMemo(() => checkGear({ load: toLb(load) ?? 0, rigging: toLb(rigging) ?? 0, legs, items }), [load, rigging, legs, items, metric]);
  const ready = load !== null && load > 0 && legs.length > 0;

  const patch = (id: string, next: Partial<GearItem>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...next } : x)));
  const tone = (l: GearLine) => (l.status === 'over' ? c.danger : l.status === 'heavy' ? c.warnText : l.status === 'ok' ? c.success : c.textFaint);
  const weakest = result.weakest !== null ? result.lines[result.weakest]! : null;
  const crit = isCritical(critical);

  return (
    <Screen>
      <HintRow text="Everything below the hook against the rating on its own tag. The lift is only as strong as its weakest piece." />

      {ready ? (
        <>
          <ResultBanner icon="barbell-outline" label="Hook load" value={W(result.hookLoad)} hint={`The load and the rigging under the hook. Heaviest leg ${W(result.maxLeg)}${fromPick && load === pickLoad ? ', from the pick' : ''}.`} />
          {result.over ? (
            <Banner tone="danger" icon="alert-circle-outline" text={`Over its rating: ${result.lines.filter((l) => l.status === 'over').map((l) => l.label.toLowerCase()).join(', ')}. Don't lift. Use gear rated for it, or change the pick.`} />
          ) : weakest ? (
            <Banner tone={weakest.status === 'heavy' ? 'warn' : 'ok'} icon={weakest.status === 'heavy' ? 'warning-outline' : 'checkmark-circle-outline'} text={`Weakest piece: the ${weakest.label.toLowerCase()}, at ${Math.round(weakest.pct! * 100)}% of its tag.${weakest.status === 'heavy' ? ' Working hard: check it twice.' : ''}`} />
          ) : null}
          {result.unrated ? <Banner tone="warn" icon="pricetag-outline" text={`${result.unrated} piece${result.unrated === 1 ? ' has' : 's have'} no rating yet: read it off the tag. No tag, no lift.`} /> : null}
        </>
      ) : (
        <ResultBanner icon="barbell-outline" label="Hook load" value="—" tone="idle" hint="Put in the load, and how it hangs." />
      )}

      <SectionHeader title="The load" />
      <FieldRow>
        <NumField label="Load" value={load} onChange={setLoad} suffix={metric ? 'kg' : 'lb'} />
      </FieldRow>
      <FieldRow>
        <NumField label="Rigging under the hook" value={rigging} onChange={setRigging} suffix={metric ? 'kg' : 'lb'} />
      </FieldRow>
      {fromPick && load === pickLoad ? (
        <HintRow text={`From the pick: ${p!.legs!.map((l, i) => `sling ${i + 1} pulls ${W(l)}`).join(', ')}. Change the load to work it out by legs and angle instead.`} />
      ) : (
        <>
          <Segmented
            label="Legs"
            options={[
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' },
            ]}
            selected={legsN}
            onSelect={setLegsN}
          />
          {legsN > 1 ? (
            <FieldRow>
              <NumField label="Sling angle from horizontal" value={angle} onChange={setAngle} suffix="°" />
            </FieldRow>
          ) : null}
          {legsN > 2 ? <HintRow text={`On a rigid load, two of the ${legsN} legs can end up carrying it all: each leg is checked for half the load.`} /> : null}
        </>
      )}

      <SectionHeader title="Below the hook" />
      {result.lines.map((l, i) => {
        const it = l.item;
        const info = GEAR_KINDS[it.kind];
        return (
          <View key={it.id} style={{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.md, padding: t.space.md, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: i === result.weakest ? 1.5 : t.hairline, borderColor: i === result.weakest ? tone(l) : c.border, gap: t.space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
              <Text style={[t.type.bodyStrong, { color: c.text, flex: 1 }]}>{l.label}</Text>
              <VoicePressable voiceLabel={`remove ${l.label}`} accessibilityRole="button" accessibilityLabel={`Remove the ${l.label.toLowerCase()}`} onPress={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} hitSlop={10}>
                <Ionicons name="close-circle-outline" size={22} color={c.textFaint} />
              </VoicePressable>
            </View>
            <Text style={[t.type.caption, { color: c.textMuted }]}>{info.where === 'leg' ? (it.kind === 'sling' && it.hitch === 'basket' ? 'One on each leg, both parts up to the hook' : 'One on each leg') : 'In line with the whole load'}</Text>
            {it.kind === 'sling' ? <ChipRow options={HITCHES} selected={it.hitch ?? 'vertical'} onSelect={(h) => patch(it.id, { hitch: h })} /> : null}
            <NumField label={it.kind === 'sling' ? `Rated load, ${(it.hitch ?? 'vertical')} hitch, off the tag` : 'Working load limit, off the tag'} value={fromLb(it.rated)} onChange={(v) => patch(it.id, { rated: toLb(v) })} suffix={metric ? 'kg' : 'lb'} />
            {it.kind === 'sling' && it.hitch === 'choker' ? (
              <Segmented
                label="Choke"
                options={[
                  { value: 'open', label: '120° or more' },
                  { value: 'tight', label: 'Tighter' },
                ]}
                selected={it.tightChoke ? 'tight' : 'open'}
                onSelect={(v) => patch(it.id, { tightChoke: v === 'tight' })}
              />
            ) : null}
            {ready ? (
              <View style={{ gap: 4 }}>
                <Text style={[t.type.body, { color: c.text }]}>{`Carries ${W(l.force)}${l.pct !== null ? ` · ${Math.round(l.pct * 100)}% of its tag` : ' · no rating yet'}`}</Text>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, Math.round((l.pct ?? 0) * 100))}%`, height: 8, backgroundColor: tone(l) }} />
                </View>
              </View>
            ) : null}
            {l.notes.map((n) => (
              <Text key={n} style={[t.type.caption, { color: c.textMuted }]}>
                {n}
              </Text>
            ))}
          </View>
        );
      })}
      <ChipRow label="Add" options={ADD} selected={null} onSelect={(k) => setItems((xs) => [...xs, fresh(k, k === 'sling' ? 'vertical' : undefined)])} />

      <SectionHeader title="Is it a critical lift?" />
      {CRITICAL.map((q) => {
        const on = !!critical[q.id];
        return (
          <VoicePressable
            key={q.id}
            voiceLabel={q.text}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => setCritical((x) => ({ ...x, [q.id]: !on }))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm }}
          >
            <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? c.danger : c.textFaint} />
            <Text style={[t.type.body, { color: c.text, flex: 1 }]}>{q.text}</Text>
          </VoicePressable>
        );
      })}
      {crit ? (
        <Banner tone="danger" icon="document-text-outline" text="Critical lift: an engineered lift plan, reviewed and signed off, and a pre-lift meeting, before it goes up. Not a phone check." />
      ) : (
        <HintRow text="Any one of these and it's a critical lift. Your site may have more: ask." />
      )}

      <ControlRow>
        <GhostButton label="Start the list again" icon="refresh" style={{ flex: 1 }} onPress={() => setItems(STARTER())} />
      </ControlRow>
      <FooterNote text="Every rating is the one on that piece's tag, for the way it's used. No tag, no lift. Inspect every piece before use. This checks the gear, it doesn't plan the lift: a qualified rigger rigs it, and the crane's capacity comes from its own chart and its operator." />
    </Screen>
  );
}
