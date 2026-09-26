import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Pattern, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Corner,
  ISO_GRID,
  L3,
  Pt,
  Viewport,
  clampScale,
  distance,
  nearestOf,
  screenToLattice,
  snapRun,
  thinStroke,
  toPage,
  toScreen,
} from '../../calc/iso';
import { Placed, Stroke, place, runNodes, storedStroke } from '../../state/sketchStore';

export type SketchMode = 'run' | 'pen' | 'note' | 'move';

/** How close a finger has to land, on screen, to pick up a run where it was left. */
const PICK_UP = 26;

type Touch = { locationX: number; locationY: number };

const centroid = (ts: Touch[]): Pt => [
  ts.reduce((s, t) => s + t.locationX, 0) / ts.length,
  ts.reduce((s, t) => s + t.locationY, 0) / ts.length,
];

/**
 * The paper.
 *
 * Four tools, chosen above it. Run: press down and drag; the line follows the
 * nearest iso axis or diagonal and lands on a dot, and pressing down near the
 * end of any run picks it up from there. Pen: whatever the finger draws, for a
 * tie-in box, a valve, a cloud round a problem. Note: tap where a word should
 * go, and the sheet asks for the word; tap a word to change it. Move: drag
 * the page. Two fingers move and zoom the page whatever the tool.
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
  const live = useRef({ mode, strokes, corner, viewport, onViewport, onStroke, onNote });
  live.current = { mode, strokes, corner, viewport, onViewport, onStroke, onNote };

  const start3 = useRef<L3>([0, 0, 0]);
  const startPage = useRef<Pt>([0, 0]);
  const pen = useRef<Pt[]>([]);
  const moved = useRef(false);
  /** Two fingers, or the move tool: the page is being dragged, not drawn on. */
  const grab = useRef<{ v: Viewport; at: Pt; span: number; pinch: boolean } | null>(null);

  const nodesOnPage = () => {
    const { strokes: ss, corner: c } = live.current;
    return runNodes(ss).map((n) => ({ n, at: toScreen(n, c, g) }));
  };

  /** The run node nearest a page point, at any distance, or null when there are no runs. */
  const anchorFor = (p: Pt): L3 | null => nearestOf(p, nodesOnPage(), (x) => x.at, Infinity)?.n ?? null;

  const beginGrab = (touches: Touch[]) => {
    const { viewport: v } = live.current;
    const ts = touches.length ? touches : [];
    const at = ts.length ? centroid(ts) : [0, 0];
    const span = ts.length >= 2 ? Math.hypot(ts[0]!.locationX - ts[1]!.locationX, ts[0]!.locationY - ts[1]!.locationY) : 0;
    grab.current = { v, at: at as Pt, span, pinch: ts.length >= 2 };
    setDraft(null);
    pen.current = [];
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const touches = (e.nativeEvent.touches ?? []) as Touch[];
          const { mode: m, viewport: v, corner: c } = live.current;
          moved.current = false;
          if (touches.length >= 2 || m === 'move') {
            beginGrab(touches.length ? touches : [{ locationX: e.nativeEvent.locationX, locationY: e.nativeEvent.locationY }]);
            return;
          }
          const p = toPage([e.nativeEvent.locationX, e.nativeEvent.locationY], v);
          startPage.current = p;
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
        },
        onPanResponderMove: (e) => {
          const touches = (e.nativeEvent.touches ?? []) as Touch[];
          const { mode: m, corner: c, onViewport: setV } = live.current;
          if (!grab.current && touches.length >= 2) beginGrab(touches);
          const gr = grab.current;
          if (gr) {
            const ts = touches.length ? touches : [{ locationX: e.nativeEvent.locationX, locationY: e.nativeEvent.locationY }];
            const at = centroid(ts);
            let scale = gr.v.scale;
            if (gr.pinch && ts.length >= 2 && gr.span > 0) {
              const span = Math.hypot(ts[0]!.locationX - ts[1]!.locationX, ts[0]!.locationY - ts[1]!.locationY);
              scale = clampScale(gr.v.scale * (span / gr.span));
            }
            // The page point that was under the fingers stays under them.
            const k = scale / gr.v.scale;
            setV({
              scale,
              tx: at[0] - (gr.at[0] - gr.v.tx) * k,
              ty: at[1] - (gr.at[1] - gr.v.ty) * k,
            });
            moved.current = true;
            return;
          }
          const p = toPage([e.nativeEvent.locationX, e.nativeEvent.locationY], live.current.viewport);
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
        onPanResponderRelease: (e) => {
          const { mode: m, strokes: ss, corner: c, viewport: v, onStroke: commit, onNote: note } = live.current;
          if (grab.current) {
            grab.current = null;
            setDraft(null);
            return;
          }
          const p = toPage([e.nativeEvent.locationX, e.nativeEvent.locationY], v);
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
            ss.forEach((s, i) => {
              const pl = place(s, c, g);
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
          setDraft(null);
          pen.current = [];
        },
      }),
    [g]
  );

  const c = t.colors;
  const s = viewport.scale;
  const tw = g * Math.sqrt(3);
  // The dots stay one screen size whatever the zoom, and go when they would
  // be a grey wash rather than dots.
  const dotR = 1.1 / s;
  const showDots = g * s >= 7;
  const pageX0 = -viewport.tx / s;
  const pageY0 = -viewport.ty / s;
  const pageW = width / s;
  const pageH = height / s;

  const drawPlaced = (p: Placed, key: string, preview: boolean) => {
    if (p.kind === 'note') {
      // Drawn twice: a halo in the paper colour under the word, so it reads
      // where it crosses a line.
      // pointerEvents none: a word must never take the touch, or a browser
      // starts dragging the selected text and the stroke under it is lost.
      const shared = { x: p.at[0], y: p.at[1], fontFamily: t.font.sansMedium, fontSize: 14 / s, ...(t.fontsLoaded ? {} : { fontWeight: '600' as const }), pointerEvents: 'none' as const };
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
          : 'Iso paper. Drag to move the page.';

  return (
    <View
      {...pan.panHandlers}
      accessibilityLabel={label}
      // Nothing on the paper is text to select or an image to drag: a stroke
      // that started on a word must stay a stroke.
      style={{ width, height, backgroundColor: c.well, userSelect: 'none' } as ViewStyle}
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
        <G transform={`translate(${viewport.tx} ${viewport.ty}) scale(${s})`}>
          {showDots ? <Rect x={pageX0} y={pageY0} width={pageW} height={pageH} fill="url(#isodots)" /> : null}
          {strokes.map((st, i) => drawPlaced(place(st, corner, g), `s${i}`, false))}
          {draft ? drawPlaced(draft, 'draft', true) : null}
        </G>
      </Svg>
    </View>
  );
}
