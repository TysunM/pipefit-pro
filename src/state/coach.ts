// Coaching on real work
// ---------------------
// A new hand's first bolt-ups, first hydro, first cut lengths, walked through
// on the screen where the work is done: the steps in order, the one that is
// next lit, and the reason under each, in the words a journeyman would use.
// Nothing is a lesson apart from the work; the work is the lesson.
//
// It fades. The coach shows while the skills passport has the skill at
// "not yet" or "started"; once the records show it is routine, or a foreman
// has signed it off, the card is gone. A hand can also hide it on any screen
// with one tap, and Settings turns it off for everyone who already knows.
//
// Pure; coachStore.tsx holds what has been hidden, and Coach.tsx draws it.

import type { SkillId, Standing } from './passport';

export type CoachScreen = 'FlangeBoltUp' | 'PressureTest' | 'CutLength';

export type CoachStep = { text: string; why: string };

export type CoachPlan = { skill: SkillId; title: string; steps: readonly CoachStep[] };

export const COACH: Readonly<Record<CoachScreen, CoachPlan>> = {
  FlangeBoltUp: {
    skill: 'boltup',
    title: 'Your first bolt-ups',
    steps: [
      { text: 'Name the joint by its tag', why: 'A joint with a tag is a record; the unnamed one is scratch and is not kept.' },
      { text: 'Set the flange: class and size, and the gasket', why: 'The stud count and size come from the class and size, and the gasket decides which methods are allowed.' },
      { text: 'Set the torque from the job\'s bolting spec', why: 'Torque is by stud size, material, lubricant and gasket, never by class. Guessing it is how gaskets leak or crush.' },
      { text: 'Tap each bolt as the screen asks, snug first', why: 'The cross pattern seats the gasket evenly. Round the circle cocks the flange and it leaks on the far side.' },
      { text: 'Rounds at 20–30%, 50–70% and 100%, a gap check after each, then check rounds until no nut turns', why: 'Bolts relax as the gasket seats. The check rounds catch what the earlier ones let go.' },
      { text: 'Have it witnessed, and pick the wrench', why: 'QC accepts the joint on the witness and the wrench\'s calibration. Without both it is redone.' },
    ],
  },
  PressureTest: {
    skill: 'hydro',
    title: 'Your first pressure tests',
    steps: [
      { text: 'Set the test pressure from the design pressure and the code', why: 'B31.3 hydro is 1.5 times design, pneumatic 1.1; the screen works it, and the code rule is on the record.' },
      { text: 'Pick the gauge from the calibration register', why: 'A reading off an overdue gauge does not stand. The register knows which gauges are in date.' },
      { text: 'Set the relief valve above test pressure', why: 'A relief set too low lifts during the test; none at all and a pump can overpressure the line.' },
      { text: 'Bring it to test pressure, then start the hold', why: 'The clock starts at pressure, not at the pump. Starting early shortens the hold on paper only.' },
      { text: 'Hold the required time and take readings as you go', why: 'A slow drop between readings is a leak. The readings are what the examiner reads.' },
      { text: 'End the hold, set the result, sign as tester', why: 'Unsigned, it is a timer; signed, it is a test record QC can accept.' },
    ],
  },
  CutLength: {
    skill: 'offsets',
    title: 'Your first cut lengths',
    steps: [
      { text: 'Enter the centre-to-centre', why: 'Everything is worked from centre to centre; that is the figure on the drawing.' },
      { text: 'Pick how it is joined and what is on each end', why: 'Each fitting eats a length, its takeout, and a welded end takes the root gap as well.' },
      { text: 'Read the pipe cut and the takeouts behind it', why: 'The takeouts come from the handbook tables. Check them once against the fitting in your hand.' },
      { text: 'Add it to the cut list with its mark', why: 'A cut on the list has a mark the saw and the spool can both find; a cut in your head does not.' },
    ],
  },
};

export const COACH_SCREENS = Object.keys(COACH) as CoachScreen[];

/** Whether the card shows: coaching on, the skill not yet routine, and not hidden on this screen. */
export function coachShows(o: { coach: 'on' | 'off'; standing: Standing; hidden: readonly string[]; screen: CoachScreen }): boolean {
  return o.coach === 'on' && (o.standing === 'none' || o.standing === 'started') && !o.hidden.includes(o.screen);
}

/** The step to do next: the first not done. All done: -1. */
export const nextStep = (done: readonly boolean[]): number => done.findIndex((d) => !d);

export type CoachHidden = { hidden: string[]; foreign: boolean; dropped: number };
export const emptyHidden = (): CoachHidden => ({ hidden: [], foreign: false, dropped: 0 });
export const serialiseHidden = (h: CoachHidden): string => JSON.stringify({ v: 1, hidden: h.hidden });
export function parseHidden(raw: string | null | undefined): CoachHidden {
  if (!raw) return emptyHidden();
  try {
    const p = JSON.parse(raw) as { v?: unknown; hidden?: unknown };
    if (typeof p?.v !== 'number') return { ...emptyHidden(), dropped: 1 };
    if (p.v > 1) return { ...emptyHidden(), foreign: true };
    return { ...emptyHidden(), hidden: (Array.isArray(p.hidden) ? p.hidden : []).filter((x): x is string => typeof x === 'string').slice(0, 20) };
  } catch {
    return { ...emptyHidden(), dropped: 1 };
  }
}
export const hide = (h: CoachHidden, screen: CoachScreen): CoachHidden => (h.hidden.includes(screen) ? h : { ...h, hidden: [...h.hidden, screen] });
export const unhideAll = (h: CoachHidden): CoachHidden => (h.hidden.length ? { ...h, hidden: [] } : h);
