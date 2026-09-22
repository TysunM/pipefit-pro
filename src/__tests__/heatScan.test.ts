import { newHeat } from '../calc/heat';
import { couldBeHeat, scanForHeats, shapeScore, tokens, whyLabel } from '../calc/heatScan';

const book = (...ns: string[]) => ns.map((n) => newHeat(n, 0));
const best = (text: string, b = book()) => scanForHeats(text, b)[0];

// A mill cert, near enough to the real thing to be worth testing against: the
// heat is one number among a dozen the same shape.
const MTR = `
MATERIAL TEST REPORT
CUSTOMER ORDER NO. 4400291
HEAT NO. E7Z419        LOT 88213
DESCRIPTION 4 IN SCH 40 SMLS PIPE ASTM A106 GRADE B
YIELD 46200 PSI   TENSILE 71500 PSI   ELONG 32
CARBON 0.21  MANGANESE 0.94
PAGE 1 REV 2   DATE 2026-03-14
`;

// A stencil sprayed on the pipe. No labels at all.
const STENCIL = 'A106 GR B 4" SCH40 SMLS 0M2947 ACME TUBE';

describe('splitting what the camera read', () => {
  it('breaks on anything that is not part of a number, keeping dashes and slashes inside', () => {
    expect(tokens('HEAT NO. E7Z-419, LOT: 88213')).toEqual(['HEAT', 'NO', 'E7Z-419', 'LOT', '88213']);
  });

  it('strips dashes and slashes off the ends, where they are punctuation', () => {
    expect(tokens('-E7Z419/')).toEqual(['E7Z419']);
  });

  it('gives nothing for nothing rather than a row of empties', () => {
    expect(tokens('')).toEqual([]);
    expect(tokens('   ...   ')).toEqual([]);
  });
});

describe('what could be a heat at all', () => {
  it('takes the shapes mills actually use', () => {
    for (const t of ['E7Z419', '0M2947', 'A12345', '123456', 'N-8842', '4400291']) {
      expect(couldBeHeat(t)).toBe(true);
    }
  });

  it('refuses what is too short or too long to be one', () => {
    expect(couldBeHeat('A12')).toBe(false);
    expect(couldBeHeat('E7Z4190000001')).toBe(false);
  });

  it('refuses a token with no digit in it, which is a word', () => {
    expect(couldBeHeat('SEAMLESS')).toBe(false);
    expect(couldBeHeat('GRADE')).toBe(false);
  });

  it('refuses the heat-shaped words a cert is covered in', () => {
    // These are the false positives that would make the feature useless.
    expect(couldBeHeat('ASTM')).toBe(false);
    expect(couldBeHeat('SMLS')).toBe(false);
    expect(couldBeHeat('YIELD')).toBe(false);
    expect(couldBeHeat('TENSILE')).toBe(false);
  });
});

describe('being told outright beats guessing', () => {
  it('takes the number after HEAT NO on a cert, out of everything else on the page', () => {
    const c = best(MTR)!;
    expect(c.text).toBe('E7Z419');
    expect(c.why.kind).toBe('labelled');
  });

  it('reads through the NO that sits between the label and the number', () => {
    expect(best('HEAT NO. E7Z419')!.text).toBe('E7Z419');
    expect(best('HEAT NUMBER: E7Z419')!.text).toBe('E7Z419');
  });

  it('takes the abbreviations and the European habit too', () => {
    expect(best('HT 0M2947')!.text).toBe('0M2947');
    expect(best('CAST NO 445512')!.text).toBe('445512');
  });

  it('offers both numbers after HEAT/LOT rather than picking one', () => {
    const cs = scanForHeats('HEAT/LOT E7Z419 88213');
    expect(cs.slice(0, 2).map((c) => c.text)).toEqual(['E7Z419', '88213']);
    // The nearer one to the label wins the tie.
    expect(cs[0]!.score).toBeGreaterThan(cs[1]!.score);
  });

  it('does not put the yield or the page number above the labelled heat', () => {
    const cs = scanForHeats(MTR);
    expect(cs[0]!.text).toBe('E7Z419');
    // Everything else on that page is a guess, not a label.
    expect(cs.slice(1).every((c) => c.why.kind !== 'labelled')).toBe(true);
  });
});

describe('the book turns guessing into recognising', () => {
  it('lifts a token that is already a heat somebody entered', () => {
    const c = best(STENCIL, book('0M2947'))!;
    expect(c.text).toBe('0M2947');
    expect(c.why.kind).toBe('inBook');
  });

  it('catches the camera making the same misread a person makes', () => {
    // OCR reads the stencilled zero as an O. The shape matches a heat that is
    // already in the book, which is the one case where the machine is about
    // to write a number that looks right and is not.
    const c = best('A106 GR B OM2947', book('0M2947'))!;
    expect(c.why).toEqual({ kind: 'looksLikeBook', existing: '0M2947' });
    expect(whyLabel(c.why)).toMatch(/check the steel/i);
  });

  it('puts a heat in the book above one that merely looks like an entry', () => {
    const cs = scanForHeats('0M2947 E72419', book('0M2947', 'E7Z419'));
    expect(cs[0]!.text).toBe('0M2947');
    expect(cs[0]!.why.kind).toBe('inBook');
    expect(cs[1]!.why.kind).toBe('looksLikeBook');
  });

  it('still lets a label win over the book, because being told beats being reminded', () => {
    const cs = scanForHeats('HEAT NO A12345  0M2947', book('0M2947'));
    expect(cs[0]!.text).toBe('A12345');
    expect(cs[0]!.why.kind).toBe('labelled');
  });
});

describe('shape, when there is nothing else to go on', () => {
  it('finds the heat on a stencil with no labels and no book', () => {
    const cs = scanForHeats(STENCIL);
    expect(cs.map((c) => c.text)).toContain('0M2947');
    // And it did not offer the spec or the word SMLS as candidates.
    expect(cs.map((c) => c.text)).not.toContain('SMLS');
    expect(cs.map((c) => c.text)).not.toContain('SCH40');
  });

  it('prefers a mix of letters and digits over a bare run of digits', () => {
    expect(shapeScore('E7Z419')).toBeGreaterThan(shapeScore('447212'));
  });

  it('marks down a token that is mostly letters', () => {
    expect(shapeScore('ABCDEF1')).toBeLessThan(shapeScore('E7Z419'));
  });
});

describe('the list it hands back', () => {
  it('never offers the same heat twice, however many times it appears', () => {
    const cs = scanForHeats('E7Z419 e7z-419 E7Z419');
    expect(cs.filter((c) => c.text.toUpperCase().replace(/[^0-9A-Z]/g, '') === 'E7Z419')).toHaveLength(1);
  });

  it('keeps the best reason when one token is found two ways', () => {
    const cs = scanForHeats('0M2947 HEAT NO 0M2947', book('0M2947'));
    expect(cs[0]!.why.kind).toBe('labelled');
  });

  it('is sorted best first, and stable when scores tie', () => {
    const cs = scanForHeats('B22222 A11111');
    expect(cs[0]!.score).toBeGreaterThanOrEqual(cs[1]!.score);
    // Equal scores fall back to the text, so the order never wobbles.
    if (cs[0]!.score === cs[1]!.score) expect(cs[0]!.text < cs[1]!.text).toBe(true);
  });

  it('comes back empty for a page with nothing heat-shaped on it', () => {
    expect(scanForHeats('SEAMLESS PIPE GRADE B')).toEqual([]);
    expect(scanForHeats('')).toEqual([]);
  });

  it('says something usable about every reason it can give', () => {
    for (const why of [
      { kind: 'labelled' as const, label: 'HEAT' },
      { kind: 'inBook' as const },
      { kind: 'looksLikeBook' as const, existing: '0M2947' },
      { kind: 'shape' as const },
    ]) {
      expect(whyLabel(why).length).toBeGreaterThan(10);
    }
  });
});

describe('the false positives that would make it useless', () => {
  it('refuses a size or a class with its figure stuck to it', () => {
    // Every one of these is heat-shaped: four to six characters, letters and
    // digits mixed. Shape cannot tell them from a heat; the prefix can.
    for (const t of ['SCH40', 'SCH80', 'SCH160', 'CL150', 'CLASS300', 'DN50', 'NPS4', 'PN16', 'REV2', 'PAGE1', 'QTY12', 'LBS220']) {
      expect(couldBeHeat(t)).toBe(false);
    }
  });

  it('still takes a heat that merely begins with those letters', () => {
    // `NO` is a label and `NO4471` is not: the rule only fires when the whole
    // rest of the token is digits *and* the prefix is the entire word.
    expect(couldBeHeat('SCHX40')).toBe(true);
    expect(couldBeHeat('GRB7741')).toBe(true);
  });

  it('marks a material designation down rather than throwing it away', () => {
    expect(shapeScore('A106')).toBeLessThan(shapeScore('E7Z419'));
    expect(shapeScore('TP316L')).toBeLessThan(shapeScore('E7Z419'));
    // But it is still offered, because on a bad stencil it beats nothing.
    expect(couldBeHeat('A106')).toBe(true);
  });

  it('keeps the real heat above the spec on a stencil with both', () => {
    const cs = scanForHeats('A106 GR B 4" SCH40 SMLS 0M2947 ACME TUBE');
    expect(cs[0]!.text).toBe('0M2947');
  });

  it('offers nothing from a page of pure specification', () => {
    const cs = scanForHeats('ASTM A106 GRADE B SCH 40 SMLS PIPE NPS 4 CLASS 150');
    expect(cs.map((c) => c.text)).not.toContain('SCH');
    expect(cs.every((c) => c.score < 25)).toBe(true);
  });
});
