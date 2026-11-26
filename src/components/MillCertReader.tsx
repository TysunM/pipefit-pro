import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../theme/ThemeProvider';
import { API_BASE } from '../ai/apiBase';
import { askMillCert, canKeep, certRows, certStatusWords, keepCert, millMissWords, toggleCert, type CertRow, type MillRead } from '../ai/millCert';
import { bestPictureSize } from '../ai/fittingSheet';
import { pct } from '../calc/sulphur';
import { useHeats } from '../state/heats';
import { canListen, listenOn, stopListening } from '../voice/listen';
import { cameraWordOf } from '../voice/cameraWords';
import { say } from '../audio/say';
import { VoicePressable } from '../voice/VoicePressable';

// A mill cert photographed and read for each heat's sulphur (ai/millCert.ts),
// then set against the heat book: what saving each would do, ticked or not.
// Nothing is written until Save, and only what is ticked. Hands-free when
// opened by voice: "take it", "again", "save", "cancel".

type Stage =
  | { at: 'camera' }
  | { at: 'reading'; uri: string }
  | { at: 'review'; uri: string; read: MillRead; rows: CertRow[] }
  | { at: 'saved'; added: number; updated: number }
  | { at: 'failed'; why: string };

export function MillCertReader({ visible, onClose, want = [], listen = false }: { visible: boolean; onClose: () => void; want?: readonly string[]; listen?: boolean }) {
  const t = useTheme();
  const c = t.colors;
  const insets = useSafeAreaInsets();
  const heats = useHeats();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>({ at: 'camera' });
  const [torch, setTorch] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const cam = useRef<CameraView | null>(null);

  const close = () => {
    setStage({ at: 'camera' });
    setTorch(false);
    onClose();
  };

  const ready = async () => {
    try {
      setPictureSize(bestPictureSize((await cam.current?.getAvailablePictureSizesAsync()) ?? []));
    } catch {
      setPictureSize(undefined);
    }
  };

  const shoot = async () => {
    const cm = cam.current;
    if (!cm) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // JPEG on the web too, where the camera otherwise gives a PNG several times the size: a full-resolution one can pass the 5 MB cap.
      const shot = await cm.takePictureAsync({ base64: true, quality: pictureSize ? 0.7 : 0.45, imageType: 'jpg' });
      const b64 = shot?.base64 ?? (shot?.uri?.startsWith('data:') ? shot.uri : '');
      if (!shot?.uri || !b64) return setStage({ at: 'failed', why: 'The camera returned no picture. Try again.' });
      setStage({ at: 'reading', uri: shot.uri });
      const read = await askMillCert(API_BASE, b64);
      if (typeof read === 'string') {
        setStage({ at: 'failed', why: millMissWords(read) });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      const rows = certRows(read, heats.book);
      setStage({ at: 'review', uri: shot.uri, read, rows });
      void Haptics.notificationAsync(rows.some((r) => r.pick) ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      setStage({ at: 'failed', why: `The picture did not go: ${e instanceof Error ? e.message : 'unknown error'}. Try again.` });
    }
  };

  const save = (st: Extract<Stage, { at: 'review' }>) => {
    if (!st.rows.some((r) => r.pick)) return;
    const out = keepCert(heats.book, st.read, st.rows, Date.now());
    heats.apply(() => out.book);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStage({ at: 'saved', added: out.added, updated: out.updated });
    if (listen) say(`${out.added + out.updated} heat${out.added + out.updated === 1 ? '' : 's'} kept.`);
  };

  // Hands-free, as the box reader: listening starts a beat after the camera opens.
  const latest = useRef({ stage, shoot, save, close });
  latest.current = { stage, shoot, save, close };
  const [hearing, setHearing] = useState('');
  useEffect(() => {
    if (!visible || !listen || !canListen()) return;
    let live = true;
    const start = setTimeout(() => {
      void listenOn(
        (alternatives) => {
          const word = cameraWordOf(alternatives);
          const { stage: st, shoot: go, save: keep, close: shut } = latest.current;
          setHearing(alternatives[0] ?? '');
          if (word === 'close') return shut();
          if (word === 'shoot' && st.at === 'camera') return void go();
          if (word === 'retake' && (st.at === 'review' || st.at === 'failed' || st.at === 'saved')) return setStage({ at: 'camera' });
          if (word === 'save' && st.at === 'review') return keep(st);
        },
        { still: () => live, onHeard: setHearing },
      );
    }, 1200);
    return () => {
      live = false;
      clearTimeout(start);
      stopListening();
    };
  }, [visible, listen]);
  useEffect(() => {
    if (listen && stage.at === 'review') {
      const n = stage.rows.filter((r) => r.pick).length;
      say(`${stage.rows.length} heat${stage.rows.length === 1 ? '' : 's'} read, ${n} ticked. Check them against the cert.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.at]);

  const voiceHint = (text: string) =>
    listen ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <Ionicons name="mic" size={18} color={c.accent} />
        <Text style={[t.type.captionStrong, { color: c.accent, flex: 1 }]}>{text}</Text>
        {hearing ? <Text style={[t.type.caption, { color: c.textFaint }]} numberOfLines={1}>{`“${hearing}”`}</Text> : null}
      </View>
    ) : null;
  const button = (label: string, onPress: () => void, opts: { icon?: keyof typeof Ionicons.glyphMap; primary?: boolean; disabled?: boolean } = {}) => (
    <VoicePressable
      voiceLabel={label}
      onPress={onPress}
      disabled={opts.disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!opts.disabled }}
      style={{ height: t.layout.controlHeight, borderRadius: t.radius.md, backgroundColor: opts.primary ? c.primary : c.bgRaised, borderWidth: opts.primary ? 0 : 1, borderColor: c.border, opacity: opts.disabled ? 0.45 : 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: t.space.sm }}
    >
      {opts.icon ? <Ionicons name={opts.icon} size={20} color={opts.primary ? c.onPrimary : c.text} /> : null}
      <Text style={[t.type.bodyStrong, { color: opts.primary ? c.onPrimary : c.text }]}>{label}</Text>
    </VoicePressable>
  );
  const note = (text: string, warn = false) => <Text style={[t.type.body, { color: warn ? c.warnText : c.textMuted }]}>{text}</Text>;

  const body = () => {
    if (!permission) return note('Checking whether the camera is available…');
    if (!permission.granted) {
      return (
        <>
          {note("The photo goes through the app's server to Cloudflare's free reader (Claude only if that cannot read it), is read, and is not kept. Nothing is saved until you check it and tap Save.")}
          {button('Allow the camera', () => void requestPermission(), { primary: true })}
        </>
      );
    }
    if (stage.at === 'camera') {
      return (
        <>
          <View style={{ height: 340, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
            <CameraView ref={cam} style={{ flex: 1 }} facing="back" enableTorch={torch} pictureSize={pictureSize} onCameraReady={() => void ready()} />
            <VoicePressable
              voiceLabel={torch ? 'Light off' : 'Light on'}
              onPress={() => setTorch((on) => !on)}
              accessibilityRole="switch"
              accessibilityState={{ checked: torch }}
              accessibilityLabel={torch ? 'Light on. Turn it off' : 'Turn the light on'}
              hitSlop={8}
              style={{ position: 'absolute', top: t.space.md, right: t.space.md, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: torch ? c.accent : 'rgba(0,0,0,0.55)' }}
            >
              <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color={torch ? c.onPrimary : '#fff'} />
            </VoicePressable>
          </View>
          <Text style={[t.type.caption, { color: c.textFaint }]}>
            {`The heat numbers and the chemistry table, flat and square, filling the frame.${want.length ? ` Looking for ${want.join(', ')}.` : ''} A long cert goes in halves.`}
          </Text>
          {voiceHint('Listening — say “take it”, or “cancel”.')}
          {button('Read the cert', () => void shoot(), { icon: 'scan-outline', primary: true })}
        </>
      );
    }
    if (stage.at === 'reading') {
      return (
        <>
          <Image source={{ uri: stage.uri }} style={{ height: 220, borderRadius: t.radius.lg }} resizeMode="contain" />
          {note('Reading it. A full cert takes up to a minute.')}
        </>
      );
    }
    if (stage.at === 'failed') {
      return (
        <>
          {note(stage.why, true)}
          {button('Try again', () => setStage({ at: 'camera' }))}
        </>
      );
    }
    if (stage.at === 'saved') {
      return (
        <>
          {note(`${[stage.added && `${stage.added} heat${stage.added === 1 ? '' : 's'} added`, stage.updated && `${stage.updated} updated`].filter(Boolean).join(', ')} in the heat book, with their sulphur. Every weld on them is checked from now on.`)}
          {button('Read another cert', () => setStage({ at: 'camera' }), { icon: 'camera-outline' })}
          {button('Done', close, { primary: true })}
        </>
      );
    }

    const st = stage;
    const picked = st.rows.filter((r) => r.pick).length;
    const from = [st.read.mill, st.read.certNo && `cert ${st.read.certNo}`].filter(Boolean).join(', ');
    const wanted = want.filter((w) => !st.rows.some((r) => r.heat.replace(/[\s-]/g, '').toUpperCase() === w.replace(/[\s-]/g, '').toUpperCase()));
    return (
      <>
        <Image source={{ uri: st.uri }} style={{ height: 140, borderRadius: t.radius.lg }} resizeMode="contain" />
        {st.rows.length ? (
          <Text style={[t.type.caption, { color: c.textMuted }]}>
            {`${from ? `Read off ${from}. ` : ''}Check each heat number and its sulphur against the cert in your hand. Ticked ones go into the heat book; tap to tick or untick.`}
          </Text>
        ) : null}
        {wanted.length ? note(`Not on this cert: ${wanted.join(', ')}.`, true) : null}
        {st.read.unread ? <Text style={[t.type.caption, { color: c.warnText }]}>{st.read.unread}</Text> : null}
        {!st.rows.length ? note('No heat on that picture could be read. Closer, flatter and square to the page reads better.', true) : null}
        <View>
          {st.rows.map((r) => {
            const s = certStatusWords(r);
            const ok = canKeep(r);
            return (
              <Pressable
                key={r.id}
                disabled={!ok}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setStage({ ...st, rows: toggleCert(st.rows, r.id) });
                }}
                accessibilityRole="checkbox"
                accessibilityLabel={`Heat ${r.heat}, sulphur ${r.s !== null ? `${pct(r.s)} per cent` : 'not read'}`}
                accessibilityState={{ checked: r.pick, disabled: !ok }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.md, borderTopWidth: t.hairline, borderTopColor: c.border, opacity: ok ? 1 : 0.6, backgroundColor: pressed ? c.bgSubtle : 'transparent' })}
              >
                <Ionicons name={r.pick ? 'checkbox' : ok ? 'square-outline' : 'remove-circle-outline'} size={24} color={r.pick ? c.accent : c.textMuted} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[t.type.bodyStrong, { color: c.text }]}>{r.heat}</Text>
                  <Text style={[t.type.caption, { color: c.textMuted }]} numberOfLines={2}>
                    {[r.spec, r.sPrinted && r.sPrinted !== (r.s !== null ? String(r.s) : '') ? `printed “${r.sPrinted}”` : '', r.analysis && `${r.analysis} analysis`].filter(Boolean).join(' · ') || 'From the cert'}
                  </Text>
                  <Text style={[t.type.caption, { color: s.warn ? c.warnText : c.textMuted }]}>{s.text}</Text>
                </View>
                <Text style={[t.type.bodyStrong, { color: c.data }]}>{r.s !== null ? `S ${pct(r.s)}%` : 'S —'}</Text>
              </Pressable>
            );
          })}
        </View>
        {button(picked ? `Save ${picked} to the heat book` : 'Tick what to save', () => save(st), { icon: 'bookmark-outline', primary: true, disabled: !picked })}
        {voiceHint('Listening — say “save” to keep what is ticked, or “again”.')}
        {button('Take it again', () => setStage({ at: 'camera' }), { icon: 'camera-outline' })}
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={close} />
      <View style={{ backgroundColor: c.bg, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl, paddingBottom: insets.bottom + t.space.lg, maxHeight: '92%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.lg, borderBottomWidth: t.hairline, borderBottomColor: c.border }}>
          <Text style={[t.type.sectionTitle, { color: c.text, flex: 1 }]}>Read a mill cert</Text>
          <VoicePressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <Ionicons name="close" size={24} color={c.textMuted} />
          </VoicePressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: t.layout.screenPadding, gap: t.space.lg }}>{body()}</ScrollView>
      </View>
    </Modal>
  );
}
