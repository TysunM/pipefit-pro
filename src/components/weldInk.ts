import type { Theme } from '../theme/ThemeProvider';
import type { WeldState } from '../state/weldLog';

/** The colour a weld's state is shown in, on the log and on the map alike. */
export const weldInk = (c: Theme['colors'], s: WeldState): string =>
  ({ planned: c.textFaint, welded: c.accent, picked: c.data, accepted: c.success, repair: c.danger })[s];
