// The cut list, at the saw
// ------------------------
// The cuts added from Cut Length, by pipe, in the order they were added: a
// mark to write on the pipe, the length to cut, and what it was worked from.
// Tick each one as it comes off the saw. Under each pipe, what is still to
// cut packed onto sticks of the rack's length, so the rack is pulled once.
// Sent as text or as a printable sheet. The reasoning is in state/cutLog.ts.
import React, { useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Pressable, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { CutList } from '../components/CutList';
import { JobChips, useJobFilter } from '../components/JobChips';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { useSettings } from '../state/settings';
import { useCuts } from '../state/cuts';
import { answerTick, clearCuts, cutGroups, cutListText, deleteCut, setCutDone, toggleCut } from '../state/cutLog';
import { readTick } from '../voice/cutTick';
import { useScreenVoice } from '../voice/useScreenVoice';
import { canListen, listenOn, stopListening } from '../voice/listen';
import { say } from '../audio/say';
import { spokenLength } from '../calc/spoken';
import { shareSheet } from '../print/share';
import { cutSheetHtml } from '../print/cutSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'CutList'>;

export function CutListScreen({ navigation }: Props) {
  const t = useTheme();
  const u = useUnits();
  const { settings } = useSettings();
  const { log, apply } = useCuts();
  const job = useJobFilter(log.cuts);
  const shown = job.mine(log.cuts);
  const groups = useMemo(() => cutGroups(shown, settings.stockLength, settings.cutAllowance), [shown, settings.stockLength, settings.cutAllowance]);
  const len = (v: number) => u.frac(v) || u.full(v);
  const toGo = shown.filter((c) => !c.done).length;
  const cutDone = shown.length - toGo;
  const title = `Cut list${job.label ? ` · ${job.label}` : ''}`;

  const [armed, setArmed] = useState<'done' | 'all' | null>(null);

  // By voice: "4 done", "undo 4", "next" — from the mic button, or with the
  // mic left open at the saw.
  const hear = (heard: string): string | null => {
    const tick = readTick(heard);
    if (!tick) return null;
    const a = answerTick(shown, tick, (v) => spokenLength(v, settings.unitSystem, settings.fractionDenominator));
    if (a.set) {
      const { id, done } = a.set;
      apply((l) => setCutDone(l, id, done));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    return a.say;
  };
  useScreenVoice(hear);
  const focused = useIsFocused();
  const [atSaw, setAtSaw] = useState(false);
  const [sawLine, setSawLine] = useState<{ heard: string; said: string } | null>(null);
  const latestHear = React.useRef(hear);
  latestHear.current = hear;
  useEffect(() => {
    if (!atSaw || !focused) return;
    let live = true;
    say('Hands free. Say a mark then done, or next.');
    const start = setTimeout(() => {
      void listenOn(
        (heard) => {
          const said = latestHear.current(heard);
          setSawLine({ heard, said: said ?? '' });
          if (said) say(said);
        },
        { still: () => live, onHeard: (h) => setSawLine((p) => ({ heard: h, said: p?.said ?? '' })) },
      ).then((err) => {
        if (err && live) {
          setAtSaw(false);
          setSawLine({ heard: '', said: 'The mic stopped. Turn hands-free on again.' });
        }
      });
    }, 2500);
    return () => {
      live = false;
      clearTimeout(start);
      stopListening();
    };
  }, [atSaw, focused]);
  const [note, setNote] = useState<string | null>(null);

  const sendText = () => {
    void Share.share({ message: cutListText(groups, { title, length: len }), title }).catch(() => undefined);
  };
  const sendSheet = async () => {
    setNote(null);
    const out = await shareSheet(cutSheetHtml({ title, groups, length: len, stock: settings.stockLength, kerf: settings.cutAllowance }), title);
    if (!out.ok) setNote(out.why);
  };

  return (
    <Screen>
      <HintRow text="Cuts added from Cut Length, by pipe. Write the mark on the pipe, tick it when it comes off the saw. What is left is packed onto sticks so the rack is pulled once." />
      <JobChips f={job} />

      {!shown.length ? (
        <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
          <Text style={[t.type.body, { color: t.colors.textMuted }]}>
            Nothing on the list for this job. Work a cut in Cut Length and tap Add to cut list, or say “add it”.
          </Text>
          <AccentButton label="Open Cut Length" icon="cut-outline" onPress={() => navigation.navigate('CutLength')} />
        </View>
      ) : (
        <>
          <Text style={[t.type.bodyStrong, { color: toGo ? t.colors.text : t.colors.accent, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg }]}>
            {toGo ? `${toGo} to cut${cutDone ? ` · ${cutDone} cut` : ''}` : `All ${shown.length} cut`}
          </Text>
          <View style={{ paddingTop: t.space.md }}>
            <ControlRow>
              <AccentButton label="Print / PDF" icon="print-outline" onPress={() => void sendSheet()} style={{ flex: 1 }} />
              <GhostButton label="Send text" icon="share-outline" onPress={sendText} style={{ flex: 1 }} />
            </ControlRow>
          </View>
          {note ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}
          {canListen() ? (
            <View style={{ paddingTop: t.space.sm }}>
              <ControlRow>
                <GhostButton
                  label={atSaw ? 'Hands-free on — tap to stop' : 'Hands-free at the saw'}
                  icon={atSaw ? 'mic' : 'mic-outline'}
                  onPress={() => {
                    setAtSaw((v) => !v);
                    setSawLine(null);
                  }}
                  style={{ flex: 1 }}
                />
              </ControlRow>
              {atSaw ? (
                <Text style={[t.type.captionStrong, { color: t.colors.accent, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm }]}>
                  {sawLine?.said || 'Listening — say “4 done”, “undo 4” or “next”.'}
                  {sawLine?.heard ? `   (“${sawLine.heard}”)` : ''}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      )}

      {groups.map((g) => (
        <View key={g.pipeKey}>
          <SectionHeader title={g.pipe} meta={g.toGo ? `${g.toGo} to cut` : 'all cut'} />
          {g.cuts.map((c) => (
            <View
              key={c.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.md,
                marginHorizontal: t.layout.screenPadding,
                minHeight: 60,
                borderTopWidth: t.hairline,
                borderTopColor: t.colors.border,
                opacity: c.done ? 0.55 : 1,
              }}
            >
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  apply((l) => toggleCut(l, c.id));
                }}
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: c.done }}
                accessibilityLabel={`Mark ${c.mark}, ${len(c.cut)}. ${c.done ? 'Cut. Tap to undo' : 'Tap when cut'}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, flex: 1, paddingVertical: t.space.sm }}
              >
                <Ionicons name={c.done ? 'checkbox' : 'square-outline'} size={28} color={c.done ? t.colors.accent : t.colors.textMuted} />
                <View style={{ minWidth: 44, paddingHorizontal: 6, paddingVertical: 2, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center' }}>
                  <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{c.mark}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.sectionTitle, { color: t.colors.data, textDecorationLine: c.done ? 'line-through' : 'none' }]}>{len(c.cut)}</Text>
                  <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={2}>
                    {`C-C ${len(c.c2c)}${c.ends ? ` · ${c.ends}` : ''}`}
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => apply((l) => deleteCut(l, c.id))} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Take mark ${c.mark} off the list`}>
                <Ionicons name="trash-outline" size={20} color={t.colors.textFaint} />
              </Pressable>
            </View>
          ))}
          {g.toGo ? (
            <CutList
              plan={g.plan}
              stock={settings.stockLength}
              length={(v) => `${u.num(v)} ${u.unitName}`}
              short={(v) => u.num(v)}
              title={`Pull for ${g.pipe}`}
            />
          ) : null}
        </View>
      ))}

      {shown.length ? (
        <View style={{ paddingTop: t.space.xl }}>
          <ControlRow>
            {cutDone ? (
              <GhostButton
                label={armed === 'done' ? `Tap again: clear ${cutDone} cut` : 'Clear the cut ones'}
                icon={armed === 'done' ? 'warning-outline' : 'checkmark-done-outline'}
                style={{ flex: 1 }}
                onPress={() => {
                  if (armed !== 'done') return setArmed('done');
                  apply((l) => clearCuts(l, shown, true));
                  setArmed(null);
                }}
              />
            ) : null}
            <GhostButton
              label={armed === 'all' ? `Tap again: clear all ${shown.length}` : 'Clear all'}
              icon={armed === 'all' ? 'warning-outline' : 'trash-outline'}
              style={{ flex: 1 }}
              onPress={() => {
                if (armed !== 'all') return setArmed('all');
                apply((l) => clearCuts(l, shown, false));
                setArmed(null);
              }}
            />
          </ControlRow>
        </View>
      ) : null}
    </Screen>
  );
}
