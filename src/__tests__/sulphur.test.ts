import { BPE_SULPHUR, DEFAULT_SULPHUR_GAP, bpeSulphurNote, pct, sulphurCheck, sulphurWords } from '../calc/sulphur';
import { newHeat } from '../calc/heat';
import { parseBook, serialiseBook, validHeat } from '../state/heatBook';

const h = (heat: string, s: number | null, inBook = true) => ({ heat, s, inBook });

describe('two heats checked against each other for sulphur', () => {
  test('0.002% welded to 0.014%: apart, the puddle pulls toward the low one, and the root on the other side is named', () => {
    const c = sulphurCheck([h('A1', 0.002), h('B2', 0.014)]);
    expect(c).toMatchObject({ state: 'apart', low: { heat: 'A1', s: 0.002 }, high: { heat: 'B2', s: 0.014 }, gap: 0.012 });
    const w = sulphurWords(c!);
    expect(w.tone).toBe('warn');
    expect(w.text).toMatch(/0\.002% on A1, 0\.014% on B2: 0\.012% apart, 7\.0 times/);
    expect(w.text).toMatch(/pulls toward A1, the lower-sulphur side, and the root on B2's side can go short/);
    expect(w.text).toMatch(/weld a coupon on these two heats first/);
  });
  test('within the crew\'s line they match; exactly on the line is within it', () => {
    expect(sulphurCheck([h('A1', 0.008), h('B2', 0.011)])).toMatchObject({ state: 'matched', gap: 0.003 });
    expect(sulphurCheck([h('A1', 0.007), h('B2', 0.012)])?.state).toBe('matched');
    expect(sulphurCheck([h('A1', 0.007), h('B2', 0.0121)])?.state).toBe('apart');
    expect(sulphurWords(sulphurCheck([h('A1', 0.008), h('B2', 0.011)])!)).toMatchObject({ tone: 'ok', text: expect.stringMatching(/within 0\.005% of each other/) });
  });
  test('the line is the crew\'s: a tighter one flags what the default lets by', () => {
    expect(sulphurCheck([h('A1', 0.008), h('B2', 0.011)], 0.002)?.state).toBe('apart');
    expect(DEFAULT_SULPHUR_GAP).toBe(0.005);
  });
  test('more than two heats: the lowest against the highest', () => {
    expect(sulphurCheck([h('A', 0.009), h('B', 0.003), h('C', 0.012)])).toMatchObject({ state: 'apart', low: { heat: 'B' }, high: { heat: 'C' } });
  });
  test('a heat with no figure, or not in the book, is said; two it cannot see are never passed', () => {
    const c = sulphurCheck([h('A1', 0.004), h('B2', null), h('C3', null, false)]);
    expect(c).toEqual({ state: 'unknown', notInBook: ['C3'], noFigure: ['B2'] });
    expect(sulphurWords(c!).text).toMatch(/C3 is not in the heat book; B2 has no sulphur entered/);
  });
  test('one heat, or blanks, is nothing to check', () => {
    expect(sulphurCheck([h('A1', 0.004)])).toBeNull();
    expect(sulphurCheck([h('A1', 0.004), h('  ', null)])).toBeNull();
  });
  test('a trace reads with enough places', () => {
    expect(pct(0.012)).toBe('0.012');
    expect(pct(0.0008)).toBe('0.0008');
  });
});

describe('the band ASME BPE gives 316L to be orbital welded', () => {
  test('under or over it is said of a 316 heat; inside it, or another grade, is not', () => {
    expect(bpeSulphurNote('A270 316L', 0.002)).toMatch(/under the 0\.005–0\.017%/);
    expect(bpeSulphurNote('316L', 0.02)).toMatch(/over/);
    expect(bpeSulphurNote('316L', 0.01)).toBeNull();
    expect(bpeSulphurNote('316L', BPE_SULPHUR.min)).toBeNull();
    expect(bpeSulphurNote('A106 Gr B', 0.002)).toBeNull();
    expect(bpeSulphurNote('316L', null)).toBeNull();
  });
});

describe('sulphur kept with the heat', () => {
  test('a heat keeps its sulphur through the store; one kept before sulphur was asked for has none', () => {
    const heat = { ...newHeat('E7Z419', 1), sulphur: 0.012 };
    expect(parseBook(serialiseBook({ heats: [heat], foreign: false, dropped: 0 })).heats[0]!.sulphur).toBe(0.012);
    const old = { ...newHeat('K1', 1) } as Record<string, unknown>;
    delete old.sulphur;
    expect(validHeat(old)!.sulphur).toBeNull();
    expect(validHeat({ ...heat, sulphur: -1 })!.sulphur).toBeNull();
    expect(validHeat({ ...heat, sulphur: '0.01' })!.sulphur).toBeNull();
  });
});
