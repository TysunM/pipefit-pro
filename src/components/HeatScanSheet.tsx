// Reading a heat number off the steel
// -----------------------------------
// Point it at a stencil or a cert, and it offers what it found. It does not
// enter anything: somebody taps the right one.
//
// That is the design, and it is deliberate rather than timid. OCR on a stencil
// sprayed round a curve in a dark rack is going to be wrong sometimes, and the
// way a heat number goes wrong is that it still looks like a heat number. A
// scanner that filled the field by itself would turn a bad read into a record
// nobody questions, which is the exact failure the heat book exists to stop.
// So the camera does the typing and the fitter does the deciding.
//
// The reading is on-device. No key in the APK for anybody to spend, and no
// signal needed — which matters because stencils are read in racks, pits and
// vaults, which is where the service worker exists for too.
import React, { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../theme/ThemeProvider';
import { Heat } from '../calc/heat';
import { Candidate, scanForHeats, whyLabel } from '../calc/heatScan';

/** Loaded lazily so a device with no OCR module still opens the sheet. */
type Ocr = { recognizeText: (uri: string) => Promise<{ text: string }> };
let ocr: Ocr | null = null;
let ocrTried = false;
async function loadOcr(): Promise<Ocr | null> {
  if (ocrTried) return ocr;
  ocrTried = true;
  try {
    // Required rather than imported so a build without the native side still
    // runs: the sheet then says so instead of taking the screen down.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-mlkit-ocr') as Ocr;
    ocr = typeof mod?.recognizeText === 'function' ? mod : null;
  } catch {
    ocr = null;
  }
  return ocr;
}

type Stage =
  | { at: 'camera' }
  | { at: 'reading'; uri: string }
  | { at: 'read'; uri: string; found: Candidate[]; raw: string }
  | { at: 'failed'; why: string };

export function HeatScanSheet({
  visible,
  onClose,
  onPick,
  book,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (heat: string) => void;
  book: readonly Heat[];
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>({ at: 'camera' });
  const cam = useRef<CameraView | null>(null);

  const reset = () => setStage({ at: 'camera' });
  const close = () => {
    reset();
    onClose();
  };

  const shoot = async () => {
    const c = cam.current;
    if (!c) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const shot = await c.takePictureAsync({ quality: 0.9, skipProcessing: true });
      if (!shot?.uri) {
        setStage({ at: 'failed', why: 'The camera returned no picture. Try again.' });
        return;
      }
      setStage({ at: 'reading', uri: shot.uri });
      const engine = await loadOcr();
      if (!engine) {
        setStage({
          at: 'failed',
          why: 'Text recognition is not available in this build. Type the heat instead — the book works either way.',
        });
        return;
      }
      const result = await engine.recognizeText(shot.uri);
      const raw = result?.text ?? '';
      const found = scanForHeats(raw, book);
      setStage({ at: 'read', uri: shot.uri, found, raw });
      void Haptics.notificationAsync(
        found.length
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch (e) {
      setStage({
        at: 'failed',
        why: `The read did not finish: ${e instanceof Error ? e.message : 'unknown error'}. Try again, or type the heat.`,
      });
    }
  };

  const body = () => {
    if (!permission) {
      return <Note t={t} text="Checking whether the camera is available…" />;
    }
    if (!permission.granted) {
      return (
        <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
          <Text style={[t.type.body, { color: t.colors.textMuted }]}>
            The camera reads the stencil. The picture is processed on this phone and is not uploaded anywhere —
            there is no account and no server to upload it to.
          </Text>
          <Pressable
            onPress={() => void requestPermission()}
            accessibilityRole="button"
            style={{
              height: t.layout.controlHeight,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[t.type.bodyStrong, { color: t.colors.onPrimary }]}>Allow the camera</Text>
          </Pressable>
        </View>
      );
    }

    if (stage.at === 'camera') {
      return (
        <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
          <View
            style={{
              height: 300,
              borderRadius: t.radius.lg,
              overflow: 'hidden',
              backgroundColor: '#000',
            }}
          >
            <CameraView ref={cam} style={{ flex: 1 }} facing="back" />
          </View>
          <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
            Fill the frame with the stencil or the heat line on the cert. Closer and squarer reads better than
            further and crooked.
          </Text>
          <Pressable
            onPress={() => void shoot()}
            accessibilityRole="button"
            style={{
              height: t.layout.controlHeight,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: t.space.sm,
            }}
          >
            <Ionicons name="scan-outline" size={20} color={t.colors.onPrimary} />
            <Text style={[t.type.bodyStrong, { color: t.colors.onPrimary }]}>Read it</Text>
          </Pressable>
        </View>
      );
    }

    if (stage.at === 'reading') {
      return (
        <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
          <Image source={{ uri: stage.uri }} style={{ height: 200, borderRadius: t.radius.lg }} resizeMode="contain" />
          <Note t={t} text="Reading it on the phone…" />
        </View>
      );
    }

    if (stage.at === 'failed') {
      return (
        <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
          <Note t={t} text={stage.why} />
          <Pressable
            onPress={reset}
            accessibilityRole="button"
            style={{
              height: t.layout.controlHeight,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.bgRaised,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={{ paddingBottom: t.space.md }}>
        <Image
          source={{ uri: stage.uri }}
          style={{ height: 150, marginHorizontal: t.layout.screenPadding, borderRadius: t.radius.lg }}
          resizeMode="contain"
        />
        {stage.found.length === 0 ? (
          <Note
            t={t}
            text={
              stage.raw.trim()
                ? 'Nothing on that read looked like a heat number. Get closer, square the phone to the stencil, or type it.'
                : 'Nothing read off that picture at all. A stencil needs light and a square-on shot; a stamp needs raking light across it.'
            }
          />
        ) : (
          <Text
            style={[
              t.type.caption,
              { color: t.colors.textMuted, padding: t.layout.screenPadding, paddingBottom: t.space.sm },
            ]}
          >
            Tap the heat number. Nothing is entered until you do — a bad read that entered itself would be a
            record nobody questions.
          </Text>
        )}
        {stage.found.map((c) => {
          const suspect = c.why.kind === 'looksLikeBook';
          return (
            <Pressable
              key={c.text}
              onPress={() => {
                onPick(c.text);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                close();
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.md,
                paddingHorizontal: t.layout.screenPadding,
                paddingVertical: t.space.lg,
                borderTopWidth: t.hairline,
                borderTopColor: t.colors.border,
                backgroundColor: pressed ? t.colors.bgSubtle : suspect ? t.colors.warnBg : 'transparent',
              })}
            >
              <Ionicons
                name={
                  c.why.kind === 'labelled'
                    ? 'pricetag-outline'
                    : c.why.kind === 'inBook'
                      ? 'shield-checkmark-outline'
                      : suspect
                        ? 'warning-outline'
                        : 'help-circle-outline'
                }
                size={20}
                color={suspect ? t.colors.warnText : c.why.kind === 'shape' ? t.colors.textMuted : t.colors.data}
              />
              <View style={{ flex: 1 }}>
                <Text style={[t.type.bodyStrong, { color: suspect ? t.colors.warnText : t.colors.text }]}>
                  {c.text}
                </Text>
                <Text style={[t.type.caption, { color: suspect ? t.colors.warnText : t.colors.textMuted }]}>
                  {whyLabel(c.why)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.colors.textFaint} />
            </Pressable>
          );
        })}
        <View style={{ padding: t.layout.screenPadding }}>
          <Pressable
            onPress={reset}
            accessibilityRole="button"
            style={{
              height: t.layout.controlHeight,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.bgRaised,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>Read another</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay }} onPress={close} />
      <View
        style={{
          backgroundColor: t.colors.bg,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          paddingBottom: insets.bottom + t.space.lg,
          maxHeight: '88%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: t.layout.screenPadding,
            paddingVertical: t.space.lg,
            borderBottomWidth: t.hairline,
            borderBottomColor: t.colors.border,
          }}
        >
          <Text style={[t.type.h3, { color: t.colors.text, flex: 1 }]}>Read a heat number</Text>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={t.colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">{body()}</ScrollView>
      </View>
    </Modal>
  );
}

function Note({ t, text }: { t: ReturnType<typeof useTheme>; text: string }) {
  return (
    <Text style={[t.type.body, { color: t.colors.textMuted, padding: t.layout.screenPadding }]}>{text}</Text>
  );
}
