import { MAX_LEARNED, alignToWords, alignTranscripts, applyLearned, emptyLearned, forgetAll, learn, learnedMap, parseLearned, serialiseLearned, setLearnedWords } from '../voice/learned';
import { VOCAB, localIntent, routeWords, spokenValue } from '../voice/intent';
import { cameraWord } from '../voice/cameraWords';
import { readTick } from '../voice/cutTick';
import { STORES } from '../state/backup';

const T = Date.UTC(2026, 9, 18, 12);

afterEach(() => setLearnedWords(new Map()));

describe('the book of learned words', () => {
  test('survives the store, and drops what does not hold up', () => {
    const b = learn(emptyLearned(), [{ said: 'volt', meant: 'bolt' }, { said: 'tork', meant: 'torque' }], T);
    const back = parseLearned(serialiseLearned(b));
    expect(back.pairs).toEqual(b.pairs);
    expect(back.dropped).toBe(0);
    expect(parseLearned('rubbish').dropped).toBe(1);
    expect(parseLearned(JSON.stringify({ v: 2, pairs: [] })).foreign).toBe(true);
    expect(parseLearned(JSON.stringify({ v: 1, pairs: [{ said: 'volt', meant: 'bolt' }, { said: 'Volt', meant: 'bolt' }, { said: 'volt', meant: 'bolts' }, 7] }))).toMatchObject({ pairs: [{ said: 'volt', meant: 'bolt', times: 1 }], dropped: 3 });
    expect(parseLearned(null)).toEqual(emptyLearned());
  });

  test('a pair taught again counts again; a word taught anew means the new thing', () => {
    let b = learn(emptyLearned(), [{ said: 'volt', meant: 'bolt' }], T);
    b = learn(b, [{ said: 'volt', meant: 'bolt' }], T + 1);
    expect(b.pairs).toEqual([{ said: 'volt', meant: 'bolt', at: T + 1, times: 2 }]);
    b = learn(b, [{ said: 'volt', meant: 'bolts' }], T + 2);
    expect(b.pairs[0]).toMatchObject({ meant: 'bolts', times: 3 });
    expect(learn(b, [{ said: 'volt', meant: 'volt' }, { said: '12', meant: 'bolt' }], T + 3)).toBe(b);
    expect(learnedMap(b).get('volt')).toBe('bolts');
    expect(forgetAll(b).pairs).toEqual([]);
  });

  test('past the cap the oldest go', () => {
    let b = emptyLearned();
    for (let i = 0; i < MAX_LEARNED + 5; i += 1) b = learn(b, [{ said: `w${i}x`, meant: 'bolt' }], T + i);
    expect(b.pairs.length).toBe(MAX_LEARNED);
    expect(b.pairs.some((p) => p.said === 'w0x')).toBe(false);
    expect(b.pairs.some((p) => p.said === `w${MAX_LEARNED + 4}x`)).toBe(true);
  });
});

describe('what is learned', () => {
  test('the words that differ between the top transcript and the one that made sense', () => {
    expect(alignTranscripts('flange bolt up 12 volt', 'flange bolt up 12 bolt', VOCAB)).toEqual([{ said: 'volt', meant: 'bolt' }]);
    expect(alignTranscripts('12 volt', 'twelve bolt', VOCAB)).toEqual([{ said: 'volt', meant: 'bolt' }]);
    // A different shape, or too many differences, is a different sentence, not a slip.
    expect(alignTranscripts('flange bolt up volt', 'flange bolt up 12 bolt', VOCAB)).toEqual([]);
    expect(alignTranscripts('vault cup tray volt', 'bolt up the bolt', VOCAB)).toEqual([]);
    // A known word is never relearned as something else; an unknown target teaches nothing.
    expect(alignTranscripts('cut list', 'cut length', VOCAB)).toEqual([]);
    expect(alignTranscripts('bolt up giraffe', 'bolt up zebra', VOCAB)).toEqual([]);
  });

  test('the unknown words of a sentence Claude read, against the names of what it opened', () => {
    expect(alignToWords('tork pattern', routeWords('FlangeBoltUp'), VOCAB)).toEqual([{ said: 'tork', meant: 'torque' }]);
    expect(alignToWords('bring up the hydrow test', routeWords('PressureTests'), VOCAB)).toEqual([{ said: 'hydrow', meant: 'hydro' }]);
    expect(alignToWords('the weather', routeWords('FlangeBoltUp'), VOCAB)).toEqual([]);
    expect(alignToWords('open the bolt up', routeWords('FlangeBoltUp'), VOCAB)).toEqual([]);
    expect(alignToWords('galvanize pipe', ['galvanized', 'galvanised'], VOCAB)).toEqual([{ said: 'galvanize', meant: 'galvanized' }]);
    // As near to two names as to each other: nothing is learned.
    expect(alignToWords('balt up', ['bolt', 'belt'], VOCAB)).toEqual([]);
  });

  test('a learned word is read as meant before any matching, and a known word never', () => {
    expect(applyLearned(['tork', 'pattern', 'bolt'], VOCAB, new Map([['tork', 'torque'], ['bolt', 'volt']]))).toEqual(['torque', 'pattern', 'bolt']);
    setLearnedWords(new Map([['tork', 'torque'], ['dun', 'done'], ['snapshot', 'snap'], ['tree', 'three']]));
    expect(localIntent('tork pattern', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp' });
    expect(readTick('4 dun')).toEqual({ kind: 'set', key: '4', done: true });
    expect(cameraWord('snapshot')).toBe('shoot');
    expect(spokenValue('tree foot', 'length')).toEqual({ n: 36, inches: true });
    setLearnedWords(new Map());
    expect(localIntent('tork pattern', null)).toBeNull();
  });
});

test('the learned words go into the backup', () => {
  expect(STORES.some((s) => s.key === 'pipefit.heard.v1' && s.field === 'pairs')).toBe(true);
});
