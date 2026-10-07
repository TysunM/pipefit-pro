// The weld log
// ------------
// Three pages of one book. Welds: every weld on the job by line, what state
// it is in, and the day's diameter-inches. NDE: what the B31.3 sampling still
// owes — the random share, tracers after a reject, a whole lot — with the welds
// to shoot suggested, the ones waiting on film, and the repairs. Welders: the
// roster, each welder's continuity on every process and reject rate. The
// reasoning is in state/weldLog.ts and calc/ndeSampling.ts.
import React, { useMemo, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { Segmented } from '../components/Segmented';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { Banner } from '../components/FormFields';
import { Chip, JobChips, useJobFilter } from '../components/JobChips';
import { WelderSheet } from '../components/WelderSheet';
import { weldInk } from '../components/weldInk';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useWelds, useWelders } from '../state/welds';
import {
  STATE_LABEL,
  Weld,
  Welder,
  continuity,
  diameterInches,
  findWelder,
  linesOf,
  logRepair,
  pickWeld,
  setResult,
  stampsIn,
  weldName,
  weldState,
  welderStats,
} from '../state/weldLog';
import { NdeAsk, lotsOf, ndeAsks, ndeRequestText, pendingExams, repairsDue, summarise } from '../calc/ndeSampling';
import { dayKey, usDate } from '../calc/days';
import { sizeLabel } from '../calc/materials';
import { shareSheet } from '../print/share';
import { weldLogHtml } from '../print/weldLog';

type Props = NativeStackScreenProps<RootStackParamList, 'WeldLog'>;
type Tab = 'welds' | 'nde' | 'welders';

const fig = (n: number) => `${Math.round(n * 100) / 100}`;

export function WeldLogScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { settings } = useSettings();
  const { log, apply, saveError, takeOver } = useWelds();
  const { roster, apply: applyRoster } = useWelders();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'welds');
  const job = useJobFilter(log.welds);
  const mine = job.mine(log.welds);
  const today = dayKey(Date.now());
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<Welder | 'new' | null>(null);
  const [newStamp, setNewStamp] = useState('');

  const asks = useMemo(() => ndeAsks(mine), [mine]);
  const repairs = repairsDue(mine);
  const pending = pendingExams(mine);
  const ndeOwed = asks.reduce((n, a) => n + a.count, 0) + repairs.length;
  const title = `Weld log${job.label ? ` · ${job.label}` : ''}`;

  // Continuity trouble across the roster, for the banner on every page.
  const trouble = roster.welders.flatMap((w) => continuity(w, log.welds, today).filter((c) => c.state !== 'ok').map((c) => ({ w, c })));

  const pick = (a: NdeAsk, w: Weld) => {
    apply((l) => pickWeld(l, w.id, { method: a.lot.method, reason: a.reason, forWeld: a.forWeld?.id, round: a.round }, Date.now()));
    void Haptics.selectionAsync();
  };
  const result = (w: Weld, r: 'accept' | 'reject') => {
    const e = w.exams[w.exams.length - 1]!;
    apply((l) => setResult(l, w.id, e.id, r, e.report, Date.now()));
    void Haptics.notificationAsync(r === 'accept' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  };
  const sendRequest = () => {
    void Share.share({ message: ndeRequestText(mine, { title: `NDE request${job.label ? ` · ${job.label}` : ''} · ${usDate(today)}`, size: sizeLabel }), title: 'NDE request' }).catch(() => undefined);
  };
  const print = async () => {
    setNote(null);
    const out = await shareSheet(weldLogHtml({ title, welds: mine, welders: roster.welders, today, size: sizeLabel }), title);
    if (!out.ok) setNote(out.why);
  };

  return (
    <Screen>
      {log.foreign ? (
        <Banner tone="danger" icon="alert-circle" text="This phone's weld log was written by a newer version of the app, so nothing is being saved. Update the app, or start a new log and lose what it held." action="Start new" onAction={takeOver} />
      ) : null}
      {saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last change could not be saved to this phone. What is on screen is ahead of what is stored." /> : null}
      {trouble.length ? (
        <Banner
          tone={trouble.some((x) => x.c.state === 'lapsed') ? 'danger' : 'warn'}
          icon="ribbon-outline"
          text={trouble.map(({ w, c }) => (c.state === 'lapsed' ? `${w.stamp} lapsed on ${c.process}` : `${w.stamp} ${c.process} runs out in ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'}`)).join(' · ')}
          action="Welders"
          onAction={() => setTab('welders')}
        />
      ) : null}

      <View style={{ paddingTop: t.space.md }}>
        <Segmented
          options={[
            { value: 'welds', label: `Welds${mine.length ? ` ${mine.length}` : ''}` },
            { value: 'nde', label: `NDE${ndeOwed ? ` ${ndeOwed}` : ''}` },
            { value: 'welders', label: 'Welders' },
          ]}
          selected={tab}
          onSelect={setTab}
        />
      </View>
      <JobChips f={job} />

      {tab === 'welds' ? (
        <WeldsPage t={t} welds={mine} today={today} onOpen={(id) => navigation.navigate('Weld', { id })} onAdd={() => navigation.navigate('Weld', { line: linesOf(mine)[0] ?? '' })} onPrint={() => void print()} note={note} />
      ) : null}

      {tab === 'nde' ? (
        <>
          <HintRow text="B31.3 random sampling: each welder's butt welds in lots by percentage. A reject asks for two tracers, a failed tracer two more, and a second failure the whole lot." />
          {repairs.length ? <SectionHeader title="Repairs" meta={`${repairs.length} to repair and re-shoot`} /> : null}
          {repairs.map((w) => (
            <Row key={w.id} t={t} onPress={() => navigation.navigate('Weld', { id: w.id })} label={`Weld ${weldName(w)}, rejected`}>
              <Text style={[t.type.bodyStrong, { color: t.colors.danger, flex: 1 }]}>{`${w.line ? `${w.line} · ` : ''}${weldName(w)} rejected`}</Text>
              <GhostButton label="Repaired" icon="construct-outline" onPress={() => apply((l) => logRepair(l, w.id, Date.now()))} />
            </Row>
          ))}

          {asks.length ? <SectionHeader title="To pick" meta={`${asks.reduce((n, a) => n + a.count, 0)} welds`} /> : null}
          {asks.map((a) => (
            <View key={`${a.lot.key}|${a.kind}|${a.forWeld?.id ?? ''}|${a.round ?? 0}`} style={{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.lg, gap: t.space.sm }}>
              <Text style={[t.type.caption, { color: a.kind === 'random' ? t.colors.textMuted : t.colors.danger }]}>{a.text}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
                {a.candidates.slice(0, Math.max(a.count + 4, 6)).map((w, i, shown) => {
                  // The line only when the welds offered are on more than one.
                  const lined = new Set(shown.map((x) => x.line)).size > 1;
                  return <Chip key={w.id} label={`${lined && w.line ? `${w.line} ` : 'Weld '}${weldName(w)}`} on={i < a.count} icon={i < a.count ? 'star' : undefined} onPress={() => pick(a, w)} />;
                })}
              </View>
              <Text style={[t.type.labelSmall, { color: t.colors.textFaint }]}>Starred: the suggestion. Tap a weld to pick it.</Text>
            </View>
          ))}

          {pending.length ? <SectionHeader title="Waiting on results" meta={`${pending.length} picked`} /> : null}
          {pending.map((w) => {
            const e = w.exams[w.exams.length - 1]!;
            return (
              <Row key={w.id} t={t} onPress={() => navigation.navigate('Weld', { id: w.id })} label={`Weld ${weldName(w)}, ${e.method} picked`}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`${w.line ? `${w.line} · ` : ''}${weldName(w)}`}</Text>
                  <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{`${e.method} · ${e.reason} · ${w.welders.join('/') || 'no stamp'}`}</Text>
                </View>
                <GhostButton label="Accept" icon="checkmark" onPress={() => result(w, 'accept')} />
                <GhostButton label="Reject" icon="close" onPress={() => result(w, 'reject')} />
              </Row>
            );
          })}
          {pending.length ? (
            <View style={{ paddingTop: t.space.md }}>
              <ControlRow>
                <AccentButton label={`Send the NDE request · ${pending.length}`} icon="share-outline" style={{ flex: 1 }} onPress={sendRequest} />
              </ControlRow>
            </View>
          ) : null}

          <SectionHeader title="Lots" meta={`${lotsOf(mine).length}`} />
          {lotsOf(mine).map((lot) => {
            const s = summarise(lot);
            return (
              <View key={lot.key} style={{ marginHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm, borderTopWidth: t.hairline, borderTopColor: t.colors.border }}>
                <Text style={[t.type.bodyStrong, { color: s.full ? t.colors.danger : t.colors.text }]}>{`${lot.stamp} · ${lot.pct}% ${lot.method}${s.full ? ' · whole lot' : ''}`}</Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                  {`${lot.welds.length} butt welds · ${s.picked} of ${s.required} picked · ${s.examined} shot · ${s.rejects} rejected`}
                </Text>
              </View>
            );
          })}
          {!mine.some((w) => w.type === 'BW' && w.pct > 0) ? (
            <Text style={[t.type.body, { color: t.colors.textMuted, padding: t.layout.screenPadding }]}>No butt welds on a line that calls for NDE yet.</Text>
          ) : null}
        </>
      ) : null}

      {tab === 'welders' ? (
        <>
          <HintRow text="ASME IX QW-322: a welder's qualification on a process lapses after six months without welding it. Every weld logged with the process carries it on." />
          <ControlRow>
            <AccentButton label="Add a welder" icon="person-add-outline" style={{ flex: 1 }} onPress={() => setEditing('new')} />
          </ControlRow>
          {stampsIn(log.welds)
            .filter((s) => !findWelder(roster, s))
            .map((s) => (
              <Row key={s} t={t} onPress={() => { setNewStamp(s); setEditing('new'); }} label={`Add ${s} to the roster`}>
                <Text style={[t.type.body, { color: t.colors.warnText, flex: 1 }]}>{`${s} is on welds but not on the roster. Tap to add.`}</Text>
              </Row>
            ))}
          {roster.welders.map((w) => {
            const st = welderStats(w.stamp, mine);
            return (
              <Row key={w.id} t={t} onPress={() => setEditing(w)} label={`Welder ${w.stamp}`}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`${w.stamp}${w.name ? ` · ${w.name}` : ''}`}</Text>
                  {continuity(w, log.welds, today).map((c) => (
                    <Text key={c.process} style={[t.type.caption, { color: c.state === 'lapsed' ? t.colors.danger : c.state === 'soon' ? t.colors.warnText : t.colors.textMuted }]}>
                      {`${c.process} ${c.state === 'lapsed' ? `lapsed after ${usDate(c.until)}` : `good to ${usDate(c.until)}`}`}
                    </Text>
                  ))}
                  {!w.quals.length ? <Text style={[t.type.caption, { color: t.colors.warnText }]}>No qualifications entered</Text> : null}
                  <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
                    {`${st.welds} welds · ${fig(st.diameterInches)} dia-in${st.examined ? ` · ${st.rejects} of ${st.examined} shot rejected (${Math.round((st.rate ?? 0) * 100)}%)` : ''}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
              </Row>
            );
          })}
          {!roster.welders.length ? <Text style={[t.type.body, { color: t.colors.textMuted, padding: t.layout.screenPadding }]}>No welders yet. Add each one with their stamp and the processes they are qualified on.</Text> : null}
        </>
      ) : null}

      <WelderSheet
        welder={editing === 'new' ? { stamp: newStamp } : editing}
        roster={roster}
        onClose={() => {
          setEditing(null);
          setNewStamp('');
        }}
        apply={applyRoster}
      />
    </Screen>
  );
}

function Row({ t, onPress, label, children }: { t: Theme; onPress: () => void; label: string; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        marginHorizontal: t.layout.screenPadding,
        minHeight: 56,
        paddingVertical: t.space.sm,
        borderTopWidth: t.hairline,
        borderTopColor: t.colors.border,
        backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
      })}
    >
      {children}
    </Pressable>
  );
}

function WeldsPage({ t, welds, today, onOpen, onAdd, onPrint, note }: { t: Theme; welds: Weld[]; today: string; onOpen: (id: string) => void; onAdd: () => void; onPrint: () => void; note: string | null }) {
  const [line, setLine] = useState<string | null>(null);
  const lines = linesOf(welds);
  const shown = line ? welds.filter((w) => w.line === line) : welds;
  const todays = welds.filter((w) => w.day === today);
  const byLine = new Map<string, Weld[]>();
  for (const w of [...shown].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))) byLine.set(w.line, [...(byLine.get(w.line) ?? []), w]);
  const ink = (w: Weld) => weldInk(t.colors, weldState(w));

  return (
    <>
      <Text style={[t.type.bodyStrong, { color: t.colors.text, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm }]}>
        {`Today ${todays.length} weld${todays.length === 1 ? '' : 's'} · ${fig(diameterInches(todays))} dia-in`}
      </Text>
      <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md }]}>
        {`All told ${welds.filter((w) => w.day).length} welded${welds.some((w) => !w.day) ? ` of ${welds.length}` : ''} · ${fig(diameterInches(welds))} dia-in`}
      </Text>
      <ControlRow>
        <AccentButton label="Log a weld" icon="add" style={{ flex: 1 }} onPress={onAdd} />
        {welds.length ? <GhostButton label="Print / PDF" icon="print-outline" onPress={onPrint} /> : null}
      </ControlRow>
      {note ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}
      {lines.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
          <Chip label="Every line" on={line === null} onPress={() => setLine(null)} />
          {lines.map((l) => (
            <Chip key={l} label={l} on={line === l} onPress={() => setLine(l)} />
          ))}
        </View>
      ) : null}
      {[...byLine.entries()].map(([l, ws]) => (
        <View key={l || '-'}>
          <SectionHeader title={l || 'No line'} meta={`${ws.filter((w) => w.day).length} of ${ws.length} welded · ${fig(diameterInches(ws))} dia-in`} />
          {ws.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => onOpen(w.id)}
              accessibilityRole="button"
              accessibilityLabel={`Weld ${weldName(w)}, ${STATE_LABEL[weldState(w)]}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.md,
                marginHorizontal: t.layout.screenPadding,
                minHeight: 56,
                borderTopWidth: t.hairline,
                borderTopColor: t.colors.border,
                backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
              })}
            >
              <View style={{ minWidth: 48, paddingHorizontal: 6, paddingVertical: 2, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center' }}>
                <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{weldName(w)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.body, { color: t.colors.text }]} numberOfLines={1}>
                  {[w.nps ? sizeLabel(w.nps) : '', w.type, w.process, w.welders.join('/') || 'no stamp'].filter(Boolean).join(' · ')}
                </Text>
                <Text style={[t.type.caption, { color: t.colors.textFaint }]} numberOfLines={1}>{`${w.day ? usDate(w.day) : 'Not welded yet'}${w.pct ? ` · ${w.pct}% ${w.method}` : ' · visual'}${w.mapAt ? ' · on the map' : ''}`}</Text>
              </View>
              <Text style={[t.type.captionStrong, { color: ink(w) }]}>{STATE_LABEL[weldState(w)]}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      {!welds.length ? (
        <View style={{ padding: t.layout.screenPadding, alignItems: 'center', gap: t.space.md }}>
          <Ionicons name="flame-outline" size={34} color={t.colors.textFaint} />
          <Text style={[t.type.body, { color: t.colors.textMuted, textAlign: 'center' }]}>
            No welds logged on this job yet. Log each one as it is finished: line, number, size, stamps and heats.
          </Text>
        </View>
      ) : null}
    </>
  );
}
