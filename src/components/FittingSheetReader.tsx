// Photographing a maker's sheet into the fitting library
// ------------------------------------------------------
// One photo of a dimension sheet or a box label, read by Claude, laid out to
// be checked against the paper and saved. What is doubtful arrives unticked
// and says why; nothing is saved until Save is tapped. The rules are in
// ai/fittingSheet.ts, where they are tested.
//
// The picture is taken at a size Claude reads in full (no more than 2576 px
// on the long side) so small print survives and the upload stays small.
import React, { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { API_BASE } from '../ai/apiBase';
import {
  ReviewRow,
  SheetFamily,
  SheetRead,
  askFittingSheet,
  bestPictureSize,
  canSave,
  reviewRows,
  scheduleMatches,
  sheetMissWords,
  toggleRow,
} from '../ai/fittingSheet';
import { sizeLabel } from '../calc/materials';
import { useFittings } from '../state/fittings';
import { setTakeout } from '../state/fittingLibrary';

type Stage =
  | { at: 'camera' }
  | { at: 'reading'; uri: string }
  | { at: 'review'; uri: string; read: SheetRead; rows: ReviewRow[] }
  | { at: 'saved'; count: number }
  | { at: 'failed'; why: string };

export function FittingSheetReader({
  visible,
  onClose,
  family,
  line,
  lineName,
  wall,
  sizes,
}: {
  visible: boolean;
  onClose: () => void;
  family: SheetFamily;
  /** The library line the figures are saved to: "pvc:40". */
  line: string;
  /** How the line is named on screen: "PVC Sch 40". */
  lineName: string;
  wall: string;
  /** The sizes the line comes in. */
  sizes: readonly number[];
}) {
  const t = useTheme();
  const u = useUnits();
  const insets = useSafeAreaInsets();
  const fittings = useFittings();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>({ at: 'camera' });
  const [torch, setTorch] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const cam = useRef<CameraView | null>(null);
  const len = (v: number) => u.frac(v) || u.full(v);

  const close = () => {
    setStage({ at: 'camera' });
    setTorch(false);
    onClose();
  };

  const ready = async () => {
    try {
      const all = await cam.current?.getAvailablePictureSizesAsync();
      setPictureSize(bestPictureSize(all ?? []));
    } catch {
      setPictureSize(undefined);
    }
  };

  const shoot = async () => {
    const c = cam.current;
    if (!c) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Sized: good JPEG. Full sensor (no size could be set): squeezed harder to stay under the cap.
      const shot = await c.takePictureAsync({ base64: true, quality: pictureSize ? 0.7 : 0.45 });
      const b64 = shot?.base64 ?? (shot?.uri?.startsWith('data:') ? shot.uri : '');
      if (!shot?.uri || !b64) {
        setStage({ at: 'failed', why: 'The camera returned no picture. Try again.' });
        return;
      }
      setStage({ at: 'reading', uri: shot.uri });
      const read = await askFittingSheet(API_BASE, b64, family);
      if (typeof read === 'string') {
        setStage({ at: 'failed', why: sheetMissWords(read) });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      const rows = reviewRows(read, { line, sizes, library: fittings.library, wall });
      setStage({ at: 'review', uri: shot.uri, read, rows });
      void Haptics.notificationAsync(rows.some((r) => r.pick) ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      setStage({ at: 'failed', why: `The picture did not go: ${e instanceof Error ? e.message : 'unknown error'}. Try again.` });
    }
  };

  const save = (rows: ReviewRow[]) => {
    const keep = rows.filter((r) => r.pick && canSave(r));
    if (!keep.length) return;
    const now = Date.now();
    fittings.apply((l) => keep.reduce((acc, r) => setTakeout(acc, line, r.fitting, r.nps, r.takeout, now), l));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStage({ at: 'saved', count: keep.length });
  };

  const button = (label: string, onPress: () => void, opts: { icon?: keyof typeof Ionicons.glyphMap; primary?: boolean; disabled?: boolean } = {}) => (
    <Pressable
      onPress={onPress}
      disabled={opts.disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!opts.disabled }}
      style={{
        height: t.layout.controlHeight,
        borderRadius: t.radius.md,
        backgroundColor: opts.primary ? t.colors.primary : t.colors.bgRaised,
        borderWidth: opts.primary ? 0 : 1,
        borderColor: t.colors.border,
        opacity: opts.disabled ? 0.45 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: t.space.sm,
      }}
    >
      {opts.icon ? <Ionicons name={opts.icon} size={20} color={opts.primary ? t.colors.onPrimary : t.colors.text} /> : null}
      <Text style={[t.type.bodyStrong, { color: opts.primary ? t.colors.onPrimary : t.colors.text }]}>{label}</Text>
    </Pressable>
  );

  const note = (text: string, warn = false) => (
    <Text style={[t.type.body, { color: warn ? t.colors.warnText : t.colors.textMuted }]}>{text}</Text>
  );

  const statusWords = (r: ReviewRow): { text: string; warn: boolean } | null => {
    switch (r.status) {
      case 'new':
        return null;
      case 'same':
        return { text: 'Already saved, the same', warn: false };
      case 'changes':
        return { text: `Replaces ${r.saved !== undefined ? len(r.saved) : 'the saved figure'}`, warn: true };
      case 'conflict':
        return { text: 'Two figures on the sheet for this one — tick the right one', warn: true };
      case 'implausible':
        return { text: `Too long for ${sizeLabel(r.nps)} — check the unit and the figure`, warn: true };
      case 'no-size':
        return { text: `${lineName} does not come in ${sizeLabel(r.nps)}`, warn: true };
      case 'no-figure':
        return { text: 'No takeout read for this one', warn: true };
    }
  };

  const body = () => {
    if (!permission) return note('Checking whether the camera is available…');
    if (!permission.granted) {
      return (
        <>
          {note(`The photo goes to Claude through the app's server, is read, and is not kept. Nothing is saved until you check it and tap Save.`)}
          {button('Allow the camera', () => void requestPermission(), { primary: true })}
        </>
      );
    }

    if (stage.at === 'camera') {
      return (
        <>
          <View style={{ height: 340, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
            <CameraView ref={cam} style={{ flex: 1 }} facing="back" enableTorch={torch} pictureSize={pictureSize} onCameraReady={() => void ready()} />
            <Pressable
              onPress={() => setTorch((on) => !on)}
              accessibilityRole="switch"
              accessibilityState={{ checked: torch }}
              accessibilityLabel={torch ? 'Light on. Turn it off' : 'Turn the light on'}
              hitSlop={8}
              style={{
                position: 'absolute',
                top: t.space.md,
                right: t.space.md,
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: torch ? t.colors.accent : 'rgba(0,0,0,0.55)',
              }}
            >
              <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color={torch ? t.colors.onPrimary : '#fff'} />
            </Pressable>
          </View>
          <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
            {`The dimension table for ${lineName} ${family === 'socket' ? 'socket' : 'no-hub'} fittings, flat and square, filling the frame. One table per photo; a long sheet goes in halves.`}
          </Text>
          {button('Read the sheet', () => void shoot(), { icon: 'scan-outline', primary: true })}
        </>
      );
    }

    if (stage.at === 'reading') {
      return (
        <>
          <Image source={{ uri: stage.uri }} style={{ height: 220, borderRadius: t.radius.lg }} resizeMode="contain" />
          {note('Claude is reading the sheet. A full page takes up to a minute.')}
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
          {note(`${stage.count} takeout${stage.count === 1 ? '' : 's'} saved to the ${lineName} library. Cut Length uses them from now on; Change on any of them puts it right.`)}
          {button('Read another sheet', () => setStage({ at: 'camera' }), { icon: 'camera-outline' })}
          {button('Done', close, { primary: true })}
        </>
      );
    }

    const { read, rows } = stage;
    const picked = rows.filter((r) => r.pick).length;
    const from = [read.maker, read.material, read.schedule && `(${read.schedule})`].filter(Boolean).join(' ');
    const wrongSchedule = !scheduleMatches(read.schedule, wall);
    return (
      <>
        <Image source={{ uri: stage.uri }} style={{ height: 140, borderRadius: t.radius.lg }} resizeMode="contain" />
        {rows.length ? (
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            {`${from ? `Read off ${from}. ` : ''}Check each against the sheet in your hand. Ticked ones are saved to ${lineName}; tap to tick or untick.`}
          </Text>
        ) : null}
        {wrongSchedule ? note(`This sheet says ${read.schedule}; the job is ${lineName}. Nothing is ticked: a figure for another schedule cuts every length wrong.`, true) : null}
        {read.unit === 'mm' ? note('The sheet is in millimetres; shown converted.', false) : null}
        {read.unread ? <Text style={[t.type.caption, { color: t.colors.warnText }]}>{read.unread}</Text> : null}
        {!rows.length ? note('Nothing on that picture could be read as a takeout. Closer, flatter and square to the page reads better.', true) : null}
        <View>
          {rows.map((r) => {
            const s = statusWords(r);
            const ok = canSave(r);
            return (
              <Pressable
                key={r.id}
                disabled={!ok}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setStage({ ...stage, rows: toggleRow(stage.rows, r.id) });
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: r.pick, disabled: !ok }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.space.md,
                  paddingVertical: t.space.md,
                  borderTopWidth: t.hairline,
                  borderTopColor: t.colors.border,
                  opacity: ok ? 1 : 0.55,
                  backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
                })}
              >
                <Ionicons
                  name={r.pick ? 'checkbox' : ok ? 'square-outline' : 'remove-circle-outline'}
                  size={24}
                  color={r.pick ? t.colors.accent : t.colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`${sizeLabel(r.nps)} ${r.fittingLabel}`}</Text>
                  <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{r.from ? `From “${r.from}” on the sheet` : 'From the sheet'}</Text>
                  {s ? <Text style={[t.type.caption, { color: s.warn ? t.colors.warnText : t.colors.textMuted }]}>{s.text}</Text> : null}
                </View>
                <Text style={[t.type.bodyStrong, { color: t.colors.data }]}>{Number.isFinite(r.takeout) ? len(r.takeout) : '—'}</Text>
              </Pressable>
            );
          })}
        </View>
        {button(picked ? `Save ${picked} to the library` : 'Tick what to save', () => save(stage.rows), {
          icon: 'bookmark-outline',
          primary: true,
          disabled: !picked,
        })}
        {button('Take it again', () => setStage({ at: 'camera' }), { icon: 'camera-outline' })}
      </>
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
          maxHeight: '92%',
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
          <Text style={[t.type.sectionTitle, { color: t.colors.text, flex: 1 }]}>{`Read a ${family === 'socket' ? 'socket' : 'no-hub'} sheet`}</Text>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <Ionicons name="close" size={24} color={t.colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: t.layout.screenPadding, gap: t.space.lg }}>{body()}</ScrollView>
      </View>
    </Modal>
  );
}
