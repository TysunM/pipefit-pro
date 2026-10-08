// Talking to the app
// ------------------
// Tap the mic, say it, and the app does it: opens the tool, fills in the
// figures, writes the weld or the test reading, or answers from the handbook
// out loud. What can be worked out on the phone is (voice/intent.ts); the rest
// goes to Claude through the Worker (ai/voice.ts).
//
// Anything written to a record is said back and left on screen with an Undo,
// because a recogniser in a loud shop will mishear a number sooner or later,
// and a wrong weld count is worse than none.
//
// The bolt-up screen also runs hands-free: the mic stays open, "done" logs the
// bolt, and the phone says the next one.

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../ai/apiBase';
import { askVoice, voiceMissWords } from '../ai/voice';
import { say, sayThen } from '../audio/say';
import { nav } from '../navigation/navRef';
import { tool } from '../navigation/groups';
import { usePressureTests } from '../state/pressureTests';
import { useSettings } from '../state/settings';
import { useShifts } from '../state/shifts';
import { usePreTasks } from '../state/pretasks';
import { testName } from '../state/pressureLog';
import { applyPretask, applyShift, applyTest } from './apply';
import { VoiceCommand, localIntent } from './intent';
import { canListen, heardWords, listenOn, listenOnce, stopListening } from './listen';
import { publishFigures } from './figures';
import { FigureSpec, Figures, TOOL_FIGURES, isFigureRoute } from './toolFigures';
import { specPatch, type SpecCommand } from './specs';
import { LIBRARY_FAMILY } from '../calc/takeoffCatalog';

export type BoltAct = 'done' | 'undo' | 'repeat';
/** What the bolt-up screen does with a spoken bolt command: what to say back. */
export type BoltHandler = (act: BoltAct) => string;
/** Cut Length, while it is open, adds the cut on screen to the list: what to say back, and whether it went on. */
export type CutAdder = () => { said: string; ok: boolean };
/** A screen's own words, tried first while it is in front: what to say back, or null when they are not its. */
export type ScreenVoice = (heard: string) => string | null;

export type VoiceSheet = {
  phase: 'listening' | 'thinking' | 'done';
  /** What was heard, as it was heard. */
  heard: string;
  /** What the app said back, or why it could not. */
  reply: string;
  tone: 'ok' | 'warn';
  /** Put the record back as it was. Present only when something was written. */
  undo?: () => void;
  /** A screen to go and look at what was written. */
  open?: { label: string; go: () => void };
};

type Ctx = {
  /** A recogniser is there and the mic button is switched on. */
  enabled: boolean;
  sheet: VoiceSheet | null;
  /** Tap: listen and do it. Tap while listening: stop. */
  talk: () => void;
  dismiss: () => void;
  handsFree: boolean;
  setHandsFree: (on: boolean) => void;
  /** The bolt-up screen, while it is open, takes done, undo and repeat. */
  useBolts: (handler: BoltHandler | null) => void;
  /** The screen in front that takes “add it to the cut list” (Cut Length, the 3D spool). */
  useCutAdder: (handler: CutAdder | null) => void;
  /** Let go of it, if it is still this screen's: another screen may have taken it already. */
  releaseCutAdder: (handler: CutAdder) => void;
  useScreenVoice: (handler: ScreenVoice | null) => void;
  releaseScreenVoice: (handler: ScreenVoice) => void;
};

const VoiceCtx = createContext<Ctx | null>(null);

/** "Rise 12, roll 8.5" — what was filled in, to read back. */
function figuresSaid(route: string, f: Figures): string {
  if (!isFigureRoute(route)) return '';
  const specs = TOOL_FIGURES[route] as Record<string, FigureSpec>;
  return Object.entries(f)
    .map(([k, v]) => `${specs[k]?.label ?? k} ${Math.round(v.n * 1000) / 1000}${v.inches ? ' in' : specs[k]?.kind === 'angle' ? '°' : ''}`)
    .join(', ');
}

/** Go to a screen, and hand it any figures said for it. Returns the screen's reason if it refused them. */
function openWith(route: string, figures?: Figures): string | undefined {
  if (!nav.isReady()) return undefined;
  // The Tools, Logs and Edu tabs are one screen, shown with that tab's tools.
  const tab = { Tools: 'tools', Logs: 'logs', Edu: 'edu' } as const;
  if (route in tab) {
    nav.navigate('Group', { id: tab[route as keyof typeof tab] });
    return undefined;
  }
  if (nav.getCurrentRoute()?.name !== route) nav.navigate(route as never);
  return figures && Object.keys(figures).length && isFigureRoute(route) ? publishFigures(route, figures) : undefined;
}

const titleOf = (route: string): string => tool(route)?.title ?? route;

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { settings, update } = useSettings();
  const shifts = useShifts();
  const plans = usePreTasks();
  const tests = usePressureTests();
  const [sheet, setSheet] = useState<VoiceSheet | null>(null);
  const [handsFree, setHandsFreeState] = useState(false);
  const bolts = useRef<BoltHandler | null>(null);
  const cutAdder = useRef<CutAdder | null>(null);
  const screenVoice = useRef<ScreenVoice | null>(null);
  const listening = useRef(false);
  const freeOn = useRef(false);
  // The stores move on; the command runs against what they hold when it lands.
  const latest = useRef({ shifts, plans, tests, project: settings.projectId, settings, update });
  latest.current = { shifts, plans, tests, project: settings.projectId, settings, update };

  const enabled = settings.voice && canListen();

  const finish = useCallback((heard: string, reply: string, extra: Partial<VoiceSheet> = {}) => {
    setSheet({ phase: 'done', heard, reply, tone: extra.tone ?? 'ok', ...extra });
    if (reply) say(reply);
  }, []);

  /** Set the job's pipe, said back, with an Undo that puts the old specs back. */
  const setSpecs = useCallback(
    (heard: string, cmd: SpecCommand) => {
      const { settings: cur, update: put } = latest.current;
      const before = { material: cur.material, defaultNps: cur.defaultNps, wall: cur.wall, defaultKind: cur.defaultKind, defaultSchedule: cur.defaultSchedule };
      const { patch, said, moved } = specPatch(cur, cmd);
      put(patch);
      finish(heard, `Specs: ${said}`, {
        tone: moved.length ? 'warn' : 'ok',
        undo: () => {
          put(before);
          setSheet({ phase: 'done', heard, reply: 'Specs put back.', tone: 'warn' });
        },
      });
    },
    [finish],
  );

  /** What the phone can do on its own. */
  const runLocal = useCallback(
    (heard: string, cmd: VoiceCommand) => {
      switch (cmd.kind) {
        case 'cancel':
          setSheet(null);
          return;
        case 'specs':
          return setSpecs(heard, cmd);
        case 'back':
          if (nav.isReady() && nav.canGoBack()) nav.goBack();
          setSheet(null);
          return;
        case 'bolt': {
          const h = bolts.current;
          if (!h) return finish(heard, 'Open the bolt-up first.', { tone: 'warn' });
          return finish(heard, h(cmd.act));
        }
        case 'readBox': {
          const { settings: cur } = latest.current;
          if (!LIBRARY_FAMILY[cur.material])
            return finish(heard, 'Box labels are read for PVC, CPVC and cast iron no-hub. Set the job pipe first, like "2 inch PVC".', { tone: 'warn' });
          if (nav.isReady()) nav.navigate('FittingLibrary', { line: `${cur.material}:${cur.wall}`, read: Date.now() });
          setSheet(null);
          return say('Camera up.');
        }
        case 'addCut': {
          const h = cutAdder.current;
          if (!h) return finish(heard, 'Open Cut Length or a 3D spool first.', { tone: 'warn' });
          const r = h();
          return finish(heard, r.said, { tone: r.ok ? 'ok' : 'warn', open: r.ok ? { label: 'Cut list', go: () => nav.isReady() && nav.navigate('CutList') } : undefined });
        }
        case 'open': {
          const refused = openWith(cmd.route, cmd.figures);
          if (refused) return finish(heard, refused, { tone: 'warn' });
          // Opening a screen is answer enough; figures are shown, not said.
          const said = cmd.figures ? figuresSaid(cmd.route, cmd.figures) : '';
          return setSheet({ phase: 'done', heard, reply: said ? `${titleOf(cmd.route)}: ${said}` : titleOf(cmd.route), tone: 'ok' });
        }
      }
    },
    [finish, setSpecs],
  );

  /** What needs Claude. */
  const runClaude = useCallback(
    async (heard: string, screen: string | null) => {
      setSheet({ phase: 'thinking', heard, reply: '', tone: 'ok' });
      const a = await askVoice(API_BASE, { said: heard, screen: screen ?? '' });
      if (typeof a === 'string') return finish(heard, voiceMissWords(a), { tone: 'warn' });
      const { shifts: s, tests: p, project } = latest.current;
      const now = Date.now();
      switch (a.action) {
        case 'open':
          return finish(heard, openWith(a.route, a.figures) ?? (a.say || titleOf(a.route)));
        case 'answer':
          if (a.table && nav.isReady()) nav.navigate('ReferenceTable', { id: a.table });
          return finish(heard, a.say);
        case 'shift': {
          const before = s.log;
          const out = applyShift(before, a, project, now, latest.current.settings.shift);
          s.apply(() => out.log);
          return finish(heard, a.say, {
            undo: () => {
              s.apply(() => before);
              setSheet({ phase: 'done', heard, reply: 'Taken back off the shift report.', tone: 'warn' });
            },
            open: { label: 'Report', go: () => nav.isReady() && nav.navigate('ShiftReport') },
          });
        }
        case 'pretask': {
          const store = latest.current.plans;
          const before = store.log;
          const out = applyPretask(before, a, project, now, latest.current.settings.shift);
          store.apply(() => out.log);
          return finish(heard, a.say, {
            undo: () => {
              store.apply(() => before);
              setSheet({ phase: 'done', heard, reply: 'Taken back off the pre-task plan.', tone: 'warn' });
            },
            open: { label: 'Plan', go: () => nav.isReady() && nav.navigate('PreTask') },
          });
        }
        case 'test': {
          const before = p.log;
          const route = nav.isReady() ? nav.getCurrentRoute() : undefined;
          const onScreen = route?.name === 'PressureTest' ? ((route.params as { testId?: string } | undefined)?.testId ?? null) : null;
          const out = applyTest(before, a, onScreen, project, now);
          if ('error' in out) return finish(heard, out.error, { tone: 'warn' });
          p.apply(() => out.log);
          return finish(heard, a.say || `Recorded on ${testName(out.test)}.`, {
            undo: () => {
              p.apply(() => before);
              setSheet({ phase: 'done', heard, reply: `Taken back off ${testName(out.test)}.`, tone: 'warn' });
            },
            open:
              onScreen === out.test.id
                ? undefined
                : { label: 'Test', go: () => nav.isReady() && nav.navigate('PressureTest', { testId: out.test.id }) },
          });
        }
        case 'specs':
          return setSpecs(heard, { material: a.material, nps: a.nps, wall: a.wall, elbow: a.elbow });
        case 'none':
          return finish(heard, a.say, { tone: 'warn' });
      }
    },
    [finish, setSpecs],
  );

  const run = useCallback(
    (heard: string) => {
      const screen = nav.isReady() ? (nav.getCurrentRoute()?.name ?? null) : null;
      const own = screenVoice.current?.(heard);
      if (own) return finish(heard, own);
      const cmd = localIntent(heard, screen);
      if (cmd) runLocal(heard, cmd);
      else void runClaude(heard, screen);
    },
    [runLocal, runClaude],
  );

  const talk = useCallback(() => {
    if (listening.current) {
      stopListening();
      return;
    }
    if (freeOn.current) return;
    listening.current = true;
    setSheet({ phase: 'listening', heard: '', reply: '', tone: 'ok' });
    void listenOnce((partial) => setSheet((v) => (v?.phase === 'listening' ? { ...v, heard: partial } : v))).then((h) => {
      listening.current = false;
      if ('text' in h) return run(h.text);
      const words = heardWords(h.error);
      if (!words) return setSheet(null);
      setSheet({ phase: 'done', heard: '', reply: words, tone: 'warn' });
    });
  }, [run]);

  // Hands-free: listen on until it is switched off, taking only bolt commands.
  // Anything else heard is shown and ignored, never answered aloud — the
  // phone's own voice must not set off a conversation with itself.
  const setHandsFree = useCallback((on: boolean) => {
    if (on === freeOn.current) return;
    freeOn.current = on;
    setHandsFreeState(on);
    if (!on) {
      stopListening();
      setSheet(null);
      return;
    }
    if (listening.current) stopListening();
    setSheet({ phase: 'listening', heard: '', reply: 'Hands-free: say done, undo or repeat.', tone: 'ok' });
    void (async () => {
      await sayThen('Hands free. Say done when the bolt is torqued.');
      const h0 = bolts.current;
      if (h0 && freeOn.current) await sayThen(h0('repeat'));
      const err = await listenOn(
        (heard) => {
          if (!freeOn.current) return;
          const cmd = localIntent(heard, 'FlangeBoltUp');
          if (cmd?.kind === 'cancel') return setHandsFree(false);
          if (cmd?.kind !== 'bolt' || !bolts.current) {
            setSheet({ phase: 'listening', heard, reply: 'Say done, undo or repeat.', tone: 'warn' });
            return;
          }
          const reply = bolts.current(cmd.act);
          setSheet({ phase: 'listening', heard, reply, tone: 'ok' });
          say(reply);
        },
        {
          still: () => freeOn.current,
          onHeard: (partial) => setSheet((v) => (v ? { ...v, heard: partial } : v)),
        },
      );
      if (err && freeOn.current) {
        freeOn.current = false;
        setHandsFreeState(false);
        setSheet({ phase: 'done', heard: '', reply: heardWords(err), tone: 'warn' });
      }
    })();
  }, []);

  const useBolts = useCallback((handler: BoltHandler | null) => {
    bolts.current = handler;
  }, []);

  const useCutAdder = useCallback((handler: CutAdder | null) => {
    cutAdder.current = handler;
  }, []);
  const releaseCutAdder = useCallback((handler: CutAdder) => {
    if (cutAdder.current === handler) cutAdder.current = null;
  }, []);
  const useScreenVoice = useCallback((handler: ScreenVoice | null) => {
    screenVoice.current = handler;
  }, []);
  const releaseScreenVoice = useCallback((handler: ScreenVoice) => {
    if (screenVoice.current === handler) screenVoice.current = null;
  }, []);

  const value = useMemo<Ctx>(
    () => ({ enabled, sheet, talk, dismiss: () => setSheet(null), handsFree, setHandsFree, useBolts, useCutAdder, releaseCutAdder, useScreenVoice, releaseScreenVoice }),
    [enabled, sheet, talk, handsFree, setHandsFree, useBolts, useCutAdder, releaseCutAdder, useScreenVoice, releaseScreenVoice],
  );
  return <VoiceCtx.Provider value={value}>{children}</VoiceCtx.Provider>;
}

/** The voice controls, or null outside the provider (a component rendered on its own). */
export function useVoiceMaybe(): Ctx | null {
  return useContext(VoiceCtx);
}

export function useVoice(): Ctx {
  const c = useContext(VoiceCtx);
  if (!c) throw new Error('useVoice must be used inside VoiceProvider');
  return c;
}
