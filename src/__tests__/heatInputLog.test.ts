import { STORES } from '../state/backup';
import { MAX_HEAT_INPUTS, addHeatInput, cleanFieldNames, deleteHeatInput, emptyHeatInputs, parseHeatInputs, serialiseHeatInputs, validEntry } from '../state/heatInputLog';
import { heatInputCsv } from '../print/heatInputCsv';

const T = Date.UTC(2026, 10, 23, 15, 30);
const base = {
  project: 'BP-1',
  mode: 'va' as const,
  amps: 180,
  volts: 24,
  energyKJ: null,
  lengthMm: 300,
  around: false,
  seconds: 60,
  process: 'smaw',
  k: 0.8,
  arcEnergy: 864,
  heatInput: 691.2,
  travel: 5,
  fields: [{ name: 'WPS', value: 'WPS-101' }, { name: 'Welder', value: 'W-7' }],
};

describe('the heat input log', () => {
  test('keeps a result, newest first, and goes round the store unchanged', () => {
    let l = addHeatInput(emptyHeatInputs(), base, T);
    l = addHeatInput(l, { ...base, heatInput: 700 }, T + 1000);
    expect(l.entries.map((e) => e.heatInput)).toEqual([700, 691.2]);
    expect(parseHeatInputs(serialiseHeatInputs(l))).toEqual(l);
  });
  test('two saved in the same millisecond keep both', () => {
    const l = addHeatInput(addHeatInput(emptyHeatInputs(), base, T), base, T);
    expect(new Set(l.entries.map((e) => e.id)).size).toBe(2);
  });
  test('refuses what does not hold together', () => {
    const ok = { ...base, id: 'x', createdAt: T };
    expect(validEntry(ok)).not.toBeNull();
    expect(validEntry({ ...ok, mode: 'va', amps: null })).toBeNull();
    expect(validEntry({ ...ok, mode: 'energy', energyKJ: null })).toBeNull();
    expect(validEntry({ ...ok, k: 0 })).toBeNull();
    expect(validEntry({ ...ok, lengthMm: -1 })).toBeNull();
    expect(validEntry({ ...ok, heatInput: Number.NaN })).toBeNull();
  });
  test('a damaged record is dropped and counted; a newer app is left alone', () => {
    const raw = JSON.stringify({ v: 1, entries: [{ ...base, id: 'a', createdAt: T }, { id: 'b' }] });
    expect(parseHeatInputs(raw).entries).toHaveLength(1);
    expect(parseHeatInputs(raw).dropped).toBe(1);
    expect(parseHeatInputs(JSON.stringify({ v: 9, entries: [] })).foreign).toBe(true);
  });
  test(`holds ${MAX_HEAT_INPUTS}, dropping the oldest`, () => {
    let l = emptyHeatInputs();
    for (let i = 0; i <= MAX_HEAT_INPUTS; i++) l = addHeatInput(l, base, T + i);
    expect(l.entries).toHaveLength(MAX_HEAT_INPUTS);
    expect(l.entries.at(-1)!.createdAt).toBe(T + 1);
  });
  test('deletes the one asked for', () => {
    const l = addHeatInput(emptyHeatInputs(), base, T);
    expect(deleteHeatInput(l, l.entries[0]!.id).entries).toEqual([]);
    expect(deleteHeatInput(l, 'nope')).toBe(l);
  });
  test('goes into the backup', () => expect(STORES.some((s) => s.key === 'pipefit.heatinput.v1' && s.field === 'entries')).toBe(true));
  test('field names: trimmed, no blanks or repeats, four at most', () => {
    expect(cleanFieldNames([' WPS ', 'wps', '', 'Welder', 'Pass', 'Joint', 'Heat'])).toEqual(['WPS', 'Welder', 'Pass', 'Joint']);
    expect(cleanFieldNames('WPS')).toEqual([]);
  });
});

describe('the spreadsheet', () => {
  const l = addHeatInput(addHeatInput(emptyHeatInputs(), base, T), { ...base, mode: 'energy', amps: null, volts: null, energyKJ: 52, seconds: null, travel: null, fields: [{ name: 'Pass', value: '=HYPERLINK("x")' }] }, T + 60_000);
  const csv = heatInputCsv(l.entries, { heat: 'kJ/in', speed: 'in/min', imperial: true, fieldNames: ['WPS', 'Welder'] });
  const rows = csv.trim().split('\r\n');
  test('a header in the reader\'s units, the job\'s fields as columns, then one row each', () => {
    expect(rows[0]).toBe('Date,Time,Project,Method,Process,Efficiency k,Amps (A),Volts (V),Energy (kJ),Length (in),Round pipe,Arc time (s),Travel speed (in/min),Arc energy (kJ/in),Heat input (kJ/in),WPS,Welder,Pass');
    expect(rows).toHaveLength(3);
  });
  test('the figures in the reader\'s units', () => {
    const va = rows[2]!.split(',');
    expect(va.slice(3, 16)).toEqual(['Volts and amps', 'SMAW stick', '0.8', '180', '24', '', '11.811', 'No', '60', '11.8', '21.9', '17.6', 'WPS-101']);
  });
  test('typed text cannot be taken for a formula, and quotes are doubled', () => {
    expect(rows[1]).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
