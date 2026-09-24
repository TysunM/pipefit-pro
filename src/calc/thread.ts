export type ThreadSize = {
  nps: number;
  label: string;
  tpi: number;
  handTight: number;
  effective: number;
  totalThread: number;
  tapDrill: string;
  wrenchTurns: number;
  /** Centre to end of a screwed 90 degree elbow. */
  elbowCenterToFace: number;
  /** Engagement when made up tight, from the handbook's own column. */
  engagementWhenTight: number;
  /** Tap drill or bore size as the handbook prints it. */
  boreSize: string;
};

export const NPT_TABLE: ThreadSize[] = [
  { nps: 0.125, label: '1/8"', tpi: 27, handTight: 0.1615, effective: 0.2638, totalThread: 0.3924, tapDrill: 'R (0.339")', wrenchTurns: 2.5, elbowCenterToFace: 0.69, engagementWhenTight: 0.25, boreSize: '11/32"' },
  { nps: 0.25, label: '1/4"', tpi: 18, handTight: 0.2278, effective: 0.4018, totalThread: 0.5946, tapDrill: '7/16"', wrenchTurns: 2.5, elbowCenterToFace: 0.81, engagementWhenTight: 0.375, boreSize: '7/16"' },
  { nps: 0.375, label: '3/8"', tpi: 18, handTight: 0.24, effective: 0.4078, totalThread: 0.6006, tapDrill: '37/64"', wrenchTurns: 2.5, elbowCenterToFace: 0.95, engagementWhenTight: 0.375, boreSize: '37/64"' },
  { nps: 0.5, label: '1/2"', tpi: 14, handTight: 0.32, effective: 0.5337, totalThread: 0.7815, tapDrill: '23/32"', wrenchTurns: 3, elbowCenterToFace: 1.12, engagementWhenTight: 0.5, boreSize: '45/64"' },
  { nps: 0.75, label: '3/4"', tpi: 14, handTight: 0.339, effective: 0.5457, totalThread: 0.7935, tapDrill: '59/64"', wrenchTurns: 3, elbowCenterToFace: 1.31, engagementWhenTight: 0.5625, boreSize: '29/32"' },
  { nps: 1, label: '1"', tpi: 11.5, handTight: 0.4, effective: 0.6828, totalThread: 0.9845, tapDrill: '1 5/32"', wrenchTurns: 3, elbowCenterToFace: 1.5, engagementWhenTight: 0.6875, boreSize: '1-9/64"' },
  { nps: 1.25, label: '1-1/4"', tpi: 11.5, handTight: 0.42, effective: 0.7068, totalThread: 1.0085, tapDrill: '1 1/2"', wrenchTurns: 3, elbowCenterToFace: 1.75, engagementWhenTight: 0.6875, boreSize: '1-1/2"' },
  { nps: 1.5, label: '1-1/2"', tpi: 11.5, handTight: 0.42, effective: 0.7235, totalThread: 1.0252, tapDrill: '1 47/64"', wrenchTurns: 3, elbowCenterToFace: 1.94, engagementWhenTight: 0.6875, boreSize: '1-23/32"' },
  { nps: 2, label: '2"', tpi: 11.5, handTight: 0.436, effective: 0.7565, totalThread: 1.0582, tapDrill: '2 7/32"', wrenchTurns: 3, elbowCenterToFace: 2.25, engagementWhenTight: 0.75, boreSize: '2-3/16"' },
  { nps: 2.5, label: '2-1/2"', tpi: 8, handTight: 0.682, effective: 1.1375, totalThread: 1.5712, tapDrill: '2 5/8"', wrenchTurns: 3, elbowCenterToFace: 2.7, engagementWhenTight: 0.9375, boreSize: '2-11/16"' },
  { nps: 3, label: '3"', tpi: 8, handTight: 0.766, effective: 1.2, totalThread: 1.6337, tapDrill: '3 1/4"', wrenchTurns: 3, elbowCenterToFace: 3.08, engagementWhenTight: 1.0, boreSize: '3-5/16"' },
  { nps: 3.5, label: '3-1/2"', tpi: 8, handTight: 0.821, effective: 1.25, totalThread: 1.6837, tapDrill: '3 3/4"', wrenchTurns: 3, elbowCenterToFace: 3.42, engagementWhenTight: 1.0625, boreSize: '3-13/16"' },
  { nps: 4, label: '4"', tpi: 8, handTight: 0.844, effective: 1.3, totalThread: 1.7337, tapDrill: '4 1/4"', wrenchTurns: 3, elbowCenterToFace: 3.79, engagementWhenTight: 1.125, boreSize: '4-5/16"' },
  { nps: 5, label: '5"', tpi: 8, handTight: 0.937, effective: 1.406, totalThread: 1.8397, tapDrill: '5 5/16"', wrenchTurns: 3, elbowCenterToFace: 4.5, engagementWhenTight: 1.25, boreSize: '5-3/8"' },
  { nps: 6, label: '6"', tpi: 8, handTight: 0.958, effective: 1.5125, totalThread: 1.9462, tapDrill: '6 5/16"', wrenchTurns: 3, elbowCenterToFace: 5.13, engagementWhenTight: 1.3125, boreSize: '6-7/16"' },
  { nps: 8, label: '8"', tpi: 8, handTight: 1.063, effective: 1.7125, totalThread: 2.1462, tapDrill: '8 5/16"', wrenchTurns: 3, elbowCenterToFace: 6.56, engagementWhenTight: 1.4375, boreSize: '8-7/16"' },
  { nps: 10, label: '10"', tpi: 8, handTight: 1.21, effective: 1.925, totalThread: 2.3587, tapDrill: '10 3/8"', wrenchTurns: 3, elbowCenterToFace: 8.08, engagementWhenTight: 1.625, boreSize: '10-9/16"' },
  { nps: 12, label: '12"', tpi: 8, handTight: 1.36, effective: 2.125, totalThread: 2.5587, tapDrill: '12 3/8"', wrenchTurns: 3, elbowCenterToFace: 9.5, engagementWhenTight: 1.75, boreSize: '12-9/16"' },
];

// findThread, solveThread and the makeup maths that used them came out with
// the thread engagement screen. The table stays because seven other modules
// read it — the screwed takeouts, couplings, unions, nipples and reducers that
// Cut length figures a screwed joint from, and the handbook's thread page,
// which still carries engagement when tight, total thread and tap drill.
