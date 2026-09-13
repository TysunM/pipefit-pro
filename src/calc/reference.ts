import { toFraction } from './format';
import { NPT_TABLE } from './thread';
import { SCREWED_STANDARD, SCREWED_HEAVY, screwedFitting } from './screwedFitting';
import { REDUCING_FITTINGS, REDUCING_FITTINGS_HEAVY } from './reducingFitting';
import { TAKEOUTS, takeout } from './takeout';
import { TAKEOUTS_45, WYE_LENGTHS, takeout45 } from './takeout45';
import { COUPLINGS_HEAVY, MALLEABLE_COUPLING_GAP, malleableCouplingLength } from './coupling';
import { REDUCER_COUPLINGS, REDUCER_COUPLINGS_MALLEABLE } from './reducerCoupling';
import { NIPPLES, closeNippleGap } from './nipple';
import { UNIONS, COMBINED_TEES, unionLength } from './union';
import { STREET_45_TAKEOUT, STREET_90_SIZES, streetTakeout90 } from './streetElbow';
import { WALL_CLEARANCES } from './clearance';
import { FLANGED_150, FLANGED_300, FLANGED_400, FLANGED_600, FLANGED_900, FLANGED_1500, FLANGED_2500, LATERALS_150, LATERALS_300, LATERALS_400, BASES_150, flangedFitting } from './flangedFitting';
import { FLANGES_150, FLANGES_300, FLANGES_400, FLANGES_600, FLANGES_900, FLANGES_1500, FLANGES_2500 } from './flange';
import { BOLT_UP_125, BOLT_UP_250, boltHoleDiameter, boltSpacing } from './boltUp';
import { WELDING_NECKS } from './weldingNeck';
import { GATE_CAST_IRON, GATE_STEEL, GLOBE_CAST_IRON, GLOBE_STEEL_LIGHT, CHECK_STEEL_LIGHT, steelGate } from './valve';
import { WELD_GATE_LIGHT, WELD_GLOBE_LIGHT, WELD_CHECK_LIGHT } from './weldValve';
import { WELD_TEES, WELD_CAPS, REDUCING_WELD_TEES, longRadiusElbow, shortRadiusElbow, elbow45, returnHeight, returnSpacing, weldReducerLargeSizes, weldReducer } from './weldFitting';
import { REDUCER_TEMPLATES } from './reducerTemplate';
import { MIN_BEND_RADIUS, advisableBendRadius } from './bendRadius';
import { SUPPORT_WATER, SUPPORT_GAS_OR_STEAM } from './support';
import { U_BOLTS, U_BOLT_DIAMETERS } from './uBolt';
import { PVC_A, PVC_SCH40, PVC_SCH80, PVC_SCH120, PE_RATED_75, PE_SCH40, PE_RATED_100 } from './plasticPipe';
import { copperSizes, copperTube } from './copperTube';
import { EXPANSION } from './expansion';
import { PIPE_TABLE, pipeDims } from './pipeData';

// The handbook, made reachable. Each entry knows its own columns and builds
// its own rows, so a screen can render any of them without knowing what is in
// it, and a test can walk all of them at once.

export type ReferenceGroup =
  | 'Screwed fittings'
  | 'Flanged fittings'
  | 'Welded fittings'
  | 'Valves'
  | 'Pipe and tube'
  | 'Hanging and bending';

export type ReferenceColumn = { key: string; label: string; wide?: boolean };

export type ReferenceTable = {
  id: string;
  title: string;
  group: ReferenceGroup;
  /** Where it came from in the handbook. */
  page: string;
  /** Anything printed with the table that belongs with the numbers. */
  note?: string;
  columns: ReferenceColumn[];
  rows: () => Record<string, string>[];
};

const f = (v: number | undefined, den: 8 | 16 | 32 = 16): string =>
  v === undefined || !Number.isFinite(v) ? '—' : toFraction(v, den);
const d = (v: number | undefined, places = 3): string =>
  v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(places);
const n = (v: number | undefined): string =>
  v === undefined || !Number.isFinite(v) ? '—' : String(v);

const SIZE: ReferenceColumn = { key: 'size', label: 'Size' };
const PAIR: ReferenceColumn = { key: 'size', label: 'Sizes', wide: true };

const label = (nps: number): string =>
  PIPE_TABLE.find((r) => r.nps === nps)?.label ?? `${nps}"`;

export const REFERENCE_TABLES: ReferenceTable[] = [
  {
    id: 'takeout-90',
    title: 'Screwed elbow takeout, 90°',
    group: 'Screwed fittings',
    page: '4-37',
    note: 'Centre of the fitting to the end of the pipe. Comes off a centre to centre measurement once for each fitting on the run.',
    columns: [SIZE, { key: 'a', label: 'Takeout' }],
    rows: () =>
      [...TAKEOUTS.map((t) => t.nps), 10, 12].map((nps) => ({
        size: label(nps),
        a: f(takeout(nps)),
      })),
  },
  {
    id: 'takeout-45',
    title: 'Screwed elbow takeout, 45°',
    group: 'Screwed fittings',
    page: '4-39',
    columns: [SIZE, { key: 'b', label: 'Takeout' }],
    rows: () =>
      [...TAKEOUTS_45.map((t) => t.nps), 10, 12].map((nps) => ({
        size: label(nps),
        b: f(takeout45(nps)),
      })),
  },
  {
    id: 'screwed-fittings',
    title: 'Screwed fitting dimensions',
    group: 'Screwed fittings',
    page: '4-15, 4-16',
    columns: [
      SIZE,
      { key: 'c90', label: '90° C-E' },
      { key: 'c45', label: '45° C-E' },
      { key: 'band', label: 'Band' },
    ],
    rows: () =>
      SCREWED_STANDARD.map((s) => ({
        size: s.label,
        c90: f(s.centerToEnd),
        c45: f(s.centerToEnd45),
        band: f(s.bandMalleable ?? s.bandCastIron),
      })),
  },
  {
    id: 'screwed-fittings-heavy',
    title: 'Screwed fittings, heavy class',
    group: 'Screwed fittings',
    page: '4-16',
    note: '250 lb cast iron and 300 lb malleable.',
    columns: [SIZE, { key: 'c90', label: '90° C-E' }, { key: 'c45', label: '45° C-E' }, { key: 'band', label: 'Band' }],
    rows: () =>
      SCREWED_HEAVY.map((s) => ({
        size: s.label,
        c90: f(s.centerToEnd),
        c45: f(s.centerToEnd45),
        band: f(s.bandMalleable ?? s.bandCastIron),
      })),
  },
  {
    id: 'reducing-fittings',
    title: 'Reducing elbows, tees and crosses',
    group: 'Screwed fittings',
    page: '4-17 to 4-27',
    note: 'X is the centre to end on the smaller outlet, Z on the larger.',
    columns: [PAIR, { key: 'x', label: 'X' }, { key: 'z', label: 'Z' }, { key: 'made', label: 'Made as', wide: true }],
    rows: () =>
      REDUCING_FITTINGS.map((r) => ({
        size: r.label,
        x: f(r.x),
        z: f(r.z),
        made: r.kinds.join(', '),
      })),
  },
  {
    id: 'reducing-fittings-heavy',
    title: 'Reducing fittings, heavy class',
    group: 'Screwed fittings',
    page: '4-28, 4-30',
    columns: [PAIR, { key: 'x', label: 'X' }, { key: 'z', label: 'Z' }, { key: 'made', label: 'Made as', wide: true }],
    rows: () =>
      REDUCING_FITTINGS_HEAVY.map((r) => ({
        size: r.label,
        x: f(r.x),
        z: f(r.z),
        made: r.kinds.join(', '),
      })),
  },
  {
    id: 'threads',
    title: 'Standard pipe threads',
    group: 'Screwed fittings',
    page: '4-13, 4-14',
    columns: [
      SIZE,
      { key: 'hand', label: 'Hand tight' },
      { key: 'tight', label: 'Wrench tight' },
      { key: 'total', label: 'Total thread' },
      { key: 'drill', label: 'Tap drill' },
    ],
    rows: () =>
      NPT_TABLE.map((t) => ({
        size: t.label,
        hand: d(t.handTight),
        tight: d(t.engagementWhenTight),
        total: d(t.totalThread),
        drill: t.tapDrill,
      })),
  },
  {
    id: 'couplings-heavy',
    title: 'Reducing couplings, 300 lb',
    group: 'Screwed fittings',
    page: '4-29',
    note: 'The length depends only on the larger of the two sizes.',
    columns: [SIZE, { key: 'l', label: 'End to end' }],
    rows: () => COUPLINGS_HEAVY.map((c) => ({ size: c.label, l: f(c.endToEnd) })),
  },
  {
    id: 'couplings-malleable',
    title: 'Malleable couplings',
    group: 'Screwed fittings',
    page: '4-42',
    columns: [SIZE, { key: 'gap', label: 'Gap' }, { key: 'l', label: 'End to end' }],
    rows: () =>
      MALLEABLE_COUPLING_GAP.map((c) => ({
        size: c.label,
        gap: f(c.gap),
        l: f(malleableCouplingLength(c.nps)),
      })),
  },
  {
    id: 'reducer-couplings',
    title: 'Reducer couplings, cast iron',
    group: 'Screwed fittings',
    page: '4-40, 4-41',
    note: 'The gap left between the two pipe ends. A dash is a pattern not made in that combination.',
    columns: [PAIR, { key: 'j', label: 'Pattern J' }, { key: 'k', label: 'Pattern K' }],
    rows: () =>
      REDUCER_COUPLINGS.map((r) => ({
        size: `${label(r.large)} × ${label(r.small)}`,
        j: f(r.j),
        k: f(r.k),
      })),
  },
  {
    id: 'reducer-couplings-malleable',
    title: 'Reducer couplings, malleable',
    group: 'Screwed fittings',
    page: '4-44',
    columns: [PAIR, { key: 'j', label: 'Gap' }, { key: 'flag', label: '' }],
    rows: () =>
      REDUCER_COUPLINGS_MALLEABLE.map((r) => ({
        size: `${label(r.large)} × ${label(r.small)}`,
        j: f(r.j),
        flag: r.suspect ? 'misprint' : '',
      })),
  },
  {
    id: 'nipples',
    title: 'Pipe nipples',
    group: 'Screwed fittings',
    page: '4-31, 4-42',
    columns: [
      SIZE,
      { key: 'close', label: 'Close' },
      { key: 'short', label: 'Short' },
      { key: 'long', label: 'Shortest long' },
      { key: 'gap', label: 'Close gap' },
    ],
    rows: () =>
      NIPPLES.map((x) => ({
        size: x.label,
        close: f(x.close),
        short: f(x.short),
        long: f(x.longestShortestLong),
        gap: f(closeNippleGap(x.nps)),
      })),
  },
  {
    id: 'unions',
    title: 'Unions and union fittings',
    group: 'Screwed fittings',
    page: '4-45',
    columns: [SIZE, { key: 'gap', label: 'Gap' }, { key: 'len', label: 'End to end' }, { key: 'take', label: 'Union takeout' }],
    rows: () =>
      UNIONS.map((u) => ({
        size: u.label,
        gap: f(u.gap),
        len: f(unionLength(u.nps)),
        take: f(u.takeout),
      })),
  },
  {
    id: 'street-elbows',
    title: 'Street elbows',
    group: 'Screwed fittings',
    page: '4-43',
    note: 'The 90° figure is the ordinary elbow takeout. A street 45 is its own casting and is not made past 2 inch.',
    columns: [SIZE, { key: 'a', label: '90° takeout' }, { key: 'c', label: '45° takeout' }],
    rows: () =>
      STREET_90_SIZES.map((nps) => ({
        size: label(nps),
        a: f(streetTakeout90(nps)),
        c: f(STREET_45_TAKEOUT.find((s) => s.nps === nps)?.takeout),
      })),
  },
  {
    id: 'combined-tees',
    title: 'Tee with a street elbow in it',
    group: 'Screwed fittings',
    page: '4-46',
    note: 'Centre of the tee to the centre of the street elbow made up straight into it.',
    columns: [SIZE, { key: 'm', label: 'With a 90' }, { key: 'l', label: 'With a 45' }],
    rows: () => COMBINED_TEES.map((c) => ({ size: c.label, m: f(c.with90), l: f(c.with45) })),
  },
  {
    id: 'wyes',
    title: 'Screwed wyes',
    group: 'Screwed fittings',
    page: '4-38',
    columns: [
      SIZE,
      { key: 'eci', label: 'E cast iron' },
      { key: 'em', label: 'E malleable' },
      { key: 'fci', label: 'F cast iron' },
      { key: 'fm', label: 'F malleable' },
    ],
    rows: () =>
      WYE_LENGTHS.map((w) => ({
        size: w.label,
        eci: f(w.eCastIron),
        em: f(w.eMalleable),
        fci: f(w.fCastIron),
        fm: f(w.fMalleable),
      })),
  },
  {
    id: 'clearances',
    title: 'Wall clearances',
    group: 'Screwed fittings',
    page: '4-32 to 4-36',
    columns: [SIZE, { key: 'c', label: 'Clearance' }],
    rows: () => WALL_CLEARANCES.map((w) => ({ size: w.label, c: f(w.clearance) })),
  },
];

// Flanged fittings, valves, welded fittings, pipe and hanging follow. They are
// built from the same descriptor so the screen stays one piece of code.

const FLANGE_CLASS_TABLES: [string, string, typeof FLANGED_150][] = [
  ['150', '4-71', FLANGED_150],
  ['300', '4-77', FLANGED_300],
  ['400', '4-83', FLANGED_400],
  ['600', '4-88', FLANGED_600],
  ['900', '4-91', FLANGED_900],
  ['1500', '4-94', FLANGED_1500],
  ['2500', '4-97', FLANGED_2500],
];

for (const [cls, page, rows] of FLANGE_CLASS_TABLES) {
  REFERENCE_TABLES.push({
    id: `flanged-${cls}`,
    title: `Flanged fittings, ${cls} lb`,
    group: 'Flanged fittings',
    page,
    note:
      cls === '150' || cls === '300'
        ? `Also the ${cls === '150' ? '125' : '250'} lb cast iron figures. A ring joint face adds to each of these.`
        : 'A ring joint face adds to each of these.',
    columns: [
      SIZE,
      { key: 'a', label: '90°, tee, cross' },
      { key: 'b', label: 'Long radius' },
      { key: 'c', label: '45°' },
      { key: 'rj', label: 'Ring joint 90°' },
    ],
    rows: () =>
      rows.map((r) => ({
        size: r.label,
        a: f(r.a),
        b: f(r.b),
        c: f(r.c),
        rj: f(flangedFitting(r.nps, cls as never, 'ringJoint')?.a, 32),
      })),
  });
}

REFERENCE_TABLES.push(
  {
    id: 'flanged-laterals',
    title: 'Flanged laterals and reducers',
    group: 'Flanged fittings',
    page: '4-72, 4-78, 4-84',
    columns: [
      SIZE,
      { key: 'e150', label: 'E 150' },
      { key: 'f150', label: 'F 150' },
      { key: 'g150', label: 'Reducer 150' },
      { key: 'e300', label: 'E 300' },
      { key: 'g300', label: 'Reducer 300' },
      { key: 'e400', label: 'E 400' },
    ],
    rows: () =>
      LATERALS_150.map((r) => ({
        size: r.label,
        e150: f(r.e),
        f150: f(r.f),
        g150: f(r.g),
        e300: f(LATERALS_300.find((x) => x.nps === r.nps)?.e),
        g300: f(LATERALS_300.find((x) => x.nps === r.nps)?.g),
        e400: f(LATERALS_400.find((x) => x.nps === r.nps)?.e),
      })),
  },
  {
    id: 'flanged-bases',
    title: 'Flanged base elbows and tees',
    group: 'Flanged fittings',
    page: '4-75',
    columns: [SIZE, { key: 'r', label: 'Centre to base' }, { key: 's', label: 'Base diameter' }],
    rows: () => BASES_150.map((b) => ({ size: b.label, r: f(b.centerToBase), s: f(b.baseDiameter) })),
  },
  {
    id: 'flanges',
    title: 'Flange thickness and length',
    group: 'Flanged fittings',
    page: '4-70 onward',
    note: 'Q is the thickness with the raised face counted in, Y a screwed or slip-on flange, Z a lapped one.',
    columns: [
      SIZE,
      { key: 'q150', label: 'Q 150' },
      { key: 'y150', label: 'Y 150' },
      { key: 'q300', label: 'Q 300' },
      { key: 'q600', label: 'Q 600' },
      { key: 'q900', label: 'Q 900' },
      { key: 'q1500', label: 'Q 1500' },
      { key: 'q2500', label: 'Q 2500' },
    ],
    rows: () =>
      FLANGES_150.map((r) => ({
        size: r.label,
        q150: f(r.q),
        y150: f(r.y),
        q300: f(FLANGES_300.find((x) => x.nps === r.nps)?.q),
        q600: f(FLANGES_600.find((x) => x.nps === r.nps)?.q),
        q900: f(FLANGES_900.find((x) => x.nps === r.nps)?.q),
        q1500: f(FLANGES_1500.find((x) => x.nps === r.nps)?.q),
        q2500: f(FLANGES_2500.find((x) => x.nps === r.nps)?.q),
      })),
  },
  {
    id: 'flanges-400',
    title: 'Flanges, 400 lb',
    group: 'Flanged fittings',
    page: '4-82',
    columns: [SIZE, { key: 'q', label: 'Q' }, { key: 'y', label: 'Y' }, { key: 'z', label: 'Z' }],
    rows: () => FLANGES_400.map((r) => ({ size: r.label, q: f(r.q), y: f(r.y), z: f(r.z) })),
  },
  {
    id: 'welding-necks',
    title: 'Welding neck flange length',
    group: 'Flanged fittings',
    page: '4-68, 4-69',
    columns: [
      SIZE,
      { key: 'y150', label: '150' },
      { key: 'y300', label: '300' },
      { key: 'y400', label: '400' },
      { key: 'y600', label: '600' },
      { key: 'y900', label: '900' },
      { key: 'y1500', label: '1500' },
      { key: 'y2500', label: '2500' },
    ],
    rows: () =>
      WELDING_NECKS.map((w) => ({
        size: w.label,
        y150: f(w.y['150']),
        y300: f(w.y['300']),
        y400: f(w.y['400']),
        y600: f(w.y['600']),
        y900: f(w.y['900']),
        y1500: f(w.y['1500']),
        y2500: f(w.y['2500']),
      })),
  },
  {
    id: 'bolt-up-125',
    title: 'Bolting up, 125 lb cast iron',
    group: 'Flanged fittings',
    page: '4-51, 4-52',
    note: 'Bolt holes are a multiple of four and straddle the centreline, so a fitting can be turned a quarter and still bolt up.',
    columns: [
      SIZE,
      { key: 'od', label: 'Flange OD' },
      { key: 'bc', label: 'Bolt circle' },
      { key: 'nb', label: 'Bolts' },
      { key: 'bd', label: 'Bolt' },
      { key: 'bl', label: 'Length' },
      { key: 'hole', label: 'Drill' },
      { key: 'sp', label: 'Hole to hole' },
      { key: 'gk', label: 'Gasket', wide: true },
    ],
    rows: () =>
      BOLT_UP_125.map((b) => ({
        size: b.label,
        od: f(b.flangeOd),
        bc: f(b.boltCircle),
        nb: n(b.bolts),
        bd: f(b.boltDiameter),
        bl: f(b.boltLength),
        hole: f(boltHoleDiameter(b.nps, '125')),
        sp: d(boltSpacing(b.nps, '125'), 2),
        gk: `${f(b.gasketId)} × ${f(b.gasketOd)}`,
      })),
  },
  {
    id: 'bolt-up-250',
    title: 'Bolting up, 250 lb cast iron',
    group: 'Flanged fittings',
    page: '4-53, 4-54',
    columns: [
      SIZE,
      { key: 'od', label: 'Flange OD' },
      { key: 'bc', label: 'Bolt circle' },
      { key: 'nb', label: 'Bolts' },
      { key: 'bd', label: 'Bolt' },
      { key: 'bl', label: 'Length' },
      { key: 'hole', label: 'Drill' },
      { key: 'sp', label: 'Hole to hole' },
      { key: 'gk', label: 'Gasket', wide: true },
    ],
    rows: () =>
      BOLT_UP_250.map((b) => ({
        size: b.label,
        od: f(b.flangeOd),
        bc: f(b.boltCircle),
        nb: n(b.bolts),
        bd: f(b.boltDiameter),
        bl: f(b.boltLength),
        hole: f(boltHoleDiameter(b.nps, '250')),
        sp: d(boltSpacing(b.nps, '250'), 2),
        gk: `${f(b.gasketId)} × ${f(b.gasketOd)}`,
      })),
  },
  {
    id: 'weld-elbows',
    title: 'Butt welding elbows and tees',
    group: 'Welded fittings',
    page: '2-42, 2-43',
    note: 'A long radius elbow is one and a half times the size, a short radius one the size itself.',
    columns: [
      SIZE,
      { key: 'lr', label: 'LR 90°' },
      { key: 'sr', label: 'SR 90°' },
      { key: 'b45', label: '45°' },
      { key: 'tee', label: 'Tee' },
    ],
    rows: () =>
      WELD_TEES.map((t) => ({
        size: t.label,
        lr: f(longRadiusElbow(t.nps)),
        sr: f(shortRadiusElbow(t.nps)),
        b45: f(elbow45(t.nps)),
        tee: f(t.c),
      })),
  },
  {
    id: 'weld-reducing-tees',
    title: 'Butt welding reducing outlet tees',
    group: 'Welded fittings',
    page: '2-44 to 2-46',
    note: 'The run keeps the plain tee figure. A cross uses the same numbers.',
    columns: [PAIR, { key: 'c', label: 'Run' }, { key: 'm', label: 'Outlet' }],
    rows: () =>
      REDUCING_WELD_TEES.map((r) => ({
        size: `${label(r.run)} × ${label(r.outlet)}`,
        c: f(WELD_TEES.find((t) => t.nps === r.run)?.c ?? (r.run === 0.5 ? 1 : NaN)),
        m: f(r.m),
      })),
  },
  {
    id: 'weld-reducers',
    title: 'Butt welding reducers',
    group: 'Welded fittings',
    page: '2-48, 2-50',
    note: 'The length depends only on the larger of the two sizes, concentric and eccentric alike.',
    columns: [SIZE, { key: 'h', label: 'End to end' }],
    rows: () =>
      weldReducerLargeSizes().map((nps) => ({
        size: label(nps),
        h: f(weldReducer(nps, nps === 1 ? 0.5 : 1)),
      })),
  },
  {
    id: 'weld-returns',
    title: 'Butt welding 180° returns',
    group: 'Welded fittings',
    page: '2-51',
    columns: [
      SIZE,
      { key: 'ko', label: 'LR height' },
      { key: 'oo', label: 'LR spacing' },
      { key: 'ks', label: 'SR height' },
      { key: 'os', label: 'SR spacing' },
    ],
    rows: () =>
      WELD_TEES.filter((t) => t.nps <= 14).map((t) => ({
        size: t.label,
        ko: f(returnHeight(t.nps)),
        oo: f(returnSpacing(t.nps)),
        ks: f(returnHeight(t.nps, 'short')),
        os: f(returnSpacing(t.nps, 'short')),
      })),
  },
  {
    id: 'weld-caps',
    title: 'Butt welding caps',
    group: 'Welded fittings',
    page: '2-53',
    columns: [SIZE, { key: 'e', label: 'Adds to the end' }],
    rows: () => WELD_CAPS.map((c) => ({ size: c.label, e: f(c.e) })),
  },
  {
    id: 'reducer-template',
    title: 'Making a reducer out of pipe',
    group: 'Welded fittings',
    page: '2-63',
    note: 'Punch A and B alternately round the pipe, cut the arms to C, bevel at 37½°, heat at the base line and push in to D.',
    columns: [
      PAIR,
      { key: 'arms', label: 'Arms' },
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
      { key: 'hb', label: '½ B' },
      { key: 'c', label: 'C' },
      { key: 'd', label: 'D' },
    ],
    rows: () =>
      REDUCER_TEMPLATES.map((t) => ({
        size: `${label(t.large)} × ${label(t.small)}`,
        arms: n(t.arms),
        a: f(t.a, 32),
        b: f(t.b, 32),
        hb: f(t.b / 2, 32),
        c: f(t.c),
        d: f(t.d),
      })),
  },
  {
    id: 'gate-valves-ci',
    title: 'Gate valves, cast iron',
    group: 'Valves',
    page: '4-99, 4-100',
    columns: [SIZE, { key: 'a', label: '125 lb' }, { key: 'b', label: '175 lb' }, { key: 'c', label: '250 lb' }],
    rows: () =>
      GATE_CAST_IRON.map((r) => ({
        size: r.label,
        a: f(r.faceToFace['125']),
        b: f(r.faceToFace['175']),
        c: f(r.faceToFace['250']),
      })),
  },
  {
    id: 'gate-valves-steel',
    title: 'Gate valves, steel flanged',
    group: 'Valves',
    page: '4-101, 4-102',
    columns: [
      SIZE,
      { key: 'c150', label: '150' },
      { key: 'c300', label: '300' },
      { key: 'c400', label: '400' },
      { key: 'c600', label: '600' },
      { key: 'c900', label: '900' },
      { key: 'c1500', label: '1500' },
      { key: 'c2500', label: '2500' },
    ],
    rows: () =>
      GATE_STEEL.map((r) => ({
        size: label(r.nps),
        c150: f(r.faceToFace['150']),
        c300: f(r.faceToFace['300']),
        c400: f(r.faceToFace['400']),
        c600: f(r.faceToFace['600']),
        c900: f(r.faceToFace['900']),
        c1500: f(r.faceToFace['1500']),
        c2500: f(r.faceToFace['2500']),
      })),
  },
  {
    id: 'gate-valves-ringjoint',
    title: 'Gate valves, ring joint',
    group: 'Valves',
    page: '4-103, 4-104',
    columns: [
      SIZE,
      { key: 'c150', label: '150' },
      { key: 'c300', label: '300' },
      { key: 'c600', label: '600' },
      { key: 'c900', label: '900' },
      { key: 'c1500', label: '1500' },
      { key: 'c2500', label: '2500' },
    ],
    rows: () =>
      GATE_STEEL.map((r) => ({
        size: label(r.nps),
        c150: f(steelGate(r.nps, '150', 'ringJoint'), 32),
        c300: f(steelGate(r.nps, '300', 'ringJoint'), 32),
        c600: f(steelGate(r.nps, '600', 'ringJoint'), 32),
        c900: f(steelGate(r.nps, '900', 'ringJoint'), 32),
        c1500: f(steelGate(r.nps, '1500', 'ringJoint'), 32),
        c2500: f(steelGate(r.nps, '2500', 'ringJoint'), 32),
      })),
  },
  {
    id: 'globe-valves',
    title: 'Globe and angle valves',
    group: 'Valves',
    page: '4-105 to 4-107',
    note: 'An angle valve reaches half as far along the run as the globe figure.',
    columns: [
      SIZE,
      { key: 'ci125', label: 'CI 125' },
      { key: 'ci250', label: 'CI 250' },
      { key: 's150', label: '150' },
      { key: 's300', label: '300' },
      { key: 's400', label: '400' },
      { key: 's600', label: '600' },
    ],
    rows: () =>
      GLOBE_STEEL_LIGHT.map((r) => ({
        size: label(r.nps),
        ci125: f(GLOBE_CAST_IRON.find((c) => c.nps === r.nps)?.faceToFace['125']),
        ci250: f(GLOBE_CAST_IRON.find((c) => c.nps === r.nps)?.faceToFace['250']),
        s150: f(r.faceToFace['150']),
        s300: f(r.faceToFace['300']),
        s400: f(r.faceToFace['400']),
        s600: f(r.faceToFace['600']),
      })),
  },
  {
    id: 'check-valves',
    title: 'Swing check valves',
    group: 'Valves',
    page: '4-111, 4-112',
    note: 'Not for a check with the seat at about 45° to the run, or any pattern needing large clearances.',
    columns: [
      SIZE,
      { key: 's150', label: '150' },
      { key: 's300', label: '300' },
      { key: 's400', label: '400' },
      { key: 's600', label: '600' },
    ],
    rows: () =>
      CHECK_STEEL_LIGHT.map((r) => ({
        size: label(r.nps),
        s150: f(r.faceToFace['150']),
        s300: f(r.faceToFace['300']),
        s400: f(r.faceToFace['400']),
        s600: f(r.faceToFace['600']),
      })),
  },
  {
    id: 'weld-valves',
    title: 'Valves with butt welding ends',
    group: 'Valves',
    page: '2-57 to 2-62',
    columns: [
      SIZE,
      { key: 'g150', label: 'Gate 150' },
      { key: 'g300', label: 'Gate 300' },
      { key: 'gl150', label: 'Globe 150' },
      { key: 'gl300', label: 'Globe 300' },
      { key: 'ck150', label: 'Check 150' },
      { key: 'ck300', label: 'Check 300' },
    ],
    rows: () =>
      WELD_GLOBE_LIGHT.map((r) => ({
        size: label(r.nps),
        g150: f(WELD_GATE_LIGHT.find((x) => x.nps === r.nps)?.faceToFace['150']),
        g300: f(WELD_GATE_LIGHT.find((x) => x.nps === r.nps)?.faceToFace['300']),
        gl150: f(r.faceToFace['150']),
        gl300: f(r.faceToFace['300']),
        ck150: f(WELD_CHECK_LIGHT.find((x) => x.nps === r.nps)?.faceToFace['150']),
        ck300: f(WELD_CHECK_LIGHT.find((x) => x.nps === r.nps)?.faceToFace['300']),
      })),
  },
  {
    id: 'steel-pipe',
    title: 'Steel pipe dimensions',
    group: 'Pipe and tube',
    page: '5-17 to 5-19',
    columns: [
      SIZE,
      { key: 'od', label: 'OD' },
      { key: 'w40', label: 'Wall 40' },
      { key: 'i40', label: 'Bore 40' },
      { key: 'lb40', label: 'lb/ft 40' },
      { key: 'w80', label: 'Wall 80' },
      { key: 'i80', label: 'Bore 80' },
      { key: 'gal', label: 'gal/ft 40' },
    ],
    rows: () =>
      PIPE_TABLE.map((r) => {
        const a = pipeDims(r.nps, '40');
        const b = pipeDims(r.nps, '80');
        return {
          size: r.label,
          od: d(r.od),
          w40: d(a?.wall),
          i40: d(a?.id),
          lb40: d(a?.weightPerFoot, 2),
          w80: d(b?.wall),
          i80: d(b?.id),
          gal: d(a?.capacityGallonsPerFoot, 3),
        };
      }),
  },
  {
    id: 'copper-tube',
    title: 'Copper tube',
    group: 'Pipe and tube',
    page: '5-13 to 5-16',
    note: 'The outside diameter is the nominal size plus an eighth, on every type.',
    columns: [
      SIZE,
      { key: 'od', label: 'OD' },
      { key: 'k', label: 'K bore' },
      { key: 'l', label: 'L bore' },
      { key: 'm', label: 'M bore' },
      { key: 'dwv', label: 'DWV bore' },
      { key: 'lbk', label: 'lb/ft K' },
    ],
    rows: () =>
      copperSizes('K').map((nps) => ({
        size: label(nps),
        od: d(nps + 0.125),
        k: d(copperTube(nps, 'K')?.id),
        l: d(copperTube(nps, 'L')?.id),
        m: d(copperTube(nps, 'M')?.id),
        dwv: d(copperTube(nps, 'DWV')?.id),
        lbk: d(copperTube(nps, 'K')?.weightPerFoot, 2),
      })),
  },
  {
    id: 'pvc',
    title: 'PVC pipe and pressure limits',
    group: 'Pipe and tube',
    page: '3-26, 3-27',
    note: 'Plain end pipe at 75°F. Threading takes it to about 55 per cent. The outside diameter is the iron pipe size.',
    columns: [
      SIZE,
      { key: 'ia', label: 'Bore A' },
      { key: 'pa', label: 'psi A' },
      { key: 'i40', label: 'Bore 40' },
      { key: 'p40', label: 'psi 40' },
      { key: 'i80', label: 'Bore 80' },
      { key: 'p80', label: 'psi 80' },
      { key: 'i120', label: 'Bore 120' },
      { key: 'p120', label: 'psi 120' },
    ],
    rows: () =>
      PVC_SCH40.map((r) => ({
        size: label(r.nps),
        ia: d(PVC_A.find((x) => x.nps === r.nps)?.id),
        pa: n(PVC_A.find((x) => x.nps === r.nps)?.typeI75),
        i40: d(r.id),
        p40: n(r.typeI75),
        i80: d(PVC_SCH80.find((x) => x.nps === r.nps)?.id),
        p80: n(PVC_SCH80.find((x) => x.nps === r.nps)?.typeI75),
        i120: d(PVC_SCH120.find((x) => x.nps === r.nps)?.id),
        p120: n(PVC_SCH120.find((x) => x.nps === r.nps)?.typeI75),
      })),
  },
  {
    id: 'polyethylene',
    title: 'Polyethylene pipe',
    group: 'Pipe and tube',
    page: '3-29, 3-30',
    note: 'Snake a ditch run a foot in every hundred so it has slack to contract.',
    columns: [
      SIZE,
      { key: 'od40', label: 'OD 40' },
      { key: 'id40', label: 'Bore 40' },
      { key: 'p40', label: 'psi 40' },
      { key: 'od75', label: 'OD 75 psi' },
      { key: 'od100', label: 'OD 100 psi' },
    ],
    rows: () =>
      PE_SCH40.map((r) => ({
        size: label(r.nps),
        od40: d(r.od),
        id40: d(r.id),
        p40: n(r.at75),
        od75: d(PE_RATED_75.find((x) => x.nps === r.nps)?.od),
        od100: d(PE_RATED_100.find((x) => x.nps === r.nps)?.od),
      })),
  },
  {
    id: 'expansion',
    title: 'Expansion of pipe per 100 feet',
    group: 'Pipe and tube',
    page: '5-25',
    note: 'Take the figure at the working temperature less the figure at the temperature it went in at.',
    columns: [
      { key: 'size', label: 'Temp °F' },
      { key: 's', label: 'Steel' },
      { key: 'w', label: 'Wrought iron' },
      { key: 'c', label: 'Copper' },
    ],
    rows: () =>
      EXPANSION.map((r) => ({
        size: `${r.temperatureF}°`,
        s: d(r.steel),
        w: d(r.wroughtIron),
        c: d(r.copper),
      })),
  },
  {
    id: 'support-water',
    title: 'Support spacing, water',
    group: 'Hanging and bending',
    page: '2-67',
    note: 'Feet. Allows for insulation but not for flanges, fittings or valves. A sloping run never spans further than its temperature allows.',
    columns: [
      SIZE,
      { key: 'a', label: 'Cold' },
      { key: 'b', label: '200°' },
      { key: 'c', label: '400°' },
      { key: 'g1', label: '1 in 10' },
      { key: 'g2', label: '1 in 20' },
    ],
    rows: () =>
      SUPPORT_WATER.map((r) => ({
        size: label(r.nps),
        a: n(r.atmospheric),
        b: n(r.at200),
        c: n(r.atTop),
        g1: n(r.oneInTen),
        g2: n(r.oneInTwenty),
      })),
  },
  {
    id: 'support-gas',
    title: 'Support spacing, gas or steam',
    group: 'Hanging and bending',
    page: '2-68',
    columns: [
      SIZE,
      { key: 'a', label: 'Cold' },
      { key: 'b', label: '200°' },
      { key: 'c', label: '800°' },
      { key: 'g1', label: '1 in 10' },
      { key: 'g2', label: '1 in 20' },
    ],
    rows: () =>
      SUPPORT_GAS_OR_STEAM.map((r) => ({
        size: label(r.nps),
        a: n(r.atmospheric),
        b: n(r.at200),
        c: n(r.atTop),
        g1: n(r.oneInTen),
        g2: n(r.oneInTwenty),
      })),
  },
  {
    id: 'u-bolts',
    title: 'U-bolts for pipe hangers',
    group: 'Hanging and bending',
    page: '2-66',
    note: 'Figured on a quarter inch plate with half an inch of thread proud of the nut.',
    columns: [
      SIZE,
      ...U_BOLT_DIAMETERS.map((dd) => ({ key: dd, label: `${dd}"` })),
    ],
    rows: () =>
      U_BOLTS.map((u) => {
        const row: Record<string, string> = { size: u.label };
        for (const dd of U_BOLT_DIAMETERS) row[dd] = f(u.lengths[dd]);
        return row;
      }),
  },
  {
    id: 'bend-radius',
    title: 'Minimum bending radius',
    group: 'Hanging and bending',
    page: '1-106',
    note: 'Cold, standard weight pipe, some flattening allowed. The pipe makers advise five times the size.',
    columns: [
      SIZE,
      { key: 's', label: 'Steel' },
      { key: 'w', label: 'Wrought iron' },
      { key: 'a', label: 'Advised' },
    ],
    rows: () =>
      MIN_BEND_RADIUS.map((r) => ({
        size: r.label,
        s: f(r.steel),
        w: f(r.wroughtIron),
        a: f(advisableBendRadius(r.nps)),
      })),
  }
);

export const referenceGroups = (): ReferenceGroup[] => [
  ...new Set(REFERENCE_TABLES.map((t) => t.group)),
];

export const referenceTable = (id: string): ReferenceTable | undefined =>
  REFERENCE_TABLES.find((t) => t.id === id);

/** Tables whose title, group, page or note mentions every word of a query. */
export function searchReference(query: string): ReferenceTable[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return REFERENCE_TABLES;
  return REFERENCE_TABLES.filter((t) => {
    const hay = `${t.title} ${t.group} ${t.page} ${t.note ?? ''} ${t.columns
      .map((c) => c.label)
      .join(' ')}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
