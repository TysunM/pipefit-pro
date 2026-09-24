export type RootStackParamList = {
  Home: undefined;
  /** One card's worth of tools — see navigation/groups.ts. */
  Group: { id: 'offsets' | 'flanges' | 'spool' };
  SimpleOffset: undefined;
  RollingOffset: undefined;
  CutLength: undefined;
  SaddleBend: undefined;
  MiterBend: undefined;
  HandBender: undefined;
  /** Which joint in the register is being worked. Absent means the unnamed one. */
  FlangeBoltUp: { jointId?: string } | undefined;
  Joints: undefined;
  Heats: undefined;
  OrderSheet: undefined;
  Calculator: undefined;
  Level: undefined;
  SpoolBuilder: undefined;
  Reference: undefined;
  ReferenceTable: { id: string };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
