import { markKey, readTick } from '../voice/cutTick';

test('a cut ticked off by its mark', () => {
  expect(readTick('4 done')).toEqual({ kind: 'set', key: '4', done: true });
  expect(readTick('mark seven is cut')).toEqual({ kind: 'set', key: '7', done: true });
  expect(readTick('mark one done')).toEqual({ kind: 'set', key: '1', done: true });
  expect(readTick('done with 12')).toEqual({ kind: 'set', key: '12', done: true });
  expect(readTick('line twelve done')).toBeNull();
  expect(readTick('s p twelve one done')).toEqual({ kind: 'set', key: 'sp121', done: true });
  expect(readTick('L12-3 done')?.kind).toBe('set');
  expect(markKey('SP-12-1')).toBe('sp121');
  expect(markKey('L12-3')).toBe('l123');
});

test('and put back', () => {
  expect(readTick('undo 4')).toEqual({ kind: 'set', key: '4', done: false });
  expect(readTick('4 not cut')).toEqual({ kind: 'set', key: '4', done: false });
});

test('"next" asks for the next cut', () => {
  expect(readTick('next')).toEqual({ kind: 'next' });
  expect(readTick("what's next")).toEqual({ kind: 'next' });
});

test("what the phone says back is never a tick", () => {
  expect(readTick('Mark 4 cut. Next, mark 5: 41 and 13 sixteenths inches.')).toBeNull();
  expect(readTick('Mark 4 is to cut again.')).toBeNull();
  expect(readTick('All cut. Nothing left on the list.')).toBeNull();
  expect(readTick('No mark 9 on the list.')).toBeNull();
});

test('a bare number or chatter is not a tick', () => {
  expect(readTick('4')).toBeNull();
  expect(readTick('hand me the grinder')).toBeNull();
  expect(readTick('')).toBeNull();
});

import { addCut, answerTick, emptyCuts, setCutDone } from '../state/cutLog';

describe('answering a tick', () => {
  const T = 1_760_000_000_000;
  const base = { pipeKey: 'cs:40|2', pipe: '2" CS SCH 40', c2c: 48, ends: '' };
  let l = addCut(emptyCuts(), { ...base, cut: 41.8125 }, T);
  l = addCut(l, { ...base, cut: 30.5 }, T + 1);
  l = addCut(l, { ...base, cut: 20, mark: 'SP-12-1' }, T + 2);
  const speak = (v: number) => `${v} inches`;

  test('done: sets it, and says the next', () => {
    const a = answerTick(l.cuts, readTick('1 done')!, speak);
    expect(a.set).toEqual({ id: l.cuts[0]!.id, done: true });
    expect(a.say).toBe('Mark 1 cut. Next, mark 2: 30.5 inches, 2 inch CS SCH 40.');
    expect(answerTick(l.cuts, readTick('s p twelve one done')!, speak).set?.id).toBe(l.cuts[2]!.id);
  });

  test('already done, missing, undo, next and the end of the list', () => {
    const one = setCutDone(l, l.cuts[0]!.id, true);
    expect(answerTick(one.cuts, readTick('1 done')!, speak)).toEqual({ say: 'Mark 1 is already cut.' });
    expect(answerTick(one.cuts, readTick('9 done')!, speak)).toEqual({ say: 'No mark 9 on this list.' });
    expect(answerTick(one.cuts, readTick('undo 1')!, speak).set).toEqual({ id: l.cuts[0]!.id, done: false });
    expect(answerTick(one.cuts, readTick('next')!, speak).say).toBe('Next, mark 2: 30.5 inches, 2 inch CS SCH 40.');
    const all = l.cuts.reduce((acc, c) => setCutDone(acc, c.id, true), l);
    expect(answerTick(all.cuts, readTick('next')!, speak).say).toBe('All cut. Nothing left on the list.');
  });

  test('every reply, heard back by the mic, does nothing', () => {
    const one = setCutDone(l, l.cuts[0]!.id, true);
    const replies = [
      answerTick(l.cuts, readTick('1 done')!, speak).say,
      answerTick(one.cuts, readTick('1 done')!, speak).say,
      answerTick(one.cuts, readTick('9 done')!, speak).say,
      answerTick(one.cuts, readTick('undo 1')!, speak).say,
      answerTick(l.cuts, readTick('undo 1')!, speak).say,
      answerTick(one.cuts, readTick('next')!, speak).say,
      "That's the last one. All cut.",
      'There are 2 mark 4s on this list. Tap the one you mean.',
    ];
    for (const r of replies) expect([r, readTick(r)]).toEqual([r, null]);
  });
});

test('replies with real spoken lengths are never ticks either', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spokenLength } = require('../calc/spoken');
  for (const v of [30.5, 41.8125, 12, 0.5, 120.0625]) {
    for (const sys of ['imperial', 'metric'] as const) {
      const len = spokenLength(v, sys, 16);
      for (const r of [`Mark 1 cut. Next, mark 2: ${len}, 2 inch CS SCH 40.`, `Next, mark 12: ${len}, 4 inch CS SCH 40.`]) expect([r, readTick(r)]).toEqual([r, null]);
    }
  }
});
