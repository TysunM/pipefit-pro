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

import { ROPE_W, layout, type P, type Prop, type Rope } from './rope';

export type KnotKind = 'Loop' | 'Hitch' | 'Stopper' | 'Bend' | 'Binding';

export type KnotStep = { rope: number; to: number; text: string; /** The last step: pulling it tight. */ tighten?: boolean };

/** An end or a bight pulled to set the knot: the point pulled, and the way. */
export type Pull = { rope: number; at: number; dir: readonly [number, number] };

/**
 * How the knot draws up when it is pulled tight: its body drawn in toward a
 * centre (by s, across and down), each point by its weight (a range of points
 * and how much: 1 all the way, 0 not at all), and the pulled points out the way
 * they are pulled.
 */
export type Snug = { c: readonly [number, number]; s: readonly [number, number]; w: readonly (readonly (readonly [number, number, number])[])[] };
export type Tight = { text: string; pulls: Pull[]; snug: Snug };

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
  /** The last step: which parts to pull, and the knot drawn up tight. */
  tight: Tight;
  /** What to look at before it takes a load. */
  checks: Check[];
  /** The faults hands tie, each drawn, to spot against the knot tied right. */
  faults: Fault[];
};

/** One thing to look at before it takes a load, and where on the knot pulled tight: points on its ropes. */
export type Check = { text: string; at?: readonly (readonly [number, number])[] };

/**
 * A fault, drawn from the knot itself so the drawing can't be wrong:
 * - loose: as tied, never pulled tight;
 * - short: pulled tight, the tail of each rope named cut off just past its
 *   last crossing (or past crossing `after`, dropping the tucks beyond it);
 * - cross: pulled tight, the crossings named going the other way, over for under.
 */
export type Fault = { id: string; name: string; why: string } & ({ kind: 'loose' } | { kind: 'short'; ropes: number[]; after?: number } | { kind: 'cross'; flip: number[] });

type Tied = Omit<Knot, 'checks' | 'faults'>;

const rope = (pts: P[], start: number, color: Rope['color'] = 'a'): Rope => ({ pts, start, color });

const TIED: Tied[] = [
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
    tight: {
      text: 'Set it: hold the eye and the tail together, and pull the standing part hard. The loop closes round both parts of the end.',
      pulls: [
        { rope: 0, at: 0, dir: [0, -1] },
        { rope: 0, at: 16, dir: [0, 1] },
      ],
      snug: { c: [150, 135], s: [0.72, 0.72], w: [[[2, 2, 0.5], [3, 11, 1], [12, 12, 0.6], [13, 13, 0.25], [19, 19, 0.25], [20, 20, 0.6], [21, 31, 1], [32, 32, 0.7]]] },
    },
  },
  {
    id: 'runbowline',
    name: 'Running bowline',
    kind: 'Loop',
    use: "A noose made with a bowline: the standing part runs through the bowline's eye, so it closes on a pull and still unties after.",
    jobs: ['Snaring something hanging out of reach with the end of a hand line', 'A noose that has to come undone easily after a hard pull', 'Lassoing a valve handle or a post from a distance'],
    watch: 'It closes under load: never round a person, and never on a lift. Leave a tail, and check the bowline before every use.',
    ropes: [
      rope(
        [
          [240, 4],
          [240, 60],
          [240, 120],
          [240, 180],
          [240, 240],
          [226, 276],
          [180, 292],
          [100, 292],
          [36, 276],
          [12, 236],
          [10, 196],
          [20, 172],
          [56, 166],
          [92, 165],
          [116, 169],
          [140, 179],
          [166, 170],
          [175, 148],
          [165, 125],
          [140, 115],
          [113, 125],
          [102, 148],
          [104, 178],
          [104, 202],
          [128, 226],
          [180, 234],
          [244, 214],
          [274, 150],
          [248, 92],
          [205, 80],
          [190, 102],
          [180, 122],
          [166, 134],
          [138, 137],
          [106, 136],
          [74, 140],
          [56, 166],
          [60, 192],
          [82, 208],
          [116, 200],
          [140, 182],
          [160, 164],
          [184, 158],
          [202, 142],
          [218, 126],
        ],
        2,
      ),
    ],
    props: [],
    cross: 'oouuouoou',
    steps: [
      { rope: 0, to: 2, text: 'The standing part runs up to the pull.' },
      { rope: 0, to: 11, text: 'Carry the end round whatever the noose goes round.' },
      { rope: 0, to: 23, text: 'Make a small loop in the end part, the working side laid over: the rabbit hole.' },
      { rope: 0, to: 31, text: 'Take the end out round the standing part and back: the eye goes round it.' },
      { rope: 0, to: 35, text: 'Up through the small loop from underneath.' },
      { rope: 0, to: 38, text: 'Round behind its own line: round the tree.' },
      { rope: 0, to: 44, text: 'Back down through the small loop beside itself. The standing part runs through the eye: a noose.' },
    ],
    tight: {
      text: 'Set the bowline: hold the eye and the tail and pull hard. Then pull the standing part and the noose runs closed on what it is round.',
      pulls: [
        { rope: 0, at: 44, dir: [0.7, -0.7] },
        { rope: 0, at: 0, dir: [0, -1] },
      ],
      snug: { c: [110, 168], s: [0.75, 0.75], w: [[[12, 12, 0.3], [13, 23, 1], [24, 24, 0.5], [31, 31, 0.5], [32, 43, 1], [44, 44, 0.5]]] },
    },
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
    tight: {
      text: 'Set it: pull both ends to snug the turns together on the pipe, then put the pull on the standing part.',
      pulls: [
        { rope: 0, at: 0, dir: [0, 1] },
        { rope: 0, at: 12, dir: [0, 1] },
      ],
      snug: { c: [128, 150], s: [0.72, 1], w: [[[1, 1, 0.3], [2, 10, 1], [11, 11, 0.5]]] },
    },
  },
  {
    id: 'rolling',
    name: 'Rolling hitch',
    kind: 'Hitch',
    use: 'Grips a pipe, or another line, so a pull along it will not slide it: the hitch for a lengthwise pull.',
    jobs: ['Pulling a length of pipe along its own line', 'Taking the strain off a loaded line to free a jammed knot', 'A tag line on a smooth pipe that has to pull lengthwise'],
    watch: 'It grips toward the side the two turns are on: pull it that way. Pulled the other way, it slides. Leave a tail.',
    ropes: [
      rope(
        [
          [4, 150],
          [50, 150],
          [95, 150],
          [135, 150],
          [152, 160],
          [158, 184],
          [150, 170, 'b'],
          [136, 130, 'b'],
          [130, 116],
          [118, 136],
          [108, 160],
          [100, 184],
          [94, 170, 'b'],
          [84, 130, 'b'],
          [80, 116],
          [68, 136],
          [58, 160],
          [50, 184],
          [72, 172, 'b'],
          [125, 150, 'b'],
          [178, 128, 'b'],
          [200, 116],
          [190, 140],
          [180, 162],
          [172, 184],
          [174, 170, 'b'],
          [176, 130, 'b'],
          [178, 116],
          [196, 150],
          [214, 184],
          [232, 212],
        ],
        2,
      ),
    ],
    props: [{ kind: 'pipe', y: 150, r: 24 }],
    cross: 'oou',
    steps: [
      { rope: 0, to: 2, text: 'The standing part comes in along the pipe from the side the pull comes from.' },
      { rope: 0, to: 11, text: 'Round the pipe and back down across the front, over the standing part: the first turn.' },
      { rope: 0, to: 17, text: 'Round again, beside it toward the pull, and over the standing part again.' },
      { rope: 0, to: 24, text: 'Round the pipe once more, on the far side of the standing part.' },
      { rope: 0, to: 30, text: 'Round again and tuck the end under that last turn: a half hitch. Pull it snug.' },
    ],
    tight: {
      text: 'Set it: snug the turns together, then pull the standing part along the pipe toward the two turns. They grip it there.',
      pulls: [
        { rope: 0, at: 30, dir: [0.6, 0.8] },
        { rope: 0, at: 0, dir: [-1, 0] },
      ],
      snug: { c: [130, 150], s: [0.72, 0.85], w: [[[1, 1, 0.3], [2, 29, 1], [30, 30, 0.4]]] },
    },
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
    tight: {
      text: 'Set it: hold its shape and pull the standing part and the end apart, so it draws up neat with no turn crossed over.',
      pulls: [
        { rope: 0, at: 0, dir: [-1, 0] },
        { rope: 0, at: 15, dir: [1, 0] },
      ],
      snug: { c: [140, 145], s: [0.7, 0.7], w: [[[1, 1, 0.4], [2, 13, 1], [14, 14, 0.4]]] },
    },
  },
  {
    id: 'fig8loop',
    name: 'Figure-eight loop',
    aka: 'Figure eight follow-through',
    kind: 'Loop',
    use: 'A fixed loop that will not slip or shake loose: a figure eight with two strands side by side, easy to check.',
    jobs: ["Tying a hand line into a closed handle a hook won't fit", "A loop at the end of a hand line that can't shake loose when it flops around", 'A fixed loop anyone can check at a glance'],
    watch: "It jams after a heavy load and is hard to untie: for a loop you'll untie, tie a bowline. Keep the two strands side by side, never crossed. Leave a tail.",
    ropes: [
      rope(
        [
          [134, 4],
          [134, 37],
          [134, 90],
          [136, 146],
          [152, 189],
          [190, 197],
          [222, 170],
          [211, 130],
          [171, 117],
          [115, 109],
          [101, 88],
          [118, 71],
          [163, 76],
          [189, 114],
          [179, 160],
          [160, 215],
          [150, 238],
          [146, 264],
          [162, 288],
          [192, 288],
          [206, 264],
          [196, 242],
          [182, 232],
          [178, 206],
          [183, 192],
          [188, 178],
          [194, 160],
          [199, 144],
          [203, 126],
          [202, 107],
          [194, 89],
          [182, 73],
          [166, 61],
          [147, 56],
          [127, 55],
          [108, 60],
          [91, 76],
          [92, 105],
          [105, 120],
          [124, 127],
          [140, 128],
          [156, 129],
          [169, 131],
          [184, 134],
          [196, 137],
          [202, 141],
          [207, 150],
          [209, 161],
          [208, 168],
          [201, 176],
          [191, 182],
          [181, 184],
          [170, 183],
          [161, 179],
          [156, 169],
          [152, 155],
          [149, 140],
          [148, 123],
          [148, 109],
          [148, 95],
          [148, 76],
          [148, 58],
          [148, 41],
        ],
        2,
      ),
    ],
    props: [],
    cross: 'ououuououuoouuoo',
    steps: [
      { rope: 0, to: 2, text: 'The standing part comes down from the top.' },
      { rope: 0, to: 8, text: 'Tie a figure eight in the line: a loop, round and across the standing part,' },
      { rope: 0, to: 15, text: 'round behind it and down through the loop. Leave it loose.' },
      { rope: 0, to: 22, text: 'Take the end round what the loop goes round, or through the handle: the eye.' },
      { rope: 0, to: 40, text: 'Follow the eight back, beside the first pass, every turn the same way.' },
      { rope: 0, to: 62, text: 'All the way out, the tail beside the standing part. Two strands side by side all through.' },
    ],
    tight: {
      text: 'Set it: dress the two strands flat side by side, then pull each of the four parts in turn until it draws up snug.',
      pulls: [
        { rope: 0, at: 62, dir: [0, -1] },
        { rope: 0, at: 0, dir: [0, -1] },
      ],
      snug: { c: [160, 135], s: [0.88, 0.88], w: [[[1, 1, 0.3], [2, 15, 1], [16, 16, 0.5], [22, 22, 0.5], [23, 58, 1], [59, 59, 0.5]]] },
    },
  },
  {
    id: 'slip',
    name: 'Quick-release knot',
    aka: 'Slipped overhand',
    kind: 'Stopper',
    use: 'A knot that lets go with one pull on the tail: for something that has to come undone fast.',
    jobs: ['Tying off a tarp or a coil to undo in a hurry', 'A quick stopper that comes out with one pull', 'Holding a coil together so one pull sets it free'],
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
    tight: {
      text: 'Set it: pull the bight against the standing part to snug it. Leave the tail free: one pull on it and it lets go.',
      pulls: [
        { rope: 0, at: 0, dir: [-1, 0] },
        { rope: 0, at: 13, dir: [0, -1] },
      ],
      snug: { c: [150, 140], s: [0.75, 0.75], w: [[[1, 1, 0.3], [2, 11, 1], [12, 12, 0.5], [14, 14, 0.5], [15, 16, 1], [17, 17, 0.5]]] },
    },
  },
  {
    id: 'slipknot',
    name: 'Slip knot',
    aka: 'Sliding loop',
    kind: 'Loop',
    use: 'A loop that slides: pull the standing part and it closes snug on whatever it is round.',
    jobs: ['Cinching a hand line tight round a bundle of conduit', 'A loop that cinches tight on a post or rail', 'A running loop that closes up as the line is pulled'],
    watch: 'It slides closed under load: never round a person, and never on a lift. For a loop that holds its size, tie a bowline.',
    ropes: [
      rope(
        [
          [108, 2],
          [108, 50],
          [108, 100],
          [108, 150],
          [108, 200],
          [110, 236],
          [128, 260],
          [150, 252],
          [157, 222],
          [157, 185],
          [157, 145],
          [157, 105],
          [159, 72],
          [178, 46],
          [220, 44],
          [250, 70],
          [262, 120],
          [252, 172],
          [224, 200],
          [192, 203],
          [145, 192],
          [100, 182],
          [82, 170],
          [90, 156],
          [128, 150],
          [178, 146],
          [180, 134],
          [140, 128],
          [100, 120],
          [82, 108],
          [90, 94],
          [128, 88],
          [178, 84],
          [186, 74],
          [145, 66],
          [104, 60],
          [70, 44],
          [44, 22],
        ],
        2,
      ),
    ],
    props: [],
    cross: 'oouuoouuoo',
    steps: [
      { rope: 0, to: 2, text: 'The standing part comes down from the top.' },
      { rope: 0, to: 11, text: 'Fold the end back along the line to make a bight: the end runs back beside the standing part.' },
      { rope: 0, to: 19, text: 'Carry the end on round in a loop, back toward the bight.' },
      { rope: 0, to: 25, text: 'Wrap the end across the front of both parts and round behind them, inside the loop.' },
      { rope: 0, to: 32, text: 'Wrap it round both parts again, working up the line: two or three wraps in all.' },
      { rope: 0, to: 37, text: 'Bring the end across the front of both parts and out.' },
    ],
    tight: {
      text: 'Set it: hold the loop and pull the end to snug the wraps into a neat coil. Then pull the standing part, and the loop slides closed on what it is round.',
      pulls: [
        { rope: 0, at: 37, dir: [-0.7, -0.7] },
        { rope: 0, at: 0, dir: [0, -1] },
      ],
      snug: { c: [132, 125], s: [0.58, 0.8], w: [[[11, 11, 0.3], [12, 12, 0.6], [13, 18, 0.9], [19, 35, 1], [36, 36, 0.5]]] },
    },
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
    tight: {
      text: 'Set it: slide both half hitches up snug against the round turn and pull the end tight. Then the load goes on the standing part.',
      pulls: [
        { rope: 0, at: 26, dir: [0.7, 0.7] },
        { rope: 0, at: 0, dir: [0, 1] },
      ],
      snug: { c: [110, 140], s: [0.85, 0.6], w: [[[11, 11, 0.5], [12, 24, 1], [25, 25, 0.6], [26, 26, 0.2]]] },
    },
  },
  {
    id: 'timber',
    name: 'Timber hitch',
    kind: 'Hitch',
    use: 'Grips a pipe or a bundle of timber for a pull or a hand-line hoist, and falls apart when the load comes off.',
    jobs: ['Dragging a bundle of timber or dunnage', 'Hauling pipe along a rack', 'Pulling a post or log that has to fall free once the pull is off'],
    watch: 'Three twists at least, round its own part, not round the pipe. To send a length of pipe up on a hand line, add a half hitch near the top end: the timber hitch and half hitch.',
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
    tight: {
      text: 'Set it: pull the standing part. The turn closes on the pipe and the twists bite on themselves. Three twists at least.',
      pulls: [{ rope: 0, at: 0, dir: [0, -1] }],
      snug: { c: [150, 140], s: [0.75, 0.85], w: [[[6, 6, 0.4], [7, 7, 0.8], [8, 17, 1]]] },
    },
  },
  {
    id: 'killick',
    name: 'Timber hitch and half hitch',
    aka: 'Killick hitch',
    kind: 'Hitch',
    use: 'A timber hitch at the far end and a half hitch near the top: the pipe goes up on end, steady, instead of swinging.',
    jobs: ['Hoisting a length of pipe on a hand line', 'Sending a stick of conduit up end first', 'Lowering a length of pipe down a shaft'],
    watch: 'Tie the timber hitch at the far end first, then drop the half hitch over the end that goes up first. Three twists at least in the timber hitch. Leave a tail.',
    ropes: [
      rope(
        [
          [4, 150],
          [40, 150],
          [70, 150],
          [95, 151],
          [102, 166],
          [108, 182],
          [98, 162, 'b'],
          [86, 136, 'b'],
          [78, 118],
          [72, 132],
          [74, 152],
          [82, 166],
          [100, 169],
          [120, 160],
          [145, 151],
          [175, 150],
          [205, 150],
          [213, 134],
          [219, 118],
          [232, 150, 'b'],
          [258, 182],
          [238, 181],
          [212, 179],
          [184, 176],
          [168, 160],
          [164, 140],
          [166, 122],
          [180, 113],
          [190, 126],
          [192, 150],
          [195, 166],
          [202, 192],
          [212, 199],
          [220, 172],
          [228, 160],
          [240, 196],
          [254, 214],
        ],
        2,
      ),
    ],
    props: [{ kind: 'pipe', y: 150, r: 26 }],
    cross: 'uouoouo',
    steps: [
      { rope: 0, to: 2, text: 'The hoist line comes in along the pipe, from the end that goes up first.' },
      { rope: 0, to: 9, text: 'Near that end, a turn round the pipe: down round the bottom and back over the top.' },
      { rope: 0, to: 13, text: 'Under the line itself and over the turn: a half hitch.' },
      { rope: 0, to: 20, text: 'Along the pipe to near the far end, and round the pipe: over the top and under it.' },
      { rope: 0, to: 30, text: 'Round the standing part: under it and back over.' },
      { rope: 0, to: 36, text: 'Twist the end round the turn on the pipe, three times at least.' },
    ],
    tight: {
      text: 'Set it: pull the hoist line along the pipe. The timber hitch bites at the far end and the half hitch holds the near end in line.',
      pulls: [{ rope: 0, at: 0, dir: [-1, 0] }],
      snug: { c: [150, 150], s: [0.85, 0.75], w: [[[1, 1, 0.3], [2, 36, 1]]] },
    },
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
    tight: {
      text: 'Set it: hold both short ends and pull the two standing parts apart. Check both short ends are on the same side.',
      pulls: [
        { rope: 0, at: 0, dir: [-1, 0] },
        { rope: 1, at: 0, dir: [1, 0] },
      ],
      snug: {
        c: [150, 140],
        s: [0.85, 0.65],
        w: [
          [[0, 0, 0.3], [1, 5, 1], [6, 6, 0.5]],
          [[1, 1, 0.3], [2, 15, 1]],
        ],
      },
    },
  },
  {
    id: 'dsheetbend',
    name: 'Double sheet bend',
    kind: 'Bend',
    use: 'A sheet bend with a second turn round the bight: it holds where a single one slips, in a wet, stiff or slick line.',
    jobs: ['Joining a wet or stiff line to another', 'Joining a slick synthetic hand line that a single bend lets slip', 'Joining two lines that will be jerked and slacked all day'],
    watch: 'Leave long tails. The second turn goes round outside the first, and both tuck under the thinner line itself. Both short ends on the same side.',
    ropes: [
      rope(
        [
          [8, 190],
          [120, 190],
          [200, 190],
          [234, 174],
          [244, 150],
          [234, 126],
          [200, 110],
          [120, 110],
          [22, 110],
        ],
        8,
        'b',
      ),
      rope(
        [
          [292, 150],
          [266, 150],
          [240, 150],
          [200, 150],
          [150, 150],
          [126, 148],
          [114, 132],
          [112, 110],
          [104, 86],
          [86, 74],
          [72, 90],
          [70, 130],
          [70, 190],
          [74, 214],
          [90, 228],
          [104, 214],
          [110, 190],
          [122, 166],
          [134, 148],
          [144, 128],
          [150, 110],
          [148, 82],
          [128, 58],
          [90, 46],
          [58, 56],
          [48, 90],
          [48, 150],
          [50, 200],
          [60, 242],
          [88, 258],
          [118, 244],
          [130, 214],
          [136, 190],
          [146, 170],
          [158, 150],
          [172, 136],
          [192, 128],
        ],
        1,
      ),
    ],
    props: [],
    cross: 'uouuououuou',
    steps: [
      { rope: 0, to: 8, text: 'Make a bight in the thicker line (blue).' },
      { rope: 1, to: 8, text: 'Bring the thinner line (orange) in under the bight and up through it.' },
      { rope: 1, to: 15, text: 'Round behind both parts of the bight.' },
      { rope: 1, to: 21, text: 'Up across the front, under its own line, and over the top: the first turn.' },
      { rope: 1, to: 30, text: 'Round behind both parts a second time, outside the first turn.' },
      { rope: 1, to: 36, text: 'Up across the front again and tuck the end under its own line, beside the first. Both short ends on the same side.' },
    ],
    tight: {
      text: 'Set it: hold both short ends and pull the two standing parts apart. Check both turns are tucked under the orange line.',
      pulls: [
        { rope: 0, at: 0, dir: [-1, 0] },
        { rope: 1, at: 0, dir: [1, 0] },
      ],
      snug: {
        c: [140, 150],
        s: [0.8, 0.62],
        w: [
          [[0, 0, 0.3], [1, 7, 1], [8, 8, 0.5]],
          [[1, 1, 0.3], [2, 36, 1]],
        ],
      },
    },
  },
  {
    id: 'square',
    name: 'Square knot',
    aka: 'Reef knot',
    kind: 'Binding',
    use: 'Ties the two ends of one line round a bundle, flat and easy to untie.',
    jobs: ['Tying a bundle of rod or small pipe together', 'Tying off a bag or a tarp round a bundle', 'Tying both ends of a tie round a coil, flat'],
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
    tight: {
      text: "Set it: pull both parts of each colour away from the other, and it draws up flat. If a colour's two parts don't lie side by side, it's a granny: tie it again.",
      pulls: [
        { rope: 0, at: 0, dir: [-1, 0] },
        { rope: 1, at: 0, dir: [1, 0] },
      ],
      snug: {
        c: [140, 150],
        s: [0.8, 0.6],
        w: [
          [[0, 0, 0.3], [1, 7, 1], [8, 8, 0.5]],
          [[1, 1, 0.4], [2, 12, 1], [13, 13, 0.4]],
        ],
      },
    },
  },
  {
    id: 'catspaw',
    name: "Cat's paw",
    kind: 'Hitch',
    use: 'Puts the middle of a line on a hook with two twisted loops: quick on, quick off, and it never jams.',
    jobs: ['Hanging a bucket from a hook on the middle of a hand line', 'Putting the middle of a hand line on a hook so both ends hang', 'Hooking on a hand line without a knot that jams'],
    watch: 'Hand lines and light material only: never as a sling on a lift. Three twists in each loop, the two loops twisted opposite ways. No tails: both legs take the load.',
    ropes: [
      rope(
        [
          [40, 296],
          [70, 240],
          [95, 200],
          [125, 176],
          [95, 152],
          [125, 128],
          [126, 100],
          [124, 70],
          [110, 46],
          [96, 70, 'b'],
          [96, 98],
          [95, 128],
          [125, 152],
          [95, 176],
          [125, 200],
          [150, 216],
          [175, 200],
          [205, 176],
          [175, 152],
          [205, 128],
          [204, 98],
          [204, 70, 'b'],
          [190, 46],
          [176, 70],
          [174, 100],
          [175, 128],
          [205, 152],
          [175, 176],
          [205, 200],
          [230, 240],
          [260, 296],
        ],
        2,
      ),
    ],
    props: [{ kind: 'pipe', y: 70, r: 16 }],
    cross: 'ououou',
    steps: [
      { rope: 0, to: 2, text: 'Tied in the middle of the line: one leg runs down to the load.' },
      { rope: 0, to: 10, text: 'Up into the first loop: over the hook from the front and round behind it.' },
      { rope: 0, to: 14, text: 'Down from the hook, twisted round the way up three times: the first loop.' },
      { rope: 0, to: 21, text: 'Across to the second loop: up behind the hook and over it.' },
      { rope: 0, to: 30, text: 'Down, twisted three times the other way, and the second leg runs down to the load.' },
    ],
    tight: {
      text: 'Set it: pull both legs down together. The twists close up and grip, and the loops bed down on the hook.',
      pulls: [
        { rope: 0, at: 0, dir: [-0.4, 0.9] },
        { rope: 0, at: 30, dir: [0.4, 0.9] },
      ],
      snug: { c: [150, 120], s: [0.8, 0.8], w: [[[1, 1, 0.3], [2, 28, 1], [29, 29, 0.3]]] },
    },
  },
  {
    id: 'trucker',
    name: "Trucker's hitch",
    kind: 'Hitch',
    use: 'A rope pulley: a slip loop in the line, the end round the anchor and back through the loop for twice the pull, then tied off.',
    jobs: ['Pulling a tie-down tight over a load of pipe on a truck', 'Tensioning a line between two anchors by hand', 'Drawing a tarp down tight over material on a rack'],
    watch: 'For securing material, never for lifting. The pulley loop wears where the line runs through it: check it. Leave a tail past the half hitches.',
    ropes: [
      rope(
        [
          [118, 4],
          [118, 22],
          [119, 74],
          [124, 124],
          [148, 166],
          [200, 176],
          [244, 160],
          [240, 80],
          [208, 46],
          [150, 40],
          [90, 42],
          [56, 54],
          [60, 72],
          [96, 78],
          [150, 76],
          [210, 72],
          [256, 66],
          [290, 104],
          [258, 146],
          [212, 144],
          [160, 144],
          [128, 144],
          [94, 148],
          [70, 164],
          [64, 186],
          [62, 205],
          [62, 240],
          [62, 266],
          [62, 284],
          [80, 288, 'b'],
          [150, 286, 'b'],
          [220, 284, 'b'],
          [244, 272],
          [270, 250],
          [278, 210],
          [278, 160],
          [278, 112],
          [270, 100],
          [262, 108],
          [261, 124],
          [260, 160],
          [252, 184],
          [222, 194],
          [160, 192],
          [98, 190],
          [62, 194],
          [40, 200],
          [40, 214],
          [64, 222],
          [92, 232],
          [118, 244],
          [104, 260],
          [62, 265],
          [40, 268],
          [36, 254],
          [62, 246],
          [94, 234],
          [122, 223],
          [144, 217],
        ],
        1,
      ),
    ],
    props: [{ kind: 'pipe', y: 284, r: 10 }],
    cross: 'ouoouuououou',
    steps: [
      { rope: 0, to: 1, text: 'The line comes down from the load.' },
      { rope: 0, to: 10, text: 'Make a loop in the line: round, and back over itself.' },
      { rope: 0, to: 17, text: 'Push a bight of the line below up through the loop.' },
      { rope: 0, to: 23, text: 'Its other side back down through the loop: a slip loop sticking out. That is the pulley. Snug it.' },
      { rope: 0, to: 32, text: 'On down and round the rail or the anchor.' },
      { rope: 0, to: 43, text: 'Up through the pulley loop and back down. Pull down: the load comes tight at twice your pull.' },
      { rope: 0, to: 58, text: 'Hold it tight and tie off with two half hitches round the line below the loop.' },
    ],
    tight: {
      text: 'Set it: pull the end down hard to draw the load tight, pinch it at the loop, then snug the two half hitches.',
      pulls: [
        { rope: 0, at: 58, dir: [0.8, -0.6] },
        { rope: 0, at: 0, dir: [0, -1] },
      ],
      snug: { c: [150, 104], s: [0.88, 0.88], w: [[[1, 1, 0.3], [2, 13, 0.6]]] },
    },
  },
];

// ------------------------------------------------------------ dress and check

// Most knots that fail were tied right and then not set, cut short or crossed
// the wrong way at one tuck. Each fault here is one a hand really ties, and is
// drawn from the knot tied right: the tests prove the crossing faults are the
// knot (or no knot) they say.

const notSet = (why: string): Fault => ({ id: 'loose', kind: 'loose', name: 'Not set', why });
const TAIL = 'Leave a tail of a dozen rope widths.';
const shortTail = (why = `Cut short, the tail can pull back through as the line loads and slacks, and the knot lets go. ${TAIL}`): Fault => ({ id: 'short', kind: 'short', ropes: [0], name: 'Short tail', why });

const DRESS: Record<string, Pick<Knot, 'checks' | 'faults'>> = {
  bowline: {
    checks: [
      { text: 'The small loop closes round both parts of the end where they pass through it.', at: [[0, 29]] },
      { text: 'The end goes round the back of the standing part: a collar, snug on it.', at: [[0, 25]] },
      { text: `The tail finishes inside the eye. ${TAIL}`, at: [[0, 32]] },
    ],
    faults: [notSet("Not pulled tight, a bowline can shake loose before the load comes on. Hold the eye and the tail, and pull the standing part hard."), shortTail()],
  },
  runbowline: {
    checks: [
      { text: "The standing part runs through the bowline's eye.", at: [[0, 3]] },
      { text: 'The bowline itself: the small loop closes round both parts of the end, the collar snug round its own line.', at: [[0, 36]] },
      { text: `The tail finishes inside the eye. ${TAIL}`, at: [[0, 44]] },
    ],
    faults: [
      { id: 'eye', kind: 'cross', flip: [2], name: 'Not through the eye', why: "The standing part only lies across the eye instead of running through it. That's a bowline beside its own line: pull it and nothing closes. Run the standing part through the eye." },
      notSet('Not set, the bowline can shake loose before the noose takes a pull. Hold the eye and the tail and pull hard first.'),
      shortTail(),
    ],
  },
  clove: {
    checks: [
      { text: 'Two turns side by side on the pipe, crossing in an X on the front.', at: [[0, 9]] },
      { text: 'The end comes out from under the X, between the two turns.', at: [[0, 11]] },
      { text: 'If the pull keeps changing direction, back it up with two half hitches.' },
    ],
    faults: [
      { id: 'tuck', kind: 'cross', flip: [0], name: 'End over the X', why: "The end crosses over the first turn instead of tucking under it. Nothing traps it: that's two turns wrapped round the pipe, and they slide off. Tuck it under the X." },
      notSet('Turns left loose roll along the pipe and slip. Pull both ends to bed them down before the pull comes on.'),
      shortTail(),
    ],
  },
  rolling: {
    checks: [
      { text: 'Two turns ride over the standing part, side by side, toward the pull.', at: [[0, 10], [0, 16]] },
      { text: 'The last turn on the far side, the end tucked under it.', at: [[0, 28]] },
      { text: 'The pull comes along the pipe toward the two turns. The other way, it slides.' },
    ],
    faults: [
      { id: 'tuck', kind: 'cross', flip: [2], name: 'End not tucked', why: "The end runs over its last turn instead of under it. Nothing holds the turns: under a pull along the pipe they unwind and slide. Tuck it under." },
      notSet('Turns left loose ride up on each other and slip along the pipe. Snug them together before the pull comes on.'),
      shortTail(),
    ],
  },
  figure8: {
    checks: [
      { text: "It reads as an 8: two loops, and the end out through the second, no turn crossed over.", at: [[0, 8]] },
      { text: `Drawn up neat with a tail. ${TAIL}`, at: [[0, 14]] },
    ],
    faults: [
      { id: 'tuck', kind: 'cross', flip: [3], name: 'Last tuck over, not under', why: "The end goes over the last strand where it goes under. That isn't a figure eight, it's no knot at all: pull the ends and it falls straight out." },
      notSet("Left loose, it can capsize into a smaller knot or work out of the end. Pull the standing part and the end apart to set it."),
      shortTail(),
    ],
  },
  fig8loop: {
    checks: [
      { text: 'Two strands side by side all through the eight, never crossed over each other.', at: [[0, 8], [0, 40]] },
      { text: 'The eye the size the job needs.', at: [[0, 19]] },
      { text: `The tail comes out beside the standing part. ${TAIL}`, at: [[0, 62]] },
    ],
    faults: [
      { id: 'crossed', kind: 'cross', flip: [4], name: 'Strands crossed', why: "The second pass jumps over the first instead of lying beside it. A crossed eight is weaker and can't be checked at a glance. Follow the first pass exactly." },
      notSet('Left loose, the eight can roll and the strands slide over each other. Dress them flat and pull all four parts snug.'),
      shortTail(),
    ],
  },
  slip: {
    checks: [
      { text: 'A bight of the end comes up through the loop: the end itself never goes through.', at: [[0, 12]] },
      { text: 'The tail hangs free to pull: one pull and it lets go. Never let it take a load.', at: [[0, 18]] },
    ],
    faults: [
      notSet('Left loose, a slip knot falls out by itself. Pull the bight against the standing part to snug it.'),
      shortTail("Cut short, there's nothing to grab to let it go, and the tail can pull through by itself. Leave a tail you can get hold of."),
    ],
  },
  slipknot: {
    checks: [
      { text: 'Two or three wraps round both parts of the line, lying side by side.', at: [[0, 22], [0, 29]] },
      { text: 'The end comes out of the last wrap with a tail to spare.', at: [[0, 36]] },
      { text: 'The loop slides: pull the standing part and it closes. Never round a person.', at: [[0, 6]] },
    ],
    faults: [
      { id: 'wraps', kind: 'short', ropes: [0], after: 3, name: 'One wrap', why: 'Only one wrap round both parts. It can pull straight out under load: two or three wraps.' },
      notSet("Wraps left loose don't grip: the loop won't stay where you set it, and the end can work out. Pull the end to snug the wraps first."),
      shortTail(),
    ],
  },
  halfhitches: {
    checks: [
      { text: 'Two full turns on the rail: the round turn takes the load.', at: [[0, 7]] },
      { text: 'Both half hitches go the same way round: behind the standing part first, then across the front.', at: [[0, 14], [0, 21]] },
      { text: `Hitches slid up snug against the round turn. ${TAIL}`, at: [[0, 26]] },
    ],
    faults: [
      { id: 'turned', kind: 'cross', flip: [2, 3, 4], name: 'Second hitch the other way', why: "The second half hitch goes round the opposite way to the first: across the front first, then behind. Together they make a cow hitch on the standing part, not a clove hitch, and it slips sooner. Make both the same way round." },
      notSet('Left loose down the standing part, the hitches work loose. Slide them up snug against the round turn and pull the end tight.'),
      shortTail(),
    ],
  },
  timber: {
    checks: [
      { text: 'The end goes round the pipe and back round its own standing part.', at: [[0, 11]] },
      { text: 'Three twists at least, round its own part, not round the pipe.', at: [[0, 15]] },
      { text: 'To hoist a length of pipe, add a half hitch near the top end: the timber hitch and half hitch.' },
    ],
    faults: [
      { id: 'twists', kind: 'short', ropes: [0], after: 2, name: 'One twist', why: 'Only one twist round its own part. The twists are what grip, and one slips under load. Three at least.' },
      notSet("Not drawn up, the turn sits loose and the twists can't bite. Pull the standing part to set it before the hoist takes it."),
    ],
  },
  killick: {
    checks: [
      { text: 'The half hitch near the end that goes up first: the line passes under itself and over the turn.', at: [[0, 10]] },
      { text: 'The timber hitch at the far end: round the pipe, round the standing part, three twists at least.', at: [[0, 33]] },
      { text: 'The line runs straight along the pipe between them, so the pipe rides up in line with it.', at: [[0, 14]] },
    ],
    faults: [
      { id: 'hitch', kind: 'cross', flip: [0], name: 'Half hitch not trapped', why: 'The line runs over itself where it goes under. Nothing traps the turn: it slides off the end, the pipe hangs from the far end alone and swings. The line goes under itself.' },
      { id: 'twists', kind: 'short', ropes: [0], after: 4, name: 'One twist', why: 'Only one twist round the turn at the far end. The twists are what grip, and one slips under load. Three at least.' },
      notSet('Not drawn up, the half hitch and the timber hitch sit loose and the pipe can slip out end first. Pull the hoist line along the pipe before it lifts.'),
    ],
  },
  sheetbend: {
    checks: [
      { text: 'The thinner line (orange) comes up through the bight and round behind both its parts.', at: [[1, 8]] },
      { text: 'Its end is tucked under its own line, nipped against the bight.', at: [[1, 13]] },
      { text: "Both short ends on the same side, or it's the weaker left-handed sheet bend.", at: [[1, 15], [0, 6]] },
    ],
    faults: [
      { id: 'tuck', kind: 'cross', flip: [5], name: 'End not tucked under', why: "The end runs over its own line instead of under it. Nothing nips it: it's only wrapped round the bight, and it pulls out under load. Tuck it under its own line." },
      notSet('Left loose, a sheet bend can slip or spill under load. Hold both short ends and pull the standing parts apart.'),
    ],
  },
  dsheetbend: {
    checks: [
      { text: 'Two turns of the thinner line (orange) round the bight, the second outside the first.', at: [[1, 12], [1, 26]] },
      { text: 'Each turn tucked under the orange line itself, nipped against the bight.', at: [[1, 18], [1, 34]] },
      { text: "Both short ends on the same side, or it's the weaker left-handed bend.", at: [[1, 36], [0, 8]] },
    ],
    faults: [
      { id: 'tuck', kind: 'cross', flip: [10], name: 'Second turn not tucked', why: "The second turn runs over the orange line instead of under it. Nothing nips it: the extra turn unwraps, and you're left with a single sheet bend at best. Tuck it under." },
      notSet('Left loose, the turns sit slack round the bight and the bend can spill. Hold both short ends and pull the standing parts apart.'),
    ],
  },
  square: {
    checks: [
      { text: "Each colour's two parts lie side by side on the same side of the other's bight: blue under the orange bight, orange over the blue.", at: [[0, 4], [1, 7]] },
      { text: 'It draws up flat, each end along its own standing part.' },
      { text: 'For binding a bundle only: never to join two lines that take a load.' },
    ],
    faults: [
      { id: 'granny', kind: 'cross', flip: [3, 4, 5], name: 'Granny knot', why: 'The second half went the same way as the first, so one colour straddles the other: over one part, under the other. A granny slips or jams. Right over left, then left over right.' },
      notSet("Not drawn up flat, it can roll and loosen. Pull both parts of each colour away from the other."),
      { id: 'short', kind: 'short', ropes: [0, 1], name: 'Short ends', why: 'Cut short, the ends can slip back through the bights and the binding lets go. Leave ends long enough to untie.' },
    ],
  },
  catspaw: {
    checks: [
      { text: 'Both loops over the hook.', at: [[0, 8], [0, 22]] },
      { text: 'Three twists in each loop, the two loops twisted opposite ways.', at: [[0, 12], [0, 18]] },
      { text: 'Both legs come down to the load and share it.' },
    ],
    faults: [
      { id: 'twists', kind: 'cross', flip: [1], name: 'Loop not twisted', why: "The first loop's two sides only lie across each other: no twist holds them. Under load that loop pulls straight off the hook. Twist each loop three times." },
      notSet("Not pulled down, the twists sit loose and the loops can ride up off the hook. Pull both legs down together before the load comes on."),
    ],
  },
  trucker: {
    checks: [
      { text: 'A slip loop in the line, its bight sticking out: the pulley.', at: [[0, 17]] },
      { text: 'The line goes round the anchor, up through the pulley loop and back down.', at: [[0, 37]] },
      { text: 'Two half hitches round the line below the loop hold the pull.', at: [[0, 48]] },
    ],
    faults: [
      { id: 'through', kind: 'cross', flip: [5], name: 'Not through the loop', why: "The line only lies across the pulley loop instead of going through it. There's no pulley: pull it and it runs straight out, and the load goes slack. Up through the loop." },
      notSet("Tied off before it was pulled tight, the load can shift and the line goes slack. Pull the end down hard first, then tie off."),
      shortTail(),
    ],
  },
};

export const KNOTS: Knot[] = TIED.map((k) => ({ ...k, checks: DRESS[k.id]?.checks ?? [], faults: DRESS[k.id]?.faults ?? [] }));

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

/** The steps with the last one added: pulling it tight. */
export function stepsOf(k: Knot): KnotStep[] {
  const r = k.tight.pulls[0]!.rope;
  return [...k.steps, { rope: r, to: k.ropes[r]!.pts.length - 1, text: k.tight.text, tighten: true }];
}

const weight = (ranges: readonly (readonly [number, number, number])[] | undefined, i: number) => ranges?.find(([a, b]) => i >= a && i <= b)?.[2] ?? 0;
/** How far a pulled point moves out, at full tightness. */
export const PULL_OUT = 16;

/** The ropes drawn up tight. */
export function tightRopes(k: Knot): Rope[] {
  const { c, s, w } = k.tight.snug;
  return k.ropes.map((r, ri) => ({
    ...r,
    pts: r.pts.map((p, i): P => {
      const f = weight(w[ri], i);
      let x = p[0] + (c[0] + (p[0] - c[0]) * s[0] - p[0]) * f;
      let y = p[1] + (c[1] + (p[1] - c[1]) * s[1] - p[1]) * f;
      for (const pl of k.tight.pulls) {
        if (pl.rope === ri && pl.at === i) {
          x += pl.dir[0] * PULL_OUT;
          y += pl.dir[1] * PULL_OUT;
        }
      }
      return p[2] ? [x, y, p[2]] : [x, y];
    }),
  }));
}

/** The ropes part way to tight: 0 as tied, 1 pulled tight. */
export function morphRopes(k: Knot, t: number): Rope[] {
  if (t <= 0) return k.ropes;
  const tight = tightRopes(k);
  return k.ropes.map((r, ri) => ({
    ...r,
    pts: r.pts.map((p, i): P => {
      const q = tight[ri]!.pts[i]!;
      const x = p[0] + (q[0] - p[0]) * t;
      const y = p[1] + (q[1] - p[1]) * t;
      return p[2] ? [x, y, p[2]] : [x, y];
    }),
  }));
}

/** How far a tail cut short runs on past its last crossing. */
export const SHORT_TAIL = ROPE_W * 1.6;

/** The over and under of a knot with some crossings turned the other way. */
export const flipped = (cross: string, flip: readonly number[]) => cross.replace(/[ou]/g, (ch, i: number) => (flip.includes(i) ? (ch === 'o' ? 'u' : 'o') : ch));

/** A fault drawn: the ropes (as tied, or pulled tight), what goes over and under, and how far each rope is shown (null: all of it). */
export function faultDrawing(k: Knot, f: Fault): { ropes: Rope[]; cross: string; keep: (number | null)[] } {
  if (f.kind === 'loose') return { ropes: k.ropes, cross: k.cross, keep: k.ropes.map(() => null) };
  const ropes = tightRopes(k);
  if (f.kind === 'cross') return { ropes, cross: flipped(k.cross, f.flip), keep: ropes.map(() => null) };
  const { crossings } = layout(ropes, k.cross);
  const keep = ropes.map((_, r) => {
    if (!f.ropes.includes(r)) return null;
    let last = 0;
    crossings.forEach((c, i) => {
      if (f.after !== undefined && i > f.after) return;
      for (const side of [c.later, c.earlier]) if (side.rope === r) last = Math.max(last, side.len);
    });
    // Cut short of the next crossing along, a rope width clear, so a crossing is never half drawn.
    let next = Infinity;
    for (const c of crossings) for (const side of [c.later, c.earlier]) if (side.rope === r && side.len > last + 0.5) next = Math.min(next, side.len);
    return Math.max(last + ROPE_W, Math.min(last + SHORT_TAIL, next - ROPE_W));
  });
  return { ropes, cross: k.cross, keep };
}

/** Where each check points on the knot pulled tight, numbered from 1. */
export function checkMarks(k: Knot): { n: number; x: number; y: number }[] {
  const tight = tightRopes(k);
  return k.checks.flatMap((c, i) => (c.at ?? []).map(([r, at]) => ({ n: i + 1, x: tight[r]!.pts[at]![0], y: tight[r]!.pts[at]![1] })));
}

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
  // Pulled tight, it is the same knot all the way: no crossing comes or goes, none changes over or under.
  if (!k.tight.text.trim() || !k.tight.pulls.length) out.push(`${k.id}: says nothing of pulling it tight`);
  if (k.tight.pulls.some((p) => !k.ropes[p.rope] || p.at < 0 || p.at >= k.ropes[p.rope]!.pts.length)) out.push(`${k.id}: pulls a point it hasn't`);
  if (k.tight.snug.w.length !== k.ropes.length) out.push(`${k.id}: says how to draw up ${k.tight.snug.w.length} ropes of ${k.ropes.length}`);
  for (const t of [0.25, 0.5, 0.75, 1]) {
    const n = layout(morphRopes(k, t), k.cross).crossings.length;
    if (n !== k.cross.length) out.push(`${k.id}: drawn up ${Math.round(t * 100)}%, ${n} crossings where ${k.cross.length} are said`);
  }
  // Checked before use: something to look at, each pointing at a point the knot has, and faults to spot.
  if (k.checks.length < 2 || k.checks.some((c) => !c.text.trim())) out.push(`${k.id}: says too little of what to check`);
  for (const c of k.checks) for (const [r, at] of c.at ?? []) if (!k.ropes[r] || at < 0 || at >= k.ropes[r]!.pts.length) out.push(`${k.id}: a check points at a point it hasn't`);
  if (k.faults.length < 2) out.push(`${k.id}: too few faults to spot`);
  if (new Set(k.faults.map((f) => f.id)).size !== k.faults.length) out.push(`${k.id}: two faults share an id`);
  for (const f of k.faults) {
    if (!f.name.trim() || !f.why.trim()) out.push(`${k.id} ${f.id}: says nothing of what is wrong`);
    if (f.kind === 'cross' && (!f.flip.length || f.flip.some((i) => i < 0 || i >= k.cross.length))) out.push(`${k.id} ${f.id}: turns a crossing it hasn't`);
    if (f.kind === 'short' && f.ropes.some((r) => !k.ropes[r])) out.push(`${k.id} ${f.id}: cuts a rope it hasn't`);
  }
  return out;
}
