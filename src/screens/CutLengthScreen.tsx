import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Coach } from '../components/Coach';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, SpoolBar, StatGrid } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { useUnits } from '../hooks/useUnits';
import { figureText, useSpokenFigures } from '../voice/figures';
import { usePipeConfig } from '../hooks/usePipeConfig';
import { useSettings } from '../state/settings';
import { StockNote } from '../components/StockNote';
import { END_FITTINGS, EndFitting, FITTING_SOURCE, endHasGap, solveCutLength } from '../calc/cutLength';
import { JointKind, LIBRARY_FAMILY, familyAfterMaterial, TAKEOFF_FAMILIES, isLibraryFitting, optionsForFamily } from '../calc/takeoffCatalog';
import { MaterialId, material, pipeSpec, sizesFor, wallLabel } from '../calc/materials';
import { useCuts } from '../state/cuts';
import { addCut, nextMark, pipeLine } from '../state/cutLog';
import { sameProject } from '../state/project';
import { useCutAdder } from '../voice/useCutAdder';
import * as Haptics from 'expo-haptics';
import { SetTakeout } from '../components/SetTakeout';
import { useFittings } from '../state/fittings';
import { clearTakeout, lookup, setTakeout } from '../state/fittingLibrary';
import { useTheme } from '../theme/ThemeProvider';
import { AccentButton } from '../components/Buttons';

/** How a material is joined, as Cut Length first offers it. */
const FAMILY_FOR: Partial<Record<MaterialId, JointKind>> = LIBRARY_FAMILY;
const firstOf = (family: JointKind): string =>
  optionsForFamily(family).find((o) => o.id !== 'none' && o.id !== 'custom')?.id ?? 'custom';
import { FlangeClass, flangedClasses } from '../calc/flangedFitting';

export function CutLengthScreen() {
  const t = useTheme();
  const navigation = useNavigation();
  const u = useUnits();
  const pipe = usePipeConfig();
  const { settings } = useSettings();

  const [c2c, setC2c] = useState('');
  const [gap, setGap] = useState('');
  // A PVC job opens on socket fittings, a no-hub job on no-hub, the rest on butt weld.
  const startFamily = FAMILY_FOR[settings.material] ?? 'welded';
  const [family, setFamily] = useState<JointKind>(startFamily);
  const [flangeClass, setFlangeClass] = useState<FlangeClass>('150');
  const [endA, setEndA] = useState<EndFitting>(startFamily === 'welded' ? 'weld90' : firstOf(startFamily));
  const [endB, setEndB] = useState<EndFitting>(startFamily === 'welded' ? 'weld90' : firstOf(startFamily));
  // The job's material changed with this open ("4 inch cast iron"): move to its joints.
  const lastMaterial = useRef(settings.material);
  useEffect(() => {
    const moveTo = familyAfterMaterial(lastMaterial.current, settings.material);
    lastMaterial.current = settings.material;
    if (!moveTo) return;
    setFamily(moveTo);
    setEndA(moveTo === 'welded' ? 'weld90' : firstOf(moveTo));
    setEndB(moveTo === 'welded' ? 'weld90' : firstOf(moveTo));
  }, [settings.material]);
  // Socket and no-hub makeups are the maker's: set once per line and size, kept on the phone.
  const fittings = useFittings();
  const line = `${settings.material}:${settings.wall}`;
  const lineName = `${material(settings.material).short} ${wallLabel(settings.wall)}`;
  const library = useMemo(() => (id: string, nps: number) => lookup(fittings.library, line, id, nps), [fittings.library, line]);
  const [customA, setCustomA] = useState('');
  const [customB, setCustomB] = useState('');
  // Spoken: "cut length, 4 foot 2".
  useSpokenFigures('CutLength', (f) => {
    if (f.c2c) setC2c(figureText(f.c2c, u.num));
    if (f.gap) setGap(figureText(f.gap, u.num));
  });

  // A no-hub joint's "gap" is the coupling's centre stop, not a root gap: nothing unless it is entered.
  const gapInches = Number.isFinite(u.parse(gap)) ? u.parse(gap) : family === 'nohub' ? 0 : settings.defaultGap;

  const result = useMemo(
    () =>
      solveCutLength({
        centerToCenter: u.parse(c2c),
        endA,
        endB,
        customA: u.parse(customA),
        customB: u.parse(customB),
        gap: gapInches,
        nps: pipe.nps,
        kind: pipe.kind,
        schedule: pipe.schedule,
        flangeClass,
        library,
      }),
    [c2c, endA, endB, customA, customB, gapInches, flangeClass, pipe.nps, pipe.kind, pipe.schedule, u, library]
  );

  const pristine = !c2c.trim();

  // The cut list: what is on screen, added with a mark to write on the pipe.
  const cuts = useCuts();
  const [mark, setMark] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const project = settings.projectId;
  const upNext = nextMark(cuts.log, project);
  const listedAs = pipeLine(settings, pipe.nps, pipe.schedule);
  const endName = (id: string) => END_FITTINGS.find((f) => f.id === id)?.label ?? id;
  const addThis = (): { said: string; ok: boolean } => {
    if (pristine || !result.valid) return { said: 'Nothing to add yet: work a cut first.', ok: false };
    const m = mark.trim() || upNext;
    cuts.apply((l) =>
      addCut(
        l,
        { ...listedAs, c2c: u.parse(c2c), cut: result.pipeCut, ends: `${endName(endA)} × ${endName(endB)}`, mark: m },
        Date.now(),
        project,
      ),
    );
    setMark('');
    const said = `Added mark ${m}: ${u.frac(result.pipeCut) || u.full(result.pipeCut)} to the cut list.`;
    setAdded(said);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return { said, ok: true };
  };
  // "Add it": the voice takes the same button.
  useCutAdder(addThis);
  useEffect(() => setAdded(null), [c2c, endA, endB, pipe.nps]);
  const open = cuts.log.cuts.filter((c) => !c.done && sameProject(c.project, project)).length;
  // Weight in the job's material where it comes in this size; steel otherwise.
  const jobSpec = pipeSpec(settings.material, pipe.nps, settings.wall);

  // The fittings offered follow how the run is being joined. Switching the
  // family moves both ends onto something that family actually makes.
  const options = useMemo(
    () => optionsForFamily(family).map((f) => ({ value: f.id, label: f.label })),
    [family]
  );
  const familyOptions = TAKEOFF_FAMILIES.map((f) => ({ value: f.id, label: f.label }));
  const classOptions = flangedClasses().map((c) => ({ value: c, label: `${c} lb` }));
  const gapApplies = endHasGap(endA) || endHasGap(endB);
  const gapNote = TAKEOFF_FAMILIES.find((f) => f.id === family)?.gapLabel ?? '';

  const pickFamily = (next: JointKind) => {
    setFamily(next);
    const first = optionsForFamily(next).find((o) => o.id !== 'none' && o.id !== 'custom');
    if (first) {
      setEndA((prev) => (optionsForFamily(next).some((o) => o.id === prev) ? prev : first.id));
      setEndB((prev) => (optionsForFamily(next).some((o) => o.id === prev) ? prev : first.id));
    }
  };

  return (
    <Screen>
      <Coach screen="CutLength" done={[c2c.trim() !== '', !pristine && result.valid, !pristine && result.valid, added !== null]} />
      <HintRow text="Turn a centre-to-centre dimension into a pipe cut. Pick how it is joined and what is on each end; the takeouts come straight out of the handbook tables." />
      <SectionHeader title="Dimensions" meta="Centre-to-centre" />

      <FieldRow>
        <DimensionInput
          label="C2C length"
          value={c2c}
          onChangeText={setC2c}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(c2c))}
        />
        <DimensionInput
          label="Gap/joint"
          value={gap}
          onChangeText={setGap}
          suffix={u.suffix}
          placeholder={gapApplies ? (family === 'nohub' ? '0' : u.num(settings.defaultGap)) : '—'}
          editable={gapApplies}
        />
      </FieldRow>

      <ChipRow label="Joint" options={familyOptions} selected={family} onSelect={pickFamily} />
      {family === 'flanged' ? (
        <ChipRow label="Class" options={classOptions} selected={flangeClass} onSelect={setFlangeClass} />
      ) : null}

      <ChipRow label="End A" options={options} selected={endA} onSelect={setEndA} />
      {endA === 'custom' ? (
        <FieldRow>
          <DimensionInput label="End A takeout" value={customA} onChangeText={setCustomA} suffix={u.suffix} placeholder="0" />
        </FieldRow>
      ) : null}

      <ChipRow label="End B" options={options} selected={endB} onSelect={setEndB} />
      {endB === 'custom' ? (
        <FieldRow>
          <DimensionInput label="End B takeout" value={customB} onChangeText={setCustomB} suffix={u.suffix} placeholder="0" />
        </FieldRow>
      ) : null}

      {[...new Set([endA, endB])].filter(isLibraryFitting).map((id) => (
        <SetTakeout
          key={id}
          fitting={id}
          nps={pipe.nps}
          lineName={lineName}
          line={line}
          wall={settings.wall}
          sizes={sizesFor(material(settings.material))}
          value={library(id, pipe.nps)}
          onSave={(v) => fittings.apply((l) => setTakeout(l, line, id, pipe.nps, v, Date.now()))}
          onClear={() => fittings.apply((l) => clearTakeout(l, line, id, pipe.nps))}
        />
      ))}

      <ControlRow>
        <SelectorButton primary={pipe.label} badge={pipe.kind} onPress={pipe.openSheet} style={{ flex: 1 }} />
        <GhostButton
          label="Clear all"
          icon="refresh-outline"
          onPress={() => {
            setC2c('');
            setGap('');
            setCustomA('');
            setCustomB('');
            setFamily(startFamily);
            setEndA(startFamily === 'welded' ? 'weld90' : firstOf(startFamily));
            setEndB(startFamily === 'welded' ? 'weld90' : firstOf(startFamily));
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <ResultBanner
        speak={!pristine && result.valid ? { inches: result.pipeCut } : undefined}
        label="Pipe cut"
        value={pristine ? '—' : result.error ? result.error : `${u.num(result.pipeCut)} ${u.unitName}`}
        hint={
          pristine
            ? `Enter a centre-to-centre dimension · Deduction ${u.num(result.totalDeduction)} ${u.unitName}`
            : result.valid
              ? `Mark & cut this length · Total deduction ${u.num(result.totalDeduction)} ${u.unitName}`
              : undefined
        }
        tone={pristine ? 'idle' : result.error ? 'error' : 'default'}
      />

      <MetaBar text={`${pipe.label} ${pipe.kind} · SCH ${pipe.schedule} · Stock ${u.num(settings.stockLength)} ${u.unitName}`} />
      {result.valid ? (
        <StockNote
          cut={result.pipeCut}
          stock={settings.stockLength}
          kerf={settings.cutAllowance}
          length={(v) => `${u.num(v)} ${u.unitName}`}
        />
      ) : null}

      {result.valid && !pristine ? (
        <View style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.md, gap: t.space.sm }}>
          <View style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'flex-end' }}>
            <View style={{ width: 120 }}>
              <DimensionInput label="Mark" value={mark} onChangeText={setMark} placeholder={upNext} keyboardType="default" />
            </View>
            <View style={{ flex: 1 }}>
              <AccentButton label={`Add to cut list · ${mark.trim() || upNext}`} icon="add-circle-outline" onPress={() => void addThis()} />
            </View>
          </View>
          {added ? <Text style={[t.type.captionStrong, { color: t.colors.accent }]}>{added}</Text> : null}
        </View>
      ) : null}
      {cuts.log.cuts.length ? (
        <Pressable onPress={() => navigation.navigate('CutList')} accessibilityRole="link" hitSlop={8} style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.sm }}>
          <Text style={[t.type.captionStrong, { color: t.colors.data }]}>{`Cut list: ${open} to cut →`}</Text>
        </Pressable>
      ) : null}

      <StatGrid
        stats={[
          { label: 'End A takeout', note: END_FITTINGS.find((f) => f.id === endA)?.label, value: u.dual(result.takeoffA) },
          { label: 'End B takeout', note: END_FITTINGS.find((f) => f.id === endB)?.label, value: u.dual(result.takeoffB) },
          { label: 'Joint gaps', note: gapApplies ? `${result.gapEnds} end${result.gapEnds === 1 ? '' : 's'}` : 'none', value: gapApplies ? u.num(gapInches) : '—' },
          { label: 'Total deduction', value: u.dual(result.totalDeduction) },
        ]}
      />

      <SpoolBar
        badge={`SCH ${pipe.schedule}`}
        text={
          result.valid
            ? `Pipe weight ${u.weight(jobSpec ? (result.pipeCut / 12) * jobSpec.lbPerFt : result.weight, 2)} for this cut`
            : 'Pipe weight unavailable'
        }
      />

      <FooterNote
        text={`End A — ${FITTING_SOURCE[endA]}.  End B — ${FITTING_SOURCE[endB]}.  ${gapNote}.  Every takeout is shown above; check it against the fitting in your hand before you cut.`}
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
