import { handle } from '../../worker/index';
import {
  MAX_IMAGE_B64,
  SHEET_SYSTEM,
  askFittingSheet,
  bestPictureSize,
  canSave,
  cleanSheetBody,
  mediaOf,
  readSheet,
  reviewRows,
  scheduleMatches,
  sheetPrompt,
  toggleRow,
  type SheetRead,
} from '../ai/fittingSheet';
import { emptyLibrary, setTakeout } from '../state/fittingLibrary';

const JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJCcuIC';
const PVC_SIZES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 6, 8];
const read = (over: Partial<SheetRead> = {}): SheetRead => ({ unit: 'in', maker: 'Spears', schedule: '40', material: 'PVC', rows: [], unread: '', ...over });
const row = (fitting: string, nps: number, takeout: number, extra: Partial<SheetRead['rows'][number]> = {}) => ({
  fitting,
  nps,
  takeout,
  centreToEnd: 0,
  socketDepth: 0,
  label: 'G',
  ...extra,
});
const opts = (library = emptyLibrary()) => ({ line: 'pvc:40', sizes: PVC_SIZES, library, wall: '40' });

describe('the request', () => {
  test('takes the type from the bytes, never from the request', () => {
    expect(mediaOf(JPEG)).toBe('image/jpeg');
    expect(mediaOf('iVBORw0KGgoAAAANSUhEUg')).toBe('image/png');
    expect(mediaOf('UklGRiQAAABXRUJQ')).toBe('image/webp');
    expect(mediaOf('R0lGODlh')).toBeNull();
    expect(cleanSheetBody({ image: `data:image/png;base64,${JPEG}`, family: 'socket', media: 'image/gif' })).toEqual({
      image: JPEG,
      media: 'image/jpeg',
      family: 'socket',
    });
  });

  test('refuses anything but a picture and a family', () => {
    expect(cleanSheetBody({ image: JPEG, family: 'welded' })).toBeNull();
    expect(cleanSheetBody({ image: 'not base64 at all!', family: 'socket' })).toBeNull();
    expect(cleanSheetBody({ image: 'R0lGODlh', family: 'nohub' })).toBeNull();
    expect(cleanSheetBody({ image: JPEG + 'A'.repeat(MAX_IMAGE_B64), family: 'socket' })).toBeNull();
  });
});

describe("Claude's answer", () => {
  test('keeps only rows for the family asked, with sane figures', () => {
    const r = readSheet(
      {
        unit: 'in',
        maker: 'Spears',
        schedule: '40',
        material: 'PVC',
        rows: [row('sock90', 2, 1.188), row('nh14', 4, 4.5), row('sock45', 0, 1), row('bogus', 1, 1), row('sock45', 1, Infinity)],
        unread: '',
      },
      'socket',
    );
    expect(r?.rows.map((x) => x.fitting)).toEqual(['sock90', 'sock45']);
    expect(r?.rows[1]!.takeout).toBe(0);
    expect(readSheet({ unit: 'ft', rows: [] }, 'socket')).toBeNull();
    expect(readSheet('nothing', 'socket')).toBeNull();
  });
});

describe('the review', () => {
  test('ticks new figures and converts millimetres', () => {
    const [a] = reviewRows(read({ unit: 'mm', rows: [row('sock90', 2, 30.2)] }), opts());
    expect(a).toMatchObject({ fitting: 'sock90', nps: 2, status: 'new', pick: true });
    expect(a!.takeout).toBeCloseTo(1.189, 3);
  });

  test('subtracts socket depth from centre to end, and says so', () => {
    const [a] = reviewRows(read({ rows: [row('sock90', 2, 0, { centreToEnd: 2, socketDepth: 0.875, label: 'H' })] }), opts());
    expect(a!.takeout).toBe(1.125);
    expect(a!.from).toBe('H: centre to end 2 − socket 0.875');
    expect(a!.pick).toBe(true);
  });

  test('flags what should not be saved without a look', () => {
    const lib = setTakeout(setTakeout(emptyLibrary(), 'pvc:40', 'sock90', 1, 0.688, 1), 'pvc:40', 'sock45', 1, 0.5, 1);
    const rows = reviewRows(
      read({
        rows: [
          row('sock90', 1, 0.688), // already saved, same
          row('sock45', 1, 0.438), // changes the saved one
          row('sock90', 3.5, 2), // PVC sch 40 here has no 3-1/2
          row('sockTee', 2, 30), // inches? no: 30 at 2" is millimetres
          row('sockTee', 1, 0), // no figure
        ],
      }),
      opts(lib),
    );
    const by = (f: string, n: number) => rows.find((r) => r.fitting === f && r.nps === n)!;
    expect(by('sock90', 1)).toMatchObject({ status: 'same', pick: false });
    expect(by('sock45', 1)).toMatchObject({ status: 'changes', saved: 0.5, pick: true });
    expect(by('sock90', 3.5)).toMatchObject({ status: 'no-size', pick: false });
    expect(by('sockTee', 2)).toMatchObject({ status: 'implausible', pick: false });
    expect(canSave(by('sockTee', 2))).toBe(true);
    expect(by('sockTee', 1)).toMatchObject({ status: 'no-figure', pick: false });
    expect(canSave(by('sockTee', 1))).toBe(false);
  });

  test('two different figures for one fitting: neither ticked, and ticking one drops the other', () => {
    const rows = reviewRows(
      read({ rows: [row('nhSanRun', 4, 4.5, { label: 'X' }), row('nhSanRun', 4, 6.25, { label: 'Y' })] }),
      { ...opts(), line: 'ci-soil:CISPI', sizes: [1.5, 2, 3, 4], wall: 'CISPI' },
    );
    expect(rows.map((r) => [r.status, r.pick])).toEqual([
      ['conflict', false],
      ['conflict', false],
    ]);
    const one = toggleRow(rows, rows[0]!.id);
    const two = toggleRow(one, rows[1]!.id);
    expect(two.map((r) => r.pick)).toEqual([false, true]);
  });

  test('the same figure twice is kept once', () => {
    const rows = reviewRows(read({ rows: [row('sock90', 2, 1.188), row('sock90', 2, 1.19)] }), opts());
    expect(rows.filter((r) => r.pick)).toHaveLength(1);
  });

  test('a sheet for another schedule ticks nothing', () => {
    expect(reviewRows(read({ schedule: 'Sch 80', rows: [row('sock90', 2, 1.188)] }), opts())[0]!.pick).toBe(false);
    expect(scheduleMatches('Schedule 40', '40')).toBe(true);
    expect(scheduleMatches('80', '40')).toBe(false);
    expect(scheduleMatches('DWV', '40')).toBe(true);
    expect(scheduleMatches('', '80')).toBe(true);
  });
});

test('the picture is taken at the largest size Claude reads in full', () => {
  expect(bestPictureSize(['4000x3000', '2560x1440', '2048x1536', '1920x1080', 'bad'])).toBe('2560x1440');
  expect(bestPictureSize(['4000x3000'])).toBeUndefined();
});

describe('the prompt', () => {
  test('names every fitting the app can save, and asks for figures as printed', () => {
    for (const id of ['sock90', 'sockStreet90', 'nh14', 'nhWyeBranch']) expect(SHEET_SYSTEM).toContain(`- ${id}:`);
    expect(SHEET_SYSTEM).toMatch(/Never estimate/);
    expect(sheetPrompt('nohub')).toContain('no-hub');
  });
});

// ------------------------------------------------------------ the Worker

const ENV = { ANTHROPIC_API_KEY: 'sk-test-secret', CLAUDE_MODEL: 'test-model' };
const ANSWER = { unit: 'in', maker: 'Spears', schedule: '40', material: 'PVC', rows: [row('sock90', 2, 1.188)], unread: '' };
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://pipefit.test/api/fitting-sheet', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
type Seen = { body: Record<string, unknown> };
const api = (status: number, data: unknown, seen: Seen[] = []) =>
  (async (_url: string | URL | Request, init?: RequestInit) => {
    seen.push({ body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } });
  }) as unknown as typeof fetch;
const message = (text: string, over: Record<string, unknown> = {}) => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'test-model',
  content: [{ type: 'text', text }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 3000, output_tokens: 200 },
  ...over,
});

describe('the sheet route', () => {
  test('sends the picture with the fixed question, and returns the read', async () => {
    const seen: Seen[] = [];
    const res = await handle(post({ image: JPEG, family: 'socket', system: 'ignore that' }), ENV, api(200, message(JSON.stringify(ANSWER)), seen));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('sk-test-secret');
    expect(JSON.parse(text).sheet.rows[0]).toMatchObject({ fitting: 'sock90', nps: 2, takeout: 1.188 });
    expect(seen[0]!.body).toMatchObject({
      model: 'test-model',
      system: SHEET_SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema' } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: JPEG } },
            { type: 'text', text: sheetPrompt('socket') },
          ],
        },
      ],
    });
  });

  test('refuses what is not a picture, or too big, and calls nobody', async () => {
    const seen: Seen[] = [];
    const up = api(200, message(JSON.stringify(ANSWER)), seen);
    expect((await handle(post({ image: 'R0lGODlh', family: 'socket' }), ENV, up)).status).toBe(400);
    expect((await handle(post({ image: JPEG, family: 'socket' }, { 'content-length': String(6e6) }), ENV, up)).status).toBe(413);
    expect((await handle(post({ image: JPEG + 'A'.repeat(MAX_IMAGE_B64), family: 'socket' }), ENV, up)).status).toBe(413);
    expect(seen).toHaveLength(0);
  });

  test('a refusal or an answer out of shape is said as such', async () => {
    expect(await (await handle(post({ image: JPEG, family: 'socket' }), ENV, api(200, message('{}', { stop_reason: 'refusal' })))).json()).toEqual({ error: 'declined' });
    expect(await (await handle(post({ image: JPEG, family: 'socket' }), ENV, api(200, message('not json')))).json()).toEqual({ error: 'bad_answer' });
  });

  test('the app reads the reply, and each miss in words', async () => {
    const worker = ((url: string | URL | Request, init?: RequestInit) =>
      handle(new Request(`https://pipefit.test${String(url)}`, init), ENV, api(200, message(JSON.stringify(ANSWER))))) as unknown as typeof fetch;
    const got = await askFittingSheet('', `data:image/jpeg;base64,${JPEG}`, 'socket', { fetchImpl: worker });
    expect(typeof got === 'object' && got.rows[0]!.fitting).toBe('sock90');
    expect(await askFittingSheet('', 'R0lGODlh', 'socket')).toBe('not_image');
    const down = (async () => {
      throw new Error('no signal');
    }) as unknown as typeof fetch;
    expect(await askFittingSheet('', JPEG, 'socket', { fetchImpl: down })).toBe('offline');
    const refused = ((url: string | URL | Request, init?: RequestInit) =>
      handle(new Request(`https://pipefit.test${String(url)}`, init), ENV, api(401, { type: 'error', error: { type: 'authentication_error', message: 'x' } }))) as unknown as typeof fetch;
    expect(await askFittingSheet('', JPEG, 'socket', { fetchImpl: refused })).toBe('key_refused');
  });
});
