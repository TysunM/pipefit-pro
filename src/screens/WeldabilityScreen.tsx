// Weldability
// -----------
// A mill cert's chemistry in, the carbon equivalents out: CE (IIW), CET,
// CE (AWS), Pcm and PREN, with the common reading of the IIW figure. What
// they say is how hard the heat-affected zone will want to get, so how much
// preheat and hydrogen control to look for in the WPS. calc/weldability.ts
// does the sums and says where each formula comes from.

import React, { useState } from 'react';
import { Share } from 'react-native';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { ControlRow, GhostButton } from '../components/Buttons';
import { FieldRow } from '../components/DimensionInput';
import { NumField } from '../components/FormFields';
import { FooterNote, ResultBanner, StatGrid, WarningBanner } from '../components/Results';
import { ELEMENTS, ceReading, equivalents, hasChemistry, outOfRange, type Chemistry, type Element } from '../calc/weldability';

const f2 = (v: number) => v.toFixed(2);
const f3 = (v: number) => v.toFixed(3);

export function WeldabilityScreen() {
  const [chem, setChem] = useState<Chemistry>({});
  const [key, setKey] = useState(0);
  const any = hasChemistry(chem);
  const eq = equivalents(chem);
  const bad = ELEMENTS.filter(({ el }) => outOfRange(chem[el]));
  const carbon = chem.C ?? 0;

  const set = (el: Element) => (v: number | null) => setChem((c) => ({ ...c, [el]: v }));

  const share = () => {
    const comp = ELEMENTS.filter(({ el }) => (chem[el] ?? 0) > 0)
      .map(({ el }) => `${el} ${chem[el]}`)
      .join(', ');
    Share.share({
      message: [`Chemistry (wt%): ${comp}`, `CE (IIW) ${f2(eq.ceIIW)}: ${ceReading(eq.ceIIW)}`, `CET ${f2(eq.cet)}`, `CE (AWS) ${f2(eq.ceAWS)}`, `Pcm ${f3(eq.pcm)}`, `PREN ${eq.pren.toFixed(1)}`].join('\n'),
    }).catch(() => {});
  };

  return (
    <Screen>
      <ResultBanner
        label="Carbon equivalent (IIW)"
        value={any ? f2(eq.ceIIW) : '—'}
        hint={any ? ceReading(eq.ceIIW) : 'Type the chemistry off the mill cert, in weight percent'}
        meta={
          any && carbon > 0
            ? carbon > 0.12
              ? 'Above 0.12% carbon the IIW figure is the one to go by.'
              : 'At 0.12% carbon or less, Pcm is the better guide.'
            : undefined
        }
        tone={any ? 'default' : 'idle'}
      />
      {any ? (
        <ControlRow>
          <GhostButton label="Share" icon="share-outline" onPress={share} style={{ flex: 1 }} />
          <GhostButton
            label="Clear"
            icon="refresh-outline"
            onPress={() => {
              setChem({});
              setKey((k) => k + 1);
            }}
            style={{ flex: 1 }}
          />
        </ControlRow>
      ) : null}
      {any ? (
        <StatGrid
          stats={[
            { label: 'CET', note: 'EN 1011-2 preheat', value: f2(eq.cet) },
            { label: 'CE (AWS)', note: 'AWS D1.1 preheat guide', value: f2(eq.ceAWS) },
            { label: 'Pcm', note: 'Low carbon steels', value: f3(eq.pcm) },
            { label: 'PREN', note: '316L ≈ 24, 2205 ≈ 35', value: eq.pren.toFixed(1) },
          ]}
        />
      ) : null}
      {bad.length ? <WarningBanner text={`${bad.map((x) => x.name).join(', ')}: a percentage is between 0 and 100. Check the figure against the cert.`} /> : null}

      <SectionHeader title="Chemistry" meta="wt %" />
      {[0, 2, 4, 6, 8].map((i) => (
        <FieldRow key={`${key}-${i}`}>
          {ELEMENTS.slice(i, i + 2).map(({ el, name }) => (
            <NumField key={el} label={`${name} (${el})`} value={chem[el] ?? null} onChange={set(el)} suffix="%" placeholder="0" />
          ))}
        </FieldRow>
      ))}

      <FooterNote
        text={
          'CE (IIW) = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15. CET = C + (Mn+Mo)/10 + (Cr+Cu)/20 + Ni/40. ' +
          'CE (AWS) = C + (Mn+Si)/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15. Pcm = C + Si/30 + (Mn+Cu+Cr)/20 + Ni/60 + Mo/15 + V/10 + 5B. PREN = Cr + 3.3Mo + 16N. ' +
          'The reading of the IIW figure is the common one: excellent to 0.35, poor past 0.50. It is an indication. Preheat, hydrogen control and interpass are set by the WPS and the code.'
        }
      />
    </Screen>
  );
}
