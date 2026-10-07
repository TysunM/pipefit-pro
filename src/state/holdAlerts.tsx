// The phone's alarms for running holds
// ------------------------------------
// Keeps the alarms the phone holds matching calc/holdAlerts.ts: set when a
// hold starts, moved when its start or its minutes change, taken down when it
// ends, is cleared or the test is deleted. The phone fires them itself, so
// they ring with the app closed and the screen locked, and a tap opens the
// test. Asking for leave to alert happens the first time a hold needs one,
// never at start-up.
//
// Welders' continuity rides the same alarms (calc/continuityAlerts.ts): two
// weeks before a qualification lapses and on its last day; a tap opens the
// roster.
//
// On the web there is nothing to set: the hold buzzes on its own screen only.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { usePressureTests } from './pressureTests';
import { useWelds, useWelders } from './welds';
import { HOLD_ALERT_PREFIX, alarmChanges, alarmTest, holdAlerts } from '../calc/holdAlerts';
import { CONTINUITY_ALERT_PREFIX, continuityAlerts } from '../calc/continuityAlerts';
import { dayKey } from '../calc/days';
import { nav } from '../navigation/navRef';

/** 'on': alarms are set; 'off': the phone said no; 'ask': not asked yet; 'none': this platform has none. */
export type AlertStatus = 'on' | 'off' | 'ask' | 'none';

const NATIVE = Platform.OS === 'android' || Platform.OS === 'ios';
/** Its own channel, loud and on the lock screen. A channel cannot be changed once made, so a change is a new id. */
export const HOLD_CHANNEL = 'holds-v1';

if (NATIVE) {
  // Shown as well when the app is open: the hold may be met with the phone on another screen.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

type Ctx = { status: AlertStatus; allow: () => Promise<void> };
const HoldAlertsContext = createContext<Ctx>({ status: 'none', allow: async () => undefined });
export const useHoldAlerts = () => useContext(HoldAlertsContext);

async function makeChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(HOLD_CHANNEL, {
    name: 'Pressure test holds',
    description: 'When a hold is nearly met, met, and left running',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500, 250, 900],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    // The alarm stream: heard at alarm volume over a jobsite, not at the ringer's.
    audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM, contentType: Notifications.AndroidAudioContentType.SONIFICATION },
  });
}

const statusOf = (p: Notifications.NotificationPermissionsStatus): AlertStatus => (p.granted ? 'on' : p.canAskAgain ? 'ask' : 'off');

export function HoldAlertsProvider({ children }: { children: React.ReactNode }) {
  const { log, hydrated } = usePressureTests();
  const { log: weldLog, hydrated: weldsIn } = useWelds();
  const { roster, hydrated: rosterIn } = useWelders();
  const [status, setStatus] = useState<AlertStatus>(NATIVE ? 'ask' : 'none');
  const asked = useRef(false);

  // What the phone allows, read at start and again on coming back from its settings.
  useEffect(() => {
    if (!NATIVE) return;
    const read = () => void Notifications.getPermissionsAsync().then((p) => setStatus(statusOf(p))).catch(() => undefined);
    read();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && read());
    return () => sub.remove();
  }, []);

  const allow = useCallback(async () => {
    if (!NATIVE) return;
    const now = await Notifications.getPermissionsAsync();
    if (!now.granted && !now.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    await makeChannel();
    setStatus(statusOf(await Notifications.requestPermissionsAsync()));
  }, []);

  // The alarms, made to match the holds. One pass at a time; a change mid-pass runs another after it.
  const running = useRef(false);
  const again = useRef(false);
  useEffect(() => {
    if (!NATIVE || !hydrated || !weldsIn || !rosterIn) return;
    const sync = async () => {
      if (running.current) {
        again.current = true;
        return;
      }
      running.current = true;
      try {
        do {
          again.current = false;
          const now = Date.now();
          const holds = holdAlerts(log.tests, now).map((a) => ({ key: a.key, at: a.at, title: a.title, body: a.body, data: { testId: a.testId, kind: a.kind } }));
          const conts = continuityAlerts(roster.welders, weldLog.welds, dayKey(now), now).map((a) => ({ ...a, data: { screen: 'welders' } }));
          const want = [...holds, ...conts];
          // The first hold that needs an alarm is the moment to ask, not before.
          if (want.length && status === 'ask' && !asked.current) {
            asked.current = true;
            await allow();
          }
          const set = (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier);
          const { cancel, add } = alarmChanges(want, set, [HOLD_ALERT_PREFIX, CONTINUITY_ALERT_PREFIX]);
          for (const k of cancel) await Notifications.cancelScheduledNotificationAsync(k);
          if (add.length) await makeChannel();
          for (const a of add) {
            await Notifications.scheduleNotificationAsync({
              identifier: a.key,
              content: { title: a.title, body: a.body, data: a.data, sound: 'default', priority: Notifications.AndroidNotificationPriority.MAX },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.at, channelId: HOLD_CHANNEL },
            });
          }
        } while (again.current);
      } catch {
        // An alarm that could not be set leaves the hold's own screen buzz; nothing here is worth a crash.
      } finally {
        running.current = false;
      }
    };
    void sync();
  }, [log.tests, hydrated, weldLog.welds, weldsIn, roster.welders, rosterIn, status, allow]);

  return (
    <HoldAlertsContext.Provider value={{ status, allow }}>
      {NATIVE ? <AlarmTaps /> : null}
      {children}
    </HoldAlertsContext.Provider>
  );
}

/** Native only: the web has no last tap to read, and asking for one throws. */
function AlarmTaps() {
  // A tap on an alarm opens its test, whether the app was open, asleep or closed.
  const last = Notifications.useLastNotificationResponse();
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!last) return;
    const req = last.notification.request;
    if (opened.current === req.identifier) return;
    if (req.identifier.startsWith(CONTINUITY_ALERT_PREFIX)) {
      const go = () => {
        if (!nav.isReady()) return false;
        opened.current = req.identifier;
        nav.navigate('WeldLog', { tab: 'welders' });
        return true;
      };
      if (go()) return;
      const h = setInterval(() => go() && clearInterval(h), 250);
      return () => clearInterval(h);
    }
    if (!req.identifier.startsWith(HOLD_ALERT_PREFIX)) return;
    const data = req.content.data as { testId?: unknown } | undefined;
    const testId = typeof data?.testId === 'string' ? data.testId : alarmTest(req.identifier);
    if (!testId) return;
    const go = () => {
      if (!nav.isReady()) return false;
      opened.current = req.identifier;
      nav.navigate('PressureTest', { testId });
      return true;
    };
    if (go()) return;
    const h = setInterval(() => go() && clearInterval(h), 250);
    return () => clearInterval(h);
  }, [last]);

  return null;
}
