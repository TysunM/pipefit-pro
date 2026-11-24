import { STORES } from '../state/backup';
import {
  MAX_WPS,
  activeWps,
  checkWps,
  emptyWpsBook,
  fromUnits,
  heatFor,
  inUnits,
  missText,
  newWps,
  parseWpsBook,
  putWps,
  rangeText,
  removeWps,
  serialiseWpsBook,
  setActiveWps,
  validRange,
  validVerdict,
  validWps,
  verdictLine,
  wpsId,
  wpsProblem,
  type Units,
  type Wps,
} from '../state/wpsBook';
import { addHeatInput, emptyHeatInputs, parseHeatInputs, serialiseHeatInputs, validEntry } from '../state/heatInputLog';

const T = Date.UTC(2026, 10, 24, 15, 0);
const IMP: Units = { heat: 'kJ/in', speed: 'in/min' };
const MET: Units = { heat: 'kJ/mm', speed: 'mm/min' };

/** A WPS with its limits typed in the given units, as the sheet keeps them. */
function wps(over: Partial<Wps> & { lim?: Partial<Record<'amps' | 'volts' | 'speed' | 'heat', [number | null, number | null]>> } = {}, u: Units = IMP): Wps {
  const { lim = {}, ...rest } = over;
  const w: Wps = { ...newWps(T), id: 'wps-101', name: 'WPS-101', ...rest };
  for (const [p, [lo, hi]] of Object.entries(lim) as ['amps' | 'volts' | 'speed' | 'heat', [number | null, number | null]][]) {
    w[p] = { min: lo === null ? null : fromUnits(p, lo, u), max: hi === null ? null : fromUnits(p, hi, u) };
  }
  return w;
}

// 180 A, 24 V, 300 mm in 60 s: 864 J/mm arc energy (21.9 kJ/in), 5 mm/s (11.8 in/min).
const PASS = { amps: 180, volts: 24, travel: 5, arcEnergy: 864 };

describe('a WPS window', () => {
  test('a limit pair holds: positive or open, low not above high', () => {
    expect(validRange({ min: 150, max: 190 })).toEqual({ min: 150, max: 190 });
    expect(validRange({ min: null, max: 20 })).toEqual({ min: null, max: 20 });
    expect(validRange({})).toEqual({ min: null, max: null });
    expect(validRange({ min: 200, max: 150 })).toBeNull();
    expect(validRange({ min: -1, max: null })).toBeNull();
    expect(validRange({ min: 'x', max: null })).toBeNull();
  });
  test('what cannot be saved says why', () => {
    expect(wpsProblem(wps({ name: '  ', lim: { amps: [150, 190] } }))).toMatch(/WPS number/);
    expect(wpsProblem(wps())).toMatch(/at least one limit/);
    expect(wpsProblem(wps({ lim: { volts: [26, 22] } }))).toMatch(/Volts: the minimum is above the maximum/);
    expect(wpsProblem(wps({ lim: { amps: [0, 190] } }))).toMatch(/Amps: a limit is more than zero/);
    expect(wpsProblem(wps({ lim: { heat: [null, 20] } }))).toBeNull();
  });
  test('a limit typed in one unit reads back the same', () => {
    for (const u of [IMP, MET, { heat: 'J/in', speed: 'mm/s' } as Units, { heat: 'J/mm', speed: 'cm/min' } as Units])
      for (const p of ['speed', 'heat'] as const) expect(Number(inUnits(p, fromUnits(p, 12.34, u), u).toPrecision(9))).toBe(12.34);
    expect(rangeText('heat', wps({ lim: { heat: [null, 50] } }).heat, IMP)).toBe('50 kJ/in max');
    expect(rangeText('amps', wps({ lim: { amps: [150, 190] } }).amps, IMP)).toBe('150–190 A');
    expect(rangeText('speed', wps({ lim: { speed: [4, null] } }).speed, IMP)).toBe('4 in/min min');
  });
  test('an id that travels: the name slugged and the moment it was made', () => expect(wpsId(' WPS-101 GTAW root ', T)).toBe(`wps-101-gtaw-root-${T.toString(36)}`));
});

describe('the check', () => {
  test('ASME IX: heat input is the arc energy, no k, whatever the process', () => {
    const w = wps({ process: 'smaw', basis: 'asme', lim: { amps: [150, 190], volts: [22, 26], speed: [8, 14], heat: [null, 20] } });
    expect(heatFor(w, 864)).toBe(864);
    const v = checkWps(w, PASS, IMP);
    expect(v.checked).toEqual(['amps', 'volts', 'speed', 'heat']);
    expect(v.out).toEqual([{ param: 'heat', side: 'high', limit: w.heat.max, value: 864 }]);
    expect(missText(v.out[0]!, IMP)).toBe('Heat input 21.9 kJ/in, over the 20 max');
  });
  test('EN ISO: the same pass, times k 0.8 for SMAW, is inside 20 kJ/in', () => {
    const w = wps({ process: 'smaw', basis: 'iso', lim: { heat: [null, 20] } });
    expect(heatFor(w, 864)).toBeCloseTo(691.2, 6);
    expect(checkWps(w, PASS, IMP).out).toEqual([]);
    expect(verdictLine(checkWps(w, PASS, IMP), IMP)).toBe('In range: heat input');
  });
  test('low and high both caught, each once', () => {
    const w = wps({ lim: { amps: [190, 220], volts: [null, 23], speed: [12, null] } });
    const v = checkWps(w, PASS, IMP);
    expect(v.out.map((m) => `${m.param} ${m.side}`)).toEqual(['amps low', 'volts high', 'speed low']);
    expect(verdictLine(v, IMP)).toBe('Amps 180 A, under the 190 min; Volts 24 V, over the 23 max; Travel speed 11.8 in/min, under the 12 min');
  });
  test('checked on the figure shown: 21.9456 reads 21.9, so a 21.9 max holds and a 21.8 max does not', () => {
    expect(checkWps(wps({ lim: { heat: [null, 21.9] } }), PASS, IMP).out).toEqual([]);
    expect(checkWps(wps({ lim: { heat: [21.9, null] } }), PASS, IMP).out).toEqual([]);
    expect(checkWps(wps({ lim: { heat: [null, 21.8] } }), PASS, IMP).out).toHaveLength(1);
  });
  test('the same pass in metric: 0.864 kJ/mm against 0.85 max', () => {
    const w = wps({ lim: { heat: [null, 0.85], speed: [null, 300] } }, MET);
    const v = checkWps(w, PASS, MET);
    expect(v.out.map((m) => m.param)).toEqual(['heat']);
    expect(missText(v.out[0]!, MET)).toBe('Heat input 0.864 kJ/mm, over the 0.85 max');
  });
  test('a total-energy pass has no amps or volts: those are not checked, nor a speed with no arc time', () => {
    const w = wps({ lim: { amps: [150, 190], speed: [8, 14], heat: [null, 30] } });
    const v = checkWps(w, { amps: null, volts: null, travel: null, arcEnergy: 864 }, IMP);
    expect(v.checked).toEqual(['heat']);
    expect(v.out).toEqual([]);
    expect(verdictLine(checkWps(wps({ lim: { amps: [150, 190] } }), { amps: null, volts: null, travel: null, arcEnergy: 864 }, IMP), IMP)).toBe('Nothing measured that it sets a limit on');
  });
});

describe('the WPS book', () => {
  const a = wps({ id: 'a', name: 'WPS-2', lim: { amps: [100, 150] } });
  const b = wps({ id: 'b', name: 'WPS-10', lim: { heat: [null, 30] } });
  test('kept in number order, the chosen one remembered, round the store unchanged', () => {
    let book = putWps(emptyWpsBook(), b).book;
    book = setActiveWps(putWps(book, a).book, 'b');
    expect(book.wps.map((w) => w.name)).toEqual(['WPS-2', 'WPS-10']);
    expect(activeWps(book)?.id).toBe('b');
    expect(parseWpsBook(serialiseWpsBook(book))).toEqual(book);
  });
  test('deleting the one in use leaves none in use; choosing one not there chooses none', () => {
    const book = setActiveWps(putWps(putWps(emptyWpsBook(), a).book, b).book, 'a');
    expect(activeWps(removeWps(book, 'a'))).toBeNull();
    expect(setActiveWps(book, 'zz').active).toBeNull();
    expect(setActiveWps(book, null).active).toBeNull();
  });
  test(`holds ${MAX_WPS}, and says so rather than drop one`, () => {
    let book = emptyWpsBook();
    for (let i = 0; i < MAX_WPS; i++) book = putWps(book, { ...a, id: `w${i}`, name: `WPS-${i}` }).book;
    const full = putWps(book, { ...a, id: 'one-more' });
    expect(full.ok).toBe(false);
    expect(full.book).toBe(book);
    expect(putWps(book, { ...a, id: 'w3', note: 'revised' }).ok).toBe(true);
  });
  test('a damaged record is dropped and counted; a newer app is left alone', () => {
    const raw = JSON.stringify({ v: 1, wps: [a, { ...b, amps: { min: 9, max: 1 } }, { id: 'x' }], active: 'b' });
    const read = parseWpsBook(raw);
    expect(read.wps.map((w) => w.id)).toEqual(['a']);
    expect(read.dropped).toBe(2);
    expect(read.active).toBeNull();
    expect(parseWpsBook(JSON.stringify({ v: 9, wps: [] })).foreign).toBe(true);
    expect(parseWpsBook('{nope').dropped).toBe(1);
    expect(validWps({ ...a, process: 'none' })).toBeNull();
    expect(validWps({ ...a, basis: 'aws' })).toBeNull();
  });
  test('goes into the backup', () => expect(STORES.some((s) => s.key === 'pipefit.wps.v1' && s.field === 'wps')).toBe(true));
});

describe('the verdict kept with a heat input', () => {
  const base = { project: '', mode: 'va' as const, amps: 180, volts: 24, energyKJ: null, lengthMm: 300, around: false, seconds: 60, process: 'none', k: 1, arcEnergy: 864, heatInput: 864, travel: 5, fields: [] };
  const w = wps({ lim: { amps: [150, 190], heat: [null, 20] } });
  const verdict = checkWps(w, PASS, IMP);
  test('saved with it and read back unchanged; WPS revised later does not touch it', () => {
    const l = addHeatInput(emptyHeatInputs(), { ...base, wps: verdict }, T);
    const back = parseHeatInputs(serialiseHeatInputs(l));
    expect(back.entries[0]!.wps).toEqual(verdict);
  });
  test('a result saved before the check existed has none', () => {
    expect(addHeatInput(emptyHeatInputs(), base, T).entries[0]!.wps).toBeNull();
    expect(validEntry({ ...base, id: 'x', createdAt: T })!.wps).toBeNull();
  });
  test('a verdict that does not hold together is not kept', () => {
    expect(validVerdict({ ...verdict, out: [{ param: 'heat', side: 'up', limit: 1, value: 2 }] })).toBeNull();
    expect(validVerdict({ ...verdict, checked: ['amps'] })).toBeNull();
    expect(validVerdict({ ...verdict, name: ' ' })).toBeNull();
    expect(validVerdict(null)).toBeNull();
  });
});
