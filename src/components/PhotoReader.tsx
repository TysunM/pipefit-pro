import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../theme/ThemeProvider';
import { bestPictureSize } from '../ai/fittingSheet';
import { canListen, listenOn, stopListening } from '../voice/listen';
import { cameraWordOf } from '../voice/cameraWords';
import { VoicePressable } from '../voice/VoicePressable';

// One photo reader's sheet: the camera with its light, the picture going to
// be read, what went wrong in plain words, and the reader's own review once
// it is back. Hands-free when opened by voice: "take it", "again", "save",
// "cancel", the phone's own voice never holding a command word.
//
// The reader brings what it reads and how it is reviewed; this brings the
// rest, so every reader works the same in the hand.

export type ReviewControls = {
  /** Back to the camera for another picture. */
  retake: () => void;
  close: () => void;
  /** What "save" does when said: the review's own keep, or nothing yet. */
  onSave: (save: (() => void) | null) => void;
  listen: boolean;
};

type Stage<T> = { at: 'camera' } | { at: 'reading'; uri: string } | { at: 'review'; uri: string; value: T } | { at: 'failed'; why: string };

export function PhotoReader<T>({
  visible,
  onClose,
  title,
  frame,
  shootLabel,
  readingNote,
  read,
  review,
  listen = false,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Under the camera: what to fill the frame with. */
  frame: string;
  shootLabel: string;
  readingNote: string;
  /** The picture read: what came back, or why it did not, in words. */
  read: (b64: string) => Promise<T | { miss: string }>;
  review: (value: T, uri: string, controls: ReviewControls) => React.ReactNode;
  listen?: boolean;
}) {
  const t = useTheme();
  const c = t.colors;
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage<T>>({ at: 'camera' });
  const [torch, setTorch] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const cam = useRef<CameraView | null>(null);
  const saveRef = useRef<(() => void) | null>(null);

  const close = () => {
    setStage({ at: 'camera' });
    setTorch(false);
    saveRef.current = null;
    onClose();
  };
  const retake = () => {
    saveRef.current = null;
    setStage({ at: 'camera' });
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
      const out = await read(b64);
      if (out && typeof out === 'object' && 'miss' in (out as object)) {
        setStage({ at: 'failed', why: (out as { miss: string }).miss });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      setStage({ at: 'review', uri: shot.uri, value: out as T });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setStage({ at: 'failed', why: `The picture did not go: ${e instanceof Error ? e.message : 'unknown error'}. Try again.` });
    }
  };

  const latest = useRef({ stage, shoot, close, retake });
  latest.current = { stage, shoot, close, retake };
  const [hearing, setHearing] = useState('');
  useEffect(() => {
    if (!visible || !listen || !canListen()) return;
    let live = true;
    const start = setTimeout(() => {
      void listenOn(
        (alternatives) => {
          const word = cameraWordOf(alternatives);
          const { stage: st, shoot: go, close: shut, retake: again } = latest.current;
          setHearing(alternatives[0] ?? '');
          if (word === 'close') return shut();
          if (word === 'shoot' && st.at === 'camera') return void go();
          if (word === 'retake' && (st.at === 'review' || st.at === 'failed')) return again();
          if (word === 'save' && st.at === 'review') saveRef.current?.();
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

  const voiceHint = (text: string) =>
    listen ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <Ionicons name="mic" size={18} color={c.accent} />
        <Text style={[t.type.captionStrong, { color: c.accent, flex: 1 }]}>{text}</Text>
        {hearing ? <Text style={[t.type.caption, { color: c.textFaint }]} numberOfLines={1}>{`“${hearing}”`}</Text> : null}
      </View>
    ) : null;
  const note = (text: string, warn = false) => <Text style={[t.type.body, { color: warn ? c.warnText : c.textMuted }]}>{text}</Text>;

  const body = () => {
    if (!permission) return note('Checking whether the camera is available…');
    if (!permission.granted) {
      return (
        <>
          {note("The photo goes through the app's server to Cloudflare's free reader (Claude only if that cannot read it), is read, and is not kept. Nothing is saved until you check it.")}
          <SheetButton label="Allow the camera" onPress={() => void requestPermission()} primary />
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
          <Text style={[t.type.caption, { color: c.textFaint }]}>{frame}</Text>
          {voiceHint('Listening — say “take it”, or “cancel”.')}
          <SheetButton label={shootLabel} icon="scan-outline" onPress={() => void shoot()} primary />
        </>
      );
    }
    if (stage.at === 'reading') {
      return (
        <>
          <Image source={{ uri: stage.uri }} style={{ height: 220, borderRadius: t.radius.lg }} resizeMode="contain" />
          {note(readingNote)}
        </>
      );
    }
    if (stage.at === 'failed') {
      return (
        <>
          {note(stage.why, true)}
          <SheetButton label="Try again" onPress={retake} />
        </>
      );
    }
    return (
      <>
        <Image source={{ uri: stage.uri }} style={{ height: 140, borderRadius: t.radius.lg }} resizeMode="contain" />
        {review(stage.value, stage.uri, { retake, close, listen, onSave: (fn) => (saveRef.current = fn) })}
        {voiceHint('Listening — say “save” to keep it, or “again”.')}
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={close} />
      <View style={{ backgroundColor: c.bg, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl, paddingBottom: insets.bottom + t.space.lg, maxHeight: '92%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.lg, borderBottomWidth: t.hairline, borderBottomColor: c.border }}>
          <Text style={[t.type.sectionTitle, { color: c.text, flex: 1 }]}>{title}</Text>
          <VoicePressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <Ionicons name="close" size={24} color={c.textMuted} />
          </VoicePressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: t.layout.screenPadding, gap: t.space.lg }}>{body()}</ScrollView>
      </View>
    </Modal>
  );
}

/** A full-width button in a reader's sheet, said by its label. */
export function SheetButton({ label, onPress, icon, primary = false, disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; primary?: boolean; disabled?: boolean }) {
  const t = useTheme();
  const c = t.colors;
  return (
    <VoicePressable
      voiceLabel={label}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ height: t.layout.controlHeight, borderRadius: t.radius.md, backgroundColor: primary ? c.primary : c.bgRaised, borderWidth: primary ? 0 : 1, borderColor: c.border, opacity: disabled ? 0.45 : 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: t.space.sm }}
    >
      {icon ? <Ionicons name={icon} size={20} color={primary ? c.onPrimary : c.text} /> : null}
      <Text style={[t.type.bodyStrong, { color: primary ? c.onPrimary : c.text }]}>{label}</Text>
    </VoicePressable>
  );
}
