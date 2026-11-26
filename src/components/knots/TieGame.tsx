import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { reachAfter, reachBefore, type Knot } from '../../calc/knots/knots';
import { VIEW, pointAt, type Laid } from '../../calc/knots/rope';
import { TRACE, move, starsFor, type Trace } from '../../calc/knots/trace';
import { recordTie } from '../../state/knotProgress';
import { useKnotBook } from '../../state/knots';
import { useScrollHost } from '../scrollHost';
import { endTouch } from '../endTouch';
import { AccentButton, ControlRow, GhostButton } from '../Buttons';
import { KnotView } from './KnotView';
import { lengthsAt } from './useStepPlayer';

// The game: drag the glowing end of the rope along the dashed path, step by
// step, over and under as the knot goes, until it is tied. Timed, slips
// counted, the best kept (trace.ts has the rules).

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

export function TieGame({ knot, laid, size, onNext, onTest }: { knot: Knot; laid: Laid; size: number; onNext?: () => void; onTest: () => void }) {
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

  const cur = moves[Math.min(k, moves.length - 1)]!;
  const base = useMemo(() => lengthsAt(laid, reachBefore(knot, cur.step)), [knot, laid, cur.step]);
  const shown = useMemo(() => base.map((b, r) => (r === cur.rope ? trace.len : b)), [base, cur.rope, trace.len]);
  const scale = size / VIEW;

  // The responder is made once; what it needs now it reads from here.
  const live = useRef({ k, trace, moves, scale, started, done, tracking: false, origin: [0, 0] as [number, number] });
  live.current = { ...live.current, k, trace, moves, scale, started, done };

  useEffect(() => {
    if (!started || done) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [started, done]);

  const finish = (slips: number) => {
    const ms = Date.now() - (live.current.started ?? Date.now());
    const stars = starsFor(slips);
    const had = book.value.tied[knot.id];
    setDone({ ms, slips, stars, best: !had || ms < had.bestMs });
    book.apply((b) => recordTie(b, knot.id, ms, stars, Date.now()));
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
          const m = L.moves[L.k]!;
          const tip = pointAt(laid.samples[m.rope]!, L.trace.len);
          const x = ne.locationX / L.scale;
          const y = ne.locationY / L.scale;
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
          if (!L.tracking) return;
          const f = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
          const x = (f.pageX - L.origin[0]) / L.scale;
          const y = (f.pageY - L.origin[1]) / L.scale;
          const m = L.moves[L.k]!;
          const next = move(L.trace, laid.samples[m.rope]!, m.to, x, y);
          if (next === L.trace) return;
          if (next.slips > L.trace.slips) {
            setHint('Back to the dashed line: the end only follows the rope’s path.');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else if (L.trace.off && !next.off) setHint(null);
          if (next.len >= m.to - 1.5) {
            // This step tied: on to the next, or done.
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const after = L.k + 1;
            if (after >= L.moves.length) {
              L.tracking = false;
              L.trace = { ...next, len: m.to };
              setTrace(L.trace);
              finish(next.slips);
              return;
            }
            L.k = after;
            L.trace = { len: L.moves[after]!.from, off: false, slips: next.slips };
            L.tracking = false;
            setK(after);
            setTrace(L.trace);
            setHint('Step tied. Pick up the glowing end again.');
            return;
          }
          L.trace = next;
          setTrace(next);
        },
        onPanResponderRelease: (e) => {
          endTouch(e, Platform.OS);
          live.current.tracking = false;
          host?.lock(false);
        },
        onPanResponderTerminate: () => {
          live.current.tracking = false;
          host?.lock(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [laid, host],
  );

  const again = () => {
    const tr = fresh();
    live.current = { ...live.current, k: 0, trace: tr, started: null, done: null, tracking: false };
    setK(0);
    setTrace(tr);
    setStarted(null);
    setDone(null);
    setHint(null);
  };

  const elapsed = done ? done.ms : started ? now - started : 0;
  const best = book.value.tied[knot.id];

  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ alignItems: 'center' }}>
        <View {...pan.panHandlers} style={Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as object) : undefined}>
          <KnotView
            knot={knot}
            laid={laid}
            shown={shown}
            size={size}
            guide={done ? null : { rope: cur.rope, from: trace.len, to: cur.to }}
            tip={done ? null : { rope: cur.rope, glow: true, arrow: true }}
            label={`${knot.name}: drag the glowing end along the dashed line`}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, gap: t.space.md }}>
        <Text style={[t.type.label, { color: c.textMuted, flex: 1 }]}>{done ? 'Tied' : `Step ${Math.min(k, moves.length - 1) + 1} of ${moves.length}`}</Text>
        <Text style={[t.type.label, { color: c.textMuted }]}>{`${seconds(elapsed)} · ${trace.slips} slip${trace.slips === 1 ? '' : 's'}`}</Text>
      </View>
      {done ? (
        <View style={{ marginHorizontal: t.layout.screenPadding, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: t.hairline, borderColor: c.border, gap: t.space.sm, alignItems: 'center' }}>
          <Text style={[t.type.sectionTitle, { color: c.text }]}>{`${knot.name}, tied`}</Text>
          <Stars n={done.stars} size={28} />
          <Text style={[t.type.body, { color: c.text }]}>{`${seconds(done.ms)} · ${done.slips} slip${done.slips === 1 ? '' : 's'}${done.best ? ' · your best' : best ? ` · best ${seconds(best.bestMs)}` : ''}`}</Text>
          <Text style={[t.type.caption, { color: c.textMuted, textAlign: 'center' }]}>Now tie it in a real line, the same way, before you need it on a job.</Text>
        </View>
      ) : (
        <Text style={[t.type.body, { color: c.text, paddingHorizontal: t.layout.screenPadding }]}>{cur.text}</Text>
      )}
      {hint && !done ? <Text style={[t.type.bodyStrong, { color: c.warnText, paddingHorizontal: t.layout.screenPadding }]}>{hint}</Text> : null}
      {!done && !started ? <Text style={[t.type.caption, { color: c.textFaint, paddingHorizontal: t.layout.screenPadding }]}>Put a finger on the glowing end and drag it along the dashed line. The rope goes over and under as the knot does.</Text> : null}
      <ControlRow>
        {done ? (
          <>
            <AccentButton label="Tie it again" icon="refresh" style={{ flex: 1 }} onPress={again} />
            {onNext ? <GhostButton label="Next knot" icon="arrow-forward" style={{ flex: 1 }} onPress={onNext} /> : null}
          </>
        ) : (
          <GhostButton label="Start over" icon="refresh" style={{ flex: 1 }} onPress={again} />
        )}
      </ControlRow>
      {done ? (
        <ControlRow>
          <GhostButton label="Take the knot test" icon="school-outline" style={{ flex: 1 }} onPress={onTest} />
        </ControlRow>
      ) : null}
    </View>
  );
}
