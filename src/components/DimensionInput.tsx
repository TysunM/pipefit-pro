import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { Well } from './metal';
import { GloveKeypad } from './GloveKeypad';
import { freshReading, useLaser } from '../state/laser';
import { useUnits } from '../hooks/useUnits';
import { M_TO_IN } from '../calc/spatial';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceMaybe } from '../voice/VoiceProvider';
import { listenOnce } from '../voice/listen';
import { spokenValue } from '../voice/intent';
import { figureText } from '../voice/figures';

export function DimensionInput({
  label,
  value,
  onChangeText,
  suffix,
  placeholder,
  editable = true,
  readout,
  style,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText?: (next: string) => void;
  suffix?: string;
  placeholder?: string;
  editable?: boolean;
  readout?: string;
  style?: ViewStyle;
  keyboardType?: 'decimal-pad' | 'numbers-and-punctuation' | 'default';
  /**
   * For the fields that are not numbers. A heat number is stamped in capitals
   * and compared character by character, so it is shown the way it is read.
   */
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}) {
  const t = useTheme();
  const { settings } = useSettings();
  const [focused, setFocused] = useState(false);
  const kb =
    keyboardType ??
    (Platform.select({ ios: 'numbers-and-punctuation', default: 'decimal-pad' }) as 'decimal-pad');
  // Glove mode: a numeric field opens the big keypad instead of the phone's
  // keyboard. An imperial length gets feet and fraction keys; an angle or a
  // count, digits and a point. Text fields (a heat number) keep the keyboard.
  const glove = settings.gloveMode && kb !== 'default' && editable && !!onChangeText;
  const tape = settings.unitSystem === 'imperial' && suffix === '"';
  const [keypad, setKeypad] = useState(false);
  const lit = focused || keypad;
  // A length field takes the laser meter's last reading with one tap, while one is connected.
  const u = useUnits();
  const reading = freshReading(useLaser());
  const laser = reading && editable && onChangeText && suffix === u.suffix ? reading.metres * M_TO_IN : null;
  // Say it instead: a mic by the label, for any number field, for gloves.
  const voice = useVoiceMaybe();
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const canSay = !!voice?.enabled && editable && !!onChangeText && kb !== 'default' && !voice.handsFree;
  const say = () => {
    if (listening) return;
    setListening(true);
    setNote('Listening…');
    void listenOnce((partial) => setNote(`“${partial}”`)).then((h) => {
      setListening(false);
      const kind = suffix === '°' ? 'angle' : suffix === u.suffix ? 'length' : 'count';
      const f = 'text' in h ? spokenValue(h.text, kind) : null;
      if (f) {
        onChangeText?.(figureText(f, u.num));
        return setNote(null);
      }
      if (!('text' in h) && h.error === 'aborted') return setNote(null);
      setNote('text' in h ? `No number in “${h.text}”` : 'Nothing heard. Tap the mic and say the figure.');
      setTimeout(() => setNote(null), 3000);
    });
  };
  return (
    <View style={[{ flex: 1, minWidth: 96 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: t.space.sm, gap: 4 }}>
        <Text style={[t.type.label, { color: t.colors.textMuted, flexShrink: 1 }]} numberOfLines={1}>
          {label}
        </Text>
        {canSay ? (
          <Pressable
            onPress={say}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Say the ${label}`}
            style={{ marginLeft: 'auto', paddingHorizontal: 2 }}
          >
            <Ionicons name={listening ? 'mic' : 'mic-outline'} size={18} color={listening ? t.colors.danger : t.colors.textFaint} />
          </Pressable>
        ) : null}
      </View>
      {/* A field you type into is a recess in the plate; one the app works
          out for you is flat, so the two are told apart before either is read. */}
      <Well
        style={[
          styles.box,
          {
            height: t.layout.fieldHeight,
            borderColor: lit ? t.colors.data : t.colors.wellEdge,
            borderWidth: lit ? 2 : 1,
            paddingHorizontal: lit ? t.space.md - 1 : t.space.md,
            opacity: editable ? 1 : 0.7,
          },
        ]}
      >
        {glove ? (
          <Pressable
            onPress={() => setKeypad(true)}
            accessibilityRole="button"
            accessibilityLabel={`${label}${value ? `, ${value}` : ''}. Opens the keypad.`}
            style={{ flex: 1, alignSelf: 'stretch', justifyContent: 'center' }}
          >
            <Text style={[t.type.fieldValue, { color: value ? t.colors.text : t.colors.textFaint }]} numberOfLines={1}>
              {value || placeholder || ''}
            </Text>
          </Pressable>
        ) : (
        <TextInput
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textFaint}
          keyboardType={kb}
          autoCapitalize={autoCapitalize}
          inputMode={kb === 'decimal-pad' ? 'decimal' : 'text'}
          selectTextOnFocus
          style={[t.type.fieldValue, { color: t.colors.text, flex: 1, padding: 0 }, WEB_INPUT_RESET]}
        />
        )}
        {suffix ? <Text style={[t.type.body, { color: t.colors.textMuted }]}>{suffix}</Text> : null}
      </Well>
      {glove ? (
        <GloveKeypad
          visible={keypad}
          label={label}
          tape={tape}
          unit={suffix}
          current={value}
          onClose={() => setKeypad(false)}
          onDone={(next) => {
            setKeypad(false);
            if (next) onChangeText?.(next);
          }}
        />
      ) : null}
      {laser !== null ? (
        <Pressable
          onPress={() => onChangeText?.(u.num(laser))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Use the laser reading, ${u.num(laser)} ${u.unitName}, for ${label}`}
          style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: t.colors.dataSoft }}
        >
          <Text style={[t.type.captionStrong, { color: t.colors.data }]} numberOfLines={1}>
            {`⤓ Laser ${u.frac(laser) || `${u.num(laser)}${u.suffix}`}`}
          </Text>
        </Pressable>
      ) : null}
      {note ? (
        <Text style={[t.type.caption, { color: listening ? t.colors.data : t.colors.warnText, marginTop: 6 }]} numberOfLines={2}>
          {note}
        </Text>
      ) : null}
      {readout ? (
        <Text style={[t.type.caption, { color: t.colors.data, marginTop: 6 }]} numberOfLines={1}>
          {readout}
        </Text>
      ) : null}
    </View>
  );
}

export function DerivedField({ label, value, style }: { label: string; value: string; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[{ flex: 1, minWidth: 96 }, style]}>
      <Text style={[t.type.label, { color: t.colors.textMuted, marginBottom: t.space.sm }]} numberOfLines={1}>
        {label}
      </Text>
      <View
        style={[
          styles.box,
          {
            height: t.layout.fieldHeight,
            borderRadius: t.radius.md,
            borderColor: 'transparent',
            backgroundColor: t.colors.bgSubtle,
            paddingHorizontal: t.space.md,
          },
        ]}
      >
        <Text style={[t.type.fieldValue, { color: t.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.space.md,
        paddingHorizontal: t.layout.screenPadding,
        marginBottom: t.space.lg,
      }}
    >
      {children}
    </View>
  );
}

const WEB_INPUT_RESET = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as TextStyle | null;

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
});
