import { ALL, claimUntagged, cleanProject, defaultFilter, inProject, only, projectsIn, sameProject, untagged, withPicked } from '../state/project';
import { PROJECT_ID_MAX } from '../state/readSettings';
import { newJoint, parseRegister, serialiseRegister, validJoint } from '../state/register';
import { newSketch, validSketch, emptyBook } from '../state/sketchStore';
import { validSpool } from '../state/spoolStore';
import { addReading, emptyLog, parseLog, serialiseLog, validReading } from '../state/levelLog';

const rec = (project: string) => ({ project });

describe('a project id is stored clean', () => {
  test('trimmed and capped', () => {
    expect(cleanProject('  BP-REF-001 ')).toBe('BP-REF-001');
    expect(cleanProject('X'.repeat(PROJECT_ID_MAX + 5))).toHaveLength(PROJECT_ID_MAX);
  });

  test('anything but a string is no project', () => {
    for (const v of [undefined, null, 7, {}, []]) expect(cleanProject(v)).toBe('');
  });

  test('the same job typed twice is the same job', () => {
    expect(sameProject('bp-ref-001', ' BP-REF-001')).toBe(true);
    expect(sameProject('BP-REF-001', 'BP-REF-002')).toBe(false);
  });
});

describe('filtering', () => {
  test('all takes everything, one takes its own', () => {
    expect(inProject('A', ALL)).toBe(true);
    expect(inProject('', ALL)).toBe(true);
    expect(inProject('a', only('A'))).toBe(true);
    expect(inProject('B', only('A'))).toBe(false);
  });

  test('"no project" is a filter of its own', () => {
    expect(inProject('', only(''))).toBe(true);
    expect(inProject('A', only(''))).toBe(false);
  });

  test('opens on the active project, or everything when none is set', () => {
    expect(defaultFilter('BP-1')).toEqual(only('BP-1'));
    expect(defaultFilter('  ')).toEqual(ALL);
  });
});

describe('the list of projects', () => {
  test('active first even when empty, then by count, no project last', () => {
    const got = projectsIn([rec('B'), rec(''), rec('C'), rec('C'), rec('b')], 'A');
    expect(got).toEqual([
      { id: 'A', count: 0 },
      { id: 'B', count: 2 },
      { id: 'C', count: 2 },
      { id: '', count: 1 },
    ]);
  });

  test('the active spelling wins over a record typed in another case', () => {
    expect(projectsIn([rec('bp-1')], 'BP-1')).toEqual([{ id: 'BP-1', count: 1 }]);
  });

  test('nothing saved and nothing active is an empty list', () => {
    expect(projectsIn([], '')).toEqual([]);
  });
});

describe('claiming untagged work', () => {
  test('only the untagged move', () => {
    const got = claimUntagged([rec(''), rec('B'), rec('')], 'A');
    expect(got.map((x) => x.project)).toEqual(['A', 'B', 'A']);
    expect(untagged(got)).toBe(0);
  });

  test('claiming for no project changes nothing', () => {
    expect(claimUntagged([rec('')], '  ').map((x) => x.project)).toEqual(['']);
  });
});

describe('records written before projects load as "no project"', () => {
  test('joint', () => {
    const j = newJoint('j', { cls: '125', nps: 6, bolts: 8 }, 1_000);
    const { project: _drop, ...old } = j;
    expect(validJoint(old)?.project).toBe('');
    expect(validJoint({ ...old, project: 42 })?.project).toBe('');
  });

  test('sketch', () => {
    const s = newSketch(emptyBook(), 1_000);
    const { project: _drop, ...old } = s;
    expect(validSketch(old, 2, 20)?.project).toBe('');
  });

  test('spool', () => {
    const old = { id: 'a', name: 'A', place: '', nps: 2, kind: 'LR', schedule: '40', gap: 0.1, legs: [{ length: 12, bearing: 0, slope: 0 }], createdAt: 1, updatedAt: 1 };
    expect(validSpool(old)?.project).toBe('');
    expect(validSpool({ ...old, project: ' BP-9 ' })?.project).toBe('BP-9');
  });

  test('level reading', () => {
    expect(validReading({ id: 'r', tag: 'T', slope: 1, inPerFt: 0.2, createdAt: 1 })?.project).toBe('');
  });
});

describe('new records carry the project they were saved under', () => {
  test('joint, sketch and reading', () => {
    expect(newJoint('j', { cls: '125', nps: 6, bolts: 8, project: ' BP-1 ' }, 1).project).toBe('BP-1');
    expect(newSketch(emptyBook(), 1, 'BP-1').project).toBe('BP-1');
    expect(addReading(emptyLog(), 'T', 1, 1, 'BP-1').readings[0]?.project).toBe('BP-1');
  });

  test('and keep it through the store', () => {
    const r = parseRegister(serialiseRegister({ joints: [newJoint('j', { cls: '125', nps: 6, bolts: 8, project: 'BP-1' }, 1)], foreign: false, dropped: 0 }));
    expect(r.joints[0]?.project).toBe('BP-1');
    expect(parseLog(serialiseLog(addReading(emptyLog(), 'T', 1, 1, 'BP-2'))).readings[0]?.project).toBe('BP-2');
  });
});

describe('a job picked on one screen stays picked on the next', () => {
  const jobs = [{ id: 'A', count: 2 }, { id: '', count: 1 }];

  test('a job this list has no records for still gets its chip, before "no project"', () => {
    expect(withPicked(jobs, only('B'))).toEqual([{ id: 'A', count: 2 }, { id: 'B', count: 0 }, { id: '', count: 1 }]);
  });

  test('"no project" picked with none here goes last', () => {
    expect(withPicked([{ id: 'A', count: 2 }], only(''))).toEqual([{ id: 'A', count: 2 }, { id: '', count: 0 }]);
  });

  test('nothing is added for all jobs, nothing picked, or a job already listed', () => {
    expect(withPicked(jobs, ALL)).toEqual(jobs);
    expect(withPicked(jobs, null)).toEqual(jobs);
    expect(withPicked(jobs, only('a'))).toEqual(jobs);
  });
});
