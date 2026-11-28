import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useVoiceMaybe } from '../voice/VoiceProvider';
import { hideFloatingMic } from '../voice/micSpot';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Keypad } from '../components/keypad/Keypad';
import { fitKeys } from '../components/keypad/fit';
import { KEYPAD } from '../calc/keys';
import { TabBar } from '../components/TabBar';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { displayLabel, displayText, initialState, press, pressMany, type CalcState } from '../calc/engine';
import { samePipe, type PipeContext } from '../calc/pipeKeys';
import { calcSchedule } from '../calc/materials';
import type { Settings } from '../state/settings';
import { entryUnitWord, isEntryEmpty } from '../calc/ftin';
import type { KeyAction } from '../calc/keys';
import type { FracDen } from '../calc/ftin';
import { Well } from '../components/metal';
import { StandardCalc } from '../components/StandardCalc';
import { equalsBasic, exprText, initialBasic, pressBasic, remember, type BasicState } from '../calc/basic';
import { formatConverted } from '../calc/convert';
import { useScreenVoice } from '../voice/useScreenVoice';
import { useVoiceTargets } from '../voice/useVoiceTargets';
import type { ScreenReply } from '../voice/VoiceProvider';
import { converted, hasLengths, readCalc, speakDisplay, standardKeys, tradeSteps, worksOut } from '../voice/calcSpeech';
import { FIELD_NAME, elbowAnswer, jobFamilyOf, memorySteps, readTrade, registerKey, triangleSteps, unknowns } from '../voice/tradeSpeech';
import { useCalcPrefs } from '../state/calcPrefsStore';
import type { CalcMode } from '../state/calcPrefs';

// The calculator tab holds two calculators: the trade one, which works in
// feet, inches and fractions and knows pipe, and the phone one, with its
// scientific keys and unit converter (StandardCalc.tsx). The switch at the
// top picks between them and is remembered. Each keeps its own sum, so going
// to one and back finds the other as it was left.

/** Trade or Standard, the one showing lit. */
function ModeSwitch({ mode, onChange }: { mode: CalcMode; onChange: (m: CalcMode) => void }) {
  const t = useTheme();
  const options: { value: CalcMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { value: 'trade', label: 'Trade', icon: 'construct-outline' },
    { value: 'standard', label: 'Standard', icon: 'calculator-outline' },
  ];
  // "Trade calculator", "standard": the switch by voice.
  useVoiceTargets(options.map((o) => ({ kind: 'pick', label: `${o.label} calculator`, on: o.value === mode, run: () => (onChange(o.value), `${o.label} calculator.`) })));
  return (
    <Well radius={t.radius.pill} style={{ flexDirection: 'row', padding: 3, height: 40 }}>
      {options.map((o) => {
        const on = o.value === mode;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityLabel={`${o.label} calculator`}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', gap: 6, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? (pressed ? t.colors.primaryPressed : t.colors.primary) : pressed ? t.colors.bgSubtle : 'transparent' })}
          >
            <Ionicons name={o.icon} size={16} color={on ? t.colors.onPrimary : t.colors.textMuted} />
            <Text style={[t.type.button, { fontSize: 15, color: on ? t.colors.onPrimary : t.colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Well>
  );
}

/** A readout's label as it is said: "T.O." is the takeout, "ARC OUT" the heel. */
const SPOKEN_LABEL: Record<string, string> = {
  'T.O.': 'Takeout', 'ARC IN': 'Throat', 'ARC CTR': 'Centre line', 'ARC OUT': 'Heel', 'TRUE OFFSET': 'True offset', 'ROLL ANGLE': 'Roll angle',
  CUT: 'Cut', OD: 'O D', ID: 'I D', 'LB/FT': 'Pounds a foot', 'LB/FT FULL': 'Pounds a foot full', 'GAL/FT': 'Gallons a foot',
  "WELDER'S GAP": "Welder's gap", 'PIPE SIZE': 'Pipe size',
};
const spokenLabel = (label: string): string => SPOKEN_LABEL[label] ?? label.charAt(0) + label.slice(1).toLowerCase();

/** The pipe the trade keys work on is the one the app is set to. */
const pipeOf = (s: Settings): PipeContext => ({ material: s.material, nps: s.defaultNps, wall: s.wall, radius: s.defaultKind, gap: s.defaultGap });

export function CalculatorScreen() {
  const t = useTheme();
  const { settings, update: updateSettings } = useSettings();
  const den = (settings.fractionDenominator || 16) as FracDen;

  const [state, setState] = useState<CalcState>(() =>
    initialState(den, settings.lengthReadout === 'feetInches' ? 'ft' : 'in', pipeOf(settings))
  );
  // Pipe Size, Pipe Mat'l, Elbow, Welder's Gap and Prefs set what Settings
  // holds, and Settings (or "6 inch schedule 80" said anywhere) sets the
  // keys: one pipe and one fraction for the whole app, never two.
  const fromSettings = pipeOf(settings);
  useEffect(() => {
    setState((s) => (samePipe(s.pipe, fromSettings) && (s.den === den || !settings.fractionDenominator) ? s : { ...s, pipe: fromSettings, den: settings.fractionDenominator ? den : s.den }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSettings.material, fromSettings.nps, fromSettings.wall, fromSettings.radius, fromSettings.gap, den]);
  const keyed = useRef({ pipe: state.pipe, den: state.den });
  useEffect(() => {
    const was = keyed.current;
    keyed.current = { pipe: state.pipe, den: state.den };
    if (!samePipe(was.pipe, state.pipe) && !samePipe(state.pipe, pipeOf(settings))) {
      const p = state.pipe;
      updateSettings({ material: p.material as Settings['material'], defaultNps: p.nps, wall: p.wall, defaultSchedule: calcSchedule(p.wall), defaultKind: p.radius, defaultGap: p.gap });
    }
    if (was.den !== state.den && state.den !== settings.fractionDenominator && (state.den === 8 || state.den === 16 || state.den === 32 || state.den === 64)) {
      updateSettings({ fractionDenominator: state.den });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pipe, state.den]);
  const { prefs, hydrated, update } = useCalcPrefs();
  const [basic, setBasic] = useState<BasicState>(() => initialBasic(prefs.angle));
  const [convInput, setConvInput] = useState('1');
  // The angle the phone calculator was left in, once the remembered settings are read.
  useEffect(() => {
    if (hydrated) setBasic((b) => (b.angle === prefs.angle ? b : { ...b, angle: prefs.angle }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  const mode = prefs.mode;
  // Both pads run to the corner the floating mic stands in, = on the phone one, so
  // while this tab is in front the mic stands in the top row instead.
  const voice = useVoiceMaybe();
  useFocusEffect(useCallback(() => hideFloatingMic(), []));

  const shown = displayText(state);
  // Under the figure: the unit being typed, or what the figure is ("T.O. · 2\" LR 45°").
  const unitWord = isEntryEmpty(state.entry) ? displayLabel(state) : entryUnitWord(state.entry);

  const annunciators = useMemo(() => {
    const out: string[] = [];
    // Which unit the answer is being read in, so it is never a guess.
    out.push(state.displayUnit.linear === 'ft' ? 'FT-IN' : 'IN');
    if (state.shift) out.push('CONV');
    if (state.pending === 'store') out.push('STO');
    if (state.pending === 'recall') out.push('RCL');
    if (state.memory.value !== 0) out.push('M');
    // A roll held makes every offset a rolling one: never a surprise.
    if (state.roll !== null) out.push('ROLL');
    if (state.frames.length) out.push('( '.repeat(state.frames.length).trim());
    if (state.dmsMode) out.push('DMS');
    if (state.costTotal !== null) out.push('TTL$');
    return out;
  }, [state]);

  // The pad is fitted to the room left under the readout, so on a short
  // phone the keys get shorter rather than running under the tab bar.
  const short = useWindowDimensions().height < 760;
  const [room, setRoom] = useState<number | null>(null);
  // Short of room the second functions go inside the keys, and past that the pad scrolls (keypad/fit.ts).
  const fit = fitKeys(room, KEYPAD.length);

  const handle = (action: KeyAction, arg?: string) => setState((s) => press(s, action, arg));

  // Said to the calculator: a sum is keyed into it the way it would be typed
  // and worked by its own engine (voice/calcSpeech.ts). A sum in feet, inches
  // or millimetres goes to the trade calculator whichever is showing; a plain
  // one to the one that is. A conversion opens the converter at it.
  const tradeNow = useRef(state);
  tradeNow.current = state;
  const basicNow = useRef(basic);
  basicNow.current = basic;
  const modeNow = useRef(mode);
  modeNow.current = mode;
  const settingsNow = useRef(settings);
  settingsNow.current = settings;
  const hear = (said: string): ScreenReply | null => {
    const onTrade = modeNow.current === 'trade';
    const fromTrade = (s: CalcState): ScreenReply => (s.error ? { reply: s.error, say: s.error, tone: 'warn' } : { reply: `= ${displayText(s)}`, say: speakDisplay(displayText(s)) });
    // The trade keys: the triangle, memory, the readout, and elbows (voice/tradeSpeech.ts). Always the trade calculator.
    const tr = readTrade(said);
    if (tr) {
      let s = tradeNow.current;
      if (s.shift) s = press(s, 'conv');
      const show = (next: CalcState, reply: ScreenReply): ScreenReply => {
        setState(next);
        if (!onTrade) update((p) => ({ ...p, mode: 'trade' }));
        return reply;
      };
      switch (tr.kind) {
        case 'triangle': {
          // The two said go in their registers (and the roll in Roll); the one asked for is solved and left on the display, and the others are read out with it.
          const held = pressMany(s, triangleSteps(tr));
          if (held.error) return show(held, fromTrade(held));
          const solved = unknowns(tr).map((f) => ({ f, s: press(held, registerKey(f)) }));
          const first = solved[0]!;
          if (first.s.error) return show(first.s, fromTrade(first.s));
          const parts = solved.filter((x) => !x.s.error).map((x) => ({ name: FIELD_NAME[x.f], shown: displayText(x.s) }));
          // A rolling offset leads with its true offset.
          if (tr.roll) {
            const t = press(held, 'roll');
            if (!t.error) parts.unshift({ name: 'True offset', shown: displayText(t) });
          }
          // And ends with the pipe to cut between the elbows, worked for the pipe set; a plain triangle only when it is asked for.
          let end = first.s;
          if (tr.roll || tr.cut) {
            const c = press(press(held, 'travel'), 'travel');
            if (!c.error) {
              parts.push({ name: 'Cut', shown: `${displayText(c)} (${displayLabel(c).split(' · ')[1] ?? ''})` });
              if (tr.cut) end = c;
            } else if (tr.cut) return show(c, fromTrade(c));
          }
          return show(end, { reply: parts.map((p) => `${p.name} ${p.shown}`).join(' · '), say: parts.map((p) => `${p.name} ${speakDisplay(p.shown.replace(/ \(.*\)$/, ''))}`).join('. ') });
        }
        case 'keys': {
          // A trade key by name: pressed as it would be, and stepped through when it shows more than one figure.
          let next = pressMany(tr.fresh ? press(press(s, 'clear'), 'clear') : { ...s, cycle: null }, tr.steps);
          const rows: CalcState[] = [];
          if (tr.repeat) {
            for (let i = 0; i < tr.repeat.times && !next.error; i++) {
              next = press(next, tr.repeat.key);
              rows.push(next);
            }
            // T.O. and its arcs, or a figure of the pipe: all of them read, the first left showing. The cut, the OD: the one asked for.
            if (tr.repeat.key !== 'takeoutArc') rows.splice(0, rows.length - 1);
          } else rows.push(next);
          const bad = rows.find((r) => r.error) ?? (next.error ? next : null);
          if (bad) return show(bad, fromTrade(bad));
          const what = displayLabel(rows[0]!).split(' · ')[1];
          const line = (r: CalcState) => `${displayLabel(r).split(' · ')[0]} ${displayText(r)}`;
          return show(rows[0]!, {
            reply: `${rows.map(line).join(' · ')}${what ? ` (${what})` : ''}`,
            say: rows.map((r) => `${spokenLabel(displayLabel(r).split(' · ')[0]!)} ${speakDisplay(displayText(r))}`).join('. '),
          });
        }
        case 'memory': {
          const next = pressMany(s, memorySteps(tr));
          if (next.error) return show(next, fromTrade(next));
          const said =
            tr.op === 'store' ? `Stored in ${tr.register}.` : tr.op === 'plus' ? 'Added to memory.' : tr.op === 'minus' ? 'Taken off memory.' : tr.op === 'clear' ? 'Memory cleared.' : null;
          return show(next, said ? said : fromTrade(next));
        }
        case 'show': {
          // A figure still being typed is finished first, so the unit key restates the answer rather than marking the figure.
          if (!isEntryEmpty(s.entry)) s = press(s, 'equals');
          const next = press(s, tr.unit === 'feet' ? 'feet' : tr.unit === 'inch' ? 'inch' : tr.unit === 'mm' ? 'mm' : 'metre');
          return show(next, fromTrade(next));
        }
        case 'elbow': {
          const cur = settingsNow.current;
          const a = elbowAnswer(tr, { radius: cur.defaultKind, jobFamily: jobFamilyOf(cur.material), den: cur.fractionDenominator, system: cur.unitSystem });
          if (!a.ok) return { reply: a.reply, say: a.say, tone: 'warn' };
          // The takeout goes on the display, ready for the next sum.
          const next = pressMany(press(press(s, 'clear'), 'clear'), tradeSteps([{ k: 'num', value: a.takeout, unit: 'in' }]) ?? []);
          return show(next, { reply: a.reply, say: a.say });
        }
      }
    }
    const c = readCalc(said);
    if (!c) return null;
    const fromBasic = (s: BasicState): ScreenReply => {
      if (s.error) return { reply: s.error, say: s.error, tone: 'warn' };
      const shown = exprText(s.toks) || '0';
      return { reply: `= ${shown}`, say: shown.replace(/−/g, 'minus ').replace(/,/g, '') };
    };
    const keep = (r: ReturnType<typeof equalsBasic>) => {
      if (r.entry) {
        const entry = r.entry;
        update((p) => ({ ...p, history: remember(p.history, entry) }));
      }
      return r.state;
    };
    switch (c.kind) {
      case 'clear':
        if (onTrade) setState((s) => press(press(s.shift ? press(s, 'conv') : s, 'clear'), 'clear'));
        else setBasic((s) => pressBasic(s, { t: 'clear' }));
        return 'Cleared.';
      case 'back':
        if (onTrade) setState((s) => press(s, 'backspace'));
        else setBasic((s) => pressBasic(s, { t: 'back' }));
        return 'Back one.';
      case 'equals': {
        if (onTrade) {
          const next = press(tradeNow.current, 'equals');
          setState(next);
          return fromTrade(next);
        }
        const next = keep(equalsBasic(basicNow.current));
        setBasic(next);
        return fromBasic(next);
      }
      case 'convert': {
        const v = converted(c);
        update((p) => ({ ...p, mode: 'standard', panel: 'convert', category: c.cat.id, from: { ...p.from, [c.cat.id]: c.from.id } }));
        setConvInput(String(Number(c.value.toPrecision(10))));
        const line = `${formatConverted(c.value)} ${c.from.sym} = ${formatConverted(v)} ${c.to.sym}`;
        return { reply: line, say: `${formatConverted(c.value)} ${c.from.name.toLowerCase()} is ${formatConverted(v)} ${c.to.name.toLowerCase()}` };
      }
      case 'sum': {
        if (onTrade || hasLengths(c.items)) {
          const steps = tradeSteps(c.items);
          if (!steps) return { reply: 'The trade calculator has no factorial: say "standard calculator" first.', say: 'The trade calculator has no factorial.', tone: 'warn' };
          let s = tradeNow.current;
          if (s.shift) s = press(s, 'conv');
          const empty = isEntryEmpty(s.entry) && !s.acc;
          // "Minus 5" with nothing on the display is nought minus five.
          if (c.carry && empty && c.items[0]?.k === 'op' && c.items[0].op === '-') s = press(press(press(s, 'clear'), 'clear'), 'digit', '0');
          else if (!c.carry) s = press(press(s, 'clear'), 'clear');
          s = pressMany(s, steps);
          if (worksOut(c.items)) s = press(s, 'equals');
          setState(s);
          if (!onTrade) update((p) => ({ ...p, mode: 'trade' }));
          return fromTrade(s);
        }
        let s = c.carry ? basicNow.current : pressBasic(basicNow.current, { t: 'clear' });
        for (const k of standardKeys(c.items) ?? []) s = pressBasic(s, k);
        if (worksOut(c.items)) s = keep(equalsBasic(s));
        setBasic(s);
        return fromBasic(s);
      }
    }
  };
  useScreenVoice(hear);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
    <Screen scroll={false}>
      <View style={[styles.wrap, { padding: t.space.md, gap: t.space.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <View style={{ flex: 1 }}>
            <ModeSwitch mode={mode} onChange={(m) => update((p) => ({ ...p, mode: m }))} />
          </View>
          {voice?.enabled ? (
            <Pressable
              onPress={voice.talk}
              accessibilityRole="button"
              accessibilityLabel="Speak a command"
              hitSlop={6}
              style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.colors.primaryPressed : t.colors.primary })}
            >
              <Ionicons name="mic" size={21} color={t.colors.onPrimary} />
            </Pressable>
          ) : null}
        </View>
        {mode === 'standard' ? (
          <StandardCalc state={basic} setState={setBasic} convInput={convInput} setConvInput={setConvInput} />
        ) : (
        <>
        <View
          style={[
            styles.lcd,
            {
              backgroundColor: t.mode === 'dark' ? '#101A16' : '#C9D4C2',
              // Trimmed in copper like every other readout in the app.
              borderColor: t.colors.copper,
              borderRadius: t.radius.lg,
              padding: t.space.md,
              minHeight: short ? 96 : 124,
            },
          ]}
        >
          <View style={styles.annunciators}>
            {annunciators.map((a) => (
              <Text key={a} style={[styles.annunciator, t.weight('700'), { fontFamily: t.font.sans, color: t.mode === 'dark' ? '#7FA890' : '#4A5A44' }]}>
                {a}
              </Text>
            ))}
          </View>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.readout,
              {
                color: state.error ? t.colors.danger : t.mode === 'dark' ? '#DCF0E2' : '#16231B',
                fontFamily: t.font.mono,
                // Words on the readout ("Galvanized steel") and long decimals step down, as the web does not shrink to fit.
                fontSize: state.error ? 17 : shown.length > 14 ? 24 : shown.length > 10 ? 30 : 40,
              },
            ]}
          >
            {shown}
          </Text>

          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.unitWord, t.weight('700'), { fontFamily: t.font.sans, color: t.mode === 'dark' ? '#7FA890' : '#4A5A44' }]}>
            {unitWord || ' '}
          </Text>
        </View>

        <View style={{ flex: 1 }} onLayout={(e) => setRoom(e.nativeEvent.layout.height)}>
          {fit.scrolls ? (
            <ScrollView showsVerticalScrollIndicator>
              <Keypad onPress={handle} shift={state.shift} keyHeight={fit.keyHeight} compact={fit.compact} />
            </ScrollView>
          ) : (
            <Keypad onPress={handle} shift={state.shift} keyHeight={fit.keyHeight} compact={fit.compact} />
          )}
        </View>
        </>
        )}
      </View>
    </Screen>
    <TabBar active="calc" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  lcd: { borderWidth: 2, justifyContent: 'space-between' },
  annunciators: { flexDirection: 'row', gap: 10, minHeight: 14 },
  annunciator: { fontSize: 10.5, letterSpacing: 1 },
  readout: { textAlign: 'right', fontWeight: '700' },
  unitWord: { textAlign: 'right', fontSize: 11.5, letterSpacing: 1.4, minHeight: 15 },
});
