import React, { useMemo, useRef, useState } from 'react';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import type Svg from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Banner } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { TieGame } from '../components/knots/TieGame';
import { Certificate } from '../components/knots/Certificate';
import { certificateArt } from '../components/knots/certArt';
import { CertArtSvg, type Fonts } from '../components/knots/CertArtSvg';
import { saveCertificate } from '../components/knots/saveCert';
import { laidOf } from '../components/knots/laid';
import { useTheme } from '../theme/ThemeProvider';
import { useKnotBook } from '../state/knots';
import { recordCert } from '../state/knotProgress';
import { KNOTS, knotById } from '../calc/knots/knots';
import { seeded } from '../calc/knots/quiz';
import { TITLE, beats, certOrder, certTotals, certified, clock, type CertKnot } from '../calc/knots/cert';
import { ListRow } from './OrbitalScreen';

// The Knot Certified run: every knot, from memory, back to back, in an order
// shuffled each time. No line, no steps, no look at it, every over or under
// called. The clock counts tying only. Tie every one and there's a
// certificate that certifies absolutely nothing; skip one and there's none.

type Props = NativeStackScreenProps<RootStackParamList, 'KnotCert'>;
type Phase = 'intro' | 'run' | 'done';

export function KnotCertScreen({ navigation }: Props) {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const book = useKnotBook();
  const [phase, setPhase] = useState<Phase>('intro');
  const [order, setOrder] = useState<string[]>([]);
  const [run, setRun] = useState<CertKnot[]>([]);
  const [runId, setRunId] = useState(0);
  const [at, setAt] = useState(0);
  const [finishedAt, setFinishedAt] = useState(0);
  const size = Math.min(width - 2 * t.layout.screenPadding, 440);
  const best = book.value.cert.best;
  // The certificate as a picture to save or send: drawn off screen on the phone, its PNG made from that.
  const artRef = useRef<Svg>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const fonts: Fonts = { sans: t.font.sans, sansRegular: t.font.sansRegular, serif: t.font.serif };
  const totals = useMemo(() => certTotals(run), [run]);
  const art = useMemo(() => (phase === 'done' && certified(totals) ? certificateArt(totals, finishedAt) : null), [phase, totals, finishedAt]);
  const save = async () => {
    if (!art || saving) return;
    setSaving(true);
    setSaved(null);
    const r = await saveCertificate(art, fonts, artRef.current);
    setSaving(false);
    setSaved(r.ok ? (r.how === 'downloaded' ? 'Saved as knot-certified.png.' : 'Shared.') : r.why);
  };

  const start = () => {
    setOrder(certOrder(seeded(Date.now() % 1_000_000_007)));
    setSaved(null);
    setRun([]);
    setAt(0);
    setRunId((n) => n + 1);
    setPhase('run');
  };
  const next = (r: CertKnot[]) => {
    if (r.length < order.length) return setAt(r.length);
    const now = Date.now();
    book.apply((b) => recordCert(b, certTotals(r), now, beats));
    setFinishedAt(now);
    setPhase('done');
  };
  const skip = () => {
    const r = [...run.slice(0, at), { id: order[at]!, ms: 0, slips: 0, wrong: 0, skipped: true }];
    setRun(r);
    next(r);
  };

  if (phase === 'intro') {
    return (
      <Screen>
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: t.space.sm, alignItems: 'center' }}>
          <Ionicons name="ribbon" size={44} color={c.glow} />
          <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 28, textAlign: 'center' }]}>Knot Certified</Text>
          <Text style={[t.type.body, { color: c.textMuted, textAlign: 'center' }]}>
            {`All ${KNOTS.length} knots from memory, back to back, in a shuffled order. Tie every one to get certified. It certifies nothing.`}
          </Text>
        </View>
        <SectionHeader title="The rules" />
        <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.sm }}>
          {[
            'No line, no steps, no Show me. The phone buzzes when you are off the line.',
            'Every crossing: over or under, your call. A wrong call counts as two misses.',
            'No starting a knot over. Skip one if you must, but a skipped knot means no certificate.',
            'The clock counts tying time only. Breathe between knots.',
          ].map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: t.space.sm }}>
              <Ionicons name="checkmark" size={18} color={c.success} />
              <Text style={[t.type.body, { color: c.text, flex: 1 }]}>{r}</Text>
            </View>
          ))}
        </View>
        {best ? (
          <View style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.lg, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: t.hairline, borderColor: c.border, gap: 4 }}>
            <Text style={[t.type.label, { color: c.textMuted }]}>Your best</Text>
            <Text style={[t.type.sectionTitle, { color: c.text }]}>{certified(best) ? TITLE : `${best.tied} of ${best.of} tied`}</Text>
            <Text style={[t.type.caption, { color: c.textMuted }]}>{`${clock(best.ms)} · ${best.misses} miss${best.misses === 1 ? '' : 'es'} · ${book.value.cert.runs} run${book.value.cert.runs === 1 ? '' : 's'}`}</Text>
          </View>
        ) : null}
        <ControlRow>
          <AccentButton label="Start the run" icon="play" style={{ flex: 1 }} onPress={start} />
        </ControlRow>
        <View style={{ paddingTop: t.space.sm }}>
          <Banner tone="warn" icon="warning-outline" text="Knots are for tag lines, hand lines and light material on a hand line. Never knot a sling or a wire rope, and never use one for fall protection." />
        </View>
      </Screen>
    );
  }

  if (phase === 'done') {
    return (
      <Screen>
        {art ? (
          <>
            <View style={{ paddingTop: t.space.lg }}>
              <Certificate totals={totals} at={finishedAt} width={size} />
            </View>
            {Platform.OS !== 'web' ? (
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <CertArtSvg ref={artRef} art={art} fonts={fonts} width={270} />
              </View>
            ) : null}
            <ControlRow>
              <AccentButton label={saving ? 'Making the picture…' : 'Save as image'} icon="image-outline" style={{ flex: 1 }} onPress={() => void save()} />
            </ControlRow>
            {saved ? <Text style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, textAlign: 'center' }]}>{saved}</Text> : null}
            <ControlRow>
              <GhostButton label="Run it again" icon="refresh" style={{ flex: 1 }} onPress={start} />
              <GhostButton label="Back to knots" icon="arrow-back" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
            </ControlRow>
          </>
        ) : (
          <>
            {/* No certificate: a knot was skipped. */}
            <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: t.space.sm, alignItems: 'center' }}>
              <Ionicons name="close-circle-outline" size={44} color={c.textMuted} />
              <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 26, textAlign: 'center' }]}>No certificate this time</Text>
              <Text style={[t.type.body, { color: c.textMuted, textAlign: 'center' }]}>
                {`${totals.skipped} knot${totals.skipped === 1 ? '' : 's'} skipped. Tie all ${totals.of} without skipping to get certified.`}
              </Text>
            </View>
            <ControlRow>
              <AccentButton label="Run it again" icon="refresh" style={{ flex: 1 }} onPress={start} />
              <GhostButton label="Back to knots" icon="arrow-back" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
            </ControlRow>
          </>
        )}
        <SectionHeader title="Knot by knot" meta={clock(totals.ms)} />
        {run.map((r, i) => {
          const k = knotById(r.id)!;
          const misses = r.slips + 2 * r.wrong;
          return (
            <ListRow
              key={`${r.id}-${i}`}
              voice={k.name}
              title={`${i + 1}. ${k.name}`}
              sub={r.skipped ? 'Skipped' : `${clock(r.ms)} · ${r.slips} off the line · ${r.wrong} wrong call${r.wrong === 1 ? '' : 's'}`}
              onPress={() => navigation.navigate('Knot', { id: k.id, mode: misses || r.skipped ? 'learn' : 'memory' })}
              right={<Ionicons name={r.skipped ? 'close-circle' : misses ? 'alert-circle' : 'checkmark-circle'} size={22} color={r.skipped ? c.danger : misses ? c.warnText : c.success} />}
            />
          );
        })}
      </Screen>
    );
  }

  const knot = knotById(order[at]!)!;
  const doneHere = run.length > at;
  const soFar = run.reduce((a, r) => a + r.ms, 0);
  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.sm }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {order.map((id, j) => {
            const r = run[j];
            return <View key={id} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: r ? (r.skipped ? c.danger : r.slips + r.wrong ? c.warnText : c.success) : j === at ? c.glow : c.border }} />;
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[t.type.label, { color: c.textMuted, flex: 1 }]}>{`Knot ${at + 1} of ${order.length}`}</Text>
          <Text style={[t.type.label, { color: c.textMuted }]}>{`Total ${clock(soFar)}`}</Text>
        </View>
        <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 26 }]}>{knot.name}</Text>
        <Text style={[t.type.body, { color: c.textMuted }]}>{knot.use}</Text>
      </View>
      <View style={{ paddingTop: t.space.md }}>
        <TieGame
          key={`${runId}-${at}`}
          knot={knot}
          laid={laidOf(knot)}
          size={size}
          blind
          cert
          onDone={(r) => setRun((prev) => [...prev.slice(0, at), { id: knot.id, ...r }])}
        />
      </View>
      <ControlRow>
        {doneHere ? (
          <AccentButton label={at < order.length - 1 ? 'Next knot' : 'See your certificate'} icon={at < order.length - 1 ? 'arrow-forward' : 'ribbon-outline'} style={{ flex: 1 }} onPress={() => next(run)} />
        ) : (
          <>
            <GhostButton label="Skip this knot" icon="play-skip-forward-outline" style={{ flex: 1 }} onPress={skip} />
            <GhostButton label="Quit the run" icon="close" style={{ flex: 1 }} onPress={() => setPhase('intro')} />
          </>
        )}
      </ControlRow>
    </Screen>
  );
}
