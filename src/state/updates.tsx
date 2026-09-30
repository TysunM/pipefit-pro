import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/**
 * Over-the-air updates.
 *
 * The native layer checks once at launch (`checkAutomatically: ON_LOAD` in
 * app.json) and downloads in the background, so a cold start never blocks on
 * the network — on a job with no signal the app opens on the bundle it already
 * has. This provider covers the other case: the app was already open when a
 * push went out. It re-checks when the app returns to the foreground, no more
 * often than RECHECK_MS.
 *
 * A downloaded update does not take effect until the JS engine reloads, which
 * is why nothing here reloads on its own. Mid-calculation is the worst moment
 * to lose a screen full of dimensions, so the banner asks first.
 *
 * One provider, so the banner and the settings screen share a single check
 * rather than racing each other for the same download.
 */

const RECHECK_MS = 5 * 60 * 1000;

/**
 * The web app has no over-the-air updates to speak of: every load is the
 * latest the Worker serves. expo-updates on web still says it is enabled, so
 * the platform is asked instead.
 */
const WEB = Platform.OS === 'web';
const OTA = Updates.isEnabled && !WEB;

export type UpdateStatus = {
  /** A new bundle is downloaded and waiting for a reload. */
  ready: boolean;
  /** A check or download is in flight. */
  busy: boolean;
  /** Set only by an explicit check that failed. */
  error: string | null;
  /** Whether OTA is live at all — false in Expo Go and in dev builds. */
  enabled: boolean;
  /** Runs the downloaded bundle. Restarts the JS engine. */
  apply: () => void;
  /** Forces a check now, ignoring the throttle. Resolves true if one was found. */
  checkNow: () => Promise<boolean>;
  /** Whether the banner should be on screen: ready, and not dismissed this launch. */
  visible: boolean;
  /** Hides the banner until the next launch. The download stays downloaded. */
  dismiss: () => void;
  /**
   * Height the banner is actually taking, measured. The navigator is shrunk by
   * it so the banner can never sit on top of a control — the keypad on the
   * calculator screen reaches the bottom of the frame.
   */
  bannerHeight: number;
  setBannerHeight: (h: number) => void;
};

export function appVersion(): string {
  return Constants.expoConfig?.version ?? '—';
}

/**
 * The build this install actually is, short enough to read out loud.
 *
 * The version string in app.json has not moved in six releases, so it answered
 * "have I got the new one" with the same four characters every time. The
 * runtime version does move: it is the fingerprint of everything native, so a
 * build carrying a new module has a new one and a build that does not, does
 * not. Eight characters is enough to tell two apart at a glance and matches
 * what the build log prints.
 */
export function buildId(): string {
  if (WEB) return 'web';
  const rv = Updates.runtimeVersion;
  return rv ? rv.slice(0, 8) : 'dev';
}

/** What the app is actually running, for the settings screen. */
export function runningBuild(): string {
  if (WEB) return 'Web app';
  if (!Updates.isEnabled) return 'Development build';
  if (Updates.isEmbeddedLaunch) return 'As installed';
  const at = Updates.createdAt;
  if (!at) return 'Updated';
  return `Updated ${at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/**
 * What this install is running, line by line, for the top of the Updates
 * section: enough to answer "did the update land" at a glance. The time is
 * there, not just the day, because a merge publishes an update and a busy day
 * has several. The update id is the one expo.dev lists, to match the two up.
 */
export function versionRows(): { label: string; value: string }[] {
  if (WEB) return [{ label: 'Running', value: 'Web app' }];
  const rows = [{ label: 'Build', value: buildId() }];
  if (!Updates.isEnabled) return [...rows, { label: 'Running', value: 'Development build' }];
  const at = Updates.createdAt;
  const when = at
    ? `${at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : null;
  rows.push({ label: 'Running', value: Updates.isEmbeddedLaunch ? 'As installed, no update yet' : when ? `Update of ${when}` : 'An update' });
  if (!Updates.isEmbeddedLaunch && Updates.updateId) rows.push({ label: 'Update', value: Updates.updateId.slice(0, 8) });
  if (Updates.channel) rows.push({ label: 'Channel', value: Updates.channel });
  return rows;
}

const UpdateContext = createContext<UpdateStatus | null>(null);

export function UpdatesProvider({ children }: { children: React.ReactNode }) {
  const { isUpdatePending } = Updates.useUpdates();
  const [fetched, setFetched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const lastCheck = useRef(Date.now());
  const inFlight = useRef(false);

  const run = useCallback(async (loud: boolean): Promise<boolean> => {
    if (!OTA || inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    if (loud) setError(null);
    try {
      const found = await Updates.checkForUpdateAsync();
      lastCheck.current = Date.now();
      if (!found.isAvailable) return false;
      const got = await Updates.fetchUpdateAsync();
      if (!got.isNew) return false;
      setFetched(true);
      return true;
    } catch (e) {
      // Being out of signal is the normal state on a job, not a fault. Only an
      // explicit check reports it; the quiet one retries on the next foreground.
      lastCheck.current = 0;
      if (loud) setError(e instanceof Error ? e.message : 'Could not reach the update server.');
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (Date.now() - lastCheck.current < RECHECK_MS) return;
      void run(false);
    });
    return () => sub.remove();
  }, [run]);

  const ready = fetched || isUpdatePending;

  const value = useMemo<UpdateStatus>(
    () => ({
      ready,
      busy,
      error,
      enabled: OTA,
      apply: () => {
        void Updates.reloadAsync();
      },
      checkNow: () => run(true),
      visible: ready && !dismissed,
      dismiss: () => setDismissed(true),
      bannerHeight,
      setBannerHeight,
    }),
    [ready, busy, error, run, dismissed, bannerHeight]
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useOtaUpdate(): UpdateStatus {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useOtaUpdate must be used inside UpdatesProvider');
  return ctx;
}
