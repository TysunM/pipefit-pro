// The tab bar by voice
// --------------------
// "Auto-hide the tab bar", "hide the tab bar as I scroll", "stop hiding the
// tab bar", "hide the tab bar", "show the tab bar": said on any screen, they
// set how the bar along the foot behaves, or tuck it away and bring it back
// (state/barHide.ts). The bar is only one way about: voice gets you anywhere.
// Something said must name the bar ("tab bar", "tabs", "bottom bar", or
// "auto-hide", which is only ever the bar's) and hold
// nothing else but the words below, so "10 bar to psi" is never the bar. Pure.

import type { Settings } from '../state/settings';

export type BarAct = 'auto' | 'scroll' | 'stay' | 'hide' | 'show';

const HIDE = ['hide', 'hides', 'hiding', 'hidden', 'tuck', 'tucks', 'tucked', 'away', 'rid', 'gone', 'invisible'];
const SHOW = ['show', 'shown', 'unhide', 'bring', 'back', 'visible'];
const AUTO = ['auto', 'autohide', 'automatic', 'automatically', 'every', 'each'];
const SCROLL = ['scroll', 'scrolls', 'scrolling'];
const KEEP = ['keep', 'always', 'stay', 'stays', 'only'];
const OFF = ['stop', 'disable', 'never', 'dont', 'not'];
const NAMES = ['tab', 'tabs', 'bar', 'bars', 'bottom', 'nav', 'navigation', 'menu'];
const AROUND = [
  'the', 'a', 'my', 'please', 'can', 'you', 'i', 'to', 'it', 'its', 'on', 'off', 'turn', 'set', 'make', 'let', 'go', 'get', 'put', 'of', 'for', 'when',
  'as', 'in', 'mode', 'down', 'up', 'again', 'now', 'do', 'just', 'want', 'with', 'me', 'out', 'way', 'until', 'till', 'pull', 'pulled', 'that', 'is',
];

/** Every word a tab bar command is made of: known to the matcher, so none is heard as something else. */
export const BAR_WORDS: readonly string[] = [...HIDE, ...SHOW, ...AUTO, ...SCROLL, ...KEEP, ...OFF, ...NAMES, ...AROUND];
const KNOWN = new Set(BAR_WORDS);

/** What was said about the tab bar, or null when it isn't about the bar. */
export function readBar(ws: readonly string[]): BarAct | null {
  if (!ws.length || ws.length > 12 || !ws.every((w) => KNOWN.has(w))) return null;
  const has = (list: readonly string[]) => ws.some((w) => list.includes(w));
  const pair = (a: string, b: readonly string[]) => ws.some((w, i) => w === a && b.includes(ws[i + 1] ?? ''));
  const named =
    pair('tab', ['bar', 'bars']) || ws.includes('tabs') || pair('bottom', ['bar']) || pair('nav', ['bar']) || pair('navigation', ['bar']) || pair('menu', ['bar']) ||
    // Auto-hide is only ever the bar's: "turn off auto-hide" needs no more.
    ws.includes('autohide') || pair('auto', ['hide', 'hides', 'hiding']);
  if (!named) return null;
  const hide = has(HIDE);
  const off = has(OFF) || ws.includes('off');
  // "Stop hiding the tab bar", "turn off auto-hide": it stays put.
  if (off && (hide || has(AUTO) || has(SCROLL))) return 'stay';
  if (has(AUTO)) return 'auto';
  if (has(SCROLL)) return 'scroll';
  // "Always hide the tab bar" is auto-hide; "keep the tab bar hidden" tucks it; "keep the tab bar" keeps it.
  // "Only when I tuck it" names the setting.
  if (ws.includes('only')) return 'stay';
  if (has(KEEP)) return hide ? (ws.includes('always') ? 'auto' : 'hide') : 'stay';
  if (has(SHOW)) return 'show';
  if (hide) return 'hide';
  return null;
}

/** What a tab bar command sets. A mode said brings the bar back, except auto-hide, which tucks it now. */
export function barPatch(act: BarAct): Partial<Settings> {
  switch (act) {
    case 'auto':
      return { barMode: 'auto', barTucked: true };
    case 'scroll':
      return { barMode: 'scroll', barTucked: false };
    case 'stay':
      return { barMode: 'stay', barTucked: false };
    case 'hide':
      return { barTucked: true };
    case 'show':
      return { barTucked: false };
  }
}
