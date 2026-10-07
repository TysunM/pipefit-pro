import { COACH, COACH_SCREENS, coachShows, hide, nextStep, parseHidden, serialiseHidden, emptyHidden, unhideAll } from '../state/coach';
import { skill } from '../state/passport';

describe('coaching on real work', () => {
  test('every screen has a plan on a real skill, with steps that each say why', () => {
    expect(COACH_SCREENS.sort()).toEqual(['CutLength', 'FlangeBoltUp', 'PressureTest']);
    for (const s of COACH_SCREENS) {
      const p = COACH[s];
      expect(skill(p.skill)).toBeDefined();
      expect(skill(p.skill)!.needs).toBeGreaterThan(0);
      expect(p.steps.length).toBeGreaterThanOrEqual(4);
      for (const st of p.steps) {
        expect(st.text).not.toBe('');
        expect(st.why.length).toBeGreaterThan(20);
      }
    }
  });

  test('shows while the skill is not yet routine, unless hidden here or turned off', () => {
    const base = { coach: 'on' as const, hidden: [], screen: 'FlangeBoltUp' as const };
    expect(coachShows({ ...base, standing: 'none' })).toBe(true);
    expect(coachShows({ ...base, standing: 'started' })).toBe(true);
    expect(coachShows({ ...base, standing: 'practised' })).toBe(false);
    expect(coachShows({ ...base, standing: 'competent' })).toBe(false);
    expect(coachShows({ ...base, standing: 'none', coach: 'off' })).toBe(false);
    expect(coachShows({ ...base, standing: 'none', hidden: ['FlangeBoltUp'] })).toBe(false);
    expect(coachShows({ ...base, standing: 'none', hidden: ['CutLength'] })).toBe(true);
  });

  test('the next step is the first not done', () => {
    expect(nextStep([true, false, false])).toBe(1);
    expect(nextStep([false, true])).toBe(0);
    expect(nextStep([true, true])).toBe(-1);
  });

  test('what is hidden is kept, once per screen, and comes back together', () => {
    let h = hide(hide(emptyHidden(), 'CutLength'), 'CutLength');
    expect(h.hidden).toEqual(['CutLength']);
    h = hide(h, 'PressureTest');
    expect(parseHidden(serialiseHidden(h)).hidden).toEqual(['CutLength', 'PressureTest']);
    expect(unhideAll(h).hidden).toEqual([]);
    expect(parseHidden('nope').dropped).toBe(1);
    expect(parseHidden('{"v":2,"hidden":[]}').foreign).toBe(true);
    expect(parseHidden('{"v":1,"hidden":["x",3]}').hidden).toEqual(['x']);
  });
});
