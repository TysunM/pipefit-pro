// The records, said on the phone
// ------------------------------
// The shift report, the pre-task plan, the pressure test and the handbook
// hear their everyday sentences here, on the phone, with no signal and at no
// cost: "3 two inch welds", "weld 14 rejected for porosity", "crew of 6",
// "10 hours", "safety: harness check at the rack", "start the hold at 150",
// "reading 148 psi", "test passed", "hazards hot work and lifting", "toolbox
// talk ladders", "crew is John and Luis", "what's the takeout on a 45".
//
// The answer is the shape the cloud gives (ai/voice.ts VoiceAnswer), so it is
// checked by the same reader and written the same way: said back, with an
// Undo. A sentence that is not one of these, or that says two things at
// once, goes on to the cloud rather than being half done here.

import { numberAt, tokens } from './words';
import { HAZARDS } from '../state/pretask';
import { WELD_SIZES } from '../state/shiftLog';
import { REFERENCE_TABLES } from '../calc/reference';
import { readVoice, type VoiceAnswer } from '../ai/voice';

const N = '(\\d+(?:\\.\\d+)?)';

/** Said, lower case, apostrophes gone, numbers as digits: "three 2-inch welds" is "3 2 inch welds". */
export function spoken(said: string): string {
  const ws = tokens(
    said
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/\b(?:an? )?inch and a half\b/g, '1.5 inch')
      .replace(/\b(?:an? )?inch and a quarter\b/g, '1.25 inch')
      .replace(/\b(?:an? )?inch and three quarters?\b/g, '1.75 inch'),
  );
  const out: string[] = [];
  for (let i = 0; i < ws.length; ) {
    const n = numberAt(ws, i);
    if (n && n.next > i) {
      out.push(String(Number(n.value.toFixed(4))));
      i = n.next;
    } else out.push(ws[i++]!);
  }
  return out.join(' ');
}

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** A mark as it is stamped: "w 14" is W14, "14 a" is 14A. */
const mark = (s: string): string => s.trim().split(/\s+/).join('').toUpperCase().slice(0, 60);
const sizeText = (n: number) => (Number.isInteger(n) ? `${n}` : `${n}`.replace(/^0/, ''));

/** The raw words after a lead-in, as they were said (capitals kept), for notes and tasks. */
function after(said: string, lead: RegExp): string | null {
  const m = said.replace(/['’]/g, '').match(lead);
  return m ? cap(m[m.length - 1]!.trim()) : null;
}

/** Every answer goes back through the cloud's own reader, so a phone answer can never be shaped differently. */
const checked = (v: Record<string, unknown>): VoiceAnswer | null => {
  const a = readVoice(v);
  return a && a.action !== 'none' ? a : null;
};

// ------------------------------------------------------------ pressure test

function testAnswer(s: string): VoiceAnswer | null {
  let m = s.match(new RegExp(`^(?:start(?:ing)?|begin(?:ning)?) (?:the |a )?hold(?: at| on| with)? ${N}(?: psi| pounds?)?$`));
  if (m) return checked({ action: 'test', testOp: 'start_hold', psi: Number(m[1]), say: `Hold started at ${m[1]} psi.` });
  m = s.match(new RegExp(`^(?:end(?:ing)?|stop|finish|close)(?: the)? hold(?: at| on)? ${N}(?: psi| pounds?)?$`));
  if (m) return checked({ action: 'test', testOp: 'end_hold', psi: Number(m[1]), say: `Hold ended at ${m[1]} psi.` });
  m =
    s.match(new RegExp(`^(?:gauge|gage|reading|reads|holding|its at|its reading|it is at|pressure)(?: reads| reading| is| at| of)? ${N}(?: psi| pounds?)?$`)) ??
    s.match(new RegExp(`^${N} (?:psi|pounds?)(?: on the gauge)?$`));
  if (m) return checked({ action: 'test', testOp: 'reading', psi: Number(m[1]), say: `Reading ${m[1]} psi.` });
  if (/^(?:the )?test (?:passed|pass|is good|held|good)$|^(?:it )?(?:passed|held)$|^good test$|^pass(?:ed)? the test$/.test(s)) return checked({ action: 'test', testOp: 'pass', say: 'Test passed.' });
  m = s.match(/^(?:(?:the )?test (?:failed|fail)|(?:it )?failed|fail(?:ed)? the test)(?: (?:with )?(?:a )?(?:leak|leaks|leaking)(?: at| on| from| in)? (.+))?$/);
  if (m) return checked({ action: 'test', testOp: 'fail', leaks: m[1] ? cap(m[1]) : '', say: m[1] ? `Test failed: leak at ${m[1]}.` : 'Test failed.' });
  return null;
}

// ------------------------------------------------------------ shift report

const MADE = '(?:we )?(?:made |welded |did |finished |got |completed |welding )?';

function weldAnswer(s: string): VoiceAnswer | null {
  let count: number | null = null;
  let nps: number | null = null;
  let m = s.match(new RegExp(`^${MADE}${N} (?:more )?${N} ?(?:inch|in)? welds?$`));
  if (m) [count, nps] = [Number(m[1]), Number(m[2])];
  m ??= s.match(new RegExp(`^${MADE}${N} welds? (?:on |of |in |at )?(?:the )?${N} ?(?:inch|in)?(?: pipe| line)?$`));
  if (m && count === null) [count, nps] = [Number(m[1]), Number(m[2])];
  m ??= s.match(new RegExp(`^${MADE}(?:a |one |another )?${N} ?(?:inch|in) weld$`));
  if (m && count === null) [count, nps] = [1, Number(m[1])];
  if (count === null || nps === null || !Number.isInteger(count) || count < 1 || !WELD_SIZES.includes(nps)) return null;
  return checked({ action: 'shift', welds: [{ nps, count }], say: `${count} ${sizeText(nps)} inch weld${count === 1 ? '' : 's'} on the shift report.` });
}

function rejectAnswer(s: string): VoiceAnswer | null {
  const why = '(?: (?:for|because of|because|due to|with|on))?(?: (.+))?';
  const m =
    s.match(new RegExp(`^(?:weld|joint) ([a-z0-9]+(?: [a-z0-9]+)?) (?:was |got |is )?(?:rejected|reject|failed|cut out|shot bad|failed x ray|failed rt)${why}$`)) ??
    s.match(new RegExp(`^(?:reject|rejected|rejection|cut out)(?: on)? (?:weld|joint) ([a-z0-9]+(?: [a-z0-9]+)?)${why}$`));
  if (!m) return null;
  const id = mark(m[1]!);
  const note = m[2] ? cap(m[2]) : '';
  return checked({ action: 'shift', rejects: [{ id, note }], say: `Weld ${id} rejected${note ? `, ${note.toLowerCase()}` : ''}, on the shift report.` });
}

function spoolAnswer(s: string): VoiceAnswer | null {
  const m =
    s.match(/^spools? (.+?) (?:is |are )?(?:done|complete|completed|finished|built|fabbed|fabricated)$/) ??
    s.match(/^(?:finished|completed|built|fabbed|done with) spools? (.+)$/);
  if (!m) return null;
  const ids = m[1]!.split(/ and | & |,| plus /).map(mark).filter(Boolean);
  if (!ids.length || ids.some((x) => x.length > 12)) return null;
  return checked({ action: 'shift', spools: ids, say: `Spool${ids.length === 1 ? '' : 's'} ${ids.join(' and ')} done, on the shift report.` });
}

function crewAnswer(s: string): VoiceAnswer | null {
  const m =
    s.match(new RegExp(`^(?:crew(?: of| is| size| size is| count| count is)?|we (?:had|have)(?: a crew of)?) ${N}(?: (?:guys|men|hands|people|workers|on the crew|on it|today))?$`)) ??
    s.match(new RegExp(`^${N} (?:man |person |hand )?crew$`)) ??
    s.match(new RegExp(`^${N} (?:guys|men|hands|people|workers)(?: on the crew| today| on site)?$`));
  if (!m) return null;
  return checked({ action: 'shift', crew: Number(m[1]), say: `Crew of ${m[1]} on the shift report.` });
}

function hoursAnswer(s: string): VoiceAnswer | null {
  const m = s.match(new RegExp(`^(?:we )?(?:worked |work |put in |shift was )?${N} (?:hours?|hrs?)(?: today| shift| day| worked)?$`)) ?? s.match(new RegExp(`^${N} hour (?:day|shift)$`));
  if (!m) return null;
  return checked({ action: 'shift', hours: Number(m[1]), say: `${m[1]} hours on the shift report.` });
}

const NOTE_LEAD = /^\s*(?:(?:add|put|log)\s+)?(?:an?\s+)?(?:(?:to|on)\s+the\s+)?(?:shift\s+report\s*)?(notes?|issues?|problem|safety(?:\s+(?:note|issue))?|tomorrow|plan\s+for\s+tomorrow|tomorrows\s+plan|for\s+tomorrow)\s*[:,-]?\s+(.+)$/i;

function noteAnswer(said: string): VoiceAnswer | null {
  const m = said.replace(/['’]/g, '').match(NOTE_LEAD);
  if (!m) return null;
  const kind = m[1]!.toLowerCase();
  const key = kind.startsWith('safety') ? 'safety' : /tomorrow/.test(kind) ? 'tomorrow' : /issue|problem/.test(kind) ? 'issues' : 'notes';
  const text = cap(m[2]!.trim());
  const where = { safety: 'safety', tomorrow: 'tomorrow', issues: 'issues', notes: 'notes' }[key];
  return checked({ action: 'shift', noteKey: key, noteText: text, say: `Under ${where} on the shift report: ${text}` });
}

// ------------------------------------------------------------ pre-task plan

/** What each hazard on the list is called on a job, besides its label. */
const HAZARD_WORDS: Record<string, readonly string[]> = {
  pinch: ['pinch points', 'pinch point', 'pinch', 'hands'],
  falls: ['working at height', 'heights', 'height', 'falls', 'fall', 'fall protection', 'ladders', 'scaffold'],
  dropped: ['dropped objects', 'dropped object', 'dropped', 'falling objects'],
  hotwork: ['hot work', 'welding', 'torch', 'fire'],
  energy: ['stored energy', 'line break', 'lockout', 'lock out', 'loto', 'energy'],
  lifting: ['lifting and rigging', 'lifting', 'rigging', 'crane', 'lifts', 'lift', 'picks'],
  confined: ['confined space', 'confined spaces', 'confined'],
  excavation: ['excavation', 'trench', 'trenching', 'digging'],
  chemical: ['chemicals', 'chemical', 'dust', 'fumes', 'silica'],
  heat: ['heat stress', 'cold stress', 'heat', 'cold'],
  traffic: ['mobile equipment', 'traffic', 'forklift', 'forklifts', 'equipment'],
  noise: ['noise', 'hearing'],
  electrical: ['electrical', 'electric', 'cords', 'power'],
  lineoffire: ['line of fire'],
  slips: ['slips trips and housekeeping', 'slips and trips', 'slips', 'trips', 'housekeeping', 'slip', 'trip'],
  grinding: ['grinding and cutting', 'grinding', 'cutting', 'grinder', 'grinders'],
  simops: ['other crews', 'other trades', 'simops', 'simultaneous ops'],
};

/** Hazard ids for a list as said ("hot work, lifting and pinch points"); null when any part is not one. */
export function hazardsIn(list: string): string[] | null {
  const parts = list
    .split(/,| and | or | plus | & /)
    .map((p) => p.trim().replace(/^the /, ''))
    .filter(Boolean);
  const ids: string[] = [];
  for (const p of parts) {
    const hit = HAZARDS.find((h) => h.label.toLowerCase() === p || h.id === p || HAZARD_WORDS[h.id]?.includes(p));
    if (!hit) return null;
    if (!ids.includes(hit.id)) ids.push(hit.id);
  }
  return ids.length ? ids : null;
}

function pretaskAnswer(said: string, s: string): VoiceAnswer | null {
  let m = s.match(/^(?:add )?(?:the )?hazards?(?: are| is| today| today are| for today)? (.+)$/) ?? s.match(/^add (?:the )?(.+?) hazards?$/);
  if (m) {
    // The list as said, with "and" kept between items for the split.
    const ids = hazardsIn(m[1]!.replace(/ (?:and|plus) /g, ' and '));
    if (!ids) return null;
    const names = ids.map((id) => HAZARDS.find((h) => h.id === id)!.label.toLowerCase());
    return checked({ action: 'pretask', hazards: ids, say: `On the pre-task plan: ${names.join(', ')}.` });
  }
  const talk = after(said, /^\s*(?:the\s+)?(?:toolbox\s+|tool\s+box\s+|safety\s+)?talk(?:\s+(?:is|on|about|topic|topic\s+is|today\s+is|today))?\s*[:,-]?\s+(.+)$/i);
  if (talk) return checked({ action: 'pretask', talk: talk.slice(0, 80), say: `Toolbox talk: ${talk.slice(0, 80)}.` });
  const task = after(said, /^\s*(?:(?:the\s+|todays\s+)?task(?:\s+(?:is|for\s+today\s+is|today\s+is|today))?|(?:today\s+)?we(?:\s+are|re)\s+(?:doing|going\s+to))\s*[:,-]?\s+(.+)$/i);
  if (task) return checked({ action: 'pretask', task, say: `Task on the pre-task plan: ${task}` });
  m = s.match(/^(?:crew(?: is| names| members| today is| today)?|sign in|signed in|signing in) ([a-z ,]+)$/) ?? s.match(/^add ([a-z ,]+?) to the crew$/);
  if (m) {
    const names = m[1]!
      .split(/,| and | & /)
      .map((n) => n.trim().replace(/\b\w/g, (c) => c.toUpperCase()))
      .filter((n) => n && n.length <= 40);
    if (!names.length || names.length > 12) return null;
    return checked({ action: 'pretask', crewNames: names, say: `Signed in on the pre-task plan: ${names.join(', ')}.` });
  }
  return null;
}

// ------------------------------------------------------------ handbook

const ASK = /^(?:whats|what is|what are|how (?:big|long|thick|much|many|far)(?: is| are)?|look up|lookup|find|show me|pull up|wheres|where is|give me|i need)\b ?(.*)$/;
const STOP = new Set(['the', 'a', 'an', 'on', 'of', 'for', 'in', 'to', 'is', 'are', 'what', 'whats', 'how', 'me', 'my', 'it', 'i', 'need', 'table', 'handbook', 'book', 'inch', 'inches', 'size', 'pipe', 'with', 'and', 'do', 'does']);
/** A word as the handbook prints it. */
const ALIAS: Record<string, string> = {
  take: 'takeout', takeouts: 'takeout', ell: 'elbow', ells: 'elbow', elbows: 'elbow', tees: 'tee', threaded: 'screwed', thread: 'threads', npt: 'threads', bolts: 'bolting', bolt: 'bolting', bolting: 'bolting', valves: 'valve', flange: 'flanges', reducers: 'reducer', caps: 'cap', hangers: 'u', hanger: 'u', spacing: 'support', supports: 'support', clearance: 'clearances', weld: 'welding', welded: 'welding', butt: 'welding', copper: 'copper', socket: 'solder',
};
const stem = (w: string): string => ALIAS[w] ?? (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);

function handbookAnswer(s: string): VoiceAnswer | null {
  const m = s.match(ASK);
  if (!m) return null;
  const want = (m[1] ?? '').split(' ').filter((w) => w && !STOP.has(w)).map(stem);
  const words = want.filter((w) => !/^\d/.test(w));
  if (!words.length) return null;
  let best: { id: string; title: string; page: string; score: number } | null = null;
  for (const t of REFERENCE_TABLES) {
    const hay = new Set(`${t.id.replace(/-/g, ' ')} ${t.title} ${t.group} ${t.columns.map((c) => c.label).join(' ')}`.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).map(stem));
    // Every word they asked about counts; a number counts when the title carries it (90, 45, 150, 300).
    const score = words.filter((w) => hay.has(w)).length * 2 + want.filter((w) => /^\d/.test(w) && t.title.includes(w)).length;
    if (score > (best?.score ?? 0)) best = { id: t.id, title: t.title, page: t.page, score };
  }
  // At least one word of theirs, and most of them, found in the one table.
  if (!best || best.score < 2 || best.score < words.length) return null;
  return checked({ action: 'answer', table: best.id, say: `${best.title}, handbook page ${best.page}. Opening it.` });
}

// ------------------------------------------------------------ all of it

/** What a sentence means for the records, worked out on the phone; null for anything else. */
export function recordAnswer(heard: string): VoiceAnswer | null {
  // "Pre-task plan: ..." and "for the shift report ..." name where it goes; the sentence after is what goes there.
  const said = heard.replace(/^\s*(?:please\s+)?(?:(?:add|put|log|record)\s+)?(?:(?:to|on|for)\s+the\s+)?(?:pre[\s-]?task(?:\s+plan)?|jsa)\s*[:,-]?\s*/i, '');
  const s = spoken(said)
    .replace(/^(?:please |ok |okay )+/, '')
    .replace(/^(?:(?:add|put|log|record) )?(?:(?:to|on|for) the )?(?:shift report|pre task plan|pre task|pretask|jsa)\b ?/, '')
    .trim();
  if (!s) return null;
  return testAnswer(s) ?? rejectAnswer(s) ?? weldAnswer(s) ?? spoolAnswer(s) ?? crewAnswer(s) ?? hoursAnswer(s) ?? noteAnswer(said) ?? pretaskAnswer(said, s) ?? handbookAnswer(s);
}
