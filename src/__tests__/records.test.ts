import { hazardsIn, recordAnswer, spoken } from '../voice/records';
import { readVoice } from '../ai/voice';

const a = (s: string) => recordAnswer(s);

describe('what was said, as figures', () => {
  test('number words become digits; an inch and a half is 1.5', () => {
    expect(spoken('Three two-inch welds')).toBe('3 2 inch welds');
    expect(spoken("an inch and a half weld")).toBe('1.5 inch weld');
    expect(spoken("it's at one fifty")).toBe('its at 1 50');
  });
});

describe('the shift report', () => {
  test('welds, by size and count', () => {
    expect(a('3 two inch welds')).toMatchObject({ action: 'shift', welds: [{ nps: 2, count: 3 }] });
    expect(a('we welded 4 welds on 6 inch')).toMatchObject({ welds: [{ nps: 6, count: 4 }] });
    expect(a('a 2 inch weld')).toMatchObject({ welds: [{ nps: 2, count: 1 }] });
    expect(a('an inch and a half weld')).toMatchObject({ welds: [{ nps: 1.5, count: 1 }] });
    expect(a('shift report: 2 four inch welds')).toMatchObject({ welds: [{ nps: 4, count: 2 }] });
  });
  test('a weld that is not a pipe size, or welds with no size, go to the cloud', () => {
    expect(a('3 welds')).toBeNull();
    expect(a('3 7 inch welds')).toBeNull();
  });
  test('a reject, by its mark and why', () => {
    expect(a('weld 14 rejected for porosity')).toMatchObject({ action: 'shift', rejects: [{ id: '14', note: 'Porosity' }] });
    expect(a('weld W-14 was rejected for lack of fusion')).toMatchObject({ rejects: [{ id: 'W14', note: 'Lack of fusion' }] });
    expect(a('reject on weld 7')).toMatchObject({ rejects: [{ id: '7', note: '' }] });
  });
  test('spools done, the crew, the hours', () => {
    expect(a('spools 3 and 4 done')).toMatchObject({ spools: ['3', '4'] });
    expect(a('finished spool A12')).toMatchObject({ spools: ['A12'] });
    expect(a('crew of six')).toMatchObject({ crew: 6 });
    expect(a('6 guys today')).toMatchObject({ crew: 6 });
    expect(a('worked 10 hours')).toMatchObject({ hours: 10 });
  });
  test('a note, filed where it was said to go, in the words it was said in', () => {
    expect(a('Safety: harness check at the rack')).toMatchObject({ note: { key: 'safety', text: 'Harness check at the rack' } });
    expect(a('issue the crane was down till 10')).toMatchObject({ note: { key: 'issues', text: 'The crane was down till 10' } });
    expect(a('plan for tomorrow: hydro on line 4')).toMatchObject({ note: { key: 'tomorrow', text: 'Hydro on line 4' } });
    expect(a('note Pump delivered late')).toMatchObject({ note: { key: 'notes', text: 'Pump delivered late' } });
  });
});

describe('the pressure test', () => {
  test('the hold, a reading, the result', () => {
    expect(a('start the hold at 150')).toMatchObject({ action: 'test', op: 'start_hold', psi: 150 });
    expect(a('reading 148 psi')).toMatchObject({ op: 'reading', psi: 148 });
    expect(a('148 psi')).toMatchObject({ op: 'reading', psi: 148 });
    expect(a('end the hold at 147')).toMatchObject({ op: 'end_hold', psi: 147 });
    expect(a('test passed')).toMatchObject({ op: 'pass' });
    expect(a('test failed leak at flange 3')).toMatchObject({ op: 'fail', leaks: 'Flange 3' });
  });
  test('a bare number is not a reading', () => expect(a('148')).toBeNull());
});

describe('the pre-task plan', () => {
  test('hazards by any name a crew uses', () => {
    expect(a('hazards hot work and lifting')).toMatchObject({ action: 'pretask', hazards: ['hotwork', 'lifting'] });
    expect(hazardsIn('pinch points, noise and heat or cold stress')).toEqual(['pinch', 'noise', 'heat']);
    expect(hazardsIn('lifting and rigging')).toEqual(['lifting']);
    expect(hazardsIn('hot work and unicorns')).toBeNull();
  });
  test('the task, the talk, the crew', () => {
    expect(a('task is tie in at rack 3')).toMatchObject({ action: 'pretask', task: 'Tie in at rack 3' });
    expect(a('toolbox talk ladder safety')).toMatchObject({ action: 'pretask', talk: 'Ladder safety' });
    expect(a('crew is john and luis')).toMatchObject({ action: 'pretask', crew: ['John', 'Luis'] });
    expect(a('Pre-task plan: hazards confined space')).toMatchObject({ hazards: ['confined'] });
  });
});

describe('the handbook', () => {
  test('a question opens the table that holds the answer', () => {
    expect(a("what's the takeout on a 45")).toMatchObject({ action: 'answer', table: 'takeout-45' });
    expect(a("what's the takeout on a 2 inch 90")).toMatchObject({ table: 'takeout-90' });
    expect(a('how long is a 6 inch weld neck')).toMatchObject({ table: 'welding-necks' });
    expect(a('look up the u bolts')).toMatchObject({ table: 'u-bolts' });
  });
  test('a question the handbook does not hold goes to the cloud', () => expect(a('what time is it')).toBeNull());
});

describe('every answer is one the cloud reader would accept', () => {
  test.each(['3 two inch welds', 'weld 14 rejected for porosity', 'crew of 6', 'start the hold at 150', 'hazards hot work', "what's the takeout on a 45"])('%s', (s) => {
    const out = a(s)!;
    const back: Record<string, unknown> = { ...out };
    // The reader's own field names for what it reads back.
    if (out.action === 'test') Object.assign(back, { testOp: out.op });
    if (out.action === 'pretask') Object.assign(back, { crewNames: out.crew });
    if (out.action === 'shift' && out.note) Object.assign(back, { noteKey: out.note.key, noteText: out.note.text });
    expect(readVoice(back)).toEqual(out);
  });
});

describe('what is not a record', () => {
  test.each(['rolling offset', 'hello there', 'weld 14', 'save', 'amperage 180'])('%s', (s) => expect(a(s)).toBeNull());
});
