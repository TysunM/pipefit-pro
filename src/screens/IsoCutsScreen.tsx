// Cuts off an iso
// ---------------
// The sketch read as pipe: every piece between two fittings, numbered in the
// order it was drawn, with what is on each end and what the saw cuts. Each
// piece gets its centre to centre here, tapped on the drawing, or on the
// sketch with the Dim tool; figures already written as notes are offered.
// Then the lot goes on the cut list, marked by the sketch, the way a spool's
// legs do. The reading is in calc/isoPieces.ts.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { ChipRow } from '../components/ChipRow';
import { AccentButton, ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { MetaBar, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { IsoCanvas } from '../components/sketch/IsoCanvas';
import { DimAsk, DimSheet } from '../components/sketch/DimSheet';
import { NameSheet } from './IsoSketchScreen';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useIsoPieces } from '../hooks/useIsoPieces';
import { useSettings } from '../state/settings';
import { useSketches } from '../state/sketches';
import { useCuts } from '../state/cuts';
import { useFittings } from '../state/fittings';
import { lookup } from '../state/fittingLibrary';
import { cutDifferently, isoPieceCuts, pipeLine, putCuts } from '../state/cutLog';
import { getSketch, isDefaultName, place, renameSketch, sketchBounds, withDim } from '../state/sketchStore';
import { sameProject } from '../state/project';
import { ISO_GRID, NO_FLIP, Viewport, fitViewport, toScreen } from '../calc/iso';
import { ISO_JOINTS, IsoJoint, IsoPiece, isoCuts, jointFor, notedDims } from '../calc/isoPieces';
import { LIBRARY_FAMILY } from '../calc/takeoffCatalog';
import { sizeLabel } from '../calc/materials';
import { toFraction } from '../calc/format';
import { useCutAdder } from '../voice/useCutAdder';

type Props = NativeStackScreenProps<RootStackParamList, 'IsoCuts'>;

const PAPER_H = 260;

export function IsoCutsScreen({ navigation, route }: Props) {
  const t = useTheme();
  const u = useUnits();
  const { id } = route.params;
  const { settings } = useSettings();
  const { book, apply } = useSketches();
  const sketch = getSketch(book, id);
  const iso = useIsoPieces(sketch);
  const pipe = usePipeConfig();
  const cutList = useCuts();
  const fittings = useFittings();
  const len = (v: number) => u.frac(v) || u.full(v);

  const libFamily = LIBRARY_FAMILY[settings.material];
  const [joint, setJoint] = useState<IsoJoint>(() => jointFor(settings.material, libFamily));
  useEffect(() => setJoint(jointFor(settings.material, libFamily)), [settings.material, libFamily]);
  const joints = ISO_JOINTS.filter((j) => j.id === 'welded' || j.id === 'screwed' || j.id === libFamily);
  const line = `${settings.material}:${settings.wall}`;
  const library = useMemo(() => (fitting: string, nps: number) => lookup(fittings.library, line, fitting, nps), [fittings.library, line]);
  // A no-hub joint's centre stop is nothing unless it is set in Cut Length; a weld leaves its root gap.
  const gap = joint === 'nohub' ? 0 : settings.defaultGap;

  const cuts = useMemo(
    () => isoCuts(iso.reading, iso.dims, { joint, nps: pipe.nps, radius: pipe.kind, gap, library, size: sizeLabel(pipe.nps), length: len }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iso.reading, iso.dims, joint, pipe.nps, pipe.kind, gap, library, u],
  );
  const ready = cuts.filter((c) => !c.problem);
  const missing = cuts.filter((c) => c.c2c === null).length;
  const needsLibrary = cuts.some((c) => c.problem?.includes('fitting library'));

  // Figures already written on the sketch as notes, beside a piece with no dimension.
  const mid = (p: IsoPiece): [number, number] => {
    const a = toScreen(p.from, 'SW', ISO_GRID);
    const b = toScreen(p.to, 'SW', ISO_GRID);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const noted = useMemo(() => {
    const notes = (sketch?.strokes ?? []).flatMap((s) => {
      if (s.kind !== 'note') return [];
      const pl = place(s, 'SW', ISO_GRID);
      return pl.kind === 'note' ? [{ at: [pl.at[0] + pl.text.length * 3.75, pl.at[1] - 5] as [number, number], text: pl.text }] : [];
    });
    const found = notedDims(iso.reading.pieces, notes, mid, ISO_GRID * 2.2, iso.readLength);
    return iso.reading.pieces.filter((p) => !iso.dims[p.key] && found.has(p.key)).map((p) => ({ piece: p, ...found.get(p.key)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sketch?.strokes, iso.reading, iso.dims, iso.readLength]);

  const [ask, setAsk] = useState<DimAsk | null>(null);
  const askFor = (key: string) => {
    const p = iso.reading.pieces.find((x) => x.key === key);
    if (p) setAsk({ key, n: p.n, current: iso.dims[key] });
  };

  // The drawing, fitted into its box once it has a size.
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 });
  const flip = sketch?.flip ?? NO_FLIP;
  useEffect(() => {
    if (!size.w || !sketch) return;
    const b = sketchBounds(sketch.strokes, 'SW', ISO_GRID, flip);
    // Filled out to the box, so every piece is big enough to tap with a finger.
    setViewport(b ? fitViewport(b, size.w, size.h, 34, 2.5) : { scale: 1, tx: size.w / 2, ty: size.h / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, sketch?.id]);

  const [listNote, setListNote] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const project = sketch?.project || settings.projectId;

  const send = (name = sketch?.name ?? ''): { said: string; ok: boolean } => {
    const fail = (said: string) => {
      setListNote(said);
      return { said, ok: false };
    };
    if (!sketch) return fail('That sketch is not in the book any more.');
    if (!ready.length) return fail(missing ? `Give the pieces their dimensions first: ${missing} still need one.` : 'Nothing on this sketch can be cut yet.');
    if (isDefaultName(name)) {
      setNaming(true);
      return fail('Name the sketch first: its pieces are marked by its name.');
    }
    const listed = isoPieceCuts(
      ready.map((c) => ({ n: c.piece.n, c2c: c.c2c!, cut: c.cut, ends: `${c.ends[0].label} × ${c.ends[1].label}` })),
      { sketch: name, ...pipeLine(settings, pipe.nps, pipe.schedule) },
    );
    const changed = cutDifferently(cutList.log, listed, project);
    const out = putCuts(cutList.log, listed, Date.now(), project);
    cutList.apply(() => out.log);
    const bits = [
      out.added ? `${out.added} added` : '',
      out.replaced ? `${out.replaced} updated` : '',
      out.alreadyCut ? `${out.alreadyCut} already cut, left alone` : '',
      cuts.length > ready.length ? `${cuts.length - ready.length} not ready` : '',
    ].filter(Boolean);
    const said =
      `${name} on the cut list: ${bits.join(', ') || 'nothing to send'}.` +
      (changed.length ? ` Already cut to another length: ${changed.join(', ')}. Check those pipes against the sketch.` : '');
    setListNote(said);
    void Haptics.notificationAsync(changed.length ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return { said, ok: true };
  };
  useCutAdder(() => send());

  if (!sketch) {
    return (
      <Screen>
        <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
          <Text style={[t.type.body, { color: t.colors.textMuted }]}>That sketch is not in the book any more.</Text>
          <GhostButton label="Back" icon="arrow-back" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  const toCut = cutList.log.cuts.filter((c) => !c.done && sameProject(c.project, project)).length;

  return (
    <Screen>
      <HintRow text="Every piece between two fittings, numbered as it was drawn. Tap a piece for its centre to centre; the cut is worked from the same tables as Cut Length." />

      <View
        style={{ height: PAPER_H, marginHorizontal: t.layout.screenPadding, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.wellEdge, overflow: 'hidden', backgroundColor: t.colors.well }}
        onLayout={(e) => setSize({ w: Math.floor(e.nativeEvent.layout.width), h: Math.floor(e.nativeEvent.layout.height) })}
      >
        {size.w > 0 ? (
          <IsoCanvas
            width={size.w}
            height={size.h}
            strokes={sketch.strokes}
            mode="dim"
            corner="SW"
            flip={flip}
            viewport={viewport}
            onViewport={setViewport}
            onStroke={() => undefined}
            onNote={() => undefined}
            pieces={iso.labels(true)}
            onPiece={askFor}
          />
        ) : null}
      </View>

      <View style={{ paddingTop: t.space.md }}>
        <ControlRow>
          <SelectorButton primary={pipe.label} badge={pipe.kind} onPress={pipe.openSheet} style={{ flex: 1 }} />
        </ControlRow>
      </View>
      <ChipRow label="Joints" options={joints.map((j) => ({ value: j.id, label: j.label }))} selected={joint} onSelect={setJoint} />
      <MetaBar
        text={`${sizeLabel(pipe.nps)} ${pipe.kind} · SCH ${pipe.schedule}${gap && joint !== 'screwed' && joint !== 'socket' ? ` · Gap ${u.system === 'imperial' ? toFraction(gap, 32) : u.full(gap)} at each ${joint === 'nohub' ? 'joint' : 'weld'}` : ''}`}
      />

      {iso.reading.error ? <WarningBanner text={iso.reading.error} /> : null}
      {!iso.reading.pieces.length && !iso.reading.error ? (
        <Text style={[t.type.body, { color: t.colors.textMuted, padding: t.layout.screenPadding }]}>No run lines on this sketch yet. Draw the pipe with the Run tool, then come back.</Text>
      ) : null}

      {noted.length ? (
        <View style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.md, padding: t.space.lg, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, gap: t.space.sm }}>
          <Text style={[t.type.captionStrong, { color: t.colors.text }]}>{`Figures in your notes, by ${noted.length === 1 ? 'a piece' : `${noted.length} pieces`}:`}</Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{noted.map((x) => `${x.piece.n}: ${x.text}`).join('   ')}</Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>Check each is a length, not a size, then use them.</Text>
          <GhostButton
            label={`Use ${noted.length === 1 ? 'it' : `these ${noted.length}`}`}
            icon="checkmark-done-outline"
            onPress={() => apply((b) => noted.reduce((acc, x) => withDim(acc, id, x.piece.key, x.value, Date.now()), b))}
          />
        </View>
      ) : null}

      {cuts.length ? <SectionHeader title="Pieces" meta={`${ready.length} of ${cuts.length} ready${missing ? ` · ${missing} to dimension` : ''}`} /> : null}
      {cuts.map((c) => (
        <Pressable
          key={c.piece.key}
          onPress={() => askFor(c.piece.key)}
          accessibilityRole="button"
          accessibilityLabel={`Piece ${c.piece.n}. ${c.problem ?? `Cut ${len(c.cut)}`}. Change its dimension`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.md,
            marginHorizontal: t.layout.screenPadding,
            minHeight: 60,
            paddingVertical: t.space.sm,
            borderTopWidth: t.hairline,
            borderTopColor: t.colors.border,
            backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
          })}
        >
          <View style={{ minWidth: 40, paddingHorizontal: 6, paddingVertical: 2, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center' }}>
            <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{c.piece.n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {c.problem ? (
              <Text style={[t.type.bodyStrong, { color: t.colors.warnText }]}>{c.problem}</Text>
            ) : (
              <Text style={[t.type.sectionTitle, { color: t.colors.data }]}>{len(c.cut)}</Text>
            )}
            <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={2}>
              {`${c.c2c ? `C-C ${iso.dimText(c.c2c)} · ` : ''}${c.ends[0].label} × ${c.ends[1].label}`}
            </Text>
          </View>
        </Pressable>
      ))}

      {needsLibrary ? (
        <View style={{ paddingTop: t.space.md }}>
          <ControlRow>
            <GhostButton label="Open the fitting library" icon="library-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('FittingLibrary', { line })} />
          </ControlRow>
        </View>
      ) : null}

      {cuts.length ? (
        <View style={{ paddingTop: t.space.lg }}>
          <ControlRow>
            <AccentButton label={ready.length ? `Send ${ready.length} to the cut list` : 'Send to the cut list'} icon="list-outline" style={{ flex: 1 }} onPress={() => send()} />
          </ControlRow>
        </View>
      ) : null}
      {listNote ? <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm }]}>{listNote}</Text> : null}
      {toCut ? (
        <Pressable onPress={() => navigation.navigate('CutList')} accessibilityRole="link" hitSlop={8} style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.sm }}>
          <Text style={[t.type.captionStrong, { color: t.colors.data }]}>{`Cut list: ${toCut} to cut →`}</Text>
        </Pressable>
      ) : null}

      <PipeSheet visible={pipe.sheetOpen} onClose={pipe.closeSheet} nps={pipe.nps} kind={pipe.kind} schedule={pipe.schedule} onChange={pipe.change} />
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
      <NameSheet
        t={t}
        sketch={naming ? sketch : null}
        onCancel={() => setNaming(false)}
        onSave={(name, placeText) => {
          setNaming(false);
          if (!name || isDefaultName(name)) return;
          apply((b) => renameSketch(b, id, name, placeText, Date.now()));
          send(name);
        }}
      />
    </Screen>
  );
}
