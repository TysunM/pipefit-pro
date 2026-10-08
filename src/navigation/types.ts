export type RootStackParamList = {
  Home: undefined;
  /** The Tools or Logs tab — see navigation/groups.ts. */
  Group: { id: 'tools' | 'logs' | 'edu' };
  /** Everything saved on the phone, one card per kind. */
  Projects: undefined;
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
  Settings: undefined;
  /** Everything on the phone to one file, and back. */
  Backup: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
