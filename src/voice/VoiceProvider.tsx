// Talking to the app
// ------------------
// Tap the mic, say it, and the app does it: opens the tool, fills in the
// figures, presses what is on the screen, writes the weld or the test reading,
// or opens the handbook at the table. In this order, the first that makes
// sense of it wins:
//   1. the screen's own words (the cut list's "4 done");
//   2. anything on the screen said by its label: a button, a chip, a field
//      and its figure (voice/onScreen.ts);
//   3. a tool by name, with its figures (voice/intent.ts);
//   4. part of a label on the screen, when it can mean one thing;
//   5. the shift report, pre-task plan, pressure test and handbook sentences
//      (voice/records.ts);
//   6. the cloud, through the Worker: Claude, or Cloudflare's free model when
//      Claude is not paid for (ai/voice.ts, worker/).
// One to five run on the phone, with no signal and at no cost.
//
// Anything written to a record is said back and left on screen with an Undo,
// because a recogniser in a loud shop will mishear a number sooner or later,
// and a wrong weld count is worse than none.
//
// The bolt-up screen also runs hands-free: the mic stays open, "done" logs the
// bolt, and the phone says the next one.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { API_BASE } from '../ai/apiBase';
import { askVoice, voiceMissShort, voiceMissWords, type VoiceAnswer } from '../ai/voice';
import { matchScreen, screenHelp, screenPhrases, targetsOn, type Entry, type ScreenMatch } from './onScreen';
import { recordAnswer } from './records';
import { readCalc, worksOut } from './calcSpeech';
import { elbowAnswer, jobFamilyOf, readElbow } from './tradeSpeech';
import { say, sayThen } from '../audio/say';
import { nav } from '../navigation/navRef';
import { tool } from '../navigation/groups';
import { usePressureTests } from '../state/pressureTests';
import { useSettings } from '../state/settings';
import { useShifts } from '../state/shifts';
import { usePreTasks } from '../state/pretasks';
import { applyPretask, applyShift, applyTest } from './apply';
import { VOCAB, VoiceCommand, bestLocal, isToolName, localIntent, othersOf, routeWords } from './intent';
import { barPatch } from './barWords';
import { alignToWords, alignTranscripts, learn, learnedMap, setLearnedWords } from './learned';
import { useLearnedWords } from '../state/learnedWords';
import { MATERIALS } from '../calc/materials';
import { SPEC_WORDS } from './specs';
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
/** What a screen says back: one line shown and said, or a line shown and another said ("50-1/2"" shown, "50 and 1/2 inches" said). */
export type ScreenReply = string | { reply: string; say: string; tone?: 'ok' | 'warn' };
/** A screen's own words, tried first while it is in front: what to say back, or null when they are not its. */
export type ScreenVoice = (heard: string) => ScreenReply | null;

/** How long "undo" can still take back the last thing voice wrote. */
const UNDO_MS = 5 * 60_000;

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
  /** The recogniser's other guesses at what was said. Tapping one runs it, and teaches the phone the words it got wrong. */
  others?: string[];
};

type Ctx = {
  /** A recogniser is there and the mic button is switched on. */
  enabled: boolean;
  sheet: VoiceSheet | null;
  /** Tap: listen and do it. Tap while listening: stop. */
  talk: () => void;
  /** "Not that?": run one of the recogniser's other transcripts as what was said, and learn from the difference. */
  retry: (text: string) => void;
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
  // The PipeFit (Tools), Weld, Rigging and Edu tabs are one screen, shown with that tab's tools.
  const tab = { Tools: 'tools', Weld: 'weld', Rigging: 'rigging', Edu: 'edu' } as const;
  // The Logs are a tab at the top of the Projects page.
  if (route === 'Logs') {
    nav.navigate('Projects', { view: 'logs' });
    return undefined;
  }
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
  const learned = useLearnedWords();
  const [sheet, setSheet] = useState<VoiceSheet | null>(null);
  const [handsFree, setHandsFreeState] = useState(false);
  const bolts = useRef<BoltHandler | null>(null);
  const cutAdder = useRef<CutAdder | null>(null);
  const screenVoice = useRef<ScreenVoice | null>(null);
  const listening = useRef(false);
  const freeOn = useRef(false);
  // The stores move on; the command runs against what they hold when it lands.
  const latest = useRef({ shifts, plans, tests, learned, project: settings.projectId, settings, update });
  latest.current = { shifts, plans, tests, learned, project: settings.projectId, settings, update };

  // The matchers hear with what this phone has learned of its mishearings.
  useEffect(() => setLearnedWords(learnedMap(learned.book)), [learned.book]);
  /** Keep what a transcript or Claude showed the recogniser got wrong, for next time (learned.ts). */
  const teach = useCallback((pairs: { said: string; meant: string }[]) => {
    if (pairs.length) latest.current.learned.apply((b) => learn(b, pairs, Date.now()));
  }, []);

  useEffect(() => {
    const opened = () => {
      const miss = lastMiss.current;
      if (!miss || Date.now() - miss.at > 30_000 || !nav.isReady()) return;
      const route = nav.getCurrentRoute()?.name;
      if (!route || route === miss.route || !tool(route)) return;
      lastMiss.current = null;
      teach(alignToWords(miss.heard, routeWords(route), VOCAB));
    };
    // The navigator is not ready when the provider mounts; wait for it, then listen.
    let off: (() => void) | null = null;
    const wait = setInterval(() => {
      if (!nav.isReady()) return;
      clearInterval(wait);
      off = nav.addListener('state', opened);
    }, 500);
    return () => {
      clearInterval(wait);
      off?.();
    };
  }, [teach]);

  const enabled = settings.voice && canListen();

  // What the recogniser offered besides the transcript acted on, and that
  // transcript, kept for the panel's "Not that?" and the learning behind it.
  const others = useRef<string[]>([]);
  const lastHeard = useRef('');
  // A command nothing could make sense of. A tool opened by hand in the next
  // half minute is taken as what it meant, and the words that should have
  // opened it are learned (learned.ts).
  const lastMiss = useRef<{ heard: string; route: string | null; at: number } | null>(null);

  const finish = useCallback((heard: string, reply: string, extra: Partial<VoiceSheet> = {}) => {
    const tone = extra.tone ?? 'ok';
    // The recogniser's other guesses only when it went wrong: something that worked needs no second guess.
    setSheet({ phase: 'done', heard, reply, tone, ...(tone === 'warn' && others.current.length ? { others: others.current } : {}), ...extra });
    if (reply) say(reply);
  }, []);
  /** Done, and to be seen on the screen: nothing said back, nothing left open. */
  const quietly = useCallback(() => setSheet(null), []);

  /**
   * The last thing voice wrote (a record, the job's pipe), to take back by
   * saying "undo" within a few minutes. Writing it is done as quietly as
   * anything else: nothing said back, the panel gone.
   */
  const lastUndo = useRef<{ run: () => void; at: number } | null>(null);
  const recorded = useCallback((undo: () => void) => {
    lastUndo.current = { run: undo, at: Date.now() };
    setSheet(null);
  }, []);

  /** Set the job's pipe, quietly; "undo" puts the old specs back. Shown only where it had to change what was said. */
  const setSpecs = useCallback(
    (heard: string, cmd: SpecCommand) => {
      const { settings: cur, update: put } = latest.current;
      const before = { material: cur.material, defaultNps: cur.defaultNps, wall: cur.wall, defaultKind: cur.defaultKind, defaultSchedule: cur.defaultSchedule };
      const { patch, said, moved } = specPatch(cur, cmd);
      put(patch);
      if (!moved.length) return recorded(() => put(before));
      lastUndo.current = { run: () => put(before), at: Date.now() };
      finish(heard, `Specs: ${said}`, {
        tone: 'warn',
        undo: () => {
          put(before);
          setSheet({ phase: 'done', heard, reply: 'Specs put back.', tone: 'warn' });
        },
      });
    },
    [finish, recorded],
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
        case 'undo': {
          // The last thing voice wrote, taken back: as quietly as it went in.
          const u = lastUndo.current;
          lastUndo.current = null;
          if (!u || Date.now() - u.at > UNDO_MS) return finish(heard, 'Nothing to undo.', { tone: 'warn' });
          u.run();
          return quietly();
        }
        case 'bar':
          // How the tab bar hides, or it tucked away and back, from any screen: done, and the panel goes.
          latest.current.update(barPatch(cmd.act));
          return quietly();
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
          return quietly();
        }
        case 'addCut': {
          const h = cutAdder.current;
          if (!h) return finish(heard, 'Open Cut Length or a 3D spool first.', { tone: 'warn' });
          const r = h();
          return r.ok ? quietly() : finish(heard, r.said, { tone: 'warn' });
        }
        case 'open': {
          const refused = openWith(cmd.route, cmd.figures);
          if (refused) return finish(heard, refused, { tone: 'warn' });
          // Opening a screen, its figures filled in, is answer enough: the panel goes.
          // Only a word the app could not place is shown, so a mishearing is
          // seen for what it was rather than silently dropped.
          if (!cmd.ignored?.length) return quietly();
          const said = cmd.figures ? figuresSaid(cmd.route, cmd.figures) : '';
          return setSheet({
            phase: 'done',
            heard,
            reply: `${said ? `${titleOf(cmd.route)}: ${said}` : titleOf(cmd.route)}. Didn't catch “${cmd.ignored.join(' ')}”.`,
            tone: 'warn',
            ...(others.current.length ? { others: others.current } : {}),
          });
        }
      }
    },
    [finish, quietly, setSpecs],
  );

  /** Do what an answer says, whether the phone worked it out (records.ts) or the cloud did. A record goes in quietly; "undo" takes it back. */
  const applyAnswer = useCallback(
    (heard: string, a: VoiceAnswer) => {
      const { shifts: s, tests: p, project } = latest.current;
      const now = Date.now();
      switch (a.action) {
        case 'open':
          // Claude read it as this tool: a word the app did not know, near the tool's names, was a mishearing of one.
          teach(alignToWords(heard, routeWords(a.route), VOCAB));
          {
            const refused = openWith(a.route, a.figures);
            return refused ? finish(heard, refused, { tone: 'warn' }) : quietly();
          }
        case 'answer':
          if (a.table && nav.isReady()) nav.navigate('ReferenceTable', { id: a.table });
          return finish(heard, a.say);
        case 'shift': {
          const before = s.log;
          const out = applyShift(before, a, project, now, latest.current.settings.shift);
          s.apply(() => out.log);
          return recorded(() => s.apply(() => before));
        }
        case 'pretask': {
          const store = latest.current.plans;
          const before = store.log;
          const out = applyPretask(before, a, project, now, latest.current.settings.shift);
          store.apply(() => out.log);
          return recorded(() => store.apply(() => before));
        }
        case 'test': {
          const before = p.log;
          const route = nav.isReady() ? nav.getCurrentRoute() : undefined;
          const onScreen = route?.name === 'PressureTest' ? ((route.params as { testId?: string } | undefined)?.testId ?? null) : null;
          const out = applyTest(before, a, onScreen, project, now);
          if ('error' in out) return finish(heard, out.error, { tone: 'warn' });
          p.apply(() => out.log);
          return recorded(() => p.apply(() => before));
        }
        case 'specs':
          teach(alignToWords(heard, [...MATERIALS.flatMap((m) => m.words), ...SPEC_WORDS], VOCAB));
          return setSpecs(heard, { material: a.material, nps: a.nps, wall: a.wall, elbow: a.elbow });
        case 'none':
          return finish(heard, a.say, { tone: 'warn' });
      }
    },
    [finish, quietly, recorded, setSpecs, teach],
  );

  /**
   * What needs the cloud. `guess`: the phone's own near-miss (a tool, one word
   * not caught), done instead when the cloud cannot be asked or cannot tell,
   * so nothing is lost with no signal, and told why the cloud did not help.
   */
  const runClaude = useCallback(
    async (heard: string, screen: string | null, guess?: (why: string) => void) => {
      setSheet({ phase: 'thinking', heard, reply: '', tone: 'ok' });
      const a = await askVoice(API_BASE, { said: heard, screen: screen ?? '' }, guess ? { timeoutMs: 12_000 } : {});
      if (guess && (typeof a === 'string' || a.action === 'none')) return guess(voiceMissShort(typeof a === 'string' ? a : 'none'));
      if (typeof a === 'string' || a.action === 'none') lastMiss.current = { heard, route: screen, at: Date.now() };
      if (typeof a === 'string') return finish(heard, voiceMissWords(a), { tone: 'warn' });
      return applyAnswer(heard, a);
    },
    [finish, applyAnswer],
  );

  /** A screen's own answer: shown, and said in its own words where it has them. */
  const answerScreen = useCallback(
    (heard: string, own: ScreenReply) => {
      if (typeof own === 'string') return finish(heard, own);
      setSheet({ phase: 'done', heard, reply: own.reply, tone: own.tone ?? 'ok', ...(own.tone === 'warn' && others.current.length ? { others: others.current } : {}) });
      if (own.say) say(own.say);
    },
    [finish],
  );

  /**
   * A sum or a conversion said anywhere: the calculator opens and works it.
   * Its words are taken once it is in front and listening, which is a beat
   * after it is opened.
   */
  const runOnCalculator = useCallback(
    (heard: string, text: string) => {
      if (!nav.isReady()) return;
      const before = screenVoice.current;
      nav.navigate('Calculator' as never);
      setSheet({ phase: 'thinking', heard, reply: '', tone: 'ok' });
      let tries = 0;
      const wait = setInterval(() => {
        tries += 1;
        const here = nav.isReady() && nav.getCurrentRoute()?.name === 'Calculator';
        const h = screenVoice.current;
        if (here && h && h !== before) {
          clearInterval(wait);
          return answerScreen(heard, h(text) ?? 'The calculator did not take that.');
        }
        if (tries > 40) {
          clearInterval(wait);
          finish(heard, 'The calculator did not open in time. Say it again on the calculator.', { tone: 'warn' });
        }
      }, 75);
    },
    [answerScreen, finish],
  );

  /** Something on the screen, said by its label: pressed, picked or filled in. */
  const runScreen = useCallback(
    (heard: string, m: ScreenMatch, here: readonly Entry[]) => {
      if (m.kind === 'help') return finish(heard, screenHelp(here));
      if (m.kind === 'which') return finish(heard, `Say which: ${m.targets.map((t) => t.label).join(', ')}.`, { tone: 'warn' });
      const items = m.kind === 'many' ? m.items : [{ target: m.target, value: m.value }];
      const said: string[] = [];
      for (const it of items) {
        const reply = it.target.run(it.value);
        if (reply === null) {
          const what = it.target.kind === 'field' ? `No ${it.target.field === 'number' ? 'figure' : 'words'} for ${it.target.label} in “${it.value}”.` : `${it.target.label} did not take that.`;
          return finish(heard, [...said, what].join(' '), { tone: 'warn' });
        }
        said.push(reply);
      }
      // A button pressed, a choice picked, a figure filled in: there on the screen to be seen. Nothing said back, and the panel goes.
      return quietly();
    },
    [finish, quietly],
  );

  // What was heard is tried the way a person would hear it: the screen's own
  // words first; then every transcript the recogniser offered, each word
  // taken as the nearest one the app knows, and a command one word short
  // of whole done anyway with the word shown; only then Claude, with the
  // top transcript as it was said.
  const run = useCallback(
    (alternatives: string[]) => {
      const heard = alternatives[0] ?? '';
      lastHeard.current = heard;
      others.current = othersOf(alternatives);
      const current = nav.isReady() ? nav.getCurrentRoute() : undefined;
      const screen = current?.name ?? null;
      const here = targetsOn(current?.key ?? null);
      const as = (t: string) => (t === heard ? heard : `${heard} (heard as “${t}”)`);
      for (const t of alternatives) {
        const own = screenVoice.current?.(t);
        if (own) return answerScreen(heard, own);
      }
      // On a bend, offset or bolt-up, figures go through the tool's own matcher first, which has its checks (a flange refused once bolts are logged).
      const toolFigures = screen !== null && isFigureRoute(screen);
      for (const t of alternatives) {
        const m = matchScreen(t, here, { whole: true, fields: !toolFigures, reserved: isToolName });
        if (m) return runScreen(as(t), m, here);
      }
      const local = bestLocal(alternatives, screen);
      // A tool with a word left over that could not be placed is a near miss: "the heat thing for welding" is not the Weld tab.
      const nearMiss = local && local.cmd.kind === 'open' && local.cmd.ignored?.length ? local : null;
      const doLocal = (l: NonNullable<typeof local>) => {
        // A transcript further down the list made sense of it: what the top one had instead is this phone's mishearing, kept for next time.
        if (l.heard !== heard) teach(alignTranscripts(heard, l.heard, VOCAB));
        runLocal(as(l.heard), l.cmd);
      };
      if (local && !nearMiss) return doLocal(local);
      const part = matchScreen(heard, here, { whole: false, reserved: isToolName });
      if (part) return runScreen(heard, part, here);
      // An elbow's takeout, or where to cut one, asked on any screen: answered where it was asked.
      for (const t of alternatives) {
        const e = readElbow(t);
        if (!e) continue;
        const cur = latest.current.settings;
        const a = elbowAnswer(e, { radius: cur.defaultKind, jobFamily: jobFamilyOf(cur.material), den: cur.fractionDenominator, system: cur.unitSystem });
        return answerScreen(as(t), { reply: a.reply, say: a.say, tone: a.ok ? 'ok' : 'warn' });
      }
      // A sum or a conversion, said on any screen: worked on the calculator.
      for (const t of alternatives) {
        const c = readCalc(t);
        if (c && ((c.kind === 'sum' && worksOut(c.items)) || c.kind === 'convert')) return runOnCalculator(as(t), t);
      }
      for (const t of alternatives) {
        const a = recordAnswer(t);
        if (a) return applyAnswer(as(t), a);
      }
      // The cloud makes sense of it if it can; a near miss is done as heard if it cannot.
      void runClaude(
        heard,
        screen,
        nearMiss
          ? (why) => {
              doLocal(nearMiss);
              setSheet((v) => (v ? { ...v, reply: `${v.reply} Cloud helper: ${why}.` } : v));
            }
          : undefined,
      );
    },
    [finish, runLocal, runClaude, runScreen, applyAnswer, answerScreen, runOnCalculator, teach],
  );

  // The web app takes a command typed into the browser's console, as if said:
  // pipefitSay('amperage 180'). For testing the whole path without a mic, and
  // for support to try what a man says he said.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    (window as unknown as { pipefitSay?: (text: string) => void }).pipefitSay = (text: string) => run([text]);
  }, [run]);

  // "Not that?": what was said is what the man says it was. The difference
  // between the two transcripts is the recogniser's mistake, learned whether
  // or not the app can do anything with the words.
  const retry = useCallback(
    (text: string) => {
      const was = lastHeard.current;
      if (was && was !== text) teach(alignTranscripts(was, text, VOCAB));
      run([text]);
    },
    [run, teach],
  );

  const talk = useCallback(() => {
    if (listening.current) {
      stopListening();
      return;
    }
    if (freeOn.current) return;
    listening.current = true;
    setSheet({ phase: 'listening', heard: '', reply: '', tone: 'ok' });
    // The recogniser listens for what is on the screen first, then every tool's name.
    const words = screenPhrases(targetsOn(nav.isReady() ? (nav.getCurrentRoute()?.key ?? null) : null));
    void listenOnce((partial) => setSheet((v) => (v?.phase === 'listening' ? { ...v, heard: partial } : v)), words).then((h) => {
      listening.current = false;
      if ('text' in h) return run(h.alternatives);
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
        (alternatives) => {
          if (!freeOn.current) return;
          const heard = alternatives[0] ?? '';
          // Any transcript the recogniser offered that is a bolt word is taken.
          const cmd = alternatives.map((t) => localIntent(t, 'FlangeBoltUp')).find((c) => c?.kind === 'bolt' || c?.kind === 'cancel') ?? null;
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
    () => ({ enabled, sheet, talk, retry, dismiss: () => setSheet(null), handsFree, setHandsFree, useBolts, useCutAdder, releaseCutAdder, useScreenVoice, releaseScreenVoice }),
    [enabled, sheet, talk, retry, handsFree, setHandsFree, useBolts, useCutAdder, releaseCutAdder, useScreenVoice, releaseScreenVoice],
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
