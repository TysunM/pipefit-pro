// The materials, as handbook tables
// --------------------------------
// The same figures the job's specs are worked from (materials.ts), laid out
// to be read and searched, and read by Claude when it is asked.

import { MATERIALS, material, pipeSpec, sizeLabel, sizesFor, JOINING_LABEL } from './materials';
import { PIPE_SIZES } from './pipe';
import type { ReferenceTable } from './reference';

const w = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(3));
const wallOf = (id: string, nps: number, wall: string) => w(pipeSpec(id, nps, wall)?.wall);
const lbOf = (id: string, nps: number, wall: string) => {
  const s = pipeSpec(id, nps, wall);
  return s ? s.lbPerFt.toFixed(2) : '—';
};

export const MATERIAL_TABLES: ReferenceTable[] = [
  {
    id: 'pipe-materials',
    title: 'Pipe materials and welding reference',
    group: 'Materials and welding',
    page: 'ASTM / ASME B31.3',
    note:
      'A reference, not a procedure: preheat, PWHT, filler and interpass come from the job WPS. The B31.3 tables these quote have changed between editions; where a figure moved, the table is named instead of a number.',
    columns: [
      { key: 'size', label: 'Material', wide: true },
      { key: 'spec', label: 'Pipe spec', wide: true },
      { key: 'p', label: 'P-No.' },
      { key: 'filler', label: 'Filler (typical)', wide: true },
      { key: 'pre', label: 'Preheat', wide: true },
      { key: 'pwht', label: 'PWHT', wide: true },
      { key: 'join', label: 'Joining', wide: true },
      { key: 'exp', label: 'Growth in/100ft/100°F' },
      { key: 'max', label: 'Max °F' },
    ],
    rows: () =>
      MATERIALS.map((m) => ({
        size: m.name,
        spec: m.spec,
        p: m.weld?.pNo ?? '—',
        filler: m.weld?.filler ?? '—',
        pre: m.weld?.preheat ?? '—',
        pwht: m.weld?.pwht ?? '—',
        join: JOINING_LABEL[m.joining],
        exp: m.expansion.toFixed(2),
        max: m.maxTempF ? String(m.maxTempF) : '—',
      })),
  },
  {
    id: 'stainless-walls',
    title: 'Stainless pipe walls (5S, 10S, 40S, 80S)',
    group: 'Materials and welding',
    page: 'ASME B36.19M',
    note: 'Same ODs as carbon steel. 40S matches Sch 40 only to 10", 80S matches Sch 80 only to 8": from 12" up they are thinner. Weight is 304/316.',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'od', label: 'OD' },
      { key: 's5', label: '5S' },
      { key: 's10', label: '10S' },
      { key: 's40', label: '40S' },
      { key: 's80', label: '80S' },
      { key: 'lb40', label: 'lb/ft 40S' },
    ],
    rows: () =>
      PIPE_SIZES.map((p) => ({
        size: p.label,
        od: p.od.toFixed(3),
        s5: wallOf('ss316l', p.nps, '5S'),
        s10: wallOf('ss316l', p.nps, '10S'),
        s40: wallOf('ss316l', p.nps, '40S'),
        s80: wallOf('ss316l', p.nps, '80S'),
        lb40: lbOf('ss316l', p.nps, '40S'),
      })),
  },
  {
    id: 'steel-heavy-walls',
    title: 'Steel pipe walls: STD, XS, 160, XXS',
    group: 'Materials and welding',
    page: 'ASME B36.10M',
    note: 'STD is Sch 40 to 10" and 3/8" above; XS is Sch 80 to 8" and 1/2" above. From 8" up XXS is lighter than Sch 160.',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'od', label: 'OD' },
      { key: 'std', label: 'STD' },
      { key: 'xs', label: 'XS' },
      { key: 's160', label: '160' },
      { key: 'xxs', label: 'XXS' },
      { key: 'lb160', label: 'lb/ft 160' },
    ],
    rows: () =>
      PIPE_SIZES.map((p) => ({
        size: p.label,
        od: p.od.toFixed(3),
        std: wallOf('cs', p.nps, 'STD'),
        xs: wallOf('cs', p.nps, 'XS'),
        s160: wallOf('cs', p.nps, '160'),
        xxs: wallOf('cs', p.nps, 'XXS'),
        lb160: lbOf('cs', p.nps, '160'),
      })),
  },
  {
    id: 'cast-iron-soil',
    title: 'Cast iron soil pipe, no-hub',
    group: 'Materials and welding',
    page: 'CISPI 301 / ASTM A888',
    note: 'Not the steel OD. Cut with a snap cutter, joined with no-hub couplings (CISPI 310).',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'od', label: 'OD' },
      { key: 'wall', label: 'Wall' },
      { key: 'id', label: 'Bore' },
      { key: 'lb', label: 'lb/ft' },
    ],
    rows: () =>
      sizesFor(material('ci-soil')).map((n) => {
        const s = pipeSpec('ci-soil', n, 'CISPI')!;
        return { size: sizeLabel(n), od: s.od.toFixed(2), wall: s.wall.toFixed(2), id: s.id.toFixed(2), lb: s.lbPerFt.toFixed(2) };
      }),
  },
  {
    id: 'ductile-iron',
    title: 'Ductile iron pipe',
    group: 'Materials and welding',
    page: 'AWWA C151',
    note: 'Not the steel OD. Pressure class shown is the lightest made: 350 to 12", 250 from 14". Class 52 is the old special thickness class. Push-on or mechanical joint (AWWA C111).',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'od', label: 'OD' },
      { key: 'pc', label: 'Wall, pressure class' },
      { key: 'tc', label: 'Wall, class 52' },
      { key: 'lb', label: 'lb/ft class 52' },
    ],
    rows: () =>
      sizesFor(material('ductile')).map((n) => ({
        size: sizeLabel(n),
        od: pipeSpec('ductile', n, 'PC')!.od.toFixed(2),
        pc: wallOf('ductile', n, 'PC'),
        tc: wallOf('ductile', n, 'TC52'),
        lb: lbOf('ductile', n, 'TC52'),
      })),
  },
  {
    id: 'hdpe-dr',
    title: 'HDPE pipe walls by DR (IPS)',
    group: 'Materials and welding',
    page: 'ASTM F714 / D3035',
    note: 'Wall is the OD divided by the DR: the lower the DR, the thicker the wall and the higher the rating. Butt fused (ASTM F2620).',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'od', label: 'OD' },
      { key: 'd7', label: 'DR 7' },
      { key: 'd9', label: 'DR 9' },
      { key: 'd11', label: 'DR 11' },
      { key: 'd17', label: 'DR 17' },
    ],
    rows: () =>
      PIPE_SIZES.map((p) => ({
        size: p.label,
        od: p.od.toFixed(3),
        d7: wallOf('hdpe', p.nps, 'DR7'),
        d9: wallOf('hdpe', p.nps, 'DR9'),
        d11: wallOf('hdpe', p.nps, 'DR11'),
        d17: wallOf('hdpe', p.nps, 'DR17'),
      })),
  },
];
