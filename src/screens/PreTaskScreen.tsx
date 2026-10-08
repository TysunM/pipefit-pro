// The pre-task plan
// -----------------
// The morning sheet, one per job per day: the task, the hazards and their
// controls off the library, permits and PPE, where to run to, the toolbox
// talk, the crew's signatures and the foreman's. The reasoning is in
// state/pretask.ts.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { Banner, DayStepper, NoteField } from '../components/FormFields';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { Chip, JobChips, useJobFilter } from '../components/JobChips';
import { SignatureSheet, SignatureView } from '../components/SignatureSheet';
import { Plate } from '../components/metal';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { usePreTasks } from '../state/pretasks';
import { HAZARDS, PERMITS, PPE_EXTRA, Plan, addCrew, deletePlan, isClosed, newPlan, planFor, planGaps, putPlan, removeCrew, reopen, setControl, signCrew, signForeman, talkFor, toggleHazard, togglePermit, togglePpe } from '../state/pretask';
import { workDay, usDate, dayKey } from '../calc/days';
import { shareSheet } from '../print/share';
import { pretaskHtml } from '../print/pretask';

type Props = NativeStackScreenProps<RootStackParamList, 'PreTask'>;

export function PreTaskScreen({ navigation }: Props) {
  const t = useTheme();
  const { settings } = useSettings();
  const { log, apply, saveError, takeOver, clearDropped } = usePreTasks();
  const job = useJobFilter(log.plans);
  const project = job.filter.kind === 'one' ? job.filter.id : job.active;
  const [day, setDay] = useState(() => workDay(Date.now(), settings.shift));
  const plan: Plan = planFor(log, day, project) ?? newPlan(day, project, Date.now());
  const closed = isClosed(plan);
  const gaps = planGaps(plan);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [signing, setSigning] = useState<{ who: 'crew' | 'foreman'; name: string } | null>(null);
  const [foreman, setForeman] = useState(settings.fitterName);
  const [note, setNote] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  useEffect(() => navigation.setOptions({ title: project ? `Pre-task plan · ${project}` : 'Pre-task plan' }), [navigation, project]);

  /** A change to the day's plan, made to the newest copy. A closed plan reopens: what was signed is what was read. */
  const change = (f: (p: Plan) => Plan) =>
    apply((l) => {
      const cur = planFor(l, day, project) ?? newPlan(day, project, Date.now());
      return putPlan(l, reopen(f(cur)), Date.now());
    });
  const edit = (patch: Partial<Plan>) => change((p) => ({ ...p, ...patch }));

  const signed = (sig: string) => {
    if (!signing) return;
    const who = signing;
    setSigning(null);
    if (who.who === 'crew') change((p) => signCrew(p, who.name, sig, Date.now()));
    else apply((l) => putPlan(l, signForeman(planFor(l, day, project) ?? newPlan(day, project, Date.now()), who.name, sig, Date.now()), Date.now()));
  };

  const print = async () => {
    setNote(null);
    const out = await shareSheet(pretaskHtml({ plan, printedAt: Date.now() }), `Pre-task plan ${usDate(day)}${project ? ` ${project}` : ''}`);
    if (!out.ok) setNote(out.why);
  };

  const suggested = useMemo(() => talkFor(day), [day]);
  const library = HAZARDS.filter((h) => !plan.hazards.some((x) => x.id === h.id));

  return (
    <Screen>
      {saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last change could not be saved to this phone." /> : null}
      {log.foreign ? <Banner tone="danger" icon="alert-circle" text="This phone's pre-task plans were written by a newer version of the app, so nothing is being saved. Update the app, or start over." action="Start new" onAction={takeOver} /> : null}
      {log.dropped ? <Banner tone="warn" icon="warning-outline" text={`${log.dropped} stored ${log.dropped === 1 ? 'plan' : 'plans'} would not load.`} action="OK" onAction={clearDropped} /> : null}
      <View style={{ paddingTop: t.space.md }}>
        <JobChips f={job} />
      </View>
      <DayStepper day={day} onChange={setDay} today={workDay(Date.now(), settings.shift)} />

      <Banner
        tone={closed ? 'ok' : gaps.length ? 'warn' : 'info'}
        icon={closed ? 'checkmark-circle' : 'clipboard-outline'}
        text={closed ? `Closed by ${plan.foreman.name}. Any change reopens it.` : gaps.length ? `Still wanted: ${gaps.join('; ')}.` : 'Everything is on the sheet. Sign it to close the plan.'}
      />

      <SectionHeader title="The task" />
      <NoteField label="What we are doing today" value={plan.task} onChangeText={(v) => edit({ task: v })} placeholder="Set 6 in. CS line L-200 from the rack to the header, bolt up two flanges, hydro at the end of the shift." max={400} />
      <FieldRow>
        <DimensionInput label="Where" value={plan.area} onChangeText={(v) => edit({ area: v })} placeholder="Unit 3, pipe rack, elevation 112" keyboardType="default" autoCapitalize="sentences" />
      </FieldRow>

      <SectionHeader title="Hazards and controls" meta={`${plan.hazards.length}`} />
      <HintRow text="Tap what can hurt the crew today. Each comes with the control a journeyman would name; change it to say what this crew does about it here." />
      {plan.hazards.map((h) => (
        <View key={h.id} style={{ paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md }}>
          <Plate radius={t.radius.lg} style={{ padding: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning-outline" size={18} color={t.colors.warnText} />
              <Text style={[t.type.bodyStrong, { color: t.colors.text, flex: 1 }]}>{h.label}</Text>
              <Pressable onPress={() => change((p) => toggleHazard(p, h.id))} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Take ${h.label} off`}>
                <Ionicons name="close-circle-outline" size={22} color={t.colors.textFaint} />
              </Pressable>
            </View>
            <NoteField label="Control" value={h.control} onChangeText={(v) => change((p) => setControl(p, h.id, v))} placeholder="What we do about it" max={400} />
          </Plate>
        </View>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
        {library.map((h) => (
          <Chip key={h.id} label={h.label} on={false} onPress={() => change((p) => toggleHazard(p, h.id))} />
        ))}
      </View>
      <FieldRow>
        <DimensionInput label="Another hazard" value={custom} onChangeText={setCustom} placeholder="Type it and add" keyboardType="default" autoCapitalize="sentences" />
      </FieldRow>
      {custom.trim() ? (
        <ControlRow>
          <GhostButton
            label={`Add "${custom.trim()}"`}
            icon="add"
            style={{ flex: 1 }}
            onPress={() => {
              change((p) => toggleHazard(p, `x:${custom.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, custom.trim()));
              setCustom('');
            }}
          />
        </ControlRow>
      ) : null}

      <SectionHeader title="Permits" meta={plan.permits.length ? `${plan.permits.length}` : 'NONE'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
        {PERMITS.map((x) => (
          <Chip key={x} label={x} on={plan.permits.includes(x)} onPress={() => change((p) => togglePermit(p, x))} />
        ))}
      </View>
      <SectionHeader title="PPE beyond the basics" meta={plan.ppe.length ? `${plan.ppe.length}` : 'NONE'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
        {PPE_EXTRA.map((x) => (
          <Chip key={x} label={x} on={plan.ppe.includes(x)} onPress={() => change((p) => togglePpe(p, x))} />
        ))}
      </View>

      <SectionHeader title="If it goes wrong" />
      <FieldRow>
        <DimensionInput label="Muster point" value={plan.muster} onChangeText={(v) => edit({ muster: v })} placeholder="North gate, upwind" keyboardType="default" autoCapitalize="sentences" />
      </FieldRow>
      <NoteField label="Eyewash, extinguisher, first aid, rescue" value={plan.emergency} onChangeText={(v) => edit({ emergency: v })} placeholder="Eyewash at the unit 3 stair; extinguisher on the rack post; first aid in the foreman's truck; confined space rescue: site team on channel 2." max={400} />

      <SectionHeader title="Toolbox talk" />
      <FieldRow>
        <DimensionInput label="Topic" value={plan.talk.topic} onChangeText={(v) => edit({ talk: { ...plan.talk, topic: v } })} placeholder={suggested} keyboardType="default" autoCapitalize="sentences" />
      </FieldRow>
      {!plan.talk.topic ? (
        <ControlRow>
          <GhostButton label={`Today's: ${suggested}`} icon="school-outline" style={{ flex: 1 }} onPress={() => edit({ talk: { ...plan.talk, topic: suggested } })} />
        </ControlRow>
      ) : null}
      <NoteField label="What was said" value={plan.talk.notes} onChangeText={(v) => edit({ talk: { ...plan.talk, notes: v } })} placeholder="The points made, questions asked, anything the crew raised." max={1000} />

      <SectionHeader title="Crew sign-in" meta={plan.crew.length ? `${plan.crew.filter((c) => c.sig).length} of ${plan.crew.length} signed` : 'NOBODY YET'} />
      {plan.crew.map((c) => (
        <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingVertical: 6 }}>
          {c.sig ? <SignatureView sig={c.sig} height={32} /> : <GhostButton label="Sign" icon="create-outline" onPress={() => setSigning({ who: 'crew', name: c.name })} />}
          <Text style={[t.type.bodyStrong, { color: t.colors.text, flex: 1 }]}>{c.name}</Text>
          <Pressable onPress={() => change((p) => removeCrew(p, c.name))} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Take ${c.name} off the crew`}>
            <Ionicons name="close-circle-outline" size={22} color={t.colors.textFaint} />
          </Pressable>
        </View>
      ))}
      <FieldRow>
        <DimensionInput label="Add to the crew" value={name} onChangeText={setName} placeholder="Name, then Add" keyboardType="default" autoCapitalize="words" />
      </FieldRow>
      <ControlRow>
        <GhostButton
          label="Add"
          icon="person-add-outline"
          style={{ flex: 1 }}
          onPress={() => {
            if (!name.trim()) return;
            change((p) => addCrew(p, name));
            setName('');
          }}
        />
      </ControlRow>

      <SectionHeader title="Foreman" />
      {closed ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.layout.screenPadding }}>
          <SignatureView sig={plan.foreman.sig} height={36} />
          <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{plan.foreman.name}</Text>
        </View>
      ) : (
        <>
          <FieldRow>
            <DimensionInput label="Foreman" value={foreman} onChangeText={setForeman} placeholder="Name" keyboardType="default" autoCapitalize="words" />
          </FieldRow>
          <ControlRow>
            <AccentButton label="Sign and close the plan" icon="create-outline" style={{ flex: 1 }} onPress={() => (foreman.trim() ? setSigning({ who: 'foreman', name: foreman.trim() }) : setNote('Give the foreman\'s name first.'))} />
          </ControlRow>
        </>
      )}
      <ControlRow>
        <GhostButton label="Share PDF" icon="share-outline" style={{ flex: 1 }} onPress={() => void print()} />
        {planFor(log, day, project) ? (
          <GhostButton
            label={armed ? 'Tap again to delete' : 'Delete'}
            icon={armed ? 'warning-outline' : 'trash-outline'}
            onPress={() => {
              if (!armed) return setArmed(true);
              apply((l) => deletePlan(l, plan.id));
              setArmed(false);
            }}
          />
        ) : null}
      </ControlRow>
      {note ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}
      <Text style={[t.type.caption, { color: t.colors.textFaint, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.lg }]}>
        {`Say it: "pre-task plan: hot work and lifting, toolbox talk on ${suggested.toLowerCase()}, crew Ruiz and Diaz". ${dayKey(Date.now()) === day ? 'A closed plan is a record in the skills passport.' : ''}`}
      </Text>

      <SignatureSheet visible={signing !== null} title={signing?.who === 'foreman' ? 'Foreman: the plan is complete and was given to the crew' : 'I was at the talk and understand the plan'} name={signing?.name ?? ''} onCancel={() => setSigning(null)} onDone={signed} />
    </Screen>
  );
}
