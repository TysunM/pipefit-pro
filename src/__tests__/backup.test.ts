import { STORES, backupFileName, counted, backupSummary, makeBackup, mergeStore, readBackup, restorePlan } from '../state/backup';
import { addCut, emptyCuts } from '../state/cutLog';
import { emptyLibrary, setTakeout } from '../state/fittingLibrary';
import { addReading, emptyLog } from '../state/levelLog';
import { emptyShifts, newReport } from '../state/shiftLog';

const T = 1_760_000_000_000;
const cut = { pipeKey: 'cs:40|2', pipe: '2" CS SCH 40', c2c: 48, cut: 41.8125, ends: '90 × 90' };

function phone() {
  let levels = addReading(emptyLog(), 'Line 12', 0.6, T, 'BP-1');
  levels = addReading(levels, 'Line 14', 1.2, T + 1, 'BP-1');
  const cuts = addCut(addCut(emptyCuts(), cut, T, 'BP-1'), cut, T + 1, 'BP-1');
  const fittings = setTakeout(emptyLibrary(), 'pvc:40', 'sock90', 2, 1.125, T);
  const shifts = { ...emptyShifts(), reports: [newReport('2026-09-30', 'BP-1', T)] };
  return { 'pipefit.levels.v1': levels, 'pipefit.cuts.v1': cuts, 'pipefit.fittings.v1': fittings, 'pipefit.shifts.v1': shifts } as Record<string, any>;
}

describe('a backup', () => {
  test('holds every store and the settings, and reads back to the same records', () => {
    const values = phone();
    const file = makeBackup(values, { projectId: 'BP-1', units: 'imperial' }, new Date(T));
    const read = readBackup(file);
    if (!read.ok) throw new Error(read.why);
    expect(Object.keys(read.stores).sort()).toEqual(STORES.map((s) => s.key).sort());
    expect(read.stores['pipefit.levels.v1']!.readings).toEqual(values['pipefit.levels.v1'].readings);
    expect(read.stores['pipefit.cuts.v1']!.cuts).toEqual(values['pipefit.cuts.v1'].cuts);
    expect(read.settings).toEqual({ projectId: 'BP-1', units: 'imperial' });
    expect(backupSummary(values)).toEqual([
      { label: 'level readings', count: 2 },
      { label: 'shift reports', count: 1 },
      { label: 'fitting takeouts', count: 1 },
      { label: 'cuts', count: 2 },
    ]);
  });

  test('read out of an email, with words round it', () => {
    const file = makeBackup(phone(), {}, new Date(T));
    expect(readBackup(`Here's the backup:\n\n${file}\n\nSent from my phone`).ok).toBe(true);
  });

  test('refuses what is not one, is cut short, or is from a newer app', () => {
    expect(readBackup('hello').ok).toBe(false);
    expect(readBackup('{"app":"Other","backup":1}').ok).toBe(false);
    const file = makeBackup(phone(), {}, new Date(T));
    expect(readBackup(file.slice(0, file.length / 2)).ok).toBe(false);
    const newer = readBackup(file.replace('"backup": 1', '"backup": 9'));
    expect(newer.ok === false && newer.why).toMatch(/newer/);
  });

  test('a bad record in the file is dropped by its own store; the rest come in', () => {
    const file = JSON.parse(makeBackup(phone(), {}, new Date(T)));
    file.stores['pipefit.levels.v1'].readings.push({ id: 'evil', tag: '', slope: 999 });
    const read = readBackup(JSON.stringify(file));
    expect(read.ok && read.stores['pipefit.levels.v1']!.readings.length).toBe(2);
  });

  test('names the file by the day and the job', () => {
    expect(backupFileName(new Date('2026-10-06T12:00:00Z'), 'BP-1 / North')).toBe('pipefit-backup-2026-10-06-BP-1-North.json');
    expect(backupFileName(new Date('2026-10-06T12:00:00Z'), '')).toBe('pipefit-backup-2026-10-06.json');
  });
});

describe('restoring only ever adds', () => {
  test('onto an empty phone, everything comes in', () => {
    const read = readBackup(makeBackup(phone(), {}, new Date(T)));
    if (!read.ok) throw new Error();
    const plan = restorePlan(read, {});
    expect(plan.filter((p) => p.adds).map((p) => [p.label, p.adds])).toEqual([
      ['level readings', 2],
      ['shift reports', 1],
      ['fitting takeouts', 1],
      ['cuts', 2],
    ]);
  });

  test('a record already on the phone is kept as the phone has it', () => {
    const now = phone();
    // On the phone since the backup: one reading's tag changed, one new reading.
    const edited = { ...now['pipefit.levels.v1'], readings: now['pipefit.levels.v1'].readings.map((r: any) => (r.tag === 'Line 12' ? { ...r, tag: 'Line 12 (redone)' } : r)) };
    const later = addReading(edited, 'Line 16', 0.3, T + 5, 'BP-1');
    const old = readBackup(makeBackup(phone(), {}, new Date(T)));
    if (!old.ok) throw new Error();
    const { value, added } = mergeStore('pipefit.levels.v1', later, old.stores['pipefit.levels.v1']!);
    expect(added).toBe(0);
    expect(value).toBe(later);
    expect(value.readings.map((r: any) => r.tag).sort()).toEqual(['Line 12 (redone)', 'Line 14', 'Line 16']);
  });

  test('restoring twice adds nothing the second time', () => {
    const read = readBackup(makeBackup(phone(), {}, new Date(T)));
    if (!read.ok) throw new Error();
    const once = mergeStore('pipefit.cuts.v1', emptyCuts(), read.stores['pipefit.cuts.v1']!);
    expect(once.added).toBe(2);
    expect(mergeStore('pipefit.cuts.v1', once.value, read.stores['pipefit.cuts.v1']!).added).toBe(0);
  });

  test('a shift report for the same job and day is the same report, whatever its id', () => {
    const mine = { ...emptyShifts(), reports: [{ ...newReport('2026-09-30', 'bp-1', T + 9), id: 'other-id' }] };
    const read = readBackup(makeBackup(phone(), {}, new Date(T)));
    if (!read.ok) throw new Error();
    expect(mergeStore('pipefit.shifts.v1', mine, read.stores['pipefit.shifts.v1']!).added).toBe(0);
  });

  test('a store a newer app wrote on this phone is never touched', () => {
    const read = readBackup(makeBackup(phone(), {}, new Date(T)));
    if (!read.ok) throw new Error();
    const foreign = { ...emptyCuts(), foreign: true };
    expect(mergeStore('pipefit.cuts.v1', foreign, read.stores['pipefit.cuts.v1']!)).toEqual({ value: foreign, added: 0 });
  });
});

test('"back up" opens the backup screen by voice', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { localIntent } = require('../voice/intent');
  expect(localIntent('back up my phone', null)).toEqual({ kind: 'open', route: 'Backup' });
  expect(localIntent('open backup', null)).toEqual({ kind: 'open', route: 'Backup' });
});

test('counts read as a man would say them', () => {
  expect(counted(1, 'spools')).toBe('1 spool');
  expect(counted(3, 'spools')).toBe('3 spools');
  expect(counted(1, 'isos')).toBe('1 iso');
});

describe('the Home nudge', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { shouldNudge } = require('../state/backup');
  const DAY = 86_400_000;
  const now = 1_760_000_000_000;
  test('asks when never backed up, or a week since, with records to lose', () => {
    expect(shouldNudge({ lastAt: null, snoozedUntil: null, records: 3, now })).toEqual({ show: true, days: null });
    expect(shouldNudge({ lastAt: now - 8 * DAY, snoozedUntil: null, records: 3, now })).toEqual({ show: true, days: 8 });
    expect(shouldNudge({ lastAt: now - 2 * DAY, snoozedUntil: null, records: 3, now }).show).toBe(false);
  });
  test('not with nothing on the phone, nor the day it was put off', () => {
    expect(shouldNudge({ lastAt: null, snoozedUntil: null, records: 0, now }).show).toBe(false);
    expect(shouldNudge({ lastAt: null, snoozedUntil: now + DAY / 2, records: 3, now }).show).toBe(false);
    expect(shouldNudge({ lastAt: null, snoozedUntil: now - 1, records: 3, now }).show).toBe(true);
  });
});
