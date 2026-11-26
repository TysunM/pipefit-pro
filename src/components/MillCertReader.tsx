import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { API_BASE } from '../ai/apiBase';
import { askMillCert, canKeep, certRows, certStatusWords, keepCert, millMissWords, toggleCert, type MillRead } from '../ai/millCert';
import { pct } from '../calc/sulphur';
import { useHeats } from '../state/heats';
import { say } from '../audio/say';
import { PhotoReader, SheetButton, type ReviewControls } from './PhotoReader';

// A mill cert photographed and read for each heat's sulphur (ai/millCert.ts),
// then set against the heat book: what saving each would do, ticked or not.
// Nothing is written until Save, and only what is ticked.

export function MillCertReader({ visible, onClose, want = [], listen = false }: { visible: boolean; onClose: () => void; want?: readonly string[]; listen?: boolean }) {
  return (
    <PhotoReader<MillRead>
      visible={visible}
      onClose={onClose}
      listen={listen}
      title="Read a mill cert"
      shootLabel="Read the cert"
      frame={`The heat numbers and the chemistry table, flat and square, filling the frame.${want.length ? ` Looking for ${want.join(', ')}.` : ''} A long cert goes in halves.`}
      readingNote="Reading it. A full cert takes up to a minute."
      read={async (b64) => {
        const r = await askMillCert(API_BASE, b64);
        return typeof r === 'string' ? { miss: millMissWords(r) } : r;
      }}
      review={(read, _uri, controls) => <CertReview read={read} want={want} controls={controls} />}
    />
  );
}

function CertReview({ read, want, controls }: { read: MillRead; want: readonly string[]; controls: ReviewControls }) {
  const t = useTheme();
  const c = t.colors;
  const heats = useHeats();
  const [rows, setRows] = useState(() => certRows(read, heats.book));
  const [saved, setSaved] = useState<{ added: number; updated: number } | null>(null);
  const picked = rows.filter((r) => r.pick).length;

  const save = () => {
    if (!rows.some((r) => r.pick)) return;
    const out = keepCert(heats.book, read, rows, Date.now());
    heats.apply(() => out.book);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved({ added: out.added, updated: out.updated });
    if (controls.listen) say(`${out.added + out.updated} heat${out.added + out.updated === 1 ? '' : 's'} kept.`);
  };
  // "Save" said keeps what is ticked now, not what was ticked when the review opened.
  const latest = useRef(save);
  latest.current = save;
  useEffect(() => {
    controls.onSave(saved ? null : () => latest.current());
    if (controls.listen && !saved) say(`${rows.length} heat${rows.length === 1 ? '' : 's'} read, ${picked} ticked. Check them against the cert.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const note = (text: string, warn = false) => <Text style={[t.type.body, { color: warn ? c.warnText : c.textMuted }]}>{text}</Text>;
  if (saved) {
    return (
      <>
        {note(`${[saved.added && `${saved.added} heat${saved.added === 1 ? '' : 's'} added`, saved.updated && `${saved.updated} updated`].filter(Boolean).join(', ')} in the heat book, with their sulphur. Every weld on them is checked from now on.`)}
        <SheetButton label="Read another cert" icon="camera-outline" onPress={controls.retake} />
        <SheetButton label="Done" onPress={controls.close} primary />
      </>
    );
  }
  const from = [read.mill, read.certNo && `cert ${read.certNo}`].filter(Boolean).join(', ');
  const norm = (s: string) => s.replace(/[\s-]/g, '').toUpperCase();
  const wanted = want.filter((w) => !rows.some((r) => norm(r.heat) === norm(w)));
  return (
    <>
      {rows.length ? (
        <Text style={[t.type.caption, { color: c.textMuted }]}>
          {`${from ? `Read off ${from}. ` : ''}Check each heat number and its sulphur against the cert in your hand. Ticked ones go into the heat book; tap to tick or untick.`}
        </Text>
      ) : null}
      {wanted.length ? note(`Not on this cert: ${wanted.join(', ')}.`, true) : null}
      {read.unread ? <Text style={[t.type.caption, { color: c.warnText }]}>{read.unread}</Text> : null}
      {!rows.length ? note('No heat on that picture could be read. Closer, flatter and square to the page reads better.', true) : null}
      <View>
        {rows.map((r) => {
          const s = certStatusWords(r);
          const ok = canKeep(r);
          return (
            <Pressable
              key={r.id}
              disabled={!ok}
              onPress={() => {
                void Haptics.selectionAsync();
                setRows((rs) => toggleCert(rs, r.id));
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
      <SheetButton label={picked ? `Save ${picked} to the heat book` : 'Tick what to save'} icon="bookmark-outline" onPress={save} primary disabled={!picked} />
      <SheetButton label="Take it again" icon="camera-outline" onPress={controls.retake} />
    </>
  );
}
