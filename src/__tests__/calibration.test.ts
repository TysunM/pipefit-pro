import {
  byUrgency,
  calState,
  calibrate,
  emptyInstruments,
  findInstrument,
  goodOn,
  parseInstruments,
  putInstrument,
  serialiseInstruments,
  setOut,
  usable,
  type CalibrationRegister,
} from '../state/calibration';
import { CALIBRATION_ALERT_PREFIX, calibrationAlerts } from '../calc/calibrationAlerts';
import { calibrationHtml } from '../print/calibration';
import { openItems } from '../print/turnover';
import { newJoint, parseRegister, serialiseRegister, emptyRegister } from '../state/register';

const T = Date.UTC(2026, 9, 7, 15);

function reg(): CalibrationRegister {
  let r = emptyInstruments();
  const add = (tag: string, kind: Parameters<typeof putInstrument>[1]['kind'], on?: string) => {
    const out = putInstrument(r, { tag, kind, name: '', max: kind === 'torque' ? 600 : 300, months: kind === 'gauge' ? 6 : 12, note: '' }, T);
    if (!out.ok) throw new Error(out.why);
    r = on ? calibrate(out.register, out.id, { on, cert: `C-${tag}`, lab: 'Acme Cal' }, T) : out.register;
  };
  add('PG-104', 'gauge', '2026-06-01');
  add('PG-105', 'gauge', '2026-04-01');
  add('TW-7', 'torque', '2026-01-15');
  add('PG-200', 'gauge');
  return r;
}

describe('the calibration register', () => {
  test('a calibration runs the interval on, and the newest is the one in force', () => {
    const r = reg();
    expect(findInstrument(r, 'pg 104')!.history[0]).toEqual({ on: '2026-06-01', due: '2026-12-01', cert: 'C-PG-104', lab: 'Acme Cal' });
    const again = calibrate(r, findInstrument(r, 'PG-104')!.id, { on: '2026-11-20', cert: 'C-9', lab: '' }, T);
    expect(findInstrument(again, 'PG-104')!.history.map((h) => h.on)).toEqual(['2026-11-20', '2026-06-01']);
    expect(calibrate(r, findInstrument(r, 'PG-104')!.id, { on: '2026-11-20', due: '2026-12-31', cert: '', lab: '' }, T).instruments.find((i) => i.tag === 'PG-104')!.history[0]!.due).toBe('2026-12-31');
  });

  test('where each one stands today, worst first', () => {
    const r = reg();
    const today = '2026-10-07';
    expect(calState(findInstrument(r, 'PG-104')!, today)).toMatchObject({ state: 'ok', due: '2026-12-01' });
    expect(calState(findInstrument(r, 'PG-105')!, today)).toMatchObject({ state: 'overdue', due: '2026-10-01', daysLeft: -6 });
    expect(calState(findInstrument(r, 'PG-104')!, '2026-11-15')).toMatchObject({ state: 'soon', daysLeft: 16 });
    expect(calState(findInstrument(r, 'PG-200')!, today).state).toBe('never');
    expect(byUrgency(r.instruments, today).map((i) => i.tag)).toEqual(['PG-105', 'PG-200', 'PG-104', 'TW-7']);
  });

  test('judged on the day of the record, by the certificate in force that day', () => {
    const r = reg();
    const g = findInstrument(r, 'PG-105')!;
    expect(goodOn(g, '2026-09-30').ok).toBe(true);
    expect(goodOn(g, '2026-10-02')).toEqual({ ok: false, why: 'PG-105 calibration ran out 2026-10-01, before 2026-10-02' });
    expect(goodOn(g, '2026-03-01').why).toBe('PG-105 had no calibration on 2026-03-01');
    const out = setOut(r, g.id, true, T);
    expect(goodOn(findInstrument(out, 'PG-105')!, '2026-09-30').ok).toBe(false);
    expect(calState(findInstrument(out, 'PG-105')!, '2026-09-30').state).toBe('out');
  });

  test('only what is good today is offered, the longest-good first', () => {
    const r = reg();
    expect(usable(r.instruments, 'gauge', '2026-09-20').map((i) => i.tag)).toEqual(['PG-104', 'PG-105']);
    expect(usable(r.instruments, 'torque', '2026-09-20').map((i) => i.tag)).toEqual(['TW-7']);
  });

  test('one tag is one instrument; stored and read back; damage dropped', () => {
    const r = reg();
    expect(putInstrument(r, { tag: 'pg104', kind: 'gauge', name: '', max: null, months: 6, note: '' }, T).ok).toBe(false);
    const raw = JSON.parse(serialiseInstruments(r));
    raw.instruments.push({ id: 'x', tag: '', createdAt: 1 }, { ...raw.instruments[0], history: [{ on: '2026-05-01', due: '2026-01-01' }] });
    const back = parseInstruments(JSON.stringify(raw));
    expect(back.instruments).toEqual(r.instruments);
    expect(back.dropped).toBe(2);
    expect(parseInstruments(JSON.stringify({ v: 9, instruments: [] })).foreign).toBe(true);
  });
});

describe('alerts, bolt-ups and paper', () => {
  test('a month out and on the day, keyed to the due day', () => {
    const now = new Date(2026, 9, 1, 12).getTime();
    const a = calibrationAlerts(reg().instruments, now);
    expect(a.map((x) => x.key)).toEqual([`${CALIBRATION_ALERT_PREFIX}PG104:2026-12-01:soon`, `${CALIBRATION_ALERT_PREFIX}PG104:2026-12-01:due`, `${CALIBRATION_ALERT_PREFIX}TW7:2027-01-15:soon`, `${CALIBRATION_ALERT_PREFIX}TW7:2027-01-15:due`]);
    expect(new Date(a[0]!.at)).toEqual(new Date(2026, 10, 1, 7));
    expect(a[1]!.title).toBe('PG-104 calibration runs out today');
  });

  test('a joint pulled up with a wrench out of calibration is an open item', () => {
    const r = reg();
    const j = { ...newJoint('j1', { tag: 'F-1', cls: '125', nps: 6, bolts: 8, torque: 60, boltedBy: 'A' }, T), witnessedBy: 'B', heats: ['H1'], wrench: 'TW-7' };
    const done = { ...j, completedAt: Date.UTC(2027, 1, 1, 15), state: { ...j.state } };
    const items = openItems([done as never], [], [], [], r.instruments).map((o) => o.needs);
    expect(items).toContain('Torque wrench: TW-7 calibration ran out 2027-01-15, before 2027-02-01');
    // Kept on the joint through a save.
    const back = parseRegister(serialiseRegister({ ...emptyRegister(), joints: [j] }));
    expect(back.joints[0]?.wrench).toBe('TW-7');
  });

  test('the printed register leads with what is overdue or never calibrated', () => {
    const html = calibrationHtml({ title: 'Calibration register', instruments: reg().instruments, today: '2026-10-07' });
    expect(html).toContain('<p class="problem">PG-105: overdue<br>PG-200: never calibrated</p>');
    expect(html).toContain('C-PG-104');
  });
});
