// A page of rules, read off paper
// -------------------------------
// The posted site rules, the orientation handout, the page of the safety
// manual: photographed and read by the phone's own text recognition, so a
// foreman with a printed sheet and no file still has the module in the app
// in a minute. The text comes back for checking before it is kept; OCR on a
// photocopy is good, not perfect.
import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { AccentButton, GhostButton } from './Buttons';

type Ocr = { recognizeText: (uri: string) => Promise<{ text: string }> };
let ocr: Ocr | null = null;
let ocrTried = false;
async function loadOcr(): Promise<Ocr | null> {
  if (ocrTried) return ocr;
  ocrTried = true;
  try {
    // Required, not imported, so a build without the native side still runs.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-mlkit-ocr') as Ocr;
    ocr = typeof mod?.recognizeText === 'function' ? mod : null;
  } catch {
    ocr = null;
  }
  return ocr;
}

type Stage = { at: 'camera' } | { at: 'reading' } | { at: 'read'; text: string } | { at: 'failed'; why: string };

export function PageScanSheet({ visible, onClose, onText }: { visible: boolean; onClose: () => void; onText: (text: string) => void }) {
  const t = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>({ at: 'camera' });
  const cam = useRef<CameraView | null>(null);
  const close = () => {
    setStage({ at: 'camera' });
    onClose();
  };

  const shoot = async () => {
    const c = cam.current;
    if (!c) return;
    try {
      const shot = await c.takePictureAsync({ quality: 0.9, skipProcessing: true });
      if (!shot?.uri) return setStage({ at: 'failed', why: 'The camera returned no picture. Try again.' });
      setStage({ at: 'reading' });
      const engine = await loadOcr();
      if (!engine) return setStage({ at: 'failed', why: 'Text recognition is not in this build. Paste or type the rules instead.' });
      const text = (await engine.recognizeText(shot.uri))?.text?.trim() ?? '';
      setStage(text ? { at: 'read', text } : { at: 'failed', why: 'No words were read off that page. Closer, squarer and better lit reads better.' });
    } catch (e) {
      setStage({ at: 'failed', why: e instanceof Error && e.message ? e.message : 'The page could not be read.' });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: t.space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, gap: t.space.md }}>
          <Text style={[t.type.sectionTitle, { color: t.colors.text, flex: 1 }]}>Read a page of rules</Text>
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={t.colors.text} />
          </Pressable>
        </View>
        {!permission?.granted ? (
          <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
            <Text style={[t.type.body, { color: t.colors.textMuted }]}>The camera reads the printed page. Nothing is sent anywhere: the reading is done on the phone.</Text>
            <AccentButton label="Allow the camera" icon="camera-outline" onPress={() => void requestPermission()} />
          </View>
        ) : stage.at === 'camera' || stage.at === 'reading' ? (
          <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
            <View style={{ height: 420, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
              <CameraView ref={cam} style={{ flex: 1 }} facing="back" />
            </View>
            <Text style={[t.type.caption, { color: t.colors.textFaint }]}>Fill the frame with the page, square on, in good light. One page at a time; the next page is added after.</Text>
            <AccentButton label={stage.at === 'reading' ? 'Reading…' : 'Read it'} icon="scan-outline" onPress={() => stage.at === 'camera' && void shoot()} />
          </View>
        ) : stage.at === 'failed' ? (
          <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
            <Text style={[t.type.body, { color: t.colors.danger }]}>{stage.why}</Text>
            <GhostButton label="Try again" icon="refresh-outline" onPress={() => setStage({ at: 'camera' })} />
          </View>
        ) : (
          <View style={{ flex: 1, padding: t.layout.screenPadding, gap: t.space.md }}>
            <Text style={[t.type.caption, { color: t.colors.textMuted }]}>What the phone read. Check it against the page after it is added; a word it got wrong can be fixed in the text.</Text>
            <ScrollView style={{ flex: 1, borderRadius: t.radius.md, backgroundColor: t.colors.bgSubtle }} contentContainerStyle={{ padding: t.space.md }}>
              <Text style={[t.type.body, { color: t.colors.text }]}>{stage.text}</Text>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: t.space.md }}>
              <GhostButton label="Read again" icon="refresh-outline" style={{ flex: 1 }} onPress={() => setStage({ at: 'camera' })} />
              <AccentButton
                label="Add this page"
                icon="add"
                style={{ flex: 1 }}
                onPress={() => {
                  onText(stage.text);
                  setStage({ at: 'camera' });
                }}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
