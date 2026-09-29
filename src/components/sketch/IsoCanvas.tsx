import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, Platform, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, Pattern, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Corner,
  Flip,
  ISO_GRID,
  L3,
  Pt,
  TWIST_FROM,
  compassRose,
  Viewport,
  distance,
  flipPt,
  handWindow,
  nearestOf,
  screenToLattice,
  snapRun,
  thinStroke,
  toPage,
  toScreen,
  wrapAngle,
} from '../../calc/iso';
import { Placed, Stroke, flipPlaced, place, runNodes, storedStroke } from '../../state/sketchStore';
import { onEdge, startsTwoFingers } from '../../calc/palm';

export type SketchMode = 'run' | 'pen' | 'note' | 'move';

/** How close a finger has to land, on screen, to pick up a run where it was left. */
const PICK_UP = 26;

/**
 * A finger, where the app's root has it. Never `locationX`: that is measured
 * from whatever view is under the finger now, so a stroke dragged across a
 * key on the paper suddenly reads from the key's own corner, and the line
 * jumps across the sheet and back.
 */
type Touch = { pageX: number; pageY: number; identifier?: number | string };

const idOf = (f: Touch): string => String(f.identifier ?? 0);

const centroid = (ts: Pt[]): Pt => [ts.reduce((s, q) => s + q[0], 0) / ts.length, ts.reduce((s, q) => s + q[1], 0) / ts.length];

/** How far apart the first two fingers are, and the angle of the line between them. */
const spanOf = (ts: Pt[]): { span: number; angle: number } => {
  const a = ts[0]!;
  const b = ts[1]!;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return { span: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
};

/**
 * The paper.
 *
 * Four tools, chosen above it. Run: press down and drag; the line follows the
 * nearest iso axis or diagonal and lands on a dot, and pressing down near the
 * end of any run picks it up from there. Pen: whatever the finger draws, for a
 * tie-in box, a valve, a cloud round a problem. Note: tap where a word should
 * go, and the sheet asks for the word; tap a word to change it. Move: drag
 * the page. Two fingers move, zoom and turn the page whatever the tool — the
 * paper turned on the desk, so a long run can lie along the long side of the
 * phone. It settles square when it comes near upright, on its side or upside
 * down.
 *
 * The page has no edge. The window onto it is `viewport`, owned by the screen
 * above, which also decides when to shrink it so a growing run stays in view.
 */
export function IsoCanvas({
  width,
  height,
  strokes,
  mode,
  corner,
  flip,
  viewport,
  onViewport,
  onStroke,
  onNote,
}: {
  width: number;
  height: number;
  strokes: readonly Stroke[];
  mode: SketchMode;
  corner: Corner;
  /** How the sheet is turned over. Only what is shown turns: every stroke is kept as drawn. */
  flip: Flip;
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  onStroke: (stroke: Stroke) => void;
  /** A note wanted at a page point, or the note at `index` to change. */
  onNote: (at: Pt, anchor: L3 | null, index: number | undefined) => void;
}) {
  const t = useTheme();
  const g = ISO_GRID;
  const [draft, setDraft] = useState<Placed | null>(null);

  // The responder is made once and reads what it needs through refs, so a
  // change of tool or of the window never leaves it holding a stale closure.
  const live = useRef({ mode, strokes, corner, flip, viewport, onViewport, onStroke, onNote });
  live.current = { mode, strokes, corner, flip, viewport, onViewport, onStroke, onNote };

  /**
   * The drawn page point under a screen point. On a turned sheet the finger
   * is on the reflection, so it is reflected back, and everything below —
   * picking up a run, snapping, anchoring a note — works on the page as drawn.
   */
  const pagePoint = (q: Pt): Pt => flipPt(toPage(q, live.current.viewport), live.current.flip);

  /**
   * Where the paper's corner is, in root coordinates. Taken when a gesture
   * starts: the first finger has just landed on the paper itself (nothing
   * drawn on it takes a touch), so there its own corner is the one
   * `locationX` counts from, and the two readings together give it exactly.
   */
  const origin = useRef<Pt>([0, 0]);
  const local = (f: Touch): Pt => [f.pageX - origin.current[0], f.pageY - origin.current[1]];

  /**
   * The touches that are fingers. One that came down on the very edge of the
   * screen is a palm, and stays one until it lifts, wherever it slides.
   */
  const known = useRef(new Set<string>());
  const palms = useRef(new Set<string>());
  const fingersOf = (e: GestureResponderEvent): Touch[] => {
    const ne = e.nativeEvent;
    const ts: Touch[] = ne.touches?.length ? ne.touches : [ne];
    const w = Dimensions.get('window').width;
    for (const f of ts) {
      const id = idOf(f);
      if (known.current.has(id)) continue;
      known.current.add(id);
      if (onEdge(f.pageX, w)) palms.current.add(id);
    }
    return ts.filter((f) => !palms.current.has(idOf(f)));
  };

  /** The finger drawing, followed by its own id so a hand landing beside it can never take the line. */
  const drawId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const lastPt = useRef<Pt>([0, 0]);
  const start3 = useRef<L3>([0, 0, 0]);
  const startPage = useRef<Pt>([0, 0]);
  const pen = useRef<Pt[]>([]);
  const moved = useRef(false);
  /**
   * Two fingers, or the move tool: the page is being handled, not drawn on.
   * `twist` is how far the fingers have turned, added up move by move so a
   * turn past half a circle keeps going rather than jumping back; the page
   * only starts turning once that passes TWIST_FROM, and `from` is where it
   * passed, so it starts from where it was rather than with a jump.
   */
  const grab = useRef<{
    v: Viewport;
    at: Pt;
    span: number;
    angle: number;
    twist: number;
    from: number | null;
    fingers: number;
  } | null>(null);

  const nodesOnPage = () => {
    const { strokes: ss, corner: c } = live.current;
    return runNodes(ss).map((n) => ({ n, at: toScreen(n, c, g) }));
  };

  /** The run node nearest a page point, at any distance, or null when there are no runs. */
  const anchorFor = (p: Pt): L3 | null => nearestOf(p, nodesOnPage(), (x) => x.at, Infinity)?.n ?? null;

  // A finger landing or lifting mid-gesture starts the hold again from where
  // the page is, so the page never jumps to a new centre between fingers.
  const beginGrab = (touches: Pt[]) => {
    const { viewport: v } = live.current;
    const two = touches.length >= 2 ? spanOf(touches) : { span: 0, angle: 0 };
    grab.current = {
      v,
      at: centroid(touches),
      span: two.span,
      angle: two.angle,
      twist: 0,
      from: null,
      fingers: touches.length,
    };
    setDraft(null);
    pen.current = [];
  };

  /** A stroke starts under this finger, in whatever the tool is. */
  const begin = (f: Touch) => {
    const { mode: m, viewport: v, corner: c } = live.current;
    const p = pagePoint(local(f));
    drawId.current = idOf(f);
    startedAt.current = Date.now();
    moved.current = false;
    startPage.current = p;
    lastPt.current = p;
    if (m === 'run') {
      const hit = nearestOf(p, nodesOnPage(), (x) => x.at, PICK_UP / v.scale);
      const from = hit ? hit.n : screenToLattice(p, c, g);
      start3.current = from;
      const at = toScreen(from, c, g);
      setDraft({ kind: 'run', pts: [at, at] });
    } else if (m === 'pen') {
      pen.current = [p];
      setDraft({ kind: 'pen', pts: [p] });
    }
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const ne = e.nativeEvent;
          origin.current = [ne.pageX - ne.locationX, ne.pageY - ne.locationY];
          known.current.clear();
          palms.current.clear();
          drawId.current = null;
          grab.current = null;
          moved.current = false;
          const ts = fingersOf(e);
          if (!ts.length) return;
          if (ts.length >= 2 || live.current.mode === 'move') beginGrab(ts.map(local));
          else begin(ts[0]!);
        },
        onPanResponderMove: (e) => {
          const ts = fingersOf(e);
          const { mode: m, corner: c, onViewport: setV } = live.current;
          if (!grab.current && ts.length) {
            const drawing = drawId.current !== null;
            if (m === 'move' || (ts.length >= 2 && startsTwoFingers(drawing, moved.current, Date.now() - startedAt.current))) beginGrab(ts.map(local));
          }
          const gr = grab.current;
          if (gr) {
            if (!ts.length) return;
            const pts = ts.map(local);
            if (pts.length !== gr.fingers) beginGrab(pts);
            let spread = 1;
            let turn = 0;
            if (pts.length >= 2 && gr.span > 0) {
              const now = spanOf(pts);
              spread = now.span / gr.span;
              gr.twist += wrapAngle(now.angle - gr.angle);
              gr.angle = now.angle;
              if (gr.from === null && Math.abs(gr.twist) > TWIST_FROM) gr.from = Math.sign(gr.twist) * TWIST_FROM;
              if (gr.from !== null) turn = gr.twist - gr.from;
            }
            // The page point that was under the fingers stays under them.
            setV(handWindow(gr.v, gr.at, centroid(pts), spread, turn));
            moved.current = true;
            return;
          }
          // Only a palm down so far: the stroke starts with the first finger.
          if (drawId.current === null) {
            if (ts[0]) begin(ts[0]);
            return;
          }
          const f = ts.find((q) => idOf(q) === drawId.current);
          if (!f) return;
          const p = pagePoint(local(f));
          lastPt.current = p;
          if (m === 'run') {
            const snap = snapRun(start3.current, p, c, g);
            if (snap.steps > 0) moved.current = true;
            setDraft({ kind: 'run', pts: [toScreen(start3.current, c, g), toScreen(snap.to, c, g)] });
          } else if (m === 'pen') {
            const last = pen.current[pen.current.length - 1];
            if (!last || distance(last, p) >= 1.5 / live.current.viewport.scale) {
              pen.current.push(p);
              moved.current = true;
              setDraft({ kind: 'pen', pts: pen.current.slice() });
            }
          } else if (distance(p, startPage.current) > 6 / live.current.viewport.scale) {
            moved.current = true;
          }
        },
        onPanResponderRelease: () => {
          const { mode: m, strokes: ss, corner: c, viewport: v, onStroke: commit, onNote: note } = live.current;
          const drew = drawId.current !== null;
          drawId.current = null;
          if (grab.current || !drew) {
            grab.current = null;
            setDraft(null);
            pen.current = [];
            return;
          }
          // Where the drawing finger last was: the touch lifting last may be the palm.
          const p = lastPt.current;
          if (m === 'run') {
            const snap = snapRun(start3.current, p, c, g);
            if (snap.steps > 0) commit({ kind: 'run', from: start3.current, to: snap.to });
          } else if (m === 'pen') {
            const pts = thinStroke(pen.current, 1.5 / v.scale);
            if (pts.length >= 2) {
              const anchor = anchorFor(pts[0]!);
              const base: Pt = anchor ? toScreen(anchor, c, g) : [0, 0];
              commit(storedStroke({ kind: 'pen', pts: pts.map((q) => [q[0] - base[0], q[1] - base[1]] as Pt), anchor }));
            }
          } else if (m === 'note' && !moved.current) {
            let hit: number | undefined;
            let best = 28 / v.scale;
            ss.forEach((st, i) => {
              const pl = place(st, c, g);
              if (pl.kind !== 'note') return;
              const d = distance(pl.at, p);
              if (d < best) {
                best = d;
                hit = i;
              }
            });
            if (hit !== undefined) note(p, null, hit);
            else {
              const anchor = anchorFor(p);
              const base: Pt = anchor ? toScreen(anchor, c, g) : [0, 0];
              note([p[0] - base[0], p[1] - base[1]], anchor, undefined);
            }
          }
          setDraft(null);
          pen.current = [];
        },
        onPanResponderTerminate: () => {
          grab.current = null;
          drawId.current = null;
          setDraft(null);
          pen.current = [];
        },
      }),
    [g]
  );

  const c = t.colors;
  const s = viewport.scale;
  const rot = viewport.rot ?? 0;
  const tw = g * Math.sqrt(3);
  // The dots stay one screen size whatever the zoom, and go when they would
  // be a grey wash rather than dots.
  const dotR = 1.1 / s;
  const showDots = g * s >= 7;
  // The patch of page the screen shows. Turned, the screen is a tilted
  // window onto the page, so the dots cover every corner of it.
  const seen = [toPage([0, 0], viewport), toPage([width, 0], viewport), toPage([0, height], viewport), toPage([width, height], viewport)];
  const pageX0 = Math.min(...seen.map((q) => q[0]));
  const pageY0 = Math.min(...seen.map((q) => q[1]));
  const pageW = Math.max(...seen.map((q) => q[0])) - pageX0;
  const pageH = Math.max(...seen.map((q) => q[1])) - pageY0;

  // North, east, south and west on the paper itself, through the origin dot:
  // it turns, zooms and turns over with the drawing, so a run is read against
  // it directly. Arms zoom with the dots; strokes and letters stay one screen
  // size, and the letters stay upright however the page is turned.
  const rose = useMemo(() => compassRose(corner, g, flip), [corner, g, flip]);
  const deg = (rot * 180) / Math.PI;
  const roseFs = 13 / s;
  const roseArm = (k: 'n' | 'e' | 's' | 'w') => (
    <Line
      key={`arm-${k}`}
      x1={0}
      y1={0}
      x2={rose[k].tip[0]}
      y2={rose[k].tip[1]}
      stroke={k === 'n' ? c.accent : c.textFaint}
      strokeWidth={(k === 'n' ? 2 : 1.5) / s}
      strokeLinecap="round"
    />
  );
  // Each letter drawn twice, a halo in the paper colour under it the way a
  // note is, so it reads where a run passes through it.
  const roseLetter = (k: 'n' | 'e' | 's' | 'w') => {
    const [x, y] = rose[k].label;
    const shared = {
      x,
      y: y + roseFs * 0.36,
      transform: `rotate(${-deg} ${x} ${y})`,
      fontFamily: t.font.sans,
      fontSize: roseFs,
      ...(t.fontsLoaded ? {} : { fontWeight: '700' as const }),
      textAnchor: 'middle' as const,
      pointerEvents: 'none' as const,
    };
    return (
      <React.Fragment key={`letter-${k}`}>
        <SvgText {...shared} fill={c.well} stroke={c.well} strokeWidth={4 / s} strokeLinejoin="round">
          {k.toUpperCase()}
        </SvgText>
        <SvgText {...shared} fill={k === 'n' ? c.accent : c.textMuted}>
          {k.toUpperCase()}
        </SvgText>
      </React.Fragment>
    );
  };

  const drawPlaced = (p: Placed, key: string, preview: boolean) => {
    if (p.kind === 'note') {
      // Drawn twice: a halo in the paper colour under the word, so it reads
      // where it crosses a line.
      // pointerEvents none: a word must never take the touch, or a browser
      // starts dragging the selected text and the stroke under it is lost.
      const shared = {
        x: p.at[0],
        // Upside down, the word hangs below its point rather than standing on it.
        y: p.at[1] + (p.upside ? (14 / s) * 0.72 : 0),
        textAnchor: (p.mirror ? 'end' : 'start') as 'end' | 'start',
        fontFamily: t.font.sansMedium,
        fontSize: 14 / s,
        ...(t.fontsLoaded ? {} : { fontWeight: '600' as const }),
        pointerEvents: 'none' as const,
      };
      return (
        <React.Fragment key={key}>
          <SvgText {...shared} fill={c.well} stroke={c.well} strokeWidth={4 / s} strokeLinejoin="round">
            {p.text}
          </SvgText>
          <SvgText {...shared} fill={c.accent}>
            {p.text}
          </SvgText>
        </React.Fragment>
      );
    }
    const points = p.pts.map((q) => `${q[0]},${q[1]}`).join(' ');
    if (p.kind === 'run') {
      return (
        <React.Fragment key={key}>
          <Polyline points={points} fill="none" stroke={preview ? c.primary : c.text} strokeWidth={3 / s} strokeLinecap="round" />
          {p.pts.map((q, i) => (
            <Circle key={i} cx={q[0]} cy={q[1]} r={3.2 / s} fill={preview ? c.primary : c.text} />
          ))}
        </React.Fragment>
      );
    }
    return (
      <Polyline
        key={key}
        points={points}
        fill="none"
        stroke={preview ? c.primary : c.textMuted}
        strokeWidth={2 / s}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  const label =
    mode === 'run'
      ? 'Iso paper. Drag to draw a run that snaps to the axes.'
      : mode === 'pen'
        ? 'Iso paper. Draw freehand.'
        : mode === 'note'
          ? 'Iso paper. Tap to place a note.'
          : 'Iso paper. Drag to move the page. Two fingers turn it.';

  return (
    <View
      {...pan.panHandlers}
      accessibilityLabel={label}
      // Nothing on the paper is text to select or an image to drag: a stroke
      // that started on a word must stay a stroke.
      // touchAction: in a browser, two fingers on the paper are the paper's —
      // left to the browser they pinch-zoom the whole page instead.
      style={{ width, height, backgroundColor: c.well, userSelect: 'none', ...(Platform.OS === 'web' ? { touchAction: 'none' } : null) } as ViewStyle}
    >
      <Svg width={width} height={height} pointerEvents="none">
        <Defs>
          <Pattern id="isodots" patternUnits="userSpaceOnUse" x={0} y={0} width={tw} height={g}>
            <Circle cx={0} cy={0} r={dotR} fill={c.borderStrong} />
            <Circle cx={tw / 2} cy={g / 2} r={dotR} fill={c.borderStrong} />
            <Circle cx={0} cy={g} r={dotR} fill={c.borderStrong} />
            <Circle cx={tw} cy={0} r={dotR} fill={c.borderStrong} />
            <Circle cx={tw} cy={g} r={dotR} fill={c.borderStrong} />
          </Pattern>
        </Defs>
        <G transform={`translate(${viewport.tx} ${viewport.ty}) rotate(${(rot * 180) / Math.PI}) scale(${s})`}>
          {showDots ? <Rect x={pageX0} y={pageY0} width={pageW} height={pageH} fill="url(#isodots)" /> : null}
          <G opacity={0.85}>
            {(['e', 'w', 's', 'n'] as const).map(roseArm)}
            <Circle cx={0} cy={0} r={2.4 / s} fill={c.textFaint} />
          </G>
          {strokes.map((st, i) => drawPlaced(place(st, corner, g, flip), `s${i}`, false))}
          {/* The letters over the drawing, the arms under it: a run through the rose never hides which way is which. */}
          {(['n', 'e', 's', 'w'] as const).map(roseLetter)}
          {draft ? drawPlaced(flipPlaced(draft, flip), 'draft', true) : null}
        </G>
      </Svg>
    </View>
  );
}
