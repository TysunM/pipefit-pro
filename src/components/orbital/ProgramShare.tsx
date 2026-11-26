import React, { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../theme/ThemeProvider';
import { useOrbitalEquations, useOrbitalGear, useOrbitalPrograms } from '../../state/orbital';
import { MAX_QR_CODE, applyImport, packShare, planImport, unpackShare, type ImportPlan, type Share as ProgramCode } from '../../state/orbitalShare';
import { tubeLabel, type Program } from '../../state/orbitalBook';
import { SheetButton } from '../PhotoReader';
import { VoicePressable } from '../../voice/VoicePressable';
import { QrCode } from './QrCode';

// A program passed phone to phone, with no server: shown as a QR on one and
// scanned by the other, or sent as text and pasted in (state/orbitalShare.ts).

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useTheme();
  const c = t.colors;
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />
      <View style={{ backgroundColor: c.bg, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl, paddingBottom: insets.bottom + t.space.lg, maxHeight: '94%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.lg, borderBottomWidth: t.hairline, borderBottomColor: c.border }}>
          <Text style={[t.type.sectionTitle, { color: c.text, flex: 1 }]} numberOfLines={1}>
            {title}
          </Text>
          <VoicePressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <Ionicons name="close" size={24} color={c.textMuted} />
          </VoicePressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: t.layout.screenPadding, gap: t.space.lg }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Text out of the app: the phone's share sheet, or on the web the browser's, else the clipboard. */
async function sendText(message: string): Promise<'sent' | 'copied' | 'failed'> {
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message });
      return 'sent';
    } catch {
      return 'failed';
    }
  }
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  try {
    if (nav?.share) {
      await nav.share({ text: message });
      return 'sent';
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return 'sent';
  }
  try {
    await nav?.clipboard?.writeText(message);
    return nav?.clipboard ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}

export function ShareProgramSheet({ visible, onClose, program }: { visible: boolean; onClose: () => void; program: Program }) {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const gear = useOrbitalGear();
  const equations = useOrbitalEquations();
  const [note, setNote] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const code = useMemo(() => (visible ? packShare(program, gear.value.gear, equations.value.equations) : ''), [visible, program, gear.value.gear, equations.value.equations]);
  const carried = useMemo(() => (code ? unpackShare(code) : null), [code]);
  const fits = code.length <= MAX_QR_CODE;
  const size = Math.min(width - 2 * t.layout.screenPadding, 380);
  const message = `PipeFit Pro orbital program ${program.name}, version ${program.version}. On your phone: Orbital welding → Programs → Receive a program, and paste this in:\n${code}`;

  const send = async () => {
    setNote(null);
    const out = await sendText(message);
    if (out === 'copied') setNote('Copied: paste it into a message to the crew.');
    if (out === 'failed') {
      setShowCode(true);
      setNote('Copy the code below into a message.');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Share ${program.name}`}>
      {fits ? <QrCode text={code} size={size} /> : <Text style={[t.type.body, { color: c.warnText }]}>Too much to read off a screen as a QR: send it as text instead.</Text>}
      <Text style={[t.type.body, { color: c.text }]}>
        {`On the other phone: Orbital welding → Programs → Receive a program, and point it at this.`}
      </Text>
      {carried?.ok ? (
        <Text style={[t.type.caption, { color: c.textMuted }]}>
          {[
            tubeLabel(program),
            `version ${program.version}`,
            program.status === 'qualified' ? `qualified to ${program.wps}` : 'in development',
            ...carried.share.gear.map((g) => [g.make, g.model].filter(Boolean).join(' ')),
            carried.share.equations.length ? `${carried.share.equations.length} equation${carried.share.equations.length === 1 ? '' : 's'} of the crew's own` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      <SheetButton label="Send as text" icon="chatbubble-ellipses-outline" onPress={() => void send()} />
      {note ? <Text style={[t.type.caption, { color: c.textMuted }]}>{note}</Text> : null}
      {showCode ? (
        <TextInput value={code} editable={false} multiline selectTextOnFocus accessibilityLabel="Program code" style={[t.type.caption, { color: c.text, backgroundColor: c.bgSunken, borderRadius: t.radius.md, padding: t.space.md, minHeight: 120 }]} />
      ) : null}
    </Sheet>
  );
}

type Stage = { at: 'scan' } | { at: 'preview'; code: ProgramCode; plan: ImportPlan } | { at: 'done'; id: string; name: string };

export function ReceiveProgramSheet({ visible, onClose, onOpen }: { visible: boolean; onClose: () => void; onOpen: (id: string) => void }) {
  const t = useTheme();
  const c = t.colors;
  const programs = useOrbitalPrograms();
  const gear = useOrbitalGear();
  const equations = useOrbitalEquations();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>({ at: 'scan' });
  const [pasted, setPasted] = useState('');
  const [why, setWhy] = useState<string | null>(null);
  const handled = useRef(false);
  const books = () => ({ programs: programs.value, gear: gear.value, equations: equations.value });

  const close = () => {
    setStage({ at: 'scan' });
    setPasted('');
    setWhy(null);
    handled.current = false;
    onClose();
  };
  const read = (text: string) => {
    const out = unpackShare(text);
    if (!out.ok) {
      setWhy(out.why);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Let the camera try again in a moment, rather than at once on the same bad frame.
      setTimeout(() => (handled.current = false), 1500);
      return;
    }
    setWhy(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStage({ at: 'preview', code: out.share, plan: planImport(out.share, books()) });
  };
  const take = (s: ProgramCode) => {
    const next = applyImport(s, books());
    programs.apply(() => next.programs);
    gear.apply(() => next.gear);
    equations.apply(() => next.equations);
    setStage({ at: 'done', id: s.program.id, name: s.program.name });
  };

  const body = () => {
    if (stage.at === 'done') {
      return (
        <>
          <Text style={[t.type.body, { color: c.text }]}>{`${stage.name} is on this phone.`}</Text>
          <SheetButton label="Open it" icon="open-outline" primary onPress={() => (close(), onOpen(stage.id))} />
          <SheetButton label="Receive another" onPress={() => ((handled.current = false), setStage({ at: 'scan' }))} />
        </>
      );
    }
    if (stage.at === 'preview') {
      const { code: s, plan } = stage;
      const p = s.program;
      const said: Record<ImportPlan['program']['state'], string> = {
        new: 'New to this phone.',
        update: `Updates version ${plan.program.have} on this phone to version ${p.version}. Version ${plan.program.have} is kept in its history.`,
        same: 'This phone has it already, the same.',
        older:
          plan.program.have === p.version
            ? `This phone's version ${p.version} was changed after the one in this code: nothing to take.`
            : `This phone has version ${plan.program.have}, newer than this code's version ${p.version}: nothing to take.`,
      };
      const acts = plan.program.state === 'new' || plan.program.state === 'update';
      return (
        <>
          <View style={{ gap: 4 }}>
            <Text style={[t.type.bodyStrong, { color: c.text }]}>{p.name}</Text>
            <Text style={[t.type.caption, { color: c.textMuted }]}>
              {[tubeLabel(p), `version ${p.version}`, p.status === 'qualified' ? `qualified to ${p.wps}` : 'in development', `${p.levels.length} levels`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text style={[t.type.body, { color: acts ? c.text : c.textMuted }]}>{said[plan.program.state]}</Text>
          {[...plan.gear.map((g) => ({ ...g, what: 'equipment' })), ...plan.equations.map((e) => ({ ...e, what: 'equation' }))].map((x) => (
            <Text key={x.id} style={[t.type.caption, { color: c.textMuted }]}>
              {`${x.name || x.what}: ${x.state === 'new' ? `added to this phone's ${x.what === 'equipment' ? 'equipment' : 'equations'}` : 'already here, kept as it is'}`}
            </Text>
          ))}
          {acts ? <SheetButton label={plan.program.state === 'new' ? 'Add it' : `Update to version ${p.version}`} icon="download-outline" primary onPress={() => take(s)} /> : null}
          <SheetButton label={acts ? 'Not now' : 'Done'} onPress={close} />
        </>
      );
    }
    return (
      <>
        {permission?.granted ? (
          <View style={{ height: 300, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={(r) => {
                if (handled.current || !r?.data) return;
                handled.current = true;
                read(r.data);
              }}
            />
          </View>
        ) : (
          <SheetButton label="Allow the camera to scan" icon="camera-outline" onPress={() => void requestPermission()} />
        )}
        <Text style={[t.type.caption, { color: c.textFaint }]}>Point it at the QR on the other phone. Or paste a code sent as text:</Text>
        <TextInput
          value={pasted}
          onChangeText={setPasted}
          multiline
          placeholder="PFP1:…"
          placeholderTextColor={c.textFaint}
          accessibilityLabel="Paste the program code"
          autoCapitalize="none"
          autoCorrect={false}
          style={[t.type.caption, { color: c.text, backgroundColor: c.bgSunken, borderRadius: t.radius.md, padding: t.space.md, minHeight: 90, textAlignVertical: 'top' }]}
        />
        <SheetButton label="Read the code" icon="document-text-outline" onPress={() => read(pasted)} disabled={!pasted.trim()} />
        {why ? <Text style={[t.type.bodyStrong, { color: c.danger }]}>{why}</Text> : null}
      </>
    );
  };

  return (
    <Sheet visible={visible} onClose={close} title="Receive a program">
      {body()}
    </Sheet>
  );
}
