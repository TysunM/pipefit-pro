import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
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
import { JointKind, LIBRARY_FAMILY, LIBRARY_FITTINGS, TAKEOFF_FAMILIES, isLibraryFitting, optionsForFamily } from '../calc/takeoffCatalog';
import { MaterialId, material, pipeSpec, sizeLabel, sizesFor, wallLabel } from '../calc/materials';
import { FittingSheetReader } from '../components/FittingSheetReader';
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

/**
 * Setting a socket or no-hub fitting's takeout, once, for the line and size on
 * screen. A socket fitting can be measured: centre to the face, less the
 * socket depth. Saved on the phone and used every time after.
 */
function SetTakeout({
  fitting,
  nps,
  lineName,
  line,
  wall,
  sizes,
  value,
  onSave,
  onClear,
}: {
  fitting: string;
  nps: number;
  lineName: string;
  line: string;
  wall: string;
  sizes: readonly number[];
  value: number | undefined;
  onSave: (inches: number) => void;
  onClear: () => void;
}) {
  const t = useTheme();
  const u = useUnits();
  const f = LIBRARY_FITTINGS.find((x) => x.id === fitting)!;
  const [editing, setEditing] = useState(false);
  const [reading, setReading] = useState(false);
  const navigation = useNavigation();
  const [takeout, setTake] = useState('');
  const [face, setFace] = useState('');
  const [depth, setDepth] = useState('');
  const socket = f.family === 'socket' && f.id !== 'sockStreet90';
  const fromFace = u.parse(face) - u.parse(depth);
  const typed = u.parse(takeout);
  const next = Number.isFinite(typed) ? typed : Number.isFinite(fromFace) && fromFace > 0 ? fromFace : NaN;
  const title = `${sizeLabel(nps)} ${lineName} ${f.label}`;
  // 1 1/8" in inches; the decimal with its unit otherwise.
  const len = (v: number) => u.frac(v) || u.full(v);

  // Ahead of both views, so it stays put when saving from it folds the panel away.
  const reader = (
    <FittingSheetReader
      visible={reading}
      onClose={() => {
        setReading(false);
        setEditing(false);
      }}
      family={f.family}
      line={line}
      lineName={lineName}
      wall={wall}
      sizes={sizes}
    />
  );

  if (value !== undefined && !editing) {
    return (
      <>
        {reader}
        <View style={{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.md, flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>
            {`${title}: takeout ${len(value)}, from your fitting library.`}
          </Text>
          <Pressable onPress={() => setEditing(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Change the ${title} takeout`}>
            <Text style={[t.type.captionStrong, { color: t.colors.data }]}>Change</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      {reader}
      <View
        style={{
          marginHorizontal: t.layout.screenPadding,
          marginBottom: t.space.lg,
          padding: t.space.md,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.warnText,
          gap: t.space.sm,
        }}
      >
        <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`Set the ${title} takeout`}</Text>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
          {`Makers differ, so this is set once for this size and kept: ${f.how}. From the maker’s sheet or the box, or measured off the fitting.`}
        </Text>
        <GhostButton label="Photograph the maker’s sheet" icon="camera-outline" onPress={() => setReading(true)} />
        <Pressable onPress={() => navigation.navigate('FittingLibrary', { line })} accessibilityRole="link" hitSlop={8}>
        <Text style={[t.type.captionStrong, { color: t.colors.data }]}>{`Every saved ${lineName} takeout, and a table at a time →`}</Text>
      </Pressable>
      <Text style={[t.type.caption, { color: t.colors.textMuted }]}>Or type it:</Text>
        <FieldRow>
          <DimensionInput label="Takeout" value={takeout} onChangeText={setTake} suffix={u.suffix} placeholder="0" readout={u.frac(typed)} />
        </FieldRow>
        {socket ? (
          <>
            <Text style={[t.type.caption, { color: t.colors.textMuted }]}>Or measure it: centre to the face of the socket, and how deep the socket is.</Text>
            <FieldRow>
              <DimensionInput label="Centre to face" value={face} onChangeText={setFace} suffix={u.suffix} placeholder="0" />
              <DimensionInput
                label="Socket depth"
                value={depth}
                onChangeText={setDepth}
                suffix={u.suffix}
                placeholder="0"
                readout={Number.isFinite(fromFace) && fromFace > 0 ? `Takeout ${len(fromFace)}` : undefined}
              />
            </FieldRow>
          </>
        ) : null}
        <View style={{ flexDirection: 'row', gap: t.space.md }}>
          <View style={{ flex: 1 }}>
            <AccentButton
              label={Number.isFinite(next) ? `Save ${len(next)}` : 'Save'}
              icon="bookmark-outline"
              onPress={() => {
                if (!Number.isFinite(next) || next < 0) return;
                onSave(next);
                setEditing(false);
                setTake('');
                setFace('');
                setDepth('');
              }}
            />
          </View>
          {value !== undefined ? (
            <View style={{ flex: 1 }}>
              <GhostButton
                label="Remove"
                icon="trash-outline"
                onPress={() => {
                  onClear();
                  setEditing(false);
                }}
              />
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}
