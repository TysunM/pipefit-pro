/** When a saved thing was last touched, the way the lists show it: "26 Sep 14:07". */
export const stamp = (at: number): string =>
  new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
  ' ' +
  new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
