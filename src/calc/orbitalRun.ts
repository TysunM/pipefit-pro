// A weld, step by step
// --------------------
// The run sheet the orbital section builds for every coupon and production
// weld: the same steps every time, in the order they are done, with that
// weld's own figures in them: the tungsten length off the head's constant,
// the purge time for the run being purged, the oxygen to reach, the program
// as it should read on the power supply. Then the look at the weld, and when
// a coupon fails, the usual first move for what it shows.
//
// Written for high-purity fusion work: thin-wall tube, a closed head, no
// filler. A head that feeds wire adds its step. The acceptance limits are
// the job's own spec (ASME BPE, the client's): the sheet names each thing
// to look at, and the spec says how much is too much.

import { solveAll, type Equation } from './orbitalEquations';
import { clock, programScope, programTimes } from './orbitalProgram';
import { gearName, tubeLabel, type Gear, type Program, type Run } from '../state/orbitalBook';

export type Step = { id: string; title: string; detail: string };

const inch = (n: number | null | undefined, places = 3): string => (n === null || n === undefined ? '—' : `${n.toFixed(places)}"`);

/** The figures a run works out: the electrode length and the purge time. */
export function runFigures(p: Program, head: Gear | undefined, equations: readonly Equation[], run: Pick<Run, 'purgeLen' | 'changes'>) {
  const { values } = solveAll(equations, { ...programScope(p, head), len: run.purgeLen, N: run.changes });
  const tungsten = values.l ?? null;
  const purgeMin = values.purgemin ?? null;
  return { tungsten: tungsten !== null && tungsten > 0 ? tungsten : null, purgeMin: purgeMin !== null && purgeMin > 0 ? purgeMin : null };
}

/** The steps for one weld off a program, each with that weld's own figures. */
export function runSteps(p: Program, supply: Gear | undefined, head: Gear | undefined, equations: readonly Equation[], run: Run): Step[] {
  const f = runFigures(p, head, equations, run);
  const t = programTimes(p);
  const wire = !!head?.wire;
  const steps: Step[] = [
    {
      id: 'gear',
      title: 'Head and power supply',
      detail: `${head ? gearName(head) : 'No head named'}${supply ? ` on ${gearName(supply)}` : ''}, set up for ${tubeLabel(p) || 'the tube'}. Inserts or collets for this OD, the head clean and its gas path clear.`,
    },
    {
      id: 'prep',
      title: 'Cut, face and clean',
      detail: 'Square cut and faced on both ends, burrs off the ID and OD, cleaned to your procedure. Butted together there is no gap at the joint.',
    },
    {
      id: 'tungsten',
      title: 'Tungsten',
      detail: [
        `${p.tungsten.dia !== null ? `${inch(p.tungsten.dia)} ` : ''}${p.tungsten.kind || 'electrode'}, ground to a clean point.`,
        f.tungsten !== null ? `Length ${inch(f.tungsten)} (C − OD ÷ 2 − gap).` : head && head.constant === null ? "Length: put the head's electrode constant C in the equipment book and it is worked out here." : '',
        p.tungsten.gap !== null ? `Arc gap ${inch(p.tungsten.gap)}, set with the gauge.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    },
    {
      id: 'fitup',
      title: 'Fit-up in the head',
      detail: 'Tube square in the inserts, the joint centred under the electrode, misalignment inside your spec.',
    },
    {
      id: 'purge',
      title: 'Purge the ID',
      detail: [
        `${p.gas.purge || 'Purge gas'}${p.gas.purgeCfh !== null ? ` at ${p.gas.purgeCfh} CFH` : ''}.`,
        f.purgeMin !== null ? `About ${clock(f.purgeMin * 60)} to change the run ${run.changes} times.` : 'Put in the length purged and the volume changes for the time.',
        p.gas.o2Max !== null ? `Under ${p.gas.o2Max} ppm oxygen at the outlet before striking; record the reading.` : 'Read the oxygen at the outlet before striking and record it.',
      ].join(' '),
    },
    {
      id: 'shield',
      title: 'Shield gas',
      detail: `${p.gas.shield || 'Shield gas'}${p.gas.shieldCfh !== null ? ` at ${p.gas.shieldCfh} CFH` : ''} through the head${p.seq.prepurge ? `, ${p.seq.prepurge} s of prepurge in the program` : ''}.`,
    },
  ];
  if (wire) steps.push({ id: 'wire', title: 'Filler wire', detail: 'The wire spool, the liner and the feed set to the program; the wire aimed into the leading edge of the puddle.' });
  steps.push(
    {
      id: 'program',
      title: 'Program on the power supply',
      detail: `${p.name}, version ${p.version}${p.status === 'qualified' ? `, qualified to ${p.wps}` : ', in development'}: ${p.levels.length} level${p.levels.length === 1 ? '' : 's'}, ${clock(t.weld)} round. Check each level on the supply against the program here.`,
    },
    {
      id: 'weld',
      title: run.kind === 'coupon' ? 'Weld the coupon' : 'Weld',
      detail: run.kind === 'coupon' ? 'Weld it off the same tube, heat and setup as the production welds it stands for.' : 'Watch the arc start and the tie-in; stop if the arc wanders.',
    },
  );
  return steps;
}

/** What to look at on the finished weld. The job's spec says how much of each is too much. */
export const INSPECT: readonly { id: string; text: string }[] = [
  { id: 'pen', text: 'Full penetration all the way round' },
  { id: 'width', text: 'ID bead even in width, on the joint all the way round' },
  { id: 'profile', text: 'ID convexity and concavity, and OD concavity, inside your spec' },
  { id: 'align', text: 'Misalignment inside your spec' },
  { id: 'tint', text: "Heat tint inside your spec's level (the AWS D18.2 chart)" },
  { id: 'defects', text: 'No cracks, porosity, undercut, crater cracks or tungsten inclusions' },
  { id: 'tiein', text: 'Smooth tie-in where the overlap runs over the start' },
];

export type Fault = { id: string; label: string; moves: string[] };

/**
 * What a failed coupon shows, and the usual first moves. Change one thing,
 * weld another coupon, and write down what was changed.
 */
export const FAULTS: readonly Fault[] = [
  {
    id: 'lack-pen',
    label: 'Not through all the way round',
    moves: [
      'Raise the current on the level where it went light, a few percent at a time, or slow that level down.',
      'Check the tungsten point and the arc gap: a worn point or a wide gap spreads the arc.',
      'Check the ends were butted tight, with no gap.',
    ],
  },
  {
    id: 'over-pen',
    label: 'Too much drop-through (ID convexity)',
    moves: [
      'Lower the current on that level, or speed it up.',
      'The tube heats up as the weld goes round: step the later levels down more.',
      'Check the ID purge pressure is enough to hold the puddle up.',
    ],
  },
  {
    id: 'id-concave',
    label: 'ID sucked back (concavity)',
    moves: ['Lower the ID purge pressure: too much pushes the puddle out.', 'Check the purge outlet is not restricted.'],
  },
  {
    id: 'od-concave',
    label: 'OD sunk (concavity)',
    moves: ['Raise the ID purge pressure a little to hold the puddle up.', 'Lower the heat on the levels where it sank.'],
  },
  {
    id: 'wander',
    label: 'Bead wanders off the joint',
    moves: [
      'Centre the electrode on the joint, and check the tube sits square in the inserts.',
      'Check the tungsten is straight and not worn to one side.',
      'Two heats with different sulphur pull the puddle toward the lower-sulphur side: check the mill certs, and match heats where you can.',
    ],
  },
  {
    id: 'tint-id',
    label: 'Heat tint on the ID',
    moves: [
      'Purge longer: go by the oxygen meter, not the clock.',
      'Find the leak: fittings, dams, tape, the purge hose.',
      'Check the purge gas itself, and the meter is reading the outlet.',
    ],
  },
  {
    id: 'tint-od',
    label: 'Heat tint on the OD',
    moves: ['Lengthen the postpurge.', "Check the shield gas flow, and the head's gas path and seals."],
  },
  {
    id: 'arc',
    label: 'Arc would not start, or wandered',
    moves: ['Re-grind or change the tungsten.', 'Check the arc gap.', 'Check the work lead, the gas, and that the ends are clean.'],
  },
  {
    id: 'porosity',
    label: 'Porosity',
    moves: ['Clean the ends again: oil, moisture, marker.', 'Check for gas leaks, and that it is the right gas.'],
  },
  {
    id: 'tie-in',
    label: 'Poor tie-in at the overlap',
    moves: ['Adjust the overlap degrees.', 'Lengthen or shorten the downslope so the crater fills.'],
  },
  {
    id: 'width',
    label: 'Bead width changes round the tube',
    moves: ['Even the heat out level by level: lower the levels where it grows, raise those where it narrows.'],
  },
];

export const faultOf = (id: string): Fault | undefined => FAULTS.find((f) => f.id === id);

/** Why a run cannot be saved yet, or null. */
export function runProblem(r: Run): string | null {
  if (r.kind === 'production' && !r.weld.trim()) return 'Put in the weld number.';
  if (r.kind === 'coupon' && !r.weld.trim()) return 'Give the coupon a number or a name, to name it on the program.';
  if (r.result === null) return 'Say how it came out: pass or fail.';
  if (r.result === 'fail' && !r.faults.length && !r.note.trim()) return 'Say what failed: pick what it shows, or write it in the note.';
  return null;
}

/** "Coupon C-3 · pass", what a run is in a list. */
export const runLabel = (r: Run): string => `${r.kind === 'coupon' ? 'Coupon' : 'Weld'} ${r.weld || '—'}${r.result ? ` · ${r.result}` : ''}`;
