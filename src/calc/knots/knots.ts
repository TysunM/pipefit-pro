// The knots
// ---------
// Each knot is its rope's path in the order the working end goes when it is
// tied (rope.ts), the crossings said over or under as the end gets to them,
// and the steps a rigger would say out loud, each one taking the end on to a
// point along the path.
//
// What a knot is for is said plainly, and so is what it is not for: knots
// here are for tag lines, hand lines and light material on a hand line, never
// in a sling or a wire rope on a lift.

import { layout, type P, type Prop, type Rope } from './rope';

export type KnotKind = 'Loop' | 'Hitch' | 'Stopper' | 'Bend' | 'Binding';

export type KnotStep = { rope: number; to: number; text: string };

export type Knot = {
  id: string;
  name: string;
  aka?: string;
  kind: KnotKind;
  /** What it does, in a line. */
  use: string;
  /** Jobs on site it is the knot for: the test asks these. */
  jobs: string[];
  /** What to watch for. */
  watch: string;
  ropes: Rope[];
  props: Prop[];
  /** Over or under at each crossing, in the order the working end gets there. */
  cross: string;
  steps: KnotStep[];
};

const rope = (pts: P[], start: number, color: Rope['color'] = 'a'): Rope => ({ pts, start, color });

export const KNOTS: Knot[] = [
  {
    id: 'bowline',
    name: 'Bowline',
    kind: 'Loop',
    use: "A fixed loop in the end of a line that won't slip or jam, and unties after a load.",
    jobs: ['A loop in the end of a tag line', 'A loop to drop over a post or hook', 'A hand line loop around a bundle of light material'],
    watch: 'Leave a tail of a dozen rope widths. It can shake loose when it is not loaded: check it before every use.',
    ropes: [
      rope(
        [
          [134, 4],
          [134, 56],
          [135, 92],
          [131, 116],
          [121, 140],
          [130, 166],
          [152, 175],
          [175, 165],
          [185, 140],
          [175, 113],
          [152, 102],
          [122, 104],
          [98, 104],
          [74, 128],
          [66, 180],
          [86, 244],
          [150, 274],
          [208, 248],
          [220, 205],
          [198, 190],
          [178, 180],
          [166, 166],
          [163, 138],
          [164, 106],
          [160, 74],
          [134, 56],
          [108, 60],
          [92, 82],
          [100, 116],
          [118, 140],
          [136, 160],
          [142, 184],
          [140, 226],
        ],
        3,
      ),
    ],
    props: [],
    cross: 'ououoou',
    steps: [
      { rope: 0, to: 3, text: 'The standing part runs up to the load or the anchor. Work with the end.' },
      { rope: 0, to: 12, text: 'Make a small loop, the working side laid over the standing part: the rabbit hole.' },
      { rope: 0, to: 20, text: 'Bring the end round to make the eye as big as the job needs, and up to the loop.' },
      { rope: 0, to: 24, text: 'Up through the loop from underneath: the rabbit comes out of the hole.' },
      { rope: 0, to: 27, text: 'Round behind the standing part: round the tree.' },
      { rope: 0, to: 32, text: 'Back down through the loop beside itself, and pull the standing part to set it.' },
    ],
  },
  {
    id: 'clove',
    name: 'Clove hitch',
    kind: 'Hitch',
    use: 'Two turns round a pipe, rail or post that grip each other: quick to tie, quick to adjust.',
    jobs: ['Starting a lashing on a pipe or post', 'A tag line on a pipe for a short pull', 'Tying a hand line to a handrail for a moment'],
    watch: 'It can roll off the end of a pipe and slip when the pull keeps changing direction. Back it up with two half hitches if it has to hold.',
    ropes: [
      rope(
        [
          [100, 296],
          [100, 240],
          [100, 186],
          [100, 150, 'b'],
          [103, 121],
          [124, 148],
          [146, 179],
          [153, 150, 'b'],
          [157, 121],
          [140, 150],
          [123, 182],
          [120, 236],
          [118, 290],
        ],
        2,
      ),
    ],
    props: [{ kind: 'pipe', y: 150, r: 22 }],
    cross: 'u',
    steps: [
      { rope: 0, to: 2, text: 'The standing part hangs on the left.' },
      { rope: 0, to: 7, text: 'Take the end up behind the pipe, over the top and down across the front.' },
      { rope: 0, to: 9, text: 'Round the pipe again beside the first turn.' },
      { rope: 0, to: 12, text: 'Down across the front and tuck it under the first turn: an X on the front. Pull both ends to set it.' },
    ],
  },
  {
    id: 'figure8',
    name: 'Figure eight',
    aka: 'Stopper knot',
    kind: 'Stopper',
    use: "A stopper in the end of a line, so it can't run out through a block, a pulley or your hand.",
    jobs: ['The end of a hand line run through a block', 'A stopper on the end of a tag line', 'Stopping a line pulling through a grommet'],
    watch: 'Bigger and easier to untie than an overhand knot. Leave a tail.',
    ropes: [
      rope(
        [
          [14, 172],
          [80, 172],
          [150, 170],
          [204, 150],
          [214, 102],
          [180, 62],
          [130, 76],
          [114, 126],
          [104, 196],
          [78, 214],
          [56, 192],
          [62, 136],
          [110, 104],
          [168, 116],
          [236, 140],
          [286, 146],
        ],
        2,
      ),
    ],
    props: [],
    cross: 'ouou',
    steps: [
      { rope: 0, to: 2, text: 'The standing part comes in from the left.' },
      { rope: 0, to: 8, text: 'Make a loop: up, round, and down over the standing part.' },
      { rope: 0, to: 11, text: 'Under the standing part and back up: round it.' },
      { rope: 0, to: 15, text: 'Down through the loop, over then under, and pull it snug: a figure eight.' },
    ],
  },
  {
    id: 'slip',
    name: 'Slip knot',
    kind: 'Stopper',
    use: 'A knot that lets go with one pull on the tail: for something that has to come undone fast.',
    jobs: ['Tying off a tarp or a coil to undo in a hurry', 'A quick stopper that comes out with one pull', 'Holding a coil of hand line together'],
    watch: "One pull on the tail and it's gone. Never for anything that takes a load or holds a person.",
    ropes: [
      rope(
        [
          [14, 182],
          [80, 182],
          [150, 180],
          [200, 156],
          [208, 104],
          [170, 70],
          [122, 84],
          [108, 130],
          [104, 210],
          [122, 244],
          [140, 222],
          [140, 150],
          [140, 74],
          [150, 34],
          [164, 72],
          [164, 150],
          [166, 214],
          [196, 252],
          [236, 268],
        ],
        2,
      ),
    ],
    props: [],
    cross: 'ouoou',
    steps: [
      { rope: 0, to: 2, text: 'The standing part comes in from the left.' },
      { rope: 0, to: 9, text: 'Make a loop: up, round, and down over the standing part.' },
      { rope: 0, to: 13, text: "Don't push the end through: push a bight of it up through the loop, under then over." },
      { rope: 0, to: 18, text: 'Pull the bight and the standing part to snug it. One pull on the tail and it lets go.' },
    ],
  },
  {
    id: 'halfhitches',
    name: 'Round turn and two half hitches',
    kind: 'Hitch',
    use: 'Ties a line off to a rail, ring or post so it holds under load and still unties.',
    jobs: ['Tying a hand line off to a handrail', 'Making a line fast to a beam clamp eye or a ring', 'Tying off a tag line between pulls'],
    watch: 'Both half hitches go the same way round: together they make a clove hitch round the standing part. The round turn takes the load, so keep it.',
    ropes: [
      rope(
        [
          [110, 296],
          [110, 220],
          [110, 112],
          [110, 80, 'b'],
          [114, 53],
          [122, 80],
          [130, 107],
          [138, 80, 'b'],
          [142, 53],
          [150, 80],
          [156, 108],
          [166, 128],
          [146, 146],
          [110, 152],
          [88, 160],
          [88, 178],
          [112, 188],
          [140, 202],
          [166, 218],
          [152, 240],
          [110, 246],
          [88, 250],
          [84, 232],
          [110, 220],
          [142, 204],
          [170, 190],
          [192, 182],
        ],
        2,
      ),
    ],
    props: [{ kind: 'pipe', y: 80, r: 20 }],
    cross: 'uouou',
    steps: [
      { rope: 0, to: 2, text: 'The standing part runs down to the load.' },
      { rope: 0, to: 6, text: 'Take the end up behind the rail, over and round it once.' },
      { rope: 0, to: 10, text: 'Round again: a round turn. It takes the load while you tie off.' },
      { rope: 0, to: 18, text: 'First half hitch: round behind the standing part and back across the front of it.' },
      { rope: 0, to: 26, text: 'Second half hitch the same way round, below the first, the end tucked up under the first. Snug them up to the rail.' },
    ],
  },
  {
    id: 'timber',
    name: 'Timber hitch',
    aka: 'Killick hitch, with a half hitch',
    kind: 'Hitch',
    use: 'Grips a pipe or a bundle of timber for a pull or a hand-line hoist, and falls apart when the load comes off.',
    jobs: ['Hoisting a length of pipe on a hand line', 'Dragging a bundle of timber or dunnage', 'Hauling pipe along a rack'],
    watch: 'Three twists at least, round its own part, not round the pipe. To hoist a length of pipe, add a half hitch near the far end (a killick hitch) so it rides level.',
    ropes: [
      rope(
        [
          [122, 4],
          [122, 70],
          [122, 128],
          [124, 142],
          [126, 170, 'b'],
          [132, 207],
          [158, 190],
          [164, 150],
          [162, 112],
          [148, 98],
          [122, 94],
          [100, 102],
          [102, 120],
          [138, 124],
          [184, 142],
          [138, 166],
          [184, 190],
          [204, 214],
        ],
        2,
      ),
    ],
    props: [{ kind: 'pipe', y: 170, r: 30 }],
    cross: 'uoouo',
    steps: [
      { rope: 0, to: 2, text: 'The standing part runs up to the hoist.' },
      { rope: 0, to: 8, text: 'Take the end down behind the pipe, under it and up the front.' },
      { rope: 0, to: 13, text: 'Round the standing part: behind it and back across the front.' },
      { rope: 0, to: 17, text: 'Twist the end round its own part, the turn on the pipe, three times at least. Pull it snug.' },
    ],
  },
  {
    id: 'sheetbend',
    name: 'Sheet bend',
    kind: 'Bend',
    use: 'Joins two lines, even two of different sizes: the bight goes in the thicker one.',
    jobs: ['Joining two hand lines to make one long enough', 'Tying a thin line to a thicker one', 'Joining a tag line extension'],
    watch: "Both short ends on the same side, or it's the weaker left-handed sheet bend. Leave long tails.",
    ropes: [
      rope(
        [
          [14, 172],
          [150, 172],
          [196, 166],
          [214, 140],
          [196, 112],
          [150, 108],
          [60, 108],
        ],
        6,
        'b',
      ),
      rope(
        [
          [292, 146],
          [240, 142],
          [205, 140],
          [176, 140],
          [152, 138],
          [140, 118],
          [138, 96],
          [124, 80],
          [106, 90],
          [104, 140],
          [108, 192],
          [128, 200],
          [140, 182],
          [146, 160],
          [164, 132],
          [188, 124],
        ],
        1,
      ),
    ],
    props: [],
    cross: 'uouuou',
    steps: [
      { rope: 0, to: 6, text: 'Make a bight in the thicker line (blue).' },
      { rope: 1, to: 6, text: 'Bring the thinner line (orange) in under the bight and up through it.' },
      { rope: 1, to: 11, text: 'Round behind both parts of the bight.' },
      { rope: 1, to: 15, text: 'Over the bight and tuck the end under its own line. Both short ends on the same side.' },
    ],
  },
  {
    id: 'square',
    name: 'Square knot',
    aka: 'Reef knot',
    kind: 'Binding',
    use: 'Ties the two ends of one line round a bundle, flat and easy to untie.',
    jobs: ['Tying a bundle of rod or small pipe together', 'Tying off a bag or a tarp round a bundle', 'Binding a coil'],
    watch: "Never to join two lines that take a load: it can capsize and pull apart. Use a sheet bend for that. Each colour's two parts lie on the same side of the other's bight, or it is a granny.",
    ropes: [
      rope(
        [
          [8, 120],
          [120, 120],
          [182, 120],
          [206, 130],
          [212, 150],
          [206, 170],
          [182, 180],
          [120, 180],
          [40, 180],
        ],
        8,
      ),
      rope(
        [
          [292, 138],
          [240, 138],
          [205, 138],
          [168, 124],
          [130, 104],
          [98, 100],
          [76, 120],
          [72, 150],
          [76, 180],
          [98, 200],
          [130, 196],
          [168, 176],
          [205, 162],
          [240, 162],
          [292, 162],
        ],
        1,
        'b',
      ),
    ],
    props: [],
    cross: 'uouuou',
    steps: [
      { rope: 0, to: 8, text: 'One end (orange) makes a bight.' },
      { rope: 1, to: 4, text: 'Bring the other end (blue) in under the bight and over its top part.' },
      { rope: 1, to: 9, text: 'Round under both orange parts.' },
      { rope: 1, to: 14, text: 'Over the bottom part and back out under the bight. Each colour stays on one side of the other: a square knot.' },
    ],
  },
];

export const knotById = (id: string) => KNOTS.find((k) => k.id === id);

// ------------------------------------------------------------ steps as lengths

/** Where each rope is shown to, as a point along it, once the steps before `step` are done (step 0: the standing parts). */
export function reachBefore(k: Knot, step: number): number[] {
  const at = k.ropes.map((r) => r.start);
  k.steps.slice(0, step).forEach((s) => (at[s.rope] = Math.max(at[s.rope]!, s.to)));
  return at;
}

/** The same, once `step` is done too. */
export const reachAfter = (k: Knot, step: number) => reachBefore(k, step + 1);

/** What would make a knot draw wrong or tie wrong: the tests hold every knot to none. */
export function knotProblems(k: Knot): string[] {
  const out: string[] = [];
  const laid = layout(k.ropes, k.cross);
  if (!/^[ou]*$/.test(k.cross)) out.push(`${k.id}: cross may hold only o and u`);
  if (laid.crossings.length !== k.cross.length) out.push(`${k.id}: ${laid.crossings.length} crossings drawn, ${k.cross.length} said`);
  const last = k.ropes.map((r) => r.start);
  k.steps.forEach((s, i) => {
    const r = k.ropes[s.rope];
    if (!r) return out.push(`${k.id} step ${i + 1}: no rope ${s.rope}`);
    if (s.to < last[s.rope]! || s.to >= r.pts.length) out.push(`${k.id} step ${i + 1}: goes back, or past the rope's end`);
    last[s.rope] = Math.max(last[s.rope]!, s.to);
    if (!s.text.trim()) out.push(`${k.id} step ${i + 1}: says nothing`);
  });
  k.ropes.forEach((r, i) => last[i]! !== r.pts.length - 1 && out.push(`${k.id}: rope ${i} is never tied to its end`));
  if (!k.steps.some((s, i) => reachAfter(k, i)[s.rope]! > reachBefore(k, i)[s.rope]!)) out.push(`${k.id}: nothing to tie`);
  if (!k.use.trim() || !k.watch.trim() || k.jobs.length < 2) out.push(`${k.id}: what it is for, or what to watch, is missing`);
  return out;
}
