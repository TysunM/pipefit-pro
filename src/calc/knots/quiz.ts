// The knot test
// -------------
// Ten questions a rigger would ask a hand: what knot is that, which knot for
// this job, what comes next, and is that safe. The answers come from the knots
// themselves (knots.ts) and the safety calls below. Pure: the order comes from
// the random function it is given.

import { KNOTS, stepsOf, type Knot } from './knots';

export type Option = { id: string; label: string };
export type Question = {
  kind: 'name' | 'job' | 'next' | 'safe';
  prompt: string;
  /** The knot drawn with the question, and how far tied (the step done), when there is one. */
  knot?: string;
  shownStep?: number;
  options: Option[];
  answer: string;
  why: string;
};

/** Calls about knots on site, each said plainly with why. */
export const SAFETY: { text: string; safe: boolean; why: string }[] = [
  { text: 'Join two hand lines with a square knot for a hoist.', safe: false, why: 'A square knot can capsize and pull apart under load. Join lines with a sheet bend.' },
  { text: 'Tie a bowline for a loop in the end of a tag line.', safe: true, why: "A bowline makes a loop that won't slip and still unties after." },
  { text: 'Shorten a wire rope sling by tying a knot in it.', safe: false, why: 'Never knot a sling or a wire rope. Get the right length of sling.' },
  { text: 'Hold a load on a hand line with a slip knot.', safe: false, why: 'One pull on the tail and a slip knot is gone.' },
  { text: 'Back up a clove hitch with two half hitches when the pull keeps changing direction.', safe: true, why: 'A clove hitch can roll and slip under a changing pull; the half hitches hold it.' },
  { text: 'Cut the tail short so the knot looks neat.', safe: false, why: 'Leave a tail of a dozen rope widths: a short tail can pull through.' },
  { text: 'Put a figure eight in the end of a hand line run through a block.', safe: true, why: "A stopper keeps the line from running out through the block." },
  { text: 'Add a half hitch near the far end of a timber hitch to hoist a length of pipe.', safe: true, why: 'That is a killick hitch: the pipe rides level instead of swinging up on end.' },
  { text: 'Use a knotted hand line as your fall protection lanyard.', safe: false, why: 'Fall protection is rated, inspected gear only. Never a knot tied on site.' },
  { text: 'Join a thin line to a thicker one with a sheet bend, the bight in the thicker one.', safe: true, why: 'A sheet bend joins lines of different sizes; the bight goes in the thicker.' },
  { text: 'Check a bowline before every use.', safe: true, why: 'A bowline can shake loose when it is not loaded.' },
  { text: 'Use a knot in place of a shackle on a lift.', safe: false, why: 'Rigging on a lift is rated hardware and slings, to the lift plan. Knots are for tag lines and hand lines.' },
];

/** A random function from a seed: the same seed, the same test (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: readonly T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const others = (k: Knot, n: number, rnd: () => number) => shuffle(KNOTS.filter((x) => x.id !== k.id), rnd).slice(0, n);
const asOption = (k: Knot): Option => ({ id: k.id, label: k.name });

/** A test: three of what knot is that, three of which knot for the job, two of what comes next, two of is that safe. */
export function makeTest(rnd: () => number): Question[] {
  const qs: Question[] = [];
  for (const k of shuffle(KNOTS, rnd).slice(0, 3)) {
    qs.push({ kind: 'name', prompt: 'Which knot is this?', knot: k.id, shownStep: k.steps.length - 1, options: shuffle([k, ...others(k, 3, rnd)], rnd).map(asOption), answer: k.id, why: `${k.name}: ${k.use}` });
  }
  for (const k of shuffle(KNOTS, rnd).slice(0, 3)) {
    const job = k.jobs[Math.floor(rnd() * k.jobs.length)]!;
    qs.push({ kind: 'job', prompt: `Which knot for this: ${job.charAt(0).toLowerCase()}${job.slice(1)}?`, options: shuffle([k, ...others(k, 3, rnd)], rnd).map(asOption), answer: k.id, why: `${k.name}: ${k.use}` });
  }
  const stepped = KNOTS.filter((k) => stepsOf(k).length >= 4);
  for (const k of shuffle(stepped, rnd).slice(0, 2)) {
    // Shown tied as far as a step past the first; the answer is the step after it, pulling it tight included.
    const all = stepsOf(k);
    const i = 1 + Math.floor(rnd() * (all.length - 1));
    const right = all[i]!;
    // One move from earlier in the same knot, one from another knot: never the same words as the right one.
    const unlike = (xs: typeof k.steps) => xs.filter((s) => s.text !== right.text);
    const first = shuffle(unlike(all.filter((_, j) => j < i)), rnd).slice(0, 1);
    const wrong = first.concat(
      shuffle(unlike(others(k, 3, rnd).flatMap((o) => stepsOf(o).slice(1))), rnd)
        .filter((s) => !first.some((f) => f.text === s.text))
        .slice(0, 1),
    );
    qs.push({
      kind: 'next',
      prompt: `${k.name}: what comes next?`,
      knot: k.id,
      shownStep: i - 1,
      options: shuffle([right, ...wrong], rnd).map((s, j) => ({ id: s === right ? 'right' : `wrong-${j}`, label: s.text })),
      answer: 'right',
      why: right.text,
    });
  }
  for (const s of shuffle(SAFETY, rnd).slice(0, 2)) {
    qs.push({ kind: 'safe', prompt: `Safe or not? ${s.text}`, options: [{ id: 'yes', label: 'Safe' }, { id: 'no', label: 'Not safe' }], answer: s.safe ? 'yes' : 'no', why: s.why });
  }
  return shuffle(qs, rnd);
}
