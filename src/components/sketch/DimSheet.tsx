import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useUnits } from '../../hooks/useUnits';
import { AccentButton, GhostButton } from '../Buttons';
import { DimensionInput, FieldRow } from '../DimensionInput';
import { MAX_DIM } from '../../state/sketchStore';

export type DimAsk = { key: string; n: number; current: number | undefined };

/** One piece's centre to centre, asked for over the paper. */
export function DimSheet({
  ask,
  dimText,
  readLength,
  onCancel,
  onSave,
}: {
  ask: DimAsk | null;
  dimText: (inches: number) => string;
  readLength: (raw: string) => number;
  onCancel: () => void;
  /** The new figure, or null to take it off. */
  onSave: (inches: number | null) => void;
}) {
  const t = useTheme();
  const u = useUnits();
  const [text, setText] = useState('');
  useEffect(() => {
    if (ask) setText('');
  }, [ask]);
  const value = readLength(text);
  const ok = Number.isFinite(value) && value > 0 && value <= MAX_DIM;

  return (
    <Modal visible={ask !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onCancel}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ margin: t.space.xl, paddingVertical: t.space.xl, borderRadius: t.radius.xl, backgroundColor: t.colors.bg, gap: t.space.md }}>
          <Text style={[t.type.sectionTitle, { color: t.colors.text, paddingHorizontal: t.space.xl }]}>
            {ask ? `Piece ${ask.n}${ask.current ? ` · now ${dimText(ask.current)}` : ''}` : ''}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.space.xl }]}>
            Centre to centre, fitting to fitting, as written on the iso. An open end is measured to the end of the pipe.
          </Text>
          <FieldRow>
            <DimensionInput label="Centre to centre" value={text} onChangeText={setText} suffix={u.suffix} placeholder={ask?.current ? u.num(ask.current) : '0'} readout={ok ? dimText(value) : ''} />
          </FieldRow>
          <View style={{ flexDirection: 'row', gap: t.space.md, paddingHorizontal: t.space.xl }}>
            {ask?.current ? <GhostButton label="Remove" icon="trash-outline" onPress={() => onSave(null)} style={{ flex: 1 }} /> : <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />}
            <AccentButton label={ok ? `Save ${dimText(value)}` : 'Save'} icon="checkmark" style={{ flex: 1 }} onPress={() => ok && onSave(value)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
