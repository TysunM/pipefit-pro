import { SVG_PREFIXES, svgId } from '../components/svgId';

// Why this file exists
// -------------------
// SVG ids are global on a web page. Every `<svg>` the app draws shares one
// namespace, so if two drawings name a gradient the same thing, the browser
// keeps one and both point at it.
//
// That happened. Ids used to read `<prefix><uid>` for a drawing's first
// gradient and `<prefix><uid>e` for its second. React hands out ids as a
// counter in base 32, so the key drawn with uid `r2` named its edge
// `sheenr2e` — and the key drawn with uid `r2e` named its *body* the same.
// The 6 key on the calculator ended up filled with its neighbour's edge
// highlight, which is almost entirely transparent, so it rendered as a hole.
//
// A screenshot caught it. These tests are what makes it not come back.

/** Ids the way React hands them out: a counter in base 32, prefixed with r. */
const reactIds = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `r${i.toString(32)}`);

/** The roles a drawing asks for. One character each, by the rule below. */
const ROLES = ['a', 'b'];

describe('an svg id belongs to exactly one gradient', () => {
  test('no prefix is a prefix of another, so two drawings never overlap', () => {
    for (const a of SVG_PREFIXES) {
      for (const b of SVG_PREFIXES) {
        if (a === b) continue;
        expect(b.startsWith(a)).toBe(false);
      }
    }
  });

  test('every role is a single character, which is what makes the tail unambiguous', () => {
    for (const r of ROLES) expect(r).toHaveLength(1);
  });

  test('1,000 drawings of every prefix and role produce no two identical ids', () => {
    const ids = new Set<string>();
    let made = 0;
    for (const prefix of SVG_PREFIXES) {
      for (const uid of reactIds(1000)) {
        for (const role of ROLES) {
          ids.add(svgId(prefix, uid, role));
          made += 1;
        }
      }
    }
    expect(ids.size).toBe(made);
  });

  test('the pair that actually broke the 6 key no longer collides', () => {
    // The old scheme: `${prefix}${uid}` and `${prefix}${uid}e`.
    expect(`sheen${'r2'}e`).toBe(`sheen${'r2e'}`); // the bug, stated plainly
    // The new one keeps them apart, because the uid is no longer on the end.
    expect(svgId('glow', 'r2', 'b')).not.toBe(svgId('glow', 'r2e', 'a'));
  });

  test('two gradients of one drawing differ, and the same gradient is stable', () => {
    expect(svgId('glow', 'r9', 'a')).not.toBe(svgId('glow', 'r9', 'b'));
    expect(svgId('glow', 'r9', 'a')).toBe(svgId('glow', 'r9', 'a'));
  });

  test('an id is usable as an svg id: starts with a letter, no punctuation', () => {
    for (const prefix of SVG_PREFIXES) {
      const id = svgId(prefix, 'r1f', 'a');
      expect(id).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
    }
  });
});
