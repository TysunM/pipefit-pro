import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { reachAfter, reachBefore, type Knot } from '../../calc/knots/knots';
import { VIEW, pointAt, type Laid } from '../../calc/knots/rope';
import { BUZZ_EVERY_MS, TRACE, move, pulled, starsFor, type Trace } from '../../calc/knots/trace';
import { recordTie } from '../../state/knotProgress';
import { useKnotBook } from '../../state/knots';
import { useScrollHost } from '../scrollHost';
import { endTouch } from '../endTouch';
import { AccentButton, ControlRow, GhostButton } from '../Buttons';
import { KnotView } from './KnotView';
import { laidAt, pullsAt } from './laid';
import { lengthsAt } from './useStepPlayer';

// The game: drag the glowing end of the rope along the dashed path, step by
// step, over and under as the knot goes; then pull it tight, each glowing end
// dragged the way its arrow points, the knot drawing up as it goes. Timed,
// slips counted, the best kept (trace.ts has the rules).
//
// From memory (`blind`): no dashed line, no steps, no arrows. The line is still
// there, hidden: the end follows only the knot's path, and the phone buzzes the
// moment the finger is off it, and keeps buzzing until it's back. "Show me"
// shows the step for a moment, and the tie counts one star.

type Move = { step: number; rope: number; from: number; to: number; text: string };
type Done = { ms: number; slips: number; stars: number; best: boolean };

export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function Stars({ n, size = 20 }: { n: number; size?: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessible accessibilityLabel={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <Ionicons key={i} name={i <= n ? 'star' : 'star-outline'} size={size} color={i <= n ? t.colors.glow : t.colors.textFaint} />
      ))}
    </View>
  );
}

export function TieGame({ knot, laid, size, blind = false, onNext, onCheck, onTest }: { knot: Knot; laid: Laid; size: number; blind?: boolean; onNext?: () => void; onCheck?: () => void; onTest: () => void }) {
  const t = useTheme();
  const c = t.colors;
  const book = useKnotBook();
  const host = useScrollHost();
  // Only the steps that move the rope are tied; the others are looked at.
  const moves = useMemo<Move[]>(
    () =>
      knot.steps
        .map((s, i) => ({ step: i, rope: s.rope, from: lengthsAt(laid, reachBefore(knot, i))[s.rope]!, to: lengthsAt(laid, reachAfter(knot, i))[s.rope]!, text: s.text }))
        .filter((m) => m.to - m.from > 1),
    [knot, laid],
  );
  const fresh = (): Trace => ({ len: moves[0]!.from, off: false, slips: 0 });
  const [k, setK] = useState(0);
  const [trace, setTrace] = useState<Trace>(fresh);
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState<Done | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  // Once it is all tied: how far each pulled end has been pulled, 0 to 1. Null until then.
  const [pull, setPull] = useState<number[] | null>(null);
  const morph = pull ? pull.reduce((a, b) => a + b, 0) / pull.length : 0;
  // From memory: a look at the line for a moment, and whether one was taken.
  const [peek, setPeek] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (peekTimer.current && clearTimeout(peekTimer.current)), []);
  const showMe = () => {
    setPeek(true);
    setPeeked(true);
    live.current.peeked = true;
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(false), 2500);
  };
  const where = blind ? 'memory' : 'tied';

  const cur = moves[Math.min(k, moves.length - 1)]!;
  const base = useMemo(() => lengthsAt(laid, reachBefore(knot, cur.step)), [knot, laid, cur.step]);
  const shown = useMemo(() => base.map((b, r) => (r === cur.rope ? trace.len : b)), [base, cur.rope, trace.len]);
  const scale = size / VIEW;

  // The responder is made once; what it needs now it reads from here.
  const live = useRef({ k, trace, moves, scale, started, done, pull, blind, peeked: false, buzzed: 0, tracking: false, grab: null as { i: number; x: number; y: number; from: number } | null, origin: [0, 0] as [number, number] });
  live.current = { ...live.current, k, trace, moves, scale, started, done, pull, blind };
  // A buzz while the finger stays off the line: not more often than the phone can make it felt.
  const buzz = (first: boolean) => {
    const at = Date.now();
    if (!first && at - live.current.buzzed < BUZZ_EVERY_MS) return;
    live.current.buzzed = at;
    void (first ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  };

  useEffect(() => {
    if (!started || done) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [started, done]);

  const finish = (slips: number) => {
    const ms = Date.now() - (live.current.started ?? Date.now());
    // A look at the line from memory: tied, but one star.
    const stars = live.current.peeked ? 1 : starsFor(slips);
    const had = book.value[where][knot.id];
    setDone({ ms, slips, stars, best: !had || ms < had.bestMs });
    book.apply((b) => recordTie(b, knot.id, ms, stars, Date.now(), where));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !live.current.done,
        onMoveShouldSetPanResponder: () => !live.current.done,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const L = live.current;
          const ne = e.nativeEvent;
          L.origin = [ne.pageX - ne.locationX, ne.pageY - ne.locationY];
          const x = ne.locationX / L.scale;
          const y = ne.locationY / L.scale;
          if (L.pull) {
            // Pulling it tight: grab the nearest end still to pull.
            const now = L.pull.reduce((a, b) => a + b, 0) / L.pull.length;
            const near = pullsAt(knot, now)
              .map((p, i) => ({ i, d: Math.hypot(p.x - x, p.y - y) }))
              .filter((p) => L.pull![p.i]! < 1)
              .sort((a, b) => a.d - b.d)[0];
            if (!near || near.d > TRACE.start + 10) {
              L.grab = null;
              setHint('Grab a glowing end and pull it the way its arrow points.');
              return;
            }
            L.grab = { i: near.i, x, y, from: L.pull[near.i]! };
            host?.lock(true);
            setHint(null);
            return;
          }
          const m = L.moves[L.k]!;
          const tip = pointAt(laid.samples[m.rope]!, L.trace.len);
          if (Math.hypot(tip.x - x, tip.y - y) > TRACE.start) {
            L.tracking = false;
            setHint('Start on the glowing end of the rope.');
            return;
          }
          L.tracking = true;
          host?.lock(true);
          setHint(null);
          if (!L.started) setStarted(Date.now());
        },
        onPanResponderMove: (e) => {
          const L = live.current;
          const f = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
          const x = (f.pageX - L.origin[0]) / L.scale;
          const y = (f.pageY - L.origin[1]) / L.scale;
          if (L.pull && L.grab) {
            const g = L.grab;
            const p = pulled(g.from, x - g.x, y - g.y, knot.tight.pulls[g.i]!.dir);
            // From memory there are no arrows: pulled the wrong way, it buzzes.
            if (L.blind && Math.hypot(x - g.x, y - g.y) > 24 && p <= g.from + 0.05) {
              buzz(false);
              setHint('Not that way.');
            } else if (L.blind && p > g.from + 0.05) setHint(null);
            if (p === L.pull[g.i]) return;
            const next = L.pull.map((v, i) => (i === g.i ? p : v));
            if (p >= 1 && L.pull[g.i]! < 1) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            L.pull = next;
            setPull(next);
            if (next.every((v) => v >= 1)) {
              L.grab = null;
              finish(L.trace.slips);
            }
            return;
          }
          if (!L.tracking) return;
          const m = L.moves[L.k]!;
          const next = move(L.trace, laid.samples[m.rope]!, m.to, x, y, L.blind ? TRACE.buzz : TRACE.slip);
          // Still off the line: from memory, it keeps buzzing until the finger is back on it.
          if (L.blind && next.off && next.slips === L.trace.slips) buzz(false);
          if (next === L.trace) return;
          if (next.slips > L.trace.slips) {
            setHint(L.blind ? 'Off the line. Find where the knot goes.' : 'Back to the dashed line: the end only follows the rope’s path.');
            if (L.blind) buzz(true);
            else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else if (L.trace.off && !next.off) setHint(null);
          if (next.len >= m.to - 1.5) {
            // This step tied: on to the next, or done.
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const after = L.k + 1;
            if (after >= L.moves.length) {
              // All tied: now pull it tight.
              L.tracking = false;
              L.trace = { ...next, len: m.to };
              L.pull = knot.tight.pulls.map(() => 0);
              setTrace(L.trace);
              setPull(L.pull);
              setHint(null);
              return;
            }
            L.k = after;
            L.trace = { len: L.moves[after]!.from, off: false, slips: next.slips };
            L.tracking = false;
            setK(after);
            setTrace(L.trace);
            setHint(L.blind ? 'Good. Pick up the glowing end again.' : 'Step tied. Pick up the glowing end again.');
            return;
          }
          L.trace = next;
          setTrace(next);
        },
        onPanResponderRelease: (e) => {
          endTouch(e, Platform.OS);
          live.current.tracking = false;
          live.current.grab = null;
          host?.lock(false);
        },
        onPanResponderTerminate: () => {
          live.current.tracking = false;
          live.current.grab = null;
          host?.lock(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [laid, host],
  );

  const again = () => {
    const tr = fresh();
    live.current = { ...live.current, k: 0, trace: tr, started: null, done: null, pull: null, tracking: false, grab: null, peeked: false };
    setPeeked(false);
    setPeek(false);
    setK(0);
    setPull(null);
    setTrace(tr);
    setStarted(null);
    setDone(null);
    setHint(null);
  };

  // The clock ticks every 200 ms: never shown below nought in the moment before its first tick.
  const elapsed = done ? done.ms : started ? Math.max(0, now - started) : 0;
  const best = book.value[where][knot.id];
  const shownLine = !blind || peek;
  const offs = (n: number) => (blind ? `${n} off the line` : `${n} slip${n === 1 ? '' : 's'}`);

  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ alignItems: 'center' }}>
        <View {...pan.panHandlers} style={Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as object) : undefined}>
          <KnotView
            knot={knot}
            laid={pull ? laidAt(knot, morph) : laid}
            shown={pull ? shown.map(() => Number.MAX_SAFE_INTEGER) : shown}
            size={size}
            guide={done || pull || !shownLine ? null : { rope: cur.rope, from: trace.len, to: cur.to }}
            tip={done || pull ? null : { rope: cur.rope, glow: true, arrow: shownLine, warn: blind && trace.off }}
            pulls={pull && !done ? pullsAt(knot, morph).map((p, i) => ({ ...p, grab: true, done: pull[i]! >= 1 })) : null}
            pullArrows={shownLine}
            shift={morph * 10}
            label={blind ? `${knot.name}: tie it from memory` : `${knot.name}: drag the glowing end`}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, gap: t.space.md }}>
        <Text style={[t.type.label, { color: c.textMuted, flex: 1 }]}>{done ? 'Tied' : `Step ${pull ? moves.length + 1 : Math.min(k, moves.length - 1) + 1} of ${moves.length + 1}`}</Text>
        <Text style={[t.type.label, { color: blind && trace.off && !done ? c.danger : c.textMuted }]}>{`${seconds(elapsed)} · ${offs(trace.slips)}`}</Text>
      </View>
      {done ? (
        <View style={{ marginHorizontal: t.layout.screenPadding, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: t.hairline, borderColor: c.border, gap: t.space.sm, alignItems: 'center' }}>
          <Text style={[t.type.sectionTitle, { color: c.text }]}>{blind ? `${knot.name}, tied from memory` : `${knot.name}, tied`}</Text>
          <Stars n={done.stars} size={28} />
          <Text style={[t.type.body, { color: c.text }]}>{`${seconds(done.ms)} · ${offs(done.slips)}${done.best ? ' · your best' : best ? ` · best ${seconds(best.bestMs)}` : ''}`}</Text>
          <Text style={[t.type.caption, { color: c.textMuted, textAlign: 'center' }]}>
            {blind && peeked
              ? 'With a look at the line: one star. Tie it again without one.'
              : blind
                ? 'Tied from memory. Now tie it in a real line, the same way, and check it before it takes a load.'
                : "Now check it the way you'll check a real one, then tie it in a real line before you need it on a job."}
          </Text>
        </View>
      ) : (
        <Text style={[t.type.body, { color: c.text, paddingHorizontal: t.layout.screenPadding }]}>
          {shownLine ? (pull ? knot.tight.text : cur.text) : pull ? 'Now set it: grab each part that pulls, and pull it the way it goes.' : `${knot.name}, from memory: no line and no steps. Take the end where the knot goes.`}
        </Text>
      )}
      {hint && !done ? <Text style={[t.type.bodyStrong, { color: c.warnText, paddingHorizontal: t.layout.screenPadding }]}>{hint}</Text> : null}
      {pull && !done && !hint && shownLine ? <Text style={[t.type.caption, { color: c.textFaint, paddingHorizontal: t.layout.screenPadding }]}>Drag each glowing end the way its arrow points, and the knot draws up.</Text> : null}
      {!done && !started ? (
        <Text style={[t.type.caption, { color: c.textFaint, paddingHorizontal: t.layout.screenPadding }]}>
          {blind ? "Put a finger on the glowing end. The knot's line is there but hidden: go off it and the phone buzzes until you're back on it." : 'Put a finger on the glowing end and drag it along the dashed line. The rope goes over and under as the knot does.'}
        </Text>
      ) : null}
      <ControlRow>
        {done ? (
          <>
            <GhostButton label="Tie it again" icon="refresh" style={{ flex: 1 }} onPress={again} />
            {onNext ? <GhostButton label="Next knot" icon="arrow-forward" style={{ flex: 1 }} onPress={onNext} /> : null}
          </>
        ) : (
          <>
            <GhostButton label="Start over" icon="refresh" style={{ flex: 1 }} onPress={again} />
            {blind ? <GhostButton label="Show me" icon="eye-outline" style={{ flex: 1 }} onPress={showMe} /> : null}
          </>
        )}
      </ControlRow>
      {done ? (
        <ControlRow>
          {onCheck ? <AccentButton label="Check it" icon="search-outline" style={{ flex: 1 }} onPress={onCheck} /> : null}
          <GhostButton label="Knot test" icon="school-outline" style={{ flex: 1 }} onPress={onTest} />
        </ControlRow>
      ) : null}
    </View>
  );
}
