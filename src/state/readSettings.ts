import type { Settings } from './settings';

/**
 * Which look the stored settings were written under.
 *
 * Before the bronze look the app wrote themePreference: 'light' into storage
 * the first time anything at all was changed — a pipe size, the units —
 * whether or not anybody had chosen a theme. So a stored 'light' from before
 * says nothing about what the fitter wanted, and the new look would never
 * reach the phones that had used the app most.
 *
 * Settings written under an older look are moved onto the current default
 * theme once, and stamped, and from then on the choice on the settings screen
 * is taken as a real one and left alone.
 */
export const LOOK = 2;

/** Longer than any job number, short enough to sit on one line of the card. */
export const PROJECT_ID_MAX = 24;

export function readSettings(
  raw: string | null,
  defaults: Settings
): { settings: Settings; migrated: boolean } {
  if (!raw) return { settings: defaults, migrated: false };
  let stored: Partial<Settings>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { settings: defaults, migrated: false };
    stored = parsed as Partial<Settings>;
  } catch {
    return { settings: defaults, migrated: false };
  }
  const merged: Settings = { ...defaults, ...stored };
  // Written by hand in a text field, so it is the one value that can arrive as
  // anything. A number or a null in storage is dropped rather than shown.
  merged.projectId = typeof stored.projectId === 'string' ? stored.projectId.slice(0, PROJECT_ID_MAX) : defaults.projectId;
  if (stored.look === LOOK) return { settings: merged, migrated: false };
  return { settings: { ...merged, themePreference: defaults.themePreference, look: LOOK }, migrated: true };
}
