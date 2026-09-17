import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { HintRow } from '../components/HintRow';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { boltUp } from '../calc/boltUp';
import { PASSES, boltUpProgress, currentPass, isFinished } from '../calc/boltUpSequence';
import {
  Joint,
  SCRATCH_ID,
  doneJoints,
  getJoint,
  isDone,
  openJoints,
  removeJoint,
  sinceLabel,
} from '../state/register';
import { useJoints } from '../state/joints';

type Props = NativeStackScreenProps<RootStackParamList, 'Joints'>;

/** The same ramp the flange face uses, so a row reads like the joint does. */
const PASS_FILL = ['#FACC15', '#F97316', '#2563EB', '#15803D'];

function flangeLabel(j: Joint): string {
  const f = j.nps === null ? undefined : boltUp(j.nps, j.cls);
  return f ? `${f.label} · class ${j.cls} · ${j.bolts} bolts` : `${j.bolts} bolts`;
}

function where(j: Joint): string {
  if (isFinished(j.state)) return 'All four passes recorded';
  const pass = currentPass(j.state);
  if (boltUpProgress(j.state).done === 0) return 'Not started';
  return `${pass?.label ?? ''} · bolt ${j.state.step + 1} of ${j.bolts}`;
}

/** Four pips, one per pass, filled as far as the joint has got. */
function PassPips({ t, joint }: { t: Theme; joint: Joint }) {
  const full = joint.state.pass;
  const part = isFinished(joint.state) ? 0 : joint.state.step / Math.max(1, joint.bolts);
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {PASSES.map((p, i) => {
        const filled = i < full;
        const share = i === full ? part : filled ? 1 : 0;
        return (
          <View
            key={p.number}
            style={{
              width: 22,
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: t.colors.bgSubtle,
              borderWidth: t.hairline,
              borderColor: t.colors.border,
            }}
          >
            <View style={{ width: `${Math.round(share * 100)}%`, height: '100%', backgroundColor: PASS_FILL[i] }} />
          </View>
        );
      })}
    </View>
  );
}

function JointRow({
  t,
  joint,
  now,
  onOpen,
  onDelete,
}: {
  t: Theme;
  joint: Joint;
  now: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  // Deleting confirms in the row rather than in an alert, because an alert is
  // one mis-tap from gone and because react-native-web does not show one at all.
  const [confirming, setConfirming] = useState(false);

  return (
    <View
      style={{
        marginHorizontal: t.layout.screenPadding,
        marginBottom: t.space.md,
        borderRadius: t.radius.md,
        borderWidth: t.hairline,
        borderColor: confirming ? t.colors.danger : t.colors.border,
        backgroundColor: t.colors.bgRaised,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open ${joint.tag || 'untitled joint'}, ${where(joint)}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          padding: t.space.lg,
          backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
        })}
      >
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[t.type.bodyStrong, { color: t.colors.text }]} numberOfLines={1}>
            {joint.tag || 'Untitled joint'}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
            {flangeLabel(joint)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: 2 }}>
            <PassPips t={t} joint={joint} />
            <Text style={[t.type.caption, { color: isDone(joint) ? t.colors.success : t.colors.data, flexShrink: 1 }]} numberOfLines={1}>
              {where(joint)}
            </Text>
          </View>
          {joint.note ? (
            <Text style={[t.type.caption, { color: t.colors.textFaint }]} numberOfLines={1}>
              {joint.note}
            </Text>
          ) : null}
          <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
            {isDone(joint) ? `Finished ${sinceLabel(joint.completedAt ?? joint.updatedAt, now)}` : `Worked ${sinceLabel(joint.updatedAt, now)}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
      </Pressable>

      {confirming ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.md,
            paddingHorizontal: t.space.lg,
            paddingBottom: t.space.lg,
          }}
        >
          <Text style={[t.type.captionStrong, { color: t.colors.danger, flex: 1 }]}>
            {isDone(joint) ? 'Delete this record?' : 'Delete it? The bolt-up is part done.'}
          </Text>
          <Pressable onPress={() => setConfirming(false)} hitSlop={10} accessibilityRole="button">
            <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>Keep</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Confirm delete ${joint.tag || 'untitled joint'}`}>
            <Text style={[t.type.labelSmall, { color: t.colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setConfirming(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${joint.tag || 'untitled joint'}`}
          style={{ position: 'absolute', top: 0, right: 0, padding: t.space.md }}
        >
          <Ionicons name="trash-outline" size={16} color={t.colors.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

function Notice({
  t,
  tone,
  icon,
  text,
  action,
  onAction,
}: {
  t: Theme;
  tone: 'warn' | 'danger';
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  const danger = tone === 'danger';
  return (
    <View
      style={{
        marginHorizontal: t.layout.screenPadding,
        marginBottom: t.space.md,
        padding: t.space.lg,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: danger ? t.colors.danger : t.colors.warnBorder,
        backgroundColor: danger ? 'transparent' : t.colors.warnBg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
      }}
    >
      <Ionicons name={icon} size={18} color={danger ? t.colors.danger : t.colors.warnText} />
      <Text style={[t.type.caption, { color: danger ? t.colors.danger : t.colors.warnText, flex: 1 }]}>{text}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={[t.type.labelSmall, { color: danger ? t.colors.danger : t.colors.warnText }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function JointsScreen({ navigation }: Props) {
  const t = useTheme();
  const { register, hydrated, saveError, apply, clearDropped, takeOver } = useJoints();
  const [clearing, setClearing] = useState(false);
  const now = Date.now();

  const open = openJoints(register);
  const done = doneJoints(register);
  const scratch = getJoint(register, SCRATCH_ID);
  const scratchStarted = scratch ? boltUpProgress(scratch.state).done > 0 : false;

  const go = (jointId?: string) => navigation.navigate('FlangeBoltUp', jointId ? { jointId } : {});
  const drop = (id: string) => apply((r) => removeJoint(r, id));

  return (
    <Screen>
      {register.foreign ? (
        <Notice
          t={t}
          tone="danger"
          icon="alert-circle"
          text="This phone's joint list was written by a newer version of the app, so nothing is being saved. Update the app to get it back, or start a new list and lose what it held."
          action="Start new"
          onAction={takeOver}
        />
      ) : null}

      {saveError ? (
        <Notice
          t={t}
          tone="danger"
          icon="cloud-offline-outline"
          text="The last change could not be saved to this phone. What is on screen is ahead of what is stored."
        />
      ) : null}

      {register.dropped ? (
        <Notice
          t={t}
          tone="warn"
          icon="warning-outline"
          text={`${register.dropped} stored ${register.dropped === 1 ? 'joint' : 'joints'} would not load and ${
            register.dropped === 1 ? 'was' : 'were'
          } left out. A part-done bolt-up that does not add up is not shown rather than shown wrongly.`}
          action="OK"
          onAction={clearDropped}
        />
      ) : null}

      <HintRow text="Every joint is saved as you work it, bolt by bolt. Leave the screen, close the app or put the phone in your pocket mid-pass and it picks up on the same bolt." />

      <SectionHeader title="Working now" meta={scratchStarted ? where(scratch as Joint) : undefined} />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.xl }}>
        <AccentButton
          label={scratchStarted ? 'Back to the unnamed joint' : 'Start a joint'}
          icon={scratchStarted ? 'arrow-forward' : 'add'}
          onPress={() => go()}
        />
        {scratch && scratchStarted ? (
          <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.md }]}>
            {`${flangeLabel(scratch)} · worked ${sinceLabel(scratch.updatedAt, now)}. Name it on that screen to keep it here as a record.`}
          </Text>
        ) : (
          <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.md }]}>
            Opens the bolt-up without naming anything. Name it when you want it kept.
          </Text>
        )}
      </View>

      {open.length ? (
        <>
          <SectionHeader title="Part done" meta={`${open.length} ${open.length === 1 ? 'joint' : 'joints'}`} />
          {open.map((j) => (
            <JointRow key={j.id} t={t} joint={j} now={now} onOpen={() => go(j.id)} onDelete={() => drop(j.id)} />
          ))}
        </>
      ) : null}

      {done.length ? (
        <>
          <SectionHeader title="Finished" meta={`${done.length} ${done.length === 1 ? 'joint' : 'joints'}`} />
          {done.map((j) => (
            <JointRow key={j.id} t={t} joint={j} now={now} onOpen={() => go(j.id)} onDelete={() => drop(j.id)} />
          ))}
        </>
      ) : null}

      {hydrated && !open.length && !done.length ? (
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.xl, alignItems: 'center', gap: t.space.md }}>
          <Ionicons name="pricetags-outline" size={34} color={t.colors.textFaint} />
          <Text style={[t.type.body, { color: t.colors.textMuted, textAlign: 'center' }]}>
            No named joints yet. Work a joint, then tap <Text style={{ fontWeight: '700' }}>Name it</Text> to keep it here.
          </Text>
        </View>
      ) : null}

      {done.length > 1 ? (
        <ControlRow>
          {clearing ? (
            <>
              <GhostButton label="Keep them" style={{ flex: 1 }} onPress={() => setClearing(false)} />
              <GhostButton
                label={`Delete ${done.length}`}
                icon="trash-outline"
                style={{ flex: 1, borderColor: t.colors.danger }}
                onPress={() => {
                  setClearing(false);
                  apply((r) => doneJoints(r).reduce((acc, j) => removeJoint(acc, j.id), r));
                }}
              />
            </>
          ) : (
            <GhostButton
              label="Clear finished"
              icon="trash-outline"
              style={{ flex: 1 }}
              onPress={() => setClearing(true)}
            />
          )}
        </ControlRow>
      ) : null}
    </Screen>
  );
}
