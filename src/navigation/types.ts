export type RootStackParamList = {
  Home: undefined;
  /** The PipeFit, Weld or Edu tab, or the Logs tiles — see navigation/groups.ts. */
  Group: { id: 'tools' | 'weld' | 'logs' | 'edu' };
  /** Everything saved on the phone, one card per kind. */
  /** view: which tab at the top of the page it opens on, the job's records or the Logs. */
  Projects: { view?: 'jobs' | 'logs' } | undefined;
  SimpleOffset: undefined;
  /** Figures to start from, in inches: an offset measured with AR measure. */
  RollingOffset: { rise?: number; roll?: number; run?: number } | undefined;
  CutLength: undefined;
  SaddleBend: undefined;
  MiterBend: undefined;
  HandBender: undefined;
  /** Which joint in the register is being worked. Absent means the unnamed one. */
  FlangeBoltUp: { jointId?: string } | undefined;
  Joints: undefined;
  Heats: undefined;
  /** The pressure test log: every hydro and pneumatic test on the phone. */
  PressureTests: undefined;
  /** One test's record, open to fill in, time and sign. */
  PressureTest: { testId: string };
  /** The daily shift report: today's, or the day picked on the screen. */
  ShiftReport: undefined;
  OrderSheet: undefined;
  Calculator: undefined;
  Level: undefined;
  /** AR measure: trace a route with the camera (the web app, in Chrome). */
  Measure: undefined;
  /** A saved spool to open on arrival. Absent means the one on screen. */
  SpoolBuilder: { spoolId?: string } | undefined;
  /** The sketch book: every iso drawn on the phone. */
  IsoSketch: undefined;
  /** One sketch, open to draw on. */
  IsoDraw: { id: string; place?: string };
  IsoCuts: { id: string };
  Reference: undefined;
  /** The cut list: cuts added from Cut Length, by pipe, for the saw. */
  CutList: undefined;
  WeldLog: { tab?: 'welds' | 'nde' | 'welders' } | undefined;
  Weld: { id?: string; line?: string };
  /** Heat input from volts, amps and travel, or a machine's total energy; saved and exported. */
  HeatInput: undefined;
  /** Carbon equivalents and PREN from a mill cert's chemistry. */
  Weldability: undefined;
  /** Orbital welding: the programs, the equipment, the equations and the welds made, by tab. */
  Orbital: { tab?: 'programs' | 'gear' | 'equations' | 'runs' } | undefined;
  /** One weld schedule: 'new', or a saved one's id; `copy` starts a new one off a saved one. */
  OrbitalProgram: { id: string; copy?: string };
  /** One power supply, head or module: 'new', or a saved one's id. */
  OrbitalGear: { id: string };
  /** One equation: 'new', a built-in's id, or one of the crew's own. */
  OrbitalEquation: { id: string };
  /** One weld off a program: a saved one's id, or a new coupon or production weld. */
  OrbitalRun: { id: string; programId?: undefined; kind?: undefined } | { id?: undefined; programId: string; kind: 'coupon' | 'production' };
  /** Sling angles: each leg's tension from the load, the legs and their angle, or an off-centre CG. */
  SlingAngle: undefined;
  /** Knots for tag lines and hand lines: each one watched, tied by finger, and the test. */
  Knots: undefined;
  /** One knot: Learn (watch it tied, a step at a time) or Tie it (drag the end through it). */
  Knot: { id: string; mode?: 'learn' | 'tie' };
  /** Ten questions on the knots: which knot, which for the job, what next, safe or not. */
  KnotTest: undefined;
  Calibration: undefined;
  /** The skills passport: what this hand can do, proved by the records and signed off. */
  Passport: undefined;
  /** Site orientation: the modules a new hire takes, built-in and the company's own. */
  Orientation: undefined;
  /** The morning pre-task plan: JSA, toolbox talk and crew sign-in, one per job per day. */
  PreTask: undefined;
  /** One module, taken: read or heard, then the check. */
  OrientationCourse: { id: string; lang?: 'en' | 'es' };
  /** Saved socket and no-hub takeouts; a line to open on, or the job's. */
  /** `read`: open the sheet reader at once, listening for “take it”; a time, so asking twice opens it twice. */
  FittingLibrary: { line?: string; read?: number } | undefined;
  ReferenceTable: { id: string };
  /** `open` lands on a section's sheet: the company bolting spec, from the bolt-up screen. */
  Settings: { open?: 'bolting' | 'welding' } | undefined;
  /** Everything on the phone to one file, and back. */
  Backup: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
