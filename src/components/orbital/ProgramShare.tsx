import React, { useMemo, useRef, useState } from 'react';
import { Platform, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../theme/ThemeProvider';
import { useOrbitalEquations, useOrbitalGear, useOrbitalPrograms, useOrbitalSigning } from '../../state/orbital';
import { MAX_QR_CODE, applyImport, packShare, planImport, signedCopyFor, unpackShare, type ImportPlan, type Share as ProgramCode } from '../../state/orbitalShare';
import { keepCopy, trustQc, verdict, type Signed, type Verdict } from '../../state/qcSigning';
import { KeyPrint } from './QcSigning';
import { tubeLabel, type Program } from '../../state/orbitalBook';
import { SheetButton } from '../PhotoReader';
import { QrCode } from './QrCode';
import { OrbitalSheet } from './OrbitalSheet';

// A program passed phone to phone, with no server: shown as a QR on one and
// scanned by the other, or sent as text and pasted in (state/orbitalShare.ts).

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
  const signing = useOrbitalSigning();
  const signer = signing.value.signer;
  const [note, setNote] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  // The QC phone signs. A crew phone passes on the QC's own signed code while the program is still what was signed.
  const forward = useMemo(() => (visible && !signer ? signedCopyFor(program, signing.value.copies) : null), [visible, signer, program, signing.value.copies]);
  const code = useMemo(
    () => (!visible ? '' : forward ? forward.code : packShare(program, gear.value.gear, equations.value.equations, signer)),
    [visible, forward, program, gear.value.gear, equations.value.equations, signer],
  );
  const guarded = signing.value.qcs.length > 0;
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
    <OrbitalSheet visible={visible} onClose={onClose} title={`Share ${program.name}`}>
      {fits ? <QrCode text={code} size={size} /> : <Text style={[t.type.body, { color: c.warnText }]}>Too much to read off a screen as a QR: send it as text instead.</Text>}
      <Text style={[t.type.body, { color: c.text }]}>
        {`On the other phone: Orbital welding → Programs → Receive a program, and point it at this.`}
      </Text>
      {signer ? (
        <View style={{ gap: 6 }}>
          <SignNote icon="shield-checkmark" ink={c.success} text={`Signed by you, ${signer.name}. The first time a crew phone gets a program from you it shows this key: check it matches.`} />
          <KeyPrint k={signer.key} />
        </View>
      ) : forward ? (
        <SignNote icon="shield-checkmark" ink={c.success} text={`Signed by QC ${forward.name}: passed on with their signature.`} />
      ) : (
        <SignNote
          icon="shield-outline"
          ink={c.textMuted}
          text={`Not signed.${program.status === 'qualified' && guarded ? " A phone that trusts your QC won't take a qualified program that isn't signed: share it from the QC phone." : ''}`}
        />
      )}
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
    </OrbitalSheet>
  );
}

function SignNote({ icon, ink, text }: { icon: keyof typeof Ionicons.glyphMap; ink: string; text: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={18} color={ink} style={{ marginTop: 1 }} />
      <Text style={[t.type.caption, { color: ink, flex: 1 }]}>{text}</Text>
    </View>
  );
}

type Stage =
  | { at: 'scan' }
  | { at: 'preview'; code: ProgramCode; plan: ImportPlan; signed: Signed | null; v: Verdict }
  | { at: 'done'; id: string; name: string; trusted: string | null };

export function ReceiveProgramSheet({ visible, onClose, onOpen }: { visible: boolean; onClose: () => void; onOpen: (id: string) => void }) {
  const t = useTheme();
  const c = t.colors;
  const programs = useOrbitalPrograms();
  const gear = useOrbitalGear();
  const equations = useOrbitalEquations();
  const signing = useOrbitalSigning();
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
    const v = verdict(out.signed, out.share.program.status === 'qualified', signing.value);
    setStage({ at: 'preview', code: out.share, plan: planImport(out.share, books()), signed: out.signed, v });
  };
  /** Take it in; with trust, trust the QC who signed it too. The signed code is kept to pass the program on with. */
  const take = (s: ProgramCode, signed: Signed | null, trust: boolean) => {
    const now = Date.now();
    const next = applyImport(s, books());
    programs.apply(() => next.programs);
    gear.apply(() => next.gear);
    equations.apply(() => next.equations);
    signing.apply((b) => keepCopy(trust && signed ? trustQc(b, signed.key, signed.name, now) : b, s.program.id, signed ? signed.code : null, now, next.programs.programs.map((p) => p.id)));
    setStage({ at: 'done', id: s.program.id, name: s.program.name, trusted: trust && signed ? signed.name : null });
  };
  /** Nothing to take in, but the code is signed: trust its QC, and keep the code if it is the program already here. */
  const keepSigned = (s: ProgramCode, signed: Signed | null, trust: boolean, same: boolean) => {
    if (!signed) return;
    const now = Date.now();
    signing.apply((b) => {
      const x = trust ? trustQc(b, signed.key, signed.name, now) : b;
      return same ? keepCopy(x, s.program.id, signed.code, now, programs.value.programs.map((p) => p.id)) : x;
    });
  };

  const body = () => {
    if (stage.at === 'done') {
      return (
        <>
          <Text style={[t.type.body, { color: c.text }]}>{`${stage.name} is on this phone.${stage.trusted ? ` ${stage.trusted} is trusted as your QC.` : ''}`}</Text>
          <SheetButton label="Open it" icon="open-outline" primary onPress={() => (close(), onOpen(stage.id))} />
          <SheetButton label="Receive another" onPress={() => ((handled.current = false), setStage({ at: 'scan' }))} />
        </>
      );
    }
    if (stage.at === 'preview') {
      const { code: s, plan, signed, v } = stage;
      const p = s.program;
      const asks = v.state === 'new-qc' || v.state === 'other-key';
      const sig: Record<Verdict['state'], { icon: keyof typeof Ionicons.glyphMap; ink: string; text: string }> = {
        yours: { icon: 'shield-checkmark', ink: c.success, text: 'Signed by you: this is the QC phone.' },
        trusted: { icon: 'shield-checkmark', ink: c.success, text: `Signed by your QC, ${v.name}.` },
        'new-qc': { icon: 'shield-half-outline', ink: c.warnText, text: `Signed by ${v.name}, a QC this phone doesn't trust yet. Check this key matches the one on their phone (Orbital welding → QC signing):` },
        'other-key': { icon: 'warning-outline', ink: c.danger, text: `Signed as ${v.name}, but with a different key from the ${v.name} this phone trusts. If the QC changed phones, check this key on their screen before you trust it:` },
        unsigned: { icon: 'shield-outline', ink: c.textMuted, text: 'Not signed: anyone could have made this code.' },
      };
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
          <SignNote {...sig[v.state]} />
          {asks && v.key ? (
            <View style={{ backgroundColor: c.bgSunken, borderRadius: t.radius.md, padding: t.space.md }}>
              <KeyPrint k={v.key} big />
            </View>
          ) : null}
          <Text style={[t.type.body, { color: acts ? c.text : c.textMuted }]}>{said[plan.program.state]}</Text>
          {[...plan.gear.map((g) => ({ ...g, what: 'equipment' })), ...plan.equations.map((e) => ({ ...e, what: 'equation' }))].map((x) => (
            <Text key={x.id} style={[t.type.caption, { color: c.textMuted }]}>
              {`${x.name || x.what}: ${x.state === 'new' ? `added to this phone's ${x.what === 'equipment' ? 'equipment' : 'equations'}` : 'already here, kept as it is'}`}
            </Text>
          ))}
          {v.blocked ? <Text style={[t.type.bodyStrong, { color: c.danger }]}>{v.blocked}</Text> : null}
          {acts && !v.blocked ? (
            asks ? (
              <>
                {/* A changed key is a warning: trusting it is never the one-tap way through. */}
                <SheetButton
                  label={`${v.state === 'other-key' ? 'Trust the new key' : `Trust ${v.name}`} and ${plan.program.state === 'new' ? 'add it' : `update to version ${p.version}`}`}
                  icon="shield-checkmark-outline"
                  primary={v.state === 'new-qc'}
                  onPress={() => take(s, signed, true)}
                />
                {v.state === 'other-key' ? <Text style={[t.type.caption, { color: c.textMuted }]}>{`Trusting it replaces the key this phone had for ${v.name}.`}</Text> : null}
                {!v.needsTrust ? <SheetButton label={plan.program.state === 'new' ? 'Add it without trusting' : 'Update without trusting'} onPress={() => take(s, signed, false)} /> : null}
              </>
            ) : (
              <SheetButton label={plan.program.state === 'new' ? 'Add it' : `Update to version ${p.version}`} icon="download-outline" primary onPress={() => take(s, signed, false)} />
            )
          ) : null}
          {!acts && asks ? (
            <SheetButton
              label={v.state === 'other-key' ? 'Trust the new key' : `Trust ${v.name}`}
              icon="shield-checkmark-outline"
              primary={v.state === 'new-qc'}
              onPress={() => (keepSigned(s, signed, true, plan.program.state === 'same'), close())}
            />
          ) : null}
          <SheetButton
            label={acts && !v.blocked ? 'Not now' : 'Done'}
            onPress={() => {
              // The program already here, signed by a QC this phone trusts: keep the code, to pass it on signed.
              if (!acts && plan.program.state === 'same' && (v.state === 'trusted' || v.state === 'yours')) keepSigned(s, signed, false, true);
              close();
            }}
          />
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
    <OrbitalSheet visible={visible} onClose={close} title="Receive a program">
      {body()}
    </OrbitalSheet>
  );
}
