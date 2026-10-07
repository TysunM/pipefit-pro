import {
  HAZARDS,
  addCrew,
  emptyPlans,
  hazard,
  isClosed,
  newPlan,
  parsePlans,
  planFor,
  planGaps,
  putPlan,
  reopen,
  serialisePlans,
  setControl,
  signCrew,
  signForeman,
  talkFor,
  toggleHazard,
  togglePermit,
} from '../state/pretask';
import { pretaskHtml } from '../print/pretask';
import { applyPretask } from '../voice/apply';
import { readVoice } from '../ai/voice';
import { encodeSig } from '../calc/signature';
import { evidence } from '../state/passport';
import { STORES } from '../state/backup';
import { BUILTIN } from '../state/orientation';

const T = new Date(2026, 9, 6, 6, 30).getTime();
const SIG = encodeSig([
  [
    [10, 50],
    [60, 20],
    [120, 70],
  ],
]);

describe('the pre-task plan', () => {
  test('one per job per day; hazards come with the control a journeyman names; a plan is closed by the signature and reopened by a change', () => {
    let l = emptyPlans();
    let p = newPlan('2026-10-06', 'bp-1', T);
    p = toggleHazard(toggleHazard(p, 'hotwork'), 'lifting');
    expect(p.hazards.map((h) => h.id)).toEqual(['hotwork', 'lifting']);
    expect(p.hazards[0]!.control).toBe(hazard('hotwork')!.control);
    p = setControl(p, 'hotwork', 'Permit 114; fire watch is Diaz.');
    p = toggleHazard(p, 'x:wasps', 'Wasps in the rack');
    expect(p.hazards[2]).toEqual({ id: 'x:wasps', label: 'Wasps in the rack', control: '' });
    p = toggleHazard(p, 'lifting');
    expect(p.hazards.map((h) => h.id)).toEqual(['hotwork', 'x:wasps']);
    p = togglePermit({ ...p, task: 'Set L-200', muster: 'North gate' }, 'Hot work');
    p = addCrew(addCrew(addCrew(p, ' J. Ruiz '), 'j. ruiz'), 'K. Diaz');
    expect(p.crew.map((c) => c.name)).toEqual(['J. Ruiz', 'K. Diaz']);
    expect(planGaps(p)).toEqual(['A control for Wasps in the rack', '2 of the crew to sign']);
    l = putPlan(l, p, T + 1);
    expect(planFor(l, '2026-10-06', 'BP-1')?.project).toBe('bp-1');
    // The same slot again replaces, never doubles.
    l = putPlan(l, { ...newPlan('2026-10-06', 'BP-1', T + 5), task: 'Changed' }, T + 5);
    expect(l.plans).toHaveLength(1);
    expect(l.plans[0]!.task).toBe('Changed');
    let q = signCrew(addCrew(p, 'M. Lee'), 'J. Ruiz', SIG, T + 10);
    expect(q.crew[0]!.sig).toBe(SIG);
    q = signForeman(q, 'A. Hand', SIG, T + 20);
    expect(isClosed(q)).toBe(true);
    expect(isClosed(reopen(q))).toBe(false);
    expect(reopen(q).foreman.name).toBe('A. Hand');
  });

  test('stored and read back; damage and a doubled slot dropped', () => {
    const p = signForeman(toggleHazard({ ...newPlan('2026-10-06', 'BP-1', T), task: 'Set L-200', muster: 'Gate' }, 'falls'), 'A. Hand', SIG, T + 1);
    const l = putPlan(emptyPlans(), p, T + 1);
    const raw = JSON.parse(serialisePlans(l));
    raw.plans.push({ ...raw.plans[0], id: 'other' }, { id: 'bad', day: 'not-a-day', createdAt: T }, { ...raw.plans[0], id: 'sig', foreman: { name: 'X', sig: 'garbage', signedAt: T } });
    const back = parsePlans(JSON.stringify(raw));
    expect(back.plans).toEqual(l.plans);
    expect(back.dropped).toBe(3);
    expect(parsePlans('{"v":9,"plans":[]}').foreign).toBe(true);
    expect(STORES.find((s) => s.key === 'pipefit.pretask.v1')?.idOf({ day: '2026-10-06', project: 'bp-1' })).toBe('2026-10-06|BP-1');
  });

  test('the toolbox talk of the day walks through the built-in modules', () => {
    const days = Array.from({ length: BUILTIN.length }, (_, i) => `2026-10-${String(6 + i).padStart(2, '0')}`);
    expect(new Set(days.map(talkFor)).size).toBe(BUILTIN.length);
    expect(BUILTIN.map((m) => m.title)).toContain(talkFor('2026-10-06'));
  });

  test('every hazard in the library has a control that says what to do', () => {
    expect(HAZARDS.length).toBeGreaterThanOrEqual(15);
    for (const h of HAZARDS) expect(h.control.length).toBeGreaterThan(40);
    expect(new Set(HAZARDS.map((h) => h.id)).size).toBe(HAZARDS.length);
  });

  test('a closed plan is a record in the skills passport; an open one is not', () => {
    const open = { ...newPlan('2026-10-06', 'BP-1', T), task: 'Set L-200' };
    const closed = signForeman(open, 'A. Hand', SIG, T + 1);
    expect(evidence({ plans: [open] }).filter((e) => e.skill === 'pretask')).toEqual([]);
    expect(evidence({ plans: [closed] }).filter((e) => e.skill === 'pretask')[0]).toMatchObject({ what: 'Set L-200', project: 'BP-1', at: T + 1 });
  });

  test('on paper: the task, each hazard with its control, the talk, every signature, and what is still wanted', () => {
    const p = signCrew(addCrew(toggleHazard({ ...newPlan('2026-10-06', 'BP-1', T), task: 'Set L-200', muster: 'North gate', talk: { topic: 'Hot work and fire', notes: 'Fire watch stays 30 min.' } }, 'hotwork'), 'J. Ruiz'), 'J. Ruiz', SIG, T + 1);
    const html = pretaskHtml({ plan: p, printedAt: T + 2 });
    expect(html).toContain('Pre-task plan · Tue 6 Oct 2026 · BP-1');
    expect(html).toContain('Open: not yet signed by the foreman');
    expect(html).toContain('<td>Hot work</td><td>Permit in hand;');
    expect(html).toContain('Hot work and fire');
    expect(html).toContain('<td>J. Ruiz</td><td class="sig"><svg');
    expect(html).not.toContain('Still wanted');
    const closed = signForeman(p, 'A. Hand', SIG, T + 3);
    expect(pretaskHtml({ plan: closed, printedAt: T + 4 })).toContain('Closed by A. Hand');
  });
});

describe('by voice', () => {
  const say = (over: Partial<Parameters<typeof applyPretask>[1]> = {}) => ({ action: 'pretask' as const, say: 'ok', task: '', hazards: [], talk: '', crew: [], ...over });

  test("Claude's answer is read: only hazards the library knows, names and a talk topic", () => {
    const a = readVoice({ action: 'pretask', say: 'Noted.', hazards: ['hotwork', 'nonsense', 'lifting'], crewNames: ['Ruiz', ' Diaz ', ''], talk: 'Hot work and fire', task: 'Set L-200' });
    expect(a).toEqual({ action: 'pretask', say: 'Noted.', task: 'Set L-200', hazards: ['hotwork', 'lifting'], talk: 'Hot work and fire', crew: ['Ruiz', 'Diaz'] });
    expect(readVoice({ action: 'pretask', say: 'Nothing.', hazards: ['nonsense'] })).toEqual({ action: 'none', say: 'Nothing.' });
  });

  test("today's plan gets what was said, started if it has not been, and never doubled", () => {
    const { log, plan } = applyPretask(emptyPlans(), say({ hazards: ['hotwork', 'lifting'], crew: ['Ruiz', 'Diaz'], talk: 'Hot work and fire' }), 'BP-1', T);
    expect(plan.day).toBe('2026-10-06');
    expect(plan.hazards.map((h) => h.id)).toEqual(['hotwork', 'lifting']);
    expect(plan.hazards[0]!.control).toBe(hazard('hotwork')!.control);
    expect(plan.crew.map((c) => c.name)).toEqual(['Ruiz', 'Diaz']);
    expect(plan.talk.topic).toBe('Hot work and fire');
    const again = applyPretask(log, say({ hazards: ['hotwork'], crew: ['ruiz'], task: 'Set L-200' }), 'BP-1', T + 60_000);
    expect(again.log.plans).toHaveLength(1);
    expect(again.plan.hazards).toHaveLength(2);
    expect(again.plan.crew).toHaveLength(2);
    expect(again.plan.task).toBe('Set L-200');
    // On nights, 4 am goes on the night's plan.
    expect(applyPretask(emptyPlans(), say({ hazards: ['falls'] }), 'BP-1', new Date(2026, 9, 7, 4).getTime(), 'nights').plan.day).toBe('2026-10-06');
  });
});
