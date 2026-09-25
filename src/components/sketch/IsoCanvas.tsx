import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { ISO_GRID, Pt, distance, nearestLattice, nearestNode, snapSegment, thinStroke } from '../../calc/iso';
import { Stroke, runNodes, storedStroke } from '../../state/sketchStore';

export type SketchMode = 'run' | 'pen' | 'note';

/** How close a finger has to land to pick up a run where it was left. */
const PICK_UP = 26;

/**
 * The paper.
 *
 * Three tools, chosen above it. Run: press down and drag; the line follows the
 * nearest iso axis or diagonal and lands on a dot, and pressing down near the
 * end of any run picks it up from there. Pen: whatever the finger draws, for a
 * tie-in box, a valve, a cloud round a problem. Note: tap where a word should
 * go, and the sheet asks for the word; tap a word to change it.
 *
 * The strokes live in the parent. This draws them, holds the one in progress,
 * and hands each finished one up.
 */
export function IsoCanvas({
  width,
  height,
  strokes,
  mode,
  onStroke,
  onNote,
}: {
  width: number;
  height: number;
  strokes: readonly Stroke[];
  mode: SketchMode;
  onStroke: (stroke: Stroke) => void;
  /** A note wanted at `at`, or the note at `index` to change. */
  onNote: (at: Pt, index: number | undefined) => void;
}) {
  const t = useTheme();
  const g = ISO_GRID;
  const [draft, setDraft] = useState<Stroke | null>(null);

  // The responder is made once and reads what it needs through refs, so a
  // change of tool or a new stroke never leaves it holding a stale closure.
  const live = useRef({ mode, strokes, onStroke, onNote });
  live.current = { mode, strokes, onStroke, onNote };
  const start = useRef<Pt>([0, 0]);
  const pen = useRef<Pt[]>([]);
  const moved = useRef(false);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const p: Pt = [e.nativeEvent.locationX, e.nativeEvent.locationY];
          moved.current = false;
          const { mode: m, strokes: ss } = live.current;
          if (m === 'run') {
            const from = nearestNode(p, runNodes(ss), PICK_UP) ?? nearestLattice(p, g);
            start.current = from;
            setDraft({ kind: 'run', pts: [from, from] });
          } else if (m === 'pen') {
            pen.current = [p];
            setDraft({ kind: 'pen', pts: [p] });
          } else {
            start.current = p;
          }
        },
        onPanResponderMove: (e) => {
          const p: Pt = [e.nativeEvent.locationX, e.nativeEvent.locationY];
          const m = live.current.mode;
          if (m === 'run') {
            const snap = snapSegment(start.current, p, g);
            if (snap.steps > 0) moved.current = true;
            setDraft({ kind: 'run', pts: [start.current, snap.end] });
          } else if (m === 'pen') {
            const last = pen.current[pen.current.length - 1];
            if (!last || distance(last, p) >= 1.5) {
              pen.current.push(p);
              moved.current = true;
              setDraft({ kind: 'pen', pts: pen.current.slice() });
            }
          }
        },
        onPanResponderRelease: (e) => {
          const p: Pt = [e.nativeEvent.locationX, e.nativeEvent.locationY];
          const { mode: m, strokes: ss, onStroke: commit, onNote: note } = live.current;
          if (m === 'run') {
            const snap = snapSegment(start.current, p, g);
            if (snap.steps > 0) commit(storedStroke({ kind: 'run', pts: [start.current, snap.end] }));
          } else if (m === 'pen') {
            const pts = thinStroke(pen.current);
            if (pts.length >= 2) commit(storedStroke({ kind: 'pen', pts }));
          } else if (!moved.current) {
            let hit: number | undefined;
            let best = 28;
            ss.forEach((s, i) => {
              if (s.kind !== 'note') return;
              const d = distance(s.at, p);
              if (d < best) {
                best = d;
                hit = i;
              }
            });
            note(hit === undefined ? p : ss[hit]!.kind === 'note' ? (ss[hit] as { at: Pt }).at : p, hit);
          }
          setDraft(null);
          pen.current = [];
        },
        onPanResponderTerminate: () => {
          setDraft(null);
          pen.current = [];
        },
      }),
    [g]
  );

  const c = t.colors;
  const tw = g * Math.sqrt(3);
  const dot = c.borderStrong;

  const drawStroke = (s: Stroke, key: string, preview: boolean) => {
    if (s.kind === 'note') {
      // Drawn twice: a halo in the paper colour under the word, so it reads
      // where it crosses a line. (paintOrder is not in the native renderer.)
      const shared = { x: s.at[0], y: s.at[1], fontFamily: t.font.sansMedium, fontSize: 14, fontWeight: '600' as const };
      return (
        <React.Fragment key={key}>
          <SvgText {...shared} fill={c.well} stroke={c.well} strokeWidth={4} strokeLinejoin="round">
            {s.text}
          </SvgText>
          <SvgText {...shared} fill={c.accent}>
            {s.text}
          </SvgText>
        </React.Fragment>
      );
    }
    const points = s.pts.map((p) => `${p[0]},${p[1]}`).join(' ');
    if (s.kind === 'run') {
      return (
        <React.Fragment key={key}>
          <Polyline points={points} fill="none" stroke={preview ? c.primary : c.text} strokeWidth={3} strokeLinecap="round" />
          {s.pts.map((p, i) => (
            <Circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill={preview ? c.primary : c.text} />
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
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  return (
    <View
      {...pan.panHandlers}
      accessibilityLabel={
        mode === 'run' ? 'Iso paper. Drag to draw a run that snaps to the axes.' : mode === 'pen' ? 'Iso paper. Draw freehand.' : 'Iso paper. Tap to place a note.'
      }
      style={{ width, height, backgroundColor: c.well }}
    >
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="isodots" patternUnits="userSpaceOnUse" x={0} y={0} width={tw} height={g}>
            <Circle cx={0} cy={0} r={1.1} fill={dot} />
            <Circle cx={tw / 2} cy={g / 2} r={1.1} fill={dot} />
            <Circle cx={0} cy={g} r={1.1} fill={dot} />
            <Circle cx={tw} cy={0} r={1.1} fill={dot} />
            <Circle cx={tw} cy={g} r={1.1} fill={dot} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#isodots)" />
        {strokes.map((s, i) => drawStroke(s, `s${i}`, false))}
        {draft ? drawStroke(draft, 'draft', true) : null}
      </Svg>
    </View>
  );
}
