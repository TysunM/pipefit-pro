import React, { useMemo, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { useOrbitalSigning } from '../../state/orbital';
import { keyPrint, makeSigner, setSigner, untrustQc, MAX_QC_NAME, type SigningBook } from '../../state/qcSigning';
import { signedCopyFor } from '../../state/orbitalShare';
import type { Program } from '../../state/orbitalBook';
import { dayKey, usDate } from '../../calc/days';
import { SheetButton } from '../PhotoReader';
import { OrbitalSheet } from './OrbitalSheet';

// The QC phone's key, the QCs a crew phone trusts, and the line that says
// a program on the phone is still exactly what its QC signed (qcSigning.ts).

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** A key as the sixteen characters read off one screen against another. */
export function KeyPrint({ k, big = false }: { k: string; big?: boolean }) {
  const t = useTheme();
  return (
    <Text selectable accessibilityLabel={`Key ${keyPrint(k).split('').join(' ')}`} style={{ fontFamily: MONO, fontSize: big ? 22 : 14, letterSpacing: big ? 2 : 1, color: t.colors.text, textAlign: big ? 'center' : 'left' }}>
      {keyPrint(k)}
    </Text>
  );
}

export type Signature = { trusted: boolean; name: string; key: string; words: string; pdf: string } | null;

/** Who signed this program, while it is still exactly what they signed, said in words for the screen and the PDF. */
export function signatureOf(p: Program | null | undefined, b: SigningBook): Signature {
  if (!p || p.id === 'new') return null;
  const s = signedCopyFor(p, b.copies);
  if (!s) return null;
  const trusted = b.qcs.some((q) => q.key === s.key) || b.signer?.key === s.key;
  const print = keyPrint(s.key);
  return {
    trusted,
    name: s.name,
    key: s.key,
    words: `${trusted ? `by your QC, ${s.name}` : `by ${s.name}, a QC this phone doesn't trust`} · key ${print}`,
    pdf: `${s.name}, QC key ${print}${trusted ? '' : " (a QC this phone doesn't trust)"}`,
  };
}

export function useSignature(p: Program | null | undefined): Signature {
  const signing = useOrbitalSigning();
  return useMemo(() => signatureOf(p, signing.value), [p, signing.value]);
}

export function SignedLine({ program }: { program: Program }) {
  const t = useTheme();
  const c = t.colors;
  const s = useSignature(program);
  if (!s) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={s.trusted ? 'shield-checkmark' : 'shield-outline'} size={16} color={s.trusted ? c.success : c.warnText} />
      <Text style={[t.type.caption, { color: s.trusted ? c.success : c.warnText, flex: 1 }]}>{`Signed ${s.words}`}</Text>
    </View>
  );
}

export function QcSigningSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const c = t.colors;
  const signing = useOrbitalSigning();
  const b = signing.value;
  const [name, setName] = useState('');
  const [why, setWhy] = useState<string | null>(null);
  // A second tap to delete the key or stop trusting a QC: neither is undone by tapping again.
  const [confirm, setConfirm] = useState<string | null>(null);

  const close = () => {
    setWhy(null);
    setConfirm(null);
    onClose();
  };
  const make = () => {
    if (!name.trim()) return setWhy('Put the name the crew knows the QC by.');
    const s = makeSigner(name, Date.now());
    if (!s) return setWhy("This phone has no secure random generator to make a key with. Update the app, then try again.");
    setWhy(null);
    signing.apply((x) => setSigner(x, s));
  };
  const twice = (id: string, act: () => void) => {
    if (confirm !== id) return setConfirm(id);
    setConfirm(null);
    act();
  };

  return (
    <OrbitalSheet visible={visible} onClose={close} title="QC signing">
      {b.signer ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
            <Ionicons name="shield-checkmark" size={20} color={c.success} />
            <Text style={[t.type.bodyStrong, { color: c.text, flex: 1 }]}>{`This is the QC phone: ${b.signer.name}`}</Text>
          </View>
          <Text style={[t.type.body, { color: c.text }]}>
            Programs shared from this phone are signed. The first time a crew phone gets one, it shows this key: check it matches before they trust it.
          </Text>
          <View style={{ backgroundColor: c.bgSunken, borderRadius: t.radius.md, padding: t.space.lg }}>
            <KeyPrint k={b.signer.key} big />
          </View>
          <SheetButton label={confirm === 'stop' ? 'Tap again to delete the key' : 'Stop signing on this phone'} icon="trash-outline" onPress={() => twice('stop', () => signing.apply((x) => setSigner(x, null)))} />
          {confirm === 'stop' ? <Text style={[t.type.caption, { color: c.danger }]}>The key can't be got back. Crew phones would have to trust a new one, checked the same way.</Text> : null}
        </>
      ) : (
        <>
          <Text style={[t.type.body, { color: c.text }]}>
            Is this the QC phone? Programs shared from it are signed. A crew phone can tell they came from you and weren't changed on the way, and won't take a qualified program that isn't signed by you.
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => setName(v.slice(0, MAX_QC_NAME))}
            placeholder="Your name, as the crew knows you: J. Ruiz, QC"
            placeholderTextColor={c.textFaint}
            accessibilityLabel="QC name"
            style={[t.type.body, { color: c.text, backgroundColor: c.bgSunken, borderRadius: t.radius.md, paddingHorizontal: t.space.md, height: t.layout.controlHeight }]}
          />
          <SheetButton label="Make this the QC phone" icon="key-outline" primary onPress={make} disabled={!name.trim()} />
          {why ? <Text style={[t.type.bodyStrong, { color: c.danger }]}>{why}</Text> : null}
        </>
      )}
      <Text style={[t.type.sectionTitle, { color: c.text, marginTop: t.space.md }]}>QCs this phone trusts</Text>
      {b.qcs.length ? (
        b.qcs.map((q) => (
          <View key={q.key} style={{ gap: 6, paddingVertical: t.space.sm, borderTopWidth: t.hairline, borderTopColor: c.border }}>
            <Text style={[t.type.bodyStrong, { color: c.text }]}>{q.name}</Text>
            <KeyPrint k={q.key} />
            <Text style={[t.type.caption, { color: c.textFaint }]}>{`Trusted ${usDate(dayKey(q.trustedAt))}`}</Text>
            <SheetButton label={confirm === q.key ? `Tap again to stop trusting ${q.name}` : `Stop trusting ${q.name}`} onPress={() => twice(q.key, () => signing.apply((x) => untrustQc(x, q.key)))} />
          </View>
        ))
      ) : (
        <Text style={[t.type.caption, { color: c.textMuted }]}>None yet. The first program signed by your QC asks whether to trust them.</Text>
      )}
      <Text style={[t.type.caption, { color: c.textFaint }]}>
        The key stays on the QC phone: it isn't in a backup or a code. If that phone is lost, make a new key on the next one. Crew phones will say the key has changed and ask to trust it again.
      </Text>
    </OrbitalSheet>
  );
}
