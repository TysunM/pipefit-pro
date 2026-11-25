import { isToolName } from '../voice/intent';
import { addTarget, clearTargets, matchScreen, sameWord, screenHelp, screenPhrases, targetsOn, type Entry, type Target } from '../voice/onScreen';

const ran: string[] = [];
const press = (label: string): Target => ({ kind: 'press', label, run: () => (ran.push(label), label) });
const pick = (label: string, group?: string, on = false): Target => ({ kind: 'pick', label, group, on, run: () => (ran.push(`${group}:${label}`), label) });
const field = (label: string, type: 'number' | 'text' | 'note' = 'number'): Target => ({ kind: 'field', label, field: type, run: (v) => (ran.push(`${label}=${v}`), v) });

function screen(...ts: Target[]): Entry[] {
  clearTargets();
  for (const t of ts) addTarget(t, 'S');
  return targetsOn('S');
}
const run = (said: string, here: Entry[], whole = true) => {
  const m = matchScreen(said, here, { whole });
  if (!m) return null;
  if (m.kind === 'run') return `${m.target.label}${m.value ? ` <- ${m.value}` : ''}`;
  if (m.kind === 'many') return m.items.map((i) => `${i.target.label} <- ${i.value}`).join(' | ');
  if (m.kind === 'which') return `which: ${m.targets.map((t) => t.label).join(', ')}`;
  return 'help';
};

beforeEach(() => (ran.length = 0));

describe('a label said whole', () => {
  const here = screen(press('Save'), press('Share'), pick('SMAW stick 0.8', 'Process'), pick('None (ASME IX)', 'Process', true), pick('Volts & amps'), pick('Total energy'), press('Send the history as a spreadsheet'));
  test('a button, with or without the words round it', () => {
    expect(run('save', here)).toBe('Save');
    expect(run('Tap save please', here)).toBe('Save');
    expect(run('press the share button', here)).toBe('Share');
  });
  test('a chip on its own, or with its row', () => {
    expect(run('total energy', here)).toBe('Total energy');
    expect(run('volts and amps', here)).toBe('Volts & amps');
    expect(run('SMAW stick 0.8', here)).toBe('SMAW stick 0.8');
    expect(run('process none ASME 9', here)).toBeNull(); // "IX" is not 9: a label is matched as shown
    expect(run('process to SMAW stick 0.8', here)).toBe('SMAW stick 0.8');
  });
  test('a word heard one letter off or by its sound still lands', () => {
    expect(sameWord('shair', 'share')).toBe(true);
    expect(sameWord('saev', 'save')).toBe(true);
    expect(sameWord('12', '13')).toBe(false);
    expect(run('shair', here)).toBe('Share');
  });
  test('part of a long label, after the app-wide commands, when it means one thing', () => {
    expect(run('send the history', here)).toBeNull();
    expect(run('send the history', here, false)).toBe('Send the history as a spreadsheet');
    expect(run('spreadsheet', here, false)).toBe('Send the history as a spreadsheet');
  });
  test('what is not on the screen is not matched', () => {
    expect(run('rolling offset', here, false)).toBeNull();
    expect(run('', here)).toBeNull();
  });
});

describe('two things with one name', () => {
  test('the newest drawn wins: a sheet over its page', () => {
    clearTargets();
    addTarget(press('Cancel'), 'S');
    const sheet = addTarget({ ...press('Cancel'), run: () => 'sheet' }, 'S');
    const m = matchScreen('cancel', targetsOn('S'), { whole: true });
    expect(m?.kind === 'run' && m.target.id).toBe(sheet);
  });
  test('part of two labels asks which', () => {
    const here = screen(press('Edit WPS-101 SMAW fill'), press('Edit the bolting spec'));
    expect(run('edit', here, false)).toBe('which: Edit the bolting spec, Edit WPS-101 SMAW fill');
  });
  test('only what is on the screen in front', () => {
    clearTargets();
    addTarget(press('Save'), 'below');
    addTarget(press('Share'), 'top');
    expect(run('save', targetsOn('top'))).toBeNull();
    expect(run('share', targetsOn('top'))).toBe('Share');
  });
});

describe('a field and its figure', () => {
  const here = screen(field('Amperage'), field('Voltage'), field('Length welded'), field('Arc time'), field('WPS', 'text'), field('Note', 'note'), field('Heat input max'), press('Save'));
  test('its name, then the figure', () => {
    expect(run('amperage 180', here)).toBe('Amperage <- 180');
    expect(run('set the voltage to 24.5', here)).toBe('Voltage <- 24.5');
    expect(run('amps 180', here)).toBe('Amperage <- 180');
    expect(run('heat input max 20', here)).toBe('Heat input max <- 20');
  });
  test('several figures in one breath', () => {
    expect(run('amperage 180 voltage 24 length welded 11.811 arc time 90', here)).toBe('Amperage <- 180 | Voltage <- 24 | Length welded <- 11.811 | Arc time <- 90');
  });
  test('text keeps what was said as it was said', () => {
    expect(run('WPS is WPS-101 Rev 2', here)).toBe('WPS <- WPS-101 Rev 2');
    expect(run('note the pump came late, call Mike', here)).toBe('Note <- the pump came late, call Mike');
  });
  test('clear one', () => {
    expect(run('clear the note', here)).toBe('Note');
    expect(run('amperage blank', here)).toBe('Amperage');
  });
  test("on a tool whose figures have their own matcher, fields wait for it", () => {
    expect(matchScreen('amperage 180', here, { whole: true, fields: false })).toBeNull();
    expect(matchScreen('save', here, { whole: true, fields: false })?.kind).toBe('run');
  });
  test('a name with nothing after it is not a command', () => {
    expect(run('amperage', here)).toBeNull();
  });
});

describe('help and listening', () => {
  const here = screen(press('Save'), field('Amperage'), pick('SMAW', 'Process'));
  test('"what can I say" lists the screen', () => {
    expect(run('what can I say', here)).toBe('help');
    expect(screenHelp(here)).toBe('On this screen you can say: Save, Amperage and a figure, SMAW. Or any tool by name.');
  });
  test('the recogniser is told the labels', () => {
    expect(screenPhrases(here)).toEqual(expect.arrayContaining(['Save', 'Amperage', 'SMAW', 'Process SMAW']));
  });
});

describe('a tool named whole is never a field and its value', () => {
  test('"heat book" on the weld form opens the heat book; "heats A1 B2" still fills the box', () => {
    const here = screen(field('Heats', 'text'), field('Note', 'note'));
    expect(matchScreen('heat book', here, { whole: true, reserved: isToolName })).toBeNull();
    expect(matchScreen('weld log', here, { whole: false, reserved: isToolName })).toBeNull();
    const m = matchScreen('heats A1 B2', here, { whole: true, reserved: isToolName });
    expect(m && m.kind === 'run' && m.target.label).toBe('Heats');
    expect(isToolName('Heat Book')).toBe(true);
    expect(isToolName('orbital welding')).toBe(true);
    expect(isToolName('heats a1')).toBe(false);
  });
});
