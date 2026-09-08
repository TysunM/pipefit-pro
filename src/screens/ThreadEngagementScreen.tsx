import React, { useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton } from '../components/Buttons';
import { FooterNote, MetaBar, ResultBanner, StatGrid, WarningBanner } from '../components/Results';
import { useUnits } from '../hooks/useUnits';
import { NPT_TABLE, findThread, solveThread } from '../calc/thread';
import { parseNumber } from '../calc/format';

export function ThreadEngagementScreen() {
  const u = useUnits();
  const [nps, setNps] = useState(2);
  const [turns, setTurns] = useState('');
  const [c2c, setC2c] = useState('');
  const [faceOverride, setFaceOverride] = useState('');

  const size = findThread(nps);

  const result = useMemo(
    () =>
      solveThread({
        nps,
        turnsPastHandTight: parseNumber(turns),
        centerToCenter: u.parse(c2c),
        centerToFace: u.parse(faceOverride),
      }),
    [nps, turns, c2c, faceOverride, u]
  );

  const pristine = !c2c.trim();
  const hasCut = Number.isFinite(result.pipeCut);

  return (
    <Screen>
      <HintRow text="Work out how far a threaded joint pulls up. Pick the size, set your wrench turns; get engagement, the deduction per end and the pipe length to cut." />
      <SectionHeader title="Thread" meta="NPT — ASME B1.20.1" />

      <ChipRow label="Size" options={NPT_TABLE.map((s) => ({ value: s.nps, label: s.label }))} selected={nps} onSelect={setNps} />

      <FieldRow>
        <DimensionInput
          label="Wrench turns"
          value={turns}
          onChangeText={setTurns}
          placeholder={String(size.wrenchTurns)}
          suffix="turns"
        />
        <DimensionInput
          label="Fitting C-to-face"
          value={faceOverride}
          onChangeText={setFaceOverride}
          suffix={u.suffix}
          placeholder={u.num(size.elbowCenterToFace)}
        />
      </FieldRow>

      <FieldRow>
        <DimensionInput
          label="C2C length"
          value={c2c}
          onChangeText={setC2c}
          suffix={u.suffix}
          placeholder="0"
          readout={u.frac(u.parse(c2c))}
        />
      </FieldRow>

      <ControlRow>
        <GhostButton
          label="Clear all"
          icon="refresh-outline"
          onPress={() => {
            setTurns('');
            setC2c('');
            setFaceOverride('');
            setNps(2);
          }}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <ResultBanner
        label="Pipe cut"
        value={pristine ? '—' : result.cutError ? result.cutError : hasCut ? `${u.num(result.pipeCut)} ${u.unitName}` : '—'}
        hint={
          pristine
            ? `Enter a centre-to-centre dimension · Deduction ${u.num(result.deductionPerEnd)} ${u.unitName} per end`
            : hasCut
              ? `Mark & cut this length · Deduction ${u.num(result.deductionPerEnd)} ${u.unitName} per end`
              : undefined
        }
        tone={pristine ? 'idle' : result.cutError ? 'error' : 'default'}
      />

      <MetaBar text={`${size.label} NPT · ${size.tpi} TPI · Tap drill ${size.tapDrill}`} />

      {result.overThreaded ? <WarningBanner text={result.error ?? ''} tone="danger" /> : null}

      <StatGrid
        stats={[
          { label: 'Hand tight', note: 'L1 engagement', value: u.dual(size.handTight) },
          { label: 'Wrench makeup', note: `${turns || size.wrenchTurns} turns`, value: u.dual(result.wrenchMakeup) },
          { label: 'Total engagement', note: 'Hand tight + wrench', value: u.dual(result.totalEngagement) },
          { label: 'Thread remaining', value: u.dual(result.remainingThread) },
          { label: 'Fitting C-to-face', note: 'ASME B16.3 90° elbow', value: u.dual(result.centerToFace) },
          { label: 'Deduction per end', note: 'Face minus engagement', value: u.dual(result.deductionPerEnd) },
          { label: 'Pitch', note: 'Advance per turn', value: u.num(result.pitch, 4) },
          { label: 'Effective thread', note: 'L2 length', value: u.dual(size.effective) },
        ]}
      />

      <FooterNote text="Cut = C2C − 2 × (fitting centre-to-face − thread engagement). Thread values follow ASME B1.20.1; the default fitting dimension is a Class 150 malleable iron 90° elbow per ASME B16.3. Override it for any other fitting." />
    </Screen>
  );
}
