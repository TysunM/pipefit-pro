import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { HintRow } from '../components/HintRow';
import { WarningBanner } from '../components/Results';
import { CutList } from '../components/CutList';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { useSettings } from '../state/settings';
import { useSpools } from '../state/spools';
import { SavedSpool, spoolToOrder } from '../state/spoolStore';
import { sinceLabel } from '../state/register';
import { OrderGroup, OrderSheet, planOrder } from '../calc/orderSheet';
import { findSize } from '../calc/pipe';
import { orderSheetHtml } from '../print/orderSheetHtml';
import { shareSheet } from '../print/share';

/**
 * The order for a whole job.
 *
 * Every other screen in this app answers one thing: one offset, one bend, one
 * spool. This one answers the question that is asked at the end of all of them
 * and nowhere else — what to actually buy — and it is the only screen where
 * the answer gets better the more of the job is on it.
 *
 * The pick list is the screen. Tapping spools in and out re-plans immediately,
 * because the saving is the thing being demonstrated and a saving you have to
 * press a button to see is a saving nobody sees.
 */

const findLabel = (nps: number): string => findSize(nps).label;

/** Two lines of figures across the top: what to buy, and what it saved. */
function Totals({ t, sheet, stick }: { t: Theme; sheet: OrderSheet; stick: string }) {
  const cell = (label: string, value: string, loud = false) => (
    <View key={label} style={{ flex: 1, paddingHorizontal: t.space.md, paddingVertical: t.space.lg }}>
      <Text style={[t.type.caption, { color: t.colors.textFaint }]}>{label}</Text>
      <Text
        style={[
          loud ? t.type.displaySmall ?? t.type.bodyStrong : t.type.bodyStrong,
          { color: loud ? t.colors.data : t.colors.text, marginTop: 2 },
        ]}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: t.layout.screenPadding,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.bgSubtle,
        overflow: 'hidden',
      }}
    >
      {cell('To buy', `${sheet.sticks} × ${stick}`)}
      <View style={{ width: t.hairline, backgroundColor: t.colors.border }} />
      {cell('One at a time', String(sheet.apart))}
      <View style={{ width: t.hairline, backgroundColor: t.colors.border }} />
      {cell('Saved', sheet.saved > 0 ? `${sheet.saved}` : '—', sheet.saved > 0)}
    </View>
  );
}

export function OrderSheetScreen() {
  const t = useTheme();
  const u = useUnits();
  const { settings } = useSettings();
  const { shelf, hydrated } = useSpools();

  // Everything on the shelf starts chosen. An order sheet that opens empty
  // makes the man do the work before it does any, and the whole job is the
  // case the screen exists for.
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const chosen = useCallback((id: string) => !dropped.has(id), [dropped]);

  const toggle = (id: string) =>
    setDropped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const picked = useMemo(() => shelf.spools.filter((s) => chosen(s.id)), [shelf.spools, chosen]);

  const sheet = useMemo(
    () => planOrder(picked.map(spoolToOrder), settings.stockLength, settings.cutAllowance),
    [picked, settings.stockLength, settings.cutAllowance]
  );

  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const stick = `${u.num(settings.stockLength, 0)} ${u.unitName}`;
  const figure = useCallback((inches: number) => u.num(inches), [u]);
  const length = useCallback((inches: number) => `${u.num(inches)} ${u.unitName}`, [u]);

  const printedOn = () => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `Printed ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const canShare = sheet.sticks > 0 && !sharing;

  const share = async () => {
    if (!canShare) return;
    setSharing(true);
    setShareNote(null);
    const out = await shareSheet(
      orderSheetHtml({
        sheet,
        stock: stick,
        kerf: length(settings.cutAllowance),
        dateLine: printedOn(),
        length,
        short: figure,
      }),
      'Order sheet'
    );
    setSharing(false);
    if (!out.ok) setShareNote(out.why);
  };

  if (!hydrated)
    return (
      <Screen>
        <HintRow text="Reading the saved spools…" />
      </Screen>
    );

  if (shelf.spools.length === 0)
    return (
      <Screen>
        <SectionHeader title="Order sheet" meta="Nothing saved yet" />
        <HintRow text="An order sheet is built from saved spools. Build a spool on the 3D spool screen, save it, and it appears here." />
      </Screen>
    );

  return (
    <Screen>
      {/* Not "Order sheet" again — the header above already says that, and a
          screen that names itself twice wastes the line that could say what
          is on it. */}
      <SectionHeader
        title="What to buy"
        meta={`${sheet.spools} spool${sheet.spools === 1 ? '' : 's'} · ${sheet.pieces} piece${sheet.pieces === 1 ? '' : 's'}`}
      />

      <Totals t={t} sheet={sheet} stick={stick} />

      <View
        style={{
          flexDirection: 'row',
          gap: t.space.md,
          alignItems: 'flex-start',
          paddingHorizontal: t.layout.screenPadding,
          paddingVertical: t.space.lg,
        }}
      >
        <Ionicons
          name={sheet.saved > 0 ? 'trending-down-outline' : 'information-circle-outline'}
          size={18}
          color={sheet.saved > 0 ? t.colors.data : t.colors.textMuted}
        />
        <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>
          {sheet.sticks === 0
            ? 'Nothing here can be ordered yet.'
            : sheet.saved > 0
              ? `Ordering these together buys ${sheet.sticks} stick${sheet.sticks === 1 ? '' : 's'} instead of ${sheet.apart}. That is ${sheet.saved} fewer, because a stick does not care which spool its pieces belong to — only the pipe has to match.`
              : `These spools already fill their own sticks, so ordering them together buys the same ${sheet.sticks} stick${sheet.sticks === 1 ? '' : 's'} as ordering them one at a time. Add more spools in the same pipe and that changes.`}
          {sheet.sticks > 0 && !sheet.best
            ? ' One of these packings is a good one rather than a proven best — the list is too long to prove and above the floor.'
            : ''}
        </Text>
      </View>

      <ControlRow>
        <AccentButton
          label={sharing ? 'Making the sheet…' : 'Share order sheet'}
          icon="share-outline"
          onPress={share}
          style={{ flex: 1, opacity: canShare ? 1 : 0.4 }}
        />
      </ControlRow>
      {shareNote ? <WarningBanner text={shareNote} /> : null}

      {/* The pick list. Tapping re-plans, so the saving moves as spools go in
          and out — which is the only way to see what each one is worth. */}
      <SectionHeader
        title="On this order"
        meta={dropped.size ? `${dropped.size} left off` : 'All of them'}
      />
      <ControlRow>
        <GhostButton
          label="All"
          icon="checkmark-done-outline"
          onPress={() => setDropped(new Set())}
          style={{ flex: 1, opacity: dropped.size ? 1 : 0.4 }}
        />
        <GhostButton
          label="None"
          icon="remove-outline"
          onPress={() => setDropped(new Set(shelf.spools.map((s) => s.id)))}
          style={{ flex: 1, opacity: dropped.size === shelf.spools.length ? 0.4 : 1 }}
        />
      </ControlRow>

      {shelf.spools.map((s: SavedSpool) => {
        const on = chosen(s.id);
        const mark = sheet.groups.flatMap((g) => g.lines).find((l) => l.spoolId === s.id)?.mark;
        const skipped = sheet.skipped.find((k) => k.id === s.id);
        return (
          <Pressable
            key={s.id}
            onPress={() => toggle(s.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${s.name}, ${on ? 'on' : 'off'} this order`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
              paddingHorizontal: t.layout.screenPadding,
              paddingVertical: t.space.lg,
              borderBottomWidth: t.hairline,
              borderBottomColor: t.colors.border,
              opacity: on ? 1 : 0.45,
            }}
          >
            <Ionicons
              name={on ? 'checkbox' : 'square-outline'}
              size={20}
              color={on ? t.colors.primary : t.colors.textFaint}
            />
            {/* The mark is what its pieces are stamped with, so the row and
                the stick carry the same letter. */}
            <View
              style={{
                width: 26,
                alignItems: 'center',
                paddingVertical: 2,
                borderRadius: t.radius.sm,
                backgroundColor: mark ? t.colors.bgSunken : 'transparent',
              }}
            >
              <Text style={[t.type.captionStrong, { color: mark ? t.colors.text : t.colors.textFaint }]}>
                {mark ?? '—'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{s.name}</Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                {skipped && on
                  ? skipped.why
                  : `${s.place ? `${s.place} · ` : ''}${s.legs.length} leg${s.legs.length === 1 ? '' : 's'} · ${findLabel(s.nps)} SCH ${s.schedule} · ${sinceLabel(s.updatedAt, Date.now())}`}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {sheet.skipped.length ? (
        <HintRow
          text={`${sheet.skipped.length} chosen spool${sheet.skipped.length === 1 ? ' does' : 's do'} not build and ${sheet.skipped.length === 1 ? 'is' : 'are'} not on the order. Open ${sheet.skipped.length === 1 ? 'it' : 'them'} on the 3D spool screen to see why.`}
        />
      ) : null}

      {/* One packing per kind of stick. Pipe does not pool across sizes or
          schedules, so neither does the sheet. */}
      {sheet.groups.map((g: OrderGroup) => (
        <View key={g.key}>
          {/* The group is the cut list, so it gets one heading and not two:
              the pipe on the left, what it costs on the right. */}
          <CutList
            plan={g.plan}
            stock={settings.stockLength}
            length={length}
            short={figure}
            title={g.label}
            meta={
              g.plan.ok
                ? `${g.together} × ${stick}${g.saved > 0 ? ` · ${g.saved} saved` : ''}`
                : 'Cannot be ordered'
            }
          />
          {/* Which letter is which spool, under the sticks that carry them. */}
          <Text
            style={[
              t.type.caption,
              {
                color: t.colors.textMuted,
                paddingHorizontal: t.layout.screenPadding,
                paddingBottom: t.space.lg,
              },
            ]}
          >
            {g.lines.map((l) => `${l.mark} ${l.name}`).join('   ·   ')}
          </Text>
        </View>
      ))}

      <HintRow text="Each piece is stamped with its spool's letter and leg number, so A3 is leg three of spool A. Share the sheet to take the marks and the sticks to the saw." />
    </Screen>
  );
}
