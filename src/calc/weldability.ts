// Weldability
// -----------
// The carbon equivalents a mill cert's chemistry is read by, to judge how
// hard a steel's heat-affected zone gets and so how much preheat and hydrogen
// control the WPS has to call for, and the pitting number a stainless or
// duplex is bought on. All in weight percent, the way the cert gives them.
//
//   CE (IIW)  C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
//   CET       C + (Mn+Mo)/10 + (Cr+Cu)/20 + Ni/40          (EN 1011-2 preheat, method B)
//   CE (AWS)  C + (Mn+Si)/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15     (AWS D1.1 preheat guide, by zone)
//   Pcm       C + Si/30 + (Mn+Cu+Cr)/20 + Ni/60 + Mo/15 + V/10 + 5B   (Ito-Bessyo)
//   PREN      Cr + 3.3 Mo + 16 N
//
// IIW CE suits steels above about 0.12% carbon; Pcm the low-carbon and
// micro-alloyed ones below it. These are indications: the preheat is the
// WPS's and the code's to set, not this screen's.

export type Element = 'C' | 'Mn' | 'Si' | 'Cr' | 'Ni' | 'Mo' | 'Cu' | 'V' | 'N' | 'B';
export type Chemistry = Partial<Record<Element, number | null>>;

/** In the order the inputs stand: the carbon equivalents' elements first, then the alloys and the traces. */
export const ELEMENTS: readonly { el: Element; name: string }[] = [
  { el: 'C', name: 'Carbon' },
  { el: 'Mn', name: 'Manganese' },
  { el: 'Si', name: 'Silicon' },
  { el: 'Cr', name: 'Chromium' },
  { el: 'Ni', name: 'Nickel' },
  { el: 'Mo', name: 'Molybdenum' },
  { el: 'Cu', name: 'Copper' },
  { el: 'V', name: 'Vanadium' },
  { el: 'N', name: 'Nitrogen' },
  { el: 'B', name: 'Boron' },
];

export type Equivalents = { ceIIW: number; cet: number; ceAWS: number; pcm: number; pren: number };

const v = (c: Chemistry, e: Element): number => {
  const x = c[e];
  return typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : 0;
};

/** A percentage that cannot be: below nought or over a hundred. */
export const outOfRange = (x: number | null | undefined): boolean => typeof x === 'number' && (x < 0 || x > 100);

export function equivalents(c: Chemistry): Equivalents {
  const [C, Mn, Si, Cr, Ni, Mo, Cu, V, N, B] = (['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'Cu', 'V', 'N', 'B'] as const).map((e) => v(c, e)) as [number, number, number, number, number, number, number, number, number, number];
  return {
    ceIIW: C + Mn / 6 + (Cr + Mo + V) / 5 + (Ni + Cu) / 15,
    cet: C + (Mn + Mo) / 10 + (Cr + Cu) / 20 + Ni / 40,
    ceAWS: C + (Mn + Si) / 6 + (Cr + Mo + V) / 5 + (Ni + Cu) / 15,
    pcm: C + Si / 30 + (Mn + Cu + Cr) / 20 + Ni / 60 + Mo / 15 + V / 10 + 5 * B,
    pren: Cr + 3.3 * Mo + 16 * N,
  };
}

/** Anything typed at all. */
export const hasChemistry = (c: Chemistry): boolean => (Object.values(c) as (number | null | undefined)[]).some((x) => typeof x === 'number' && x > 0);

/** How the IIW figure is commonly read: excellent to 0.35, poor past 0.50. An indication, never the preheat. */
export function ceReading(ce: number): string {
  if (ce <= 0.35) return 'Excellent weldability';
  if (ce <= 0.4) return 'Very good weldability';
  if (ce <= 0.45) return 'Good weldability: preheat may be needed on thick sections';
  if (ce <= 0.5) return 'Fair weldability: preheat and low-hydrogen practice likely';
  return 'Poor weldability: preheat, low hydrogen and controlled interpass needed';
}
