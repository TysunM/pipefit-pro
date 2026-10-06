import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Segmented } from '../components/Segmented';
import { AccentButton, GhostButton } from '../components/Buttons';
import { IsoCanvas, SketchMode } from '../components/sketch/IsoCanvas';
import { FlipLabel, PaperKey } from '../components/sketch/PageControls';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { useSketches } from '../state/sketches';
import { Corner, Flip, ISO_GRID, L3, NO_FLIP, Pt, Viewport, contained, fitViewport, holding, tenth, toPage, turnDegrees, turnOver } from '../calc/iso';
import { MAX_NOTE, Stroke, getSketch, sketchBounds, sketchToSvg, withDim, withFlip, withStrokes } from '../state/sketchStore';
import { DimAsk, DimSheet } from '../components/sketch/DimSheet';
import { useIsoPieces } from '../hooks/useIsoPieces';
import { esc } from '../print/spoolSvg';
import { shareSheet } from '../print/share';

type Props = NativeStackScreenProps<RootStackParamList, 'IsoDraw'>;

const HINT: Record<SketchMode, string> = {
  run: 'Drag to draw a line; it follows the nearest axis. Start near the end of a line to carry on from it.',
  pen: 'Draw freehand: a tie-in box, a valve, a cloud round a problem.',
  note: 'Tap where a word or a measurement goes. Tap a word to change it.',
  dim: 'Tap a piece of pipe for its centre to centre. Every piece is numbered as it goes on the cut list.',
  move: 'Drag to move the page. Two fingers move, zoom and turn it from any tool; N, E, S and W on the paper turn with it.',
};

const TOOLS: { value: SketchMode; label: string; icon: 'analytics-outline' | 'create-outline' | 'text-outline' | 'resize-outline' | 'hand-left-outline' }[] = [
  { value: 'run', label: 'Run', icon: 'analytics-outline' },
  { value: 'pen', label: 'Pen', icon: 'create-outline' },
  { value: 'note', label: 'Note', icon: 'text-outline' },
  { value: 'dim', label: 'Dim', icon: 'resize-outline' },
  { value: 'move', label: 'Move', icon: 'hand-left-outline' },
];

/** Room left round a drawing when the page is fitted to the screen. */
const FIT_MARGIN = 28;

/**
 * The corner the paper is read from. Fixed: a sketch is a picture on iso paper,
 * and a diagonal on the paper — a rolling offset — can be more than one run in
 * the world, so re-working the drawing from another corner turned a man's
 * sketch into a different one. Turning the sheet over (see Flip) keeps it the
 * same picture.
 */
const CORNER: Corner = 'SW';

/** How long each half of the turn-over takes. Long enough to see which way it went. */
const FLIP_MS = 110;
const NATIVE = Platform.OS !== 'web';

/** One sketch, open on the paper. Every stroke is kept as it lands. */
export function IsoDrawScreen({ navigation, route }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const { book, hydrated, apply } = useSketches();
  const sketch = getSketch(book, id);

  const [mode, setMode] = useState<SketchMode>('run');
  const corner = CORNER;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 });
  const [note, setNote] = useState<{ at: Pt; anchor: L3 | null; index: number | undefined } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [word, setWord] = useState<string | null>(null);
  const [ask, setAsk] = useState<DimAsk | null>(null);
  const iso = useIsoPieces(sketch);
  // Full screen: the paper takes the whole phone. The header, the hints and
  // the buttons under the paper go; the tools and undo sit on the paper.
  const [full, setFull] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: sketch?.name ?? 'Sketch', headerShown: !full });
  }, [navigation, sketch?.name, full]);

  // Back, full screen, comes out of full screen rather than out of the sketch.
  useEffect(() => {
    if (!full) return;
    return navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      setFull(false);
    });
  }, [navigation, full]);

  useEffect(() => {
    if (!word) return;
    const h = setTimeout(() => setWord(null), 4000);
    return () => clearTimeout(h);
  }, [word]);

  const strokes = sketch?.strokes ?? [];
  const flip: Flip = sketch?.flip ?? NO_FLIP;

  // The sheet turning over: squeezed flat along the fold, swapped, opened out.
  const fold = useRef(new Animated.Value(1)).current;
  const [folding, setFolding] = useState<'x' | 'y'>('x');
  const turning = useRef(false);
  const turnSheet = (next: Flip, axis: 'x' | 'y') => {
    // One turn at a time: a second press mid-turn would read the sheet as it
    // was and undo itself.
    if (turning.current) return;
    turning.current = true;
    setFolding(axis);
    Animated.timing(fold, { toValue: 0, duration: FLIP_MS, useNativeDriver: NATIVE }).start(() => {
      apply((b) => withFlip(b, id, next));
      if (size.w && size.h) setViewport((v) => turnOver(v, size.w, size.h, flip, next));
      Animated.timing(fold, { toValue: 1, duration: FLIP_MS, useNativeDriver: NATIVE }).start(() => {
        turning.current = false;
      });
    });
  };

  /** Fit everything drawn onto the screen, never larger than life size, turned as it is. */
  const fit = (everything = false) => {
    if (!size.w || !size.h) return;
    const rot = viewport.rot ?? 0;
    const b = sketchBounds(strokes, corner, ISO_GRID, flip, rot);
    if (!b) {
      setViewport({ scale: 1, rot, tx: size.w / 2, ty: size.h / 2 });
      return;
    }
    if (everything || !contained(b, viewport, size.w, size.h, FIT_MARGIN)) setViewport(fitViewport(b, size.w, size.h, FIT_MARGIN, 1, rot));
  };

  /**
   * Back upright, about the middle of the screen, at the same zoom — and the
   * right way up if the sheet was turned over top to bottom, which the turn
   * now does instead.
   */
  const squareUp = () => {
    if (flip.upside) turnSheet({ ...flip, upside: false }, 'y');
    if (!size.w || !size.h) return;
    const mid: Pt = [size.w / 2, size.h / 2];
    setViewport((v) => holding({ ...v, rot: 0 }, toPage(mid, v), mid));
  };

  // Going in or out of full screen changes the paper's size. The middle of
  // what was shown stays the middle.
  const lastSize = useRef({ w: 0, h: 0 });
  const onPaper = (w: number, h: number) => {
    const old = lastSize.current;
    if (old.w && old.h && (old.w !== w || old.h !== h)) {
      setViewport((v) => ({ ...v, tx: v.tx + (w - old.w) / 2, ty: v.ty + (h - old.h) / 2 }));
    }
    lastSize.current = { w, h };
    setSize({ w, h });
  };

  // The page opens centred, and shrinks when a new stroke lands off the
  // screen, so a run that grows is always all in view. A stroke that lands
  // on the screen leaves the view alone: a man zoomed in on one end of a long
  // run is left there, not thrown back out to the whole sheet every line.
  const laidOut = useRef(false);
  const seen = useRef(0);
  useEffect(() => {
    if (!size.w || !size.h) return;
    if (!laidOut.current) {
      laidOut.current = true;
      seen.current = strokes.length;
      const b = sketchBounds(strokes, corner, ISO_GRID, flip);
      setViewport(b ? fitViewport(b, size.w, size.h, FIT_MARGIN, 1) : { scale: 1, tx: size.w / 2, ty: size.h / 2 });
      return;
    }
    if (strokes.length > seen.current) {
      const fresh = sketchBounds(strokes.slice(seen.current), corner, ISO_GRID, flip, viewport.rot ?? 0);
      seen.current = strokes.length;
      if (fresh && !contained(fresh, viewport, size.w, size.h, FIT_MARGIN)) fit(true);
    } else seen.current = strokes.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes.length, size.w, size.h]);

  const edit = (f: (strokes: Stroke[]) => Stroke[]) =>
    apply((b) => {
      const s = getSketch(b, id);
      return s ? withStrokes(b, id, f(s.strokes), Date.now()) : b;
    });

  if (hydrated && !sketch) {
    return (
      <Screen>
        <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
          <Text style={[t.type.body, { color: t.colors.textMuted }]}>That sketch is not in the book any more.</Text>
          <GhostButton label="Back to the sketches" icon="arrow-back" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  const share = async () => {
    if (!sketch) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sketch.name)}</title><style>body{margin:0;padding:12px;font-family:Helvetica,Arial,sans-serif}h1{font-size:16px;margin:0 0 8px}svg{max-width:100%;height:auto}</style></head><body><h1>${esc(sketch.name)}${sketch.place ? ' · ' + esc(sketch.place) : ''}</h1>${sketchToSvg(sketch, ISO_GRID, corner, flip, iso.labels(false).filter((l) => !l.missing))}</body></html>`;
    const r = await shareSheet(html, sketch.name);
    if (!r.ok) setWord(r.why);
  };

  const rot = viewport.rot ?? 0;
  const turned = turnDegrees(rot);
  const lift = full ? insets.bottom : 0;
  const strip = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: t.colors.bgSubtle,
    borderColor: t.colors.wellEdge,
  };

  return (
    <Screen scroll={false}>
      {full ? null : (
        <View style={{ paddingTop: t.space.md }}>
          <Segmented options={TOOLS.map(({ value, label }) => ({ value, label }))} selected={mode} onSelect={setMode} />
          <Text style={[t.type.caption, { color: word ? t.colors.warnText : t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }]} numberOfLines={2}>
            {word ?? HINT[mode]}
          </Text>
        </View>
      )}

      {/* The paper, and under it (over it too, full screen) a strip of its own
          for the keys and the words on how the sheet lies. Nothing sits on
          the drawing, so a stroke is never drawn, or ended, under a key. */}
      <View
        style={
          full
            ? { flex: 1, marginTop: insets.top, backgroundColor: t.colors.well }
            : {
                flex: 1,
                marginHorizontal: t.layout.screenPadding,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.wellEdge,
                overflow: 'hidden',
                backgroundColor: t.colors.well,
              }
        }
      >
        {full ? (
          <View style={[strip, { borderBottomWidth: 1 }]} accessibilityLabel="Tools">
            {TOOLS.map((tool) => (
              <PaperKey key={tool.value} icon={tool.icon} label={tool.label} on={mode === tool.value} onPress={() => setMode(tool.value)} />
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => onPaper(Math.floor(e.nativeEvent.layout.width), Math.floor(e.nativeEvent.layout.height))}>
          {size.w > 0 && size.h > 0 ? (
            <Animated.View style={{ transform: [folding === 'x' ? { scaleX: fold } : { scaleY: fold }] }}>
              <IsoCanvas
                width={size.w}
                height={size.h}
                strokes={strokes}
                mode={mode}
                corner={corner}
                flip={flip}
                viewport={viewport}
                onViewport={setViewport}
                onStroke={(s) => edit((prev) => [...prev, s])}
                onNote={(at, anchor, index) => setNote({ at, anchor, index })}
                pieces={iso.labels(mode === 'dim')}
                onPiece={(key) => {
                  const p = iso.reading.pieces.find((x) => x.key === key);
                  if (p) setAsk({ key, n: p.n, current: iso.dims[key] });
                }}
              />
            </Animated.View>
          ) : null}
        </View>
        <View style={[strip, { borderTopWidth: 1, paddingBottom: 5 + lift }]} accessibilityLabel="Sheet controls">
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FlipLabel flip={flip} />
            <Text style={[t.type.labelSmall, { color: t.colors.textFaint }]}>{`· ${Math.round(viewport.scale * 100)}%`}</Text>
            {turned ? <Text style={[t.type.labelSmall, { color: t.colors.accent }]}>{`· ${turned}°`}</Text> : null}
          </View>
          {full ? <PaperKey icon="arrow-undo-outline" label="Undo" onPress={() => edit((prev) => prev.slice(0, -1))} /> : null}
          {turned || flip.upside ? <PaperKey icon="compass-outline" label="Square the sheet up" on onPress={squareUp} /> : null}
          <PaperKey
            icon="swap-horizontal-outline"
            label={flip.mirror ? 'Turn the sheet back, unmirrored' : 'Mirror the sheet left for right'}
            on={flip.mirror}
            onPress={() => turnSheet({ ...flip, mirror: !flip.mirror }, 'x')}
          />
          <PaperKey icon="scan-outline" label="Fit the drawing to the screen" onPress={() => fit(true)} />
          <PaperKey icon={full ? 'contract-outline' : 'expand-outline'} label={full ? 'Leave full screen' : 'Full screen'} on={full} onPress={() => setFull((f) => !f)} />
        </View>
      </View>

      {full ? null : (
        <View style={{ flexDirection: 'row', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, paddingBottom: insets.bottom + t.space.md }}>
          {confirmClear ? (
            <>
              <GhostButton label="Keep" style={{ flex: 1 }} onPress={() => setConfirmClear(false)} />
              <GhostButton
                label="Clear the page"
                icon="trash-outline"
                style={{ flex: 2 }}
                onPress={() => {
                  setConfirmClear(false);
                  edit(() => []);
                }}
              />
            </>
          ) : (
            <>
              <GhostButton label="Undo" icon="arrow-undo-outline" style={{ flex: 1 }} onPress={() => edit((prev) => prev.slice(0, -1))} />
              <GhostButton label="Clear" icon="trash-outline" style={{ flex: 1 }} onPress={() => setConfirmClear(true)} />
              <GhostButton label="Share" icon="share-outline" style={{ flex: 1 }} onPress={() => void share()} />
              <AccentButton label="Cuts" icon="cut-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('IsoCuts', { id })} />
            </>
          )}
        </View>
      )}

      <DimSheet
        ask={ask}
        dimText={iso.dimText}
        readLength={iso.readLength}
        onCancel={() => setAsk(null)}
        onSave={(v) => {
          const a = ask;
          setAsk(null);
          if (a) apply((b) => withDim(b, id, a.key, v, Date.now()));
        }}
      />

      <NoteSheet
        t={t}
        open={note}
        existing={note?.index !== undefined ? (strokes[note.index] as { kind: 'note'; text: string } | undefined)?.text ?? '' : ''}
        onCancel={() => setNote(null)}
        onSave={(text) => {
          const n = note;
          setNote(null);
          if (!n) return;
          const clean = text.trim().slice(0, MAX_NOTE);
          edit((prev) => {
            if (n.index !== undefined) {
              const cur = prev[n.index];
              if (!cur || cur.kind !== 'note') return prev;
              return clean ? prev.map((s, i) => (i === n.index ? { ...cur, text: clean } : s)) : prev.filter((_, i) => i !== n.index);
            }
            return clean ? [...prev, { kind: 'note', at: [tenth(n.at[0]), tenth(n.at[1])], text: clean, anchor: n.anchor }] : prev;
          });
        }}
      />
    </Screen>
  );
}

function NoteSheet({
  t,
  open,
  existing,
  onCancel,
  onSave,
}: {
  t: Theme;
  open: { index: number | undefined } | null;
  existing: string;
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText(existing);
  }, [open, existing]);
  const editing = open?.index !== undefined;

  return (
    <Modal visible={open !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ margin: t.space.xxl, padding: t.space.xxl, borderRadius: t.radius.xl, backgroundColor: t.colors.bg, gap: t.space.md }}
        >
          <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>{editing ? 'Change the note' : 'Add a note'}</Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            {editing ? 'Leave it empty to take the note off the page.' : 'A measurement, a tag, a word. It goes where you tapped and stays by the nearest line when the page turns.'}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={'4\'-6 1/2"'}
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Note text"
            autoFocus
            maxLength={MAX_NOTE}
            onSubmitEditing={() => onSave(text)}
            style={{
              height: t.layout.fieldHeight,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.bgRaised,
              color: t.colors.text,
              paddingHorizontal: t.space.lg,
              fontFamily: t.font.sansMedium,
              fontSize: 17,
              ...t.weight('600'),
            }}
          />
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
            <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
            <AccentButton label={editing ? 'Save' : 'Place it'} icon="checkmark" style={{ flex: 1 }} onPress={() => onSave(text)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
