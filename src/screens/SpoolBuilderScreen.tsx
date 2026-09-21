import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { AccentButton, ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, SpoolBar, StatGrid, WarningBanner } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { CutList } from '../components/CutList';
import { buildSpoolSheet } from '../print/spoolSheet';
import { shareSheet } from '../print/share';
import { SpoolView } from '../components/spool3d/SpoolView';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useSettings } from '../state/settings';
import { useSpools } from '../state/spools';
import { SavedSpool, deleteSpool, freshSpoolId, getSpool, sameSpool, saveSpool } from '../state/spoolStore';
import { sinceLabel } from '../state/register';
import { MAX_LEGS, solveSpool } from '../calc/spool';
import { findSize } from '../calc/pipe';
import { planCuts } from '../calc/cutList';
import { AimPad } from '../components/AimPad';
import { AXES, aimRun, flatAxes, flattenDirs, isFlat, planeOf, sameAim } from '../calc/aim';
import { Camera, ISO_VIEW } from '../components/spool3d/project';
import {
  DirLeg,
  LegDir,
  bearingLabel,
  dirLabel,
  dirShort,
  fittingFor,
  flipDirs,
  isVertical,
  lerpDirs,
  mirrorDirs,
  rotateDirs,
  solveDirections,
  turnDeg,
} from '../calc/direction';
import { parseNumber, toFraction } from '../calc/format';
import { fromInches } from '../calc/units';

let counter = 0;
const nextId = () => `leg${(counter += 1)}`;

const dirLeg = (length: number, bearing: number, slope: number): DirLeg => ({
  id: nextId(),
  length,
  dir: { bearing, slope },
});

/** Along, up, and across: the spool everybody draws first. */
const START = (): DirLeg[] => [dirLeg(36, 90, 0), dirLeg(24, 0, 90), dirLeg(30, 0, 0)];

/** The pipe size the way it is said: 2", 3/4". */
const findLabel = (nps: number): string => findSize(nps).label;

/** How long a handing change takes to sweep. Long enough to watch, short enough not to wait on. */
const MORPH_MS = 460;

const tidy = (n: number): string => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

export function SpoolBuilderScreen() {
  const t = useTheme();
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();

  const [legs, setLegs] = useState<DirLeg[]>(START);
  const [gap, setGap] = useState('');
  const [open, setOpen] = useState<number | null>(0);

  const gapInches = Number.isFinite(u.parse(gap)) ? u.parse(gap) : settings.defaultGap;

  // The shelf. A spool takes twenty minutes to lay out and a phone restart to
  // lose, so what is on screen can be kept by name and comes back as it was.
  const spoolsCtx = useSpools();
  const shelf = spoolsCtx.shelf;
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loaded = loadedId ? getSpool(shelf, loadedId) : undefined;
  // A loaded spool deleted elsewhere, or dropped by the cap, stops being "loaded".
  useEffect(() => {
    if (loadedId && !getSpool(shelf, loadedId)) setLoadedId(null);
  }, [shelf, loadedId]);

  /** What a save would write: the screen, in the shelf's shape. */
  const onScreen = useMemo(
    () => ({
      nps: pipe.nps,
      kind: pipe.kind,
      schedule: pipe.schedule,
      gap: gapInches,
      legs: legs.map((l) => ({ length: l.length, bearing: l.dir.bearing, slope: l.dir.slope })),
    }),
    [pipe.nps, pipe.kind, pipe.schedule, gapInches, legs]
  );
  const dirty = loaded ? !sameSpool(loaded, onScreen) : false;

  const loadSpool = (s: SavedSpool) => {
    setLegs(s.legs.map((l) => ({ id: nextId(), length: l.length, dir: { bearing: l.bearing, slope: l.slope } })));
    pipe.change({ nps: s.nps, kind: s.kind, schedule: s.schedule });
    setGap(String(fromInches(s.gap, u.system)));
    setLoadedId(s.id);
    setConfirmDelete(null);
    setOpen(0);
  };

  /**
   * One sheet, three outcomes, decided by what would be lost.
   *
   * The same name always updates the loaded spool. A new name on a spool with
   * no edits renames it — a duplicate of an identical spool helps nobody. A
   * new name on a spool with edits keeps both, because renaming it would
   * silently destroy the version that was deliberately diverged from.
   */
  const commitSave = (name: string, place: string) => {
    const now = Date.now();
    const keepId = loaded && (name === loaded.name || !dirty);
    const id = keepId ? loaded!.id : freshSpoolId(shelf, name);
    spoolsCtx.apply((prev) =>
      saveSpool(prev, { id, name, place, ...onScreen, createdAt: now, updatedAt: now }, now)
    );
    setLoadedId(id);
    setSaveOpen(false);
  };

  const removeSpool = (id: string) => {
    spoolsCtx.apply((prev) => deleteSpool(prev, id));
    if (loadedId === id) setLoadedId(null);
    setConfirmDelete(null);
  };

  const [morph, setMorph] = useState<{ from: LegDir[]; to: LegDir[]; t: number } | null>(null);
  // What the last rearrangement did, and whether it held every cut.
  //
  // Mirror, turn over, swing and pointing the run are rotations and
  // reflections: they keep every angle, so they cannot move a cut, and saying
  // so is the whole point of the line. Flattening is not one of those. It
  // swings a leg onto a new heading, which can change the bend at each end of
  // it, which changes what gets cut — so the claim has to be earned rather
  // than printed, or the app is lying to somebody about to cut steel.
  const [handed, setHanded] = useState<{ text: string; held: boolean } | null>(null);
  const morphFrame = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (morphFrame.current !== null) cancelAnimationFrame(morphFrame.current);
    },
    []
  );

  // Each leg is aimed at the compass, and the bends and rolls the engine walks
  // are worked out from where consecutive legs point. Nobody types a roll.
  const turns = useMemo(() => solveDirections(legs), [legs]);

  const spool = useMemo(() => {
    if (!turns.ok)
      return solveSpool({ legs: [], nps: pipe.nps, kind: pipe.kind, schedule: pipe.schedule, gap: gapInches });
    return solveSpool({
      legs: turns.legs,
      start: turns.start,
      nps: pipe.nps,
      kind: pipe.kind,
      schedule: pipe.schedule,
      gap: gapInches,
    });
  }, [turns, pipe.nps, pipe.kind, pipe.schedule, gapInches]);

  const error = turns.ok ? spool.error : turns.error;
  const valid = turns.ok && spool.valid;

  /**
   * The spool as drawn, which during a handing change is a frame of the sweep.
   *
   * Only the picture uses this. A part-way spool has part-way bends, and a
   * part-way bend is not a fitting anybody can buy — so the elbow list, the
   * cuts, the sheet and the shelf all stay on the committed spool, which is
   * already correct. A frame that will not solve at all, which a sweep can
   * pass through, falls back to that same committed spool rather than
   * blanking the canvas mid-movement.
   */
  const shown = useMemo(() => {
    if (!morph) return spool;
    const dirs = lerpDirs(morph.from, morph.to, morph.t);
    const t = solveDirections(legs.map((l, i) => ({ ...l, dir: dirs[i] ?? l.dir })));
    if (!t.ok) return spool;
    const s = solveSpool({
      legs: t.legs,
      start: t.start,
      nps: pipe.nps,
      kind: pipe.kind,
      schedule: pipe.schedule,
      gap: gapInches,
    });
    return s.valid ? s : spool;
  }, [morph, legs, spool, pipe.nps, pipe.kind, pipe.schedule, gapInches]);

  const patch = (id: string, next: Partial<DirLeg>) =>
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...next } : l)));

  const aim = (id: string, next: Partial<LegDir>) =>
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, dir: { ...l.dir, ...next } } : l)));

  // The pad lays its buttons out at the angles its directions draw at, so it
  // has to know where the viewer is standing. The drawing owns that and says
  // when it changes.
  const [cam, setCam] = useState<Camera>(ISO_VIEW);

  // Whether the run is held to one vertical plane.
  //
  // Not stored on the spool, because the spool already knows: a run whose legs
  // all lie in one plane is a flat run, and asking the legs is one less thing
  // to keep in step with them or to migrate in saved files. `null` means
  // follow the legs, which is what a spool opens on; pressing either button
  // pins it, so a flat run can still be taken into the third dimension and a
  // spatial one can be worked on flat before it is flattened.
  const [flatPref, setFlatPref] = useState<boolean | null>(null);

  // The run pad is behind a button rather than always on screen. Everything
  // that reshapes the drawing has to sit against the drawing to be watched,
  // and a pad left open costs a hundred and fifty points of the height that
  // keeps the total above the fold. Open it, aim the run, close it.
  const [pointRun, setPointRun] = useState(false);

  const setLength = useCallback((index: number, inches: number) => {
    setLegs((prev) => prev.map((l, i) => (i === index ? { ...l, length: Math.round(inches * 16) / 16 } : l)));
  }, []);

  // Watching a spool change hands
  // -----------------------------
  // Mirror, turn over and swing rearrange a spool without moving a single
  // figure on the screen, so the drawing is the only evidence any of them did
  // anything — and a drawing that changes between two frames is not evidence,
  // it is a memory test. Reported from the job: pressing Mirror two or three
  // times just to be sure something happened.
  //
  // So the change is swept through instead of jumped. The legs commit at once,
  // which keeps every figure, every save and every printed sheet honest from
  // the first frame; only the picture takes the long way, and it is the
  // picture that was being doubted.
  const reaim = (f: (dirs: LegDir[]) => LegDir[], said: string, held = true) => {
    const from = legs.map((l) => l.dir);
    const to = f(from);
    setLegs((prev) => prev.map((l, i) => ({ ...l, dir: to[i] ?? l.dir })));
    setHanded({ text: said, held });

    if (morphFrame.current !== null) cancelAnimationFrame(morphFrame.current);
    const started = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - started) / MORPH_MS);
      // Ease out: it leaves quickly enough to be obviously caused by the tap,
      // and arrives slowly enough to be read.
      setMorph({ from, to, t: 1 - (1 - t) ** 3 });
      if (t < 1) morphFrame.current = requestAnimationFrame(step);
      else {
        morphFrame.current = null;
        setMorph(null);
      }
    };
    morphFrame.current = requestAnimationFrame(step);
  };

  // Which plane a flat run lies in, whether it is flat, and therefore which
  // pad to offer: eight directions inside the plane, or the six axes of the
  // world. Derived, never stored, so it cannot disagree with the pipe.
  const plane = planeOf(legs.map((l) => l.dir));
  const flat = flatPref ?? isFlat(legs.map((l) => l.dir), plane);
  const padAxes = flat ? flatAxes(plane) : AXES;

  /**
   * Press the run flat into the plane it is already mostly in.
   *
   * Unlike every other rearrangement on this screen, this one can change what
   * gets cut: a leg swung onto a new heading changes the bend at each end of
   * it. So whether it did is measured rather than assumed — the flattened run
   * is solved and its total compared — and the line underneath says which it
   * was.
   */
  const flatten = () => {
    const { dirs, guessed } = flattenDirs(legs.map((l) => l.dir), plane);
    const after = solveDirections(legs.map((l, i) => ({ ...l, dir: dirs[i] ?? l.dir })));
    const held =
      after.ok &&
      valid &&
      Math.abs(
        solveSpool({
          legs: after.legs,
          start: after.start,
          nps: pipe.nps,
          kind: pipe.kind,
          schedule: pipe.schedule,
          gap: gapInches,
        }).totalCut - spool.totalCut,
      ) < 0.005;

    // What moved, not what had to be guessed. A leg can be swung a long way
    // into the plane without ever having been square out of it, and counting
    // only the square ones reported "every leg was already in the plane" over
    // a cut list that had just changed.
    const moved = legs.filter((l, i) => !sameAim(l.dir, dirs[i] ?? l.dir)).length;
    const leg = (n: number) => `${n} leg${n > 1 ? 's' : ''}`;

    setFlatPref(true);
    reaim(
      (d) => flattenDirs(d, plane).dirs,
      moved === 0
        ? 'Flattened — every leg was already in the plane'
        : guessed === 0
          ? `Flattened — ${leg(moved)} swung into the plane`
          : guessed === moved
            ? `Flattened — ${leg(moved)} ran square out of the plane and now ${moved > 1 ? 'run' : 'runs'} along it`
            : `Flattened — ${leg(moved)} swung into the plane, ${guessed} of them square out of it`,
      held,
    );
  };

  const addLeg = () => {
    if (legs.length >= MAX_LEGS) return;
    // A new leg heads somewhere the last one does not, so it is a leg and not
    // a continuation: square off it, level if the last one rose, up if it ran.
    const last = legs[legs.length - 1]?.dir ?? { bearing: 0, slope: 0 };
    const next: LegDir = isVertical(last) ? { bearing: 0, slope: 0 } : { bearing: last.bearing, slope: 90 };
    setLegs((prev) => [...prev, { id: nextId(), length: 24, dir: next }]);
    setOpen(legs.length);
  };

  const removeLeg = (id: string) =>
    setLegs((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));

  // What goes on the drawing. Centre to centre, the way a spool is dimensioned,
  // and where the leg runs — which for a leg square on to the viewer is the
  // only thing on the page that says anything about it at all.
  // A drawing carries a figure, not a readout: 36", not 36.00 inch. Whole
  // numbers stay whole, a fractional imperial figure is the fraction a tape
  // has on it, and metric keeps the one decimal that means anything.
  const figure = useCallback(
    (inches: number) => {
      // A fraction comes back carrying its own inch mark, so it takes no suffix.
      const f = u.frac(inches);
      if (f) return f;
      const shown = fromInches(inches, u.system);
      return `${u.num(inches, Math.abs(shown - Math.round(shown)) < 0.005 ? 0 : 1)}${u.suffix}`;
    },
    [u]
  );

  const legText = useCallback(
    (i: number) => {
      const r = spool.runs[i];
      const leg = legs[i];
      if (!r || !leg) return [''];
      return [figure(r.centerToCenter), dirShort(leg.dir)];
    },
    [spool.runs, legs, figure]
  );

  const elbowText = useCallback(
    (i: number) => {
      const e = spool.elbows[i];
      if (!e) return [''];
      const f = fittingFor(e.angle);
      return f.stock ? [`${tidy(e.angle)}°`] : [`${tidy(e.angle)}°`, 'cut to suit'];
    },
    [spool.elbows]
  );

  // The cuts are only half the answer. What a man actually needs to know at
  // the rack is how many sticks to pull, and the two are not the same
  // question: four pieces totalling 180 inches are one stick if they nest and
  // two if they do not.
  const cuts = useMemo(
    () =>
      planCuts(
        valid
          ? spool.runs.map((r, i) => ({ id: `leg${i}`, label: `Leg ${i + 1}`, tag: String(i + 1), length: r.cutLength }))
          : [],
        settings.stockLength,
        settings.cutAllowance
      ),
    [valid, spool.runs, settings.stockLength, settings.cutAllowance]
  );

  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const odd = turns.ok ? turns.legs.filter((l, i) => i > 0 && !fittingFor(l.bend).stock).length : 0;

  /** A date a man can read, in the one form every phone agrees on. */
  const printedOn = () => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `Printed ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  /**
   * The weld gap, at full precision.
   *
   * Everywhere else a length is shown to whatever fraction the reader set, and
   * at sixteenths a 3/32 gap reads as 1/8. On a sheet somebody cuts from, the
   * spec has to be the spec: sixty-fourths hold every standard root gap
   * exactly, and reduce to the fraction it is called by.
   */
  const gapLabel = () =>
    u.system === 'imperial' ? toFraction(gapInches, 64) : `${u.num(gapInches)} ${u.unitName}`;

  const share = async () => {
    if (!valid || sharing) return;
    setSharing(true);
    setShareNote(null);
    const name = loaded?.name ?? 'Spool';
    const html = buildSpoolSheet({
      name,
      place: loaded?.place ?? '',
      spec: `${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Gap ${gapLabel()}`,
      dateLine: printedOn(),
      spool,
      cuts,
      text: { legText, elbowText },
      legDir: (i) => (legs[i] ? dirLabel(legs[i]!.dir) : ''),
      length: (v) => `${u.num(v)} ${u.unitName}`,
      angle: (d) => u.angle(d, 1),
      fitting: (d) => fittingFor(d).label,
      footer:
        'Lengths are centre-to-centre. Each cut deducts the takeoff at both ends plus the weld gap. ' +
        'Check every figure against the job before cutting.',
      // Worth printing at the top of a sheet somebody is about to order from.
      problem:
        odd > 0
          ? `${odd} turn${odd === 1 ? '' : 's'} on this spool ${odd === 1 ? 'is' : 'are'} not a stock elbow — see the elbow schedule before ordering.`
          : undefined,
    });
    const out = await shareSheet(html, name);
    setSharing(false);
    if (!out.ok) setShareNote(out.why);
  };

  return (
    <Screen>
      <HintRow text="Say where each leg runs and how far — east, up, north. The app works out every bend for you and tells you what fitting it takes." />

      {valid ? (
        <SpoolView
          spool={shown}
          onCamera={setCam}
          showLabels
          selectedRun={open}
          onPickRun={setOpen}
          onResizeLeg={setLength}
          lengthLabel={(v) => `${u.num(v)} ${u.unitName}`}
          legText={legText}
          elbowText={elbowText}
        />
      ) : null}

      {/* Anything that reshapes the drawing sits against the drawing. Down
          under the leg list these were a button you pressed and then scrolled
          up to see the result of, which is how you end up pressing Mirror
          three times because you cannot tell whether it took. */}
      {valid ? (
        <>
          {pointRun ? (
            <AimPad
              label="Point the whole run — every leg turns together"
              axes={padAxes}
              cam={cam}
              value={legs[0]?.dir ?? { bearing: 0, slope: 0 }}
              onAim={(dir) => reaim((d) => aimRun(d, dir), 'Run pointed — every angle between the legs held')}
            />
          ) : null}

          <ControlRow>
            <GhostButton
              label="Mirror"
              icon="git-compare-outline"
              onPress={() => reaim(mirrorDirs, 'Mirrored — opposite hand')}
              style={{ flex: 1 }}
            />
            <GhostButton
              label="Turn over"
              icon="swap-vertical-outline"
              onPress={() => reaim(flipDirs, 'Turned over — rises are drops')}
              style={{ flex: 1 }}
            />
            <GhostButton
              label="Swing 90°"
              icon="refresh-circle-outline"
              onPress={() => reaim((d) => rotateDirs(d, 90), 'Swung 90° round the compass')}
              style={{ flex: 1 }}
            />
          </ControlRow>

          <ControlRow>
            <GhostButton
              label={pointRun ? 'Hide pad' : 'Point run'}
              icon="move-outline"
              onPress={() => setPointRun((v) => !v)}
              style={{ flex: 1 }}
            />
            <GhostButton
              label={flat ? 'Go 3D' : 'Flatten'}
              icon={flat ? 'cube-outline' : 'document-outline'}
              onPress={() => (flat ? setFlatPref(false) : flatten())}
              style={{ flex: 1 }}
            />
          </ControlRow>
          <HintRow
            text={
              handed
                ? `${handed.text}. ${handed.held ? 'Not one cut changed.' : 'Check the cut list — this one moves pipe.'}`
                : flat
                  ? 'Held to one plane: eight directions, every turn between them a stock elbow. Go 3D to leave the plane.'
                  : 'Mirror, turn over, swing and pointing the run all rearrange the spool. None of them changes a cut.'
            }
          />
        </>
      ) : null}

      <ResultBanner
        label="Total pipe"
        value={valid ? `${u.num(spool.totalCut)} ${u.unitName}` : error ?? '—'}
        hint={
          valid
            ? `${spool.runs.length} leg${spool.runs.length === 1 ? '' : 's'} · ${spool.elbows.length} elbow${
                spool.elbows.length === 1 ? '' : 's'
              } · C2C ${u.num(spool.totalCenterToCenter)} ${u.unitName}`
            : undefined
        }
        tone={valid ? 'default' : 'error'}
      />

      {/* Keeping and printing both belong with the drawing they are about. Put
          them under the leg list and a man with five legs on screen has to
          scroll past all of them, the handing buttons and the whole shelf to
          find the thing he opened the screen to do. */}
      <ControlRow>
        <AccentButton
          label={loaded ? (dirty ? `Update ${loaded.name}` : 'Rename or copy') : 'Save this spool'}
          icon={loaded && !dirty ? 'create-outline' : 'save-outline'}
          onPress={() => setSaveOpen(true)}
          style={{ flex: 1 }}
        />
        <GhostButton
          label={sharing ? 'Making the sheet…' : 'Share drawing'}
          icon="print-outline"
          onPress={share}
          style={{ flex: 1, opacity: valid && !sharing ? 1 : 0.4 }}
        />
      </ControlRow>
      {shareNote ? <WarningBanner text={shareNote} /> : null}

      <MetaBar text={`${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Gap ${u.num(gapInches)} ${u.unitName}`} />
      {gapInches <= 0 ? <WarningBanner text={`No weld gap set (0 ${u.unitName}).`} /> : null}
      {odd > 0 ? (
        <WarningBanner
          text={`${odd} turn${odd === 1 ? '' : 's'} on this spool ${odd === 1 ? 'is' : 'are'} not a stock elbow. Check the Elbows list before you order.`}
        />
      ) : null}

      <SectionHeader title="Legs" meta={`${legs.length} of ${MAX_LEGS}`} />

      {legs.map((l, i) => {
        const run = valid ? spool.runs[i] : undefined;
        const turn = turns.ok ? turns.legs[i] : undefined;
        const expanded = open === i;
        const vertical = isVertical(l.dir);
        const fitting = turn && i > 0 ? fittingFor(turn.bend) : null;
        return (
          <View
            key={l.id}
            style={{
              borderBottomWidth: t.hairline,
              borderBottomColor: t.colors.border,
              backgroundColor: expanded ? t.colors.bgSubtle : 'transparent',
            }}
          >
            <Pressable
              onPress={() => setOpen(expanded ? null : i)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.md,
                paddingHorizontal: t.layout.screenPadding,
                paddingVertical: t.space.lg,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: expanded ? t.colors.accent : t.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[t.type.captionStrong, { color: t.colors.onPrimary }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>
                  {run ? `Cut ${u.num(run.cutLength)} ${u.unitName}` : `Leg ${i + 1}`}
                </Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                  {`${u.num(l.length)} ${u.unitName} ${dirLabel(l.dir)}`}
                  {fitting ? ` · ${fitting.stock ? fitting.label : `${tidy(turn!.bend)}° turn`}` : ' · start of the spool'}
                </Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={t.colors.textFaint} />
              {legs.length > 1 ? (
                <Pressable onPress={() => removeLeg(l.id)} hitSlop={12} accessibilityLabel={`Remove leg ${i + 1}`}>
                  <Ionicons name="trash-outline" size={18} color={t.colors.textFaint} />
                </Pressable>
              ) : null}
            </Pressable>

            {expanded ? (
              <View style={{ paddingBottom: t.space.md }}>
                <FieldRow>
                  <DimensionInput
                    label="Length"
                    value={String(l.length)}
                    onChangeText={(v) => patch(l.id, { length: parseNumber(v) })}
                    suffix={u.suffix}
                    placeholder="0"
                    readout={u.frac(l.length)}
                  />
                  <DimensionInput
                    label="Bearing"
                    value={String(Math.round(turnDeg(l.dir.bearing)))}
                    onChangeText={(v) => aim(l.id, { bearing: parseNumber(v) })}
                    suffix="°"
                    placeholder="0"
                    readout={vertical ? 'not used' : bearingLabel(l.dir.bearing)}
                  />
                  <DimensionInput
                    label="Slope"
                    value={String(l.dir.slope)}
                    onChangeText={(v) => aim(l.id, { slope: Math.max(-90, Math.min(90, parseNumber(v))) })}
                    suffix="°"
                    placeholder="0"
                    readout={l.dir.slope === 0 ? 'level' : l.dir.slope > 0 ? 'rising' : 'falling'}
                  />
                </FieldRow>

                {/* One control instead of two rows. The compass row and the
                    slope row were two coordinates to combine in your head to
                    point a leg somewhere you could already see, and the slope
                    row was the one nobody found — which is why a leg could
                    only be sent left or right. Here the buttons sit where the
                    leg will draw. */}
                <AimPad
                  label={flat ? 'Send this leg' : 'Send this leg — six ways pipe runs'}
                  axes={padAxes}
                  cam={cam}
                  value={l.dir}
                  onAim={(dir) => aim(l.id, dir)}
                />

                {/* The bend is a result here, not an entry. It is shown because
                    it is what gets ordered, and because a number nobody typed
                    is a number somebody should be able to see. */}
                {turn && i > 0 && fitting ? (
                  <View
                    style={{
                      marginHorizontal: t.layout.screenPadding,
                      padding: t.space.md,
                      borderRadius: t.radius.sm,
                      backgroundColor: fitting.stock ? t.colors.dataSoft : t.colors.accentSoft,
                    }}
                  >
                    <Text style={[t.type.captionStrong, { color: fitting.stock ? t.colors.data : t.colors.accent }]}>
                      {`Turns ${tidy(turn.bend)}° off leg ${i} — ${fitting.label}`}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <ControlRow>
        <AccentButton
          label={legs.length >= MAX_LEGS ? `Max ${MAX_LEGS} legs` : 'Add leg'}
          icon="add-outline"
          onPress={addLeg}
          style={{ flex: 1 }}
        />
        <GhostButton
          label="Reset"
          icon="refresh-outline"
          onPress={() => {
            setLegs(START());
            setLoadedId(null);
            setOpen(0);
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      {/* The shelf. Saving keeps the input — the legs, the pipe, the gap — so
          a saved spool always rebuilds to exactly the cuts it showed. */}
      <SectionHeader
        title="Saved spools"
        meta={loaded ? (dirty ? `Editing ${loaded.name} — unsaved changes` : `Editing ${loaded.name} — saved`) : `${shelf.spools.length} on this phone`}
      />
      <HintRow text="Tap one to open it. Save and Share drawing are up under the picture." />

      {spoolsCtx.saveError ? (
        <WarningBanner text="The phone refused the last write. What is on screen is ahead of what is saved; the next change retries it." />
      ) : null}
      {shelf.foreign ? (
        <>
          <WarningBanner text="The saved spools on this phone were written by a newer version of the app, so nothing is being saved. Update the app to read them." />
          <ControlRow>
            <GhostButton
              label="Save here anyway, discarding them"
              icon="warning-outline"
              onPress={spoolsCtx.takeOver}
              style={{ flex: 1 }}
            />
          </ControlRow>
        </>
      ) : null}
      {shelf.dropped > 0 ? (
        <Pressable onPress={spoolsCtx.clearDropped} accessibilityRole="button" accessibilityLabel="Dismiss the dropped spools notice">
          <WarningBanner
            text={`${shelf.dropped} saved spool${shelf.dropped === 1 ? '' : 's'} could not be read and ${shelf.dropped === 1 ? 'was' : 'were'} left out. Tap to dismiss.`}
          />
        </Pressable>
      ) : null}


      {shelf.spools.map((s) => {
        const here = s.id === loadedId;
        const legsWord = `${s.legs.length} leg${s.legs.length === 1 ? '' : 's'}`;
        return (
          <Pressable
            key={s.id}
            onPress={() => loadSpool(s)}
            accessibilityRole="button"
            accessibilityLabel={`Open saved spool ${s.name}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
              paddingHorizontal: t.layout.screenPadding,
              paddingVertical: t.space.lg,
              borderBottomWidth: t.hairline,
              borderBottomColor: t.colors.border,
              backgroundColor: here ? t.colors.bgSubtle : 'transparent',
              borderLeftWidth: here ? 3 : 0,
              borderLeftColor: t.colors.accent,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[t.type.bodyStrong, { color: here ? t.colors.accent : t.colors.text }]}>{s.name}</Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                {`${s.place ? `${s.place} · ` : ''}${legsWord} · ${findLabel(s.nps)} SCH ${s.schedule} · ${sinceLabel(s.updatedAt, Date.now())}`}
              </Text>
            </View>
            {confirmDelete === s.id ? (
              <Pressable
                onPress={() => removeSpool(s.id)}
                hitSlop={12}
                accessibilityLabel={`Really delete ${s.name}`}
                style={{
                  paddingHorizontal: t.space.md,
                  paddingVertical: 4,
                  borderRadius: t.radius.sm,
                  backgroundColor: t.colors.accent,
                }}
              >
                <Text style={[t.type.captionStrong, { color: t.colors.onAccent }]}>Delete?</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setConfirmDelete(s.id)}
                hitSlop={12}
                accessibilityLabel={`Delete saved spool ${s.name}`}
              >
                <Ionicons name="trash-outline" size={18} color={t.colors.textFaint} />
              </Pressable>
            )}
          </Pressable>
        );
      })}
      {shelf.spools.length === 0 && !shelf.foreign ? (
        <HintRow text="Nothing saved yet. Save a spool and it survives closing the app, restarting the phone, and every update." />
      ) : null}

      <ControlRow>
        <SelectorButton primary={pipe.label} badge={pipe.kind} onPress={pipe.openSheet} style={{ flex: 1 }} />
        <DimensionInput
          label="Gap/joint"
          value={gap}
          onChangeText={setGap}
          suffix={u.suffix}
          placeholder={u.num(settings.defaultGap)}
          style={{ flex: 1 }}
        />
      </ControlRow>

      {valid && spool.elbows.length ? (
        <>
          <SectionHeader title="Elbows" meta="In order along the spool" />
          {spool.elbows.map((e, i) => {
            const f = fittingFor(e.angle);
            const from = legs[e.legIndex - 1];
            const to = legs[e.legIndex];
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  gap: t.space.md,
                  paddingHorizontal: t.layout.screenPadding,
                  paddingVertical: t.space.lg,
                  borderBottomWidth: t.hairline,
                  borderBottomColor: t.colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.label, { color: t.colors.textMuted }]}>
                    {`Joint ${e.legIndex} → leg ${e.legIndex + 1}`}
                  </Text>
                  <Text style={[t.type.statValue, { color: t.colors.text, marginTop: 2 }]}>{u.angle(e.angle, 1)}</Text>
                  <Text
                    style={[t.type.caption, { color: f.stock ? t.colors.data : t.colors.text, marginTop: 2 }]}
                  >
                    {f.label}
                  </Text>
                  {from && to ? (
                    <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                      {`${dirLabel(from.dir)} → ${dirLabel(to.dir)}`}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{`Takeoff ${u.num(e.takeoff)}`}</Text>
                  <Text style={[t.type.caption, { color: t.colors.data, marginTop: 2 }]}>{`Throat ${u.num(e.throatArc)}`}</Text>
                  <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>{`Back ${u.num(e.backArc)}`}</Text>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      {valid ? (
        <CutList plan={cuts} stock={settings.stockLength} length={(v) => `${u.num(v)} ${u.unitName}`} short={figure} />
      ) : null}

      <StatGrid
        stats={[
          { label: 'Total cut', note: 'Pipe in the job', value: valid ? u.dual(spool.totalCut) : '—' },
          {
            label: 'Sticks to pull',
            note: `${u.num(settings.stockLength, 0)} ${u.unitName} stock`,
            value: cuts.ok ? String(cuts.count) : '—',
          },
          { label: 'Longest drop', note: 'Worth keeping', value: cuts.ok ? u.dual(cuts.longestDrop) : '—' },
          { label: 'Centre to centre', value: valid ? u.dual(spool.totalCenterToCenter) : '—' },
          { label: 'Legs', value: String(legs.length) },
          { label: 'Elbows', value: valid ? String(spool.elbows.length) : '—' },
          {
            label: 'Envelope',
            note: 'E × UP × N',
            value: valid
              ? `${u.num(spool.bounds.size.x, 0)}×${u.num(spool.bounds.size.y, 0)}×${u.num(spool.bounds.size.z, 0)}`
              : '—',
          },
          { label: 'Longest leg', value: valid ? u.dual(Math.max(...spool.runs.map((r) => r.cutLength))) : '—' },
        ]}
      />

      <SpoolBar
        badge={`SCH ${pipe.schedule}`}
        text={valid ? `Pipe weight ${u.weight(spool.weight, 2)} for ${u.num(spool.totalCut)} ${u.unitName}` : 'Weight unavailable'}
      />

      <FooterNote text="A leg is where it runs and how far: a bearing off the compass and a slope off level, so straight up is a slope of 90 and the bearing stops mattering. Lengths on the drawing are centre-to-centre; each cut deducts the takeoff at both ends plus the weld gap." />

      <SaveSheet
        t={t}
        visible={saveOpen}
        name={loaded?.name ?? ''}
        place={loaded?.place ?? ''}
        hint={
          loaded
            ? dirty
              ? `Saving as ${loaded.name} replaces it with what is on screen. A new name keeps both.`
              : 'The same name just updates the note. A new name renames it.'
            : 'Whatever you would call it out by — a spool mark, a line number.'
        }
        onCancel={() => setSaveOpen(false)}
        onSave={commitSave}
      />

      <PipeSheet
        visible={pipe.sheetOpen}
        onClose={pipe.closeSheet}
        nps={pipe.nps}
        kind={pipe.kind}
        schedule={pipe.schedule}
        onChange={pipe.change}
      />
    </Screen>
  );
}

/**
 * Naming a spool to keep it.
 *
 * One sheet covers saving, renaming and saving a copy: it opens holding what
 * the loaded spool is called, and what is typed is what gets kept. When there
 * are unsaved changes it says plainly that saving under the loaded name
 * replaces it, because "Update" quietly meaning "overwrite" is how somebody
 * loses the version they wanted.
 */
function SaveSheet({
  t,
  visible,
  name: initialName,
  place: initialPlace,
  hint,
  onCancel,
  onSave,
}: {
  t: Theme;
  visible: boolean;
  name: string;
  place: string;
  /** What saving will do, said before it is done. */
  hint: string;
  onCancel: () => void;
  onSave: (name: string, place: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [place, setPlace] = useState(initialPlace);

  // The fields hold what the record holds every time the sheet opens, so a
  // cancelled edit never leaks into the next one.
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPlace(initialPlace);
    }
  }, [visible, initialName, initialPlace]);

  const field = {
    height: t.layout.fieldHeight,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.bgRaised,
    color: t.colors.text,
    paddingHorizontal: t.space.lg,
    fontSize: 17,
    fontWeight: '600' as const,
  };

  const can = name.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            margin: t.space.xxl,
            padding: t.space.xxl,
            borderRadius: t.radius.xl,
            backgroundColor: t.colors.bg,
            gap: t.space.md,
          }}
        >
          <Text style={[t.type.sectionTitle, { color: t.colors.text, fontFamily: t.font.serif }]}>
            {initialName ? 'Keep this spool' : 'Name this spool'}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{hint}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="SP-104 riser"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Spool name"
            autoCapitalize="characters"
            autoCorrect={false}
            style={field}
          />
          <TextInput
            value={place}
            onChangeText={setPlace}
            placeholder="Where it goes, or anything worth remembering"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Spool place"
            style={field}
          />
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
            <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
            <AccentButton
              label={initialName && name.trim() === initialName ? 'Update' : 'Save'}
              icon="save-outline"
              onPress={() => {
                if (!can) return;
                onSave(name.trim(), place);
              }}
              style={{ flex: 1, opacity: can ? 1 : 0.4 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
