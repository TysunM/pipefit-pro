import { JOINING_LABEL, MATERIALS, MaterialGroup, calcSchedule, material, resolveSpec, sizeLabel, wallLabel, wallsAt } from '../calc/materials';
import { wallFor } from '../voice/specs';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { AccentButton, ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { appVersion, buildId, runningBuild, useOtaUpdate, versionRows } from '../state/updates';
import { useUnits } from '../hooks/useUnits';
import { findSize } from '../calc/pipe';
import { FractionDenominator } from '../calc/format';
import { fromInches } from '../calc/units';
import { PERSON_MAX, PROJECT_ID_MAX } from '../state/readSettings';
import { useNavigation } from '@react-navigation/native';
import { backupAge, useLastBackup } from '../state/lastBackup';

export function SettingsScreen() {
  const t = useTheme();
  const u = useUnits();
  const { settings, update, reset } = useSettings();
  const ota = useOtaUpdate();
  const navigation = useNavigation();
  const lastBackup = useLastBackup();
  const backup = backupAge(lastBackup.at, Date.now());
  const [otaNote, setOtaNote] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [gapText, setGapText] = React.useState(String(fromInches(settings.defaultGap, settings.unitSystem)));
  const [stockText, setStockText] = React.useState(String(fromInches(settings.stockLength, settings.unitSystem)));
  const [kerfText, setKerfText] = React.useState(String(fromInches(settings.cutAllowance, settings.unitSystem)));

  React.useEffect(() => {
    setGapText(fromInches(settings.defaultGap, settings.unitSystem).toFixed(settings.unitSystem === 'metric' ? 1 : 5).replace(/0+$/, '').replace(/\.$/, ''));
    setStockText(fromInches(settings.stockLength, settings.unitSystem).toFixed(settings.unitSystem === 'metric' ? 0 : 2));
    setKerfText(
      fromInches(settings.cutAllowance, settings.unitSystem)
        .toFixed(settings.unitSystem === 'metric' ? 1 : 5)
        .replace(/0+$/, '')
        .replace(/\.$/, '')
    );
  }, [settings.unitSystem, settings.defaultGap, settings.stockLength, settings.cutAllowance]);

  return (
    <Screen>
      <SectionHeader
        title="Backup"
        meta={lastBackup.at ? (backup.days === 0 ? 'Backed up today' : `Backed up ${backup.days} day${backup.days === 1 ? '' : 's'} ago`) : 'Never backed up'}
      />
      <ControlRow>
        <GhostButton
          label={backup.due ? 'Back up this phone now' : 'Back up and restore'}
          icon={backup.due ? 'warning-outline' : 'cloud-upload-outline'}
          onPress={() => navigation.navigate('Backup')}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <SectionHeader title="Project" meta="Shown on the home screen" />
      <FieldRow>
        <DimensionInput
          label="Project ID"
          value={settings.projectId}
          onChangeText={(text) => update({ projectId: text.slice(0, PROJECT_ID_MAX) })}
          placeholder="Job or line number"
          keyboardType="default"
          autoCapitalize="characters"
        />
      </FieldRow>
      <FieldRow>
        <DimensionInput
          label="Your name"
          value={settings.fitterName}
          onChangeText={(text) => update({ fitterName: text.slice(0, PERSON_MAX) })}
          placeholder="Filled in as Bolted by on joints you name"
          keyboardType="default"
          autoCapitalize="words"
        />
      </FieldRow>

      <SectionHeader title="Smart help" meta="TypeSafe Jev" />
      <ChipRow
        label="Jev"
        options={[
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ]}
        selected={settings.smartFill ? 'on' : 'off'}
        onSelect={(v) => update({ smartFill: v === 'on' })}
      />
      <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>
        With signal, two things go to TypeSafe's Jev: the text a heat scan read — never the photo — so it can suggest the grade,
        form, size and schedule; and what you type in the handbook search, so it can find the table that answers it. Nothing is
        entered until you add the heat. Off, or with no signal, both stay on this phone and work as before.
      </Text>

      <SectionHeader title="In the field" meta="Gloves · noise" />
      <ChipRow
        label="Glove keys"
        options={[
          { value: 'off', label: 'Off' },
          { value: 'on', label: 'On' },
        ]}
        selected={settings.gloveMode ? 'on' : 'off'}
        onSelect={(v) => update({ gloveMode: v === 'on' })}
      />
      <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>
        Every number field opens big keys: feet, inches, a row of eighths with +1/16, and the figures you used last. Made for a
        knuckle, a capacitive stylus or touchscreen gloves — no phone screen reads through plain leather.
      </Text>
      <ChipRow
        label="Shift"
        options={[
          { value: 'days', label: 'Days' },
          { value: 'nights', label: 'Nights' },
        ]}
        selected={settings.shift}
        onSelect={(v) => update({ shift: v as 'days' | 'nights' })}
      />
      <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>
        Where "today" turns over. Days: at midnight. Nights: at noon, so 6 pm to 6 am is one shift, dated by the night it
        started — the Projects Today view and the shift report both keep it together. Weld, test and calibration dates stay the
        calendar day they happened.
      </Text>
      <ChipRow
        label="Voice"
        options={[
          { value: 'on', label: 'Mic button' },
          { value: 'off', label: 'Off' },
        ]}
        selected={settings.voice ? 'on' : 'off'}
        onSelect={(v) => update({ voice: v === 'on' })}
      />
      <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>
        Tap the mic on any screen and say it: a tool ("bolt up", "rolling offset, rise 12, roll 8, run 30"), a weld ("two 6 inch welds,
        weld 14 rejected for porosity"), a test reading ("hold started at 225") or a handbook question. Tool names work on the phone
        with no signal; the rest is read by Claude, said back, and kept on screen with an Undo.
      </Text>
      <ChipRow
        label="Read aloud"
        options={[
          { value: 'off', label: 'Off' },
          { value: 'tap', label: 'Tap' },
          { value: 'auto', label: 'Auto' },
        ]}
        selected={settings.readAloud}
        onSelect={(v) => update({ readAloud: v as 'off' | 'tap' | 'auto' })}
      />
      <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>
        Tap puts a speaker on each answer; Auto says it once the figures stop changing — "Pipe cut: 4 foot, 3 and
        five-eighths", with "strong" or "shy" when it is off the mark. Plays through earbuds when they are connected, the
        speaker when not.
      </Text>

      <SectionHeader title="Appearance" />
      <ChipRow
        label="Theme"
        options={[
          { value: 'dark', label: 'Slate' },
          { value: 'light', label: 'Daylight' },
          { value: 'system', label: 'Match phone' },
        ]}
        selected={settings.themePreference}
        onSelect={(v) => update({ themePreference: v })}
      />

      <SectionHeader title="Units" />
      <ChipRow
        label="System"
        options={[
          { value: 'imperial', label: 'Imperial' },
          { value: 'metric', label: 'Metric' },
        ]}
        selected={settings.unitSystem}
        onSelect={(v) => update({ unitSystem: v })}
      />
      <ChipRow
        label="Length readout"
        options={[
          { value: 'inches', label: 'Inches' },
          { value: 'feetInches', label: "Feet + inches" },
        ]}
        selected={settings.lengthReadout}
        onSelect={(v) => update({ lengthReadout: v })}
      />
      <ChipRow
        label="Fractions"
        options={[
          { value: 0, label: 'Off' },
          { value: 8, label: '1/8' },
          { value: 16, label: '1/16' },
          { value: 32, label: '1/32' },
          { value: 64, label: '1/64' },
        ]}
        selected={settings.fractionDenominator}
        onSelect={(v) => update({ fractionDenominator: v as FractionDenominator })}
      />

      <SectionHeader title="Pipe on this job" meta="Material · wall · size" />
      {(['Steels', 'Chrome-moly', 'Iron', 'Plastics & lined'] as MaterialGroup[]).map((g) => (
        <ChipRow
          key={g}
          label={g}
          options={MATERIALS.filter((m) => m.group === g).map((m) => ({ value: m.id, label: m.short }))}
          selected={settings.material}
          onSelect={(id) => {
            // A new material keeps the wall in its own terms where it has it: Sch 40 steel becomes 40S stainless.
            const m = material(id);
            const r = resolveSpec(m.id, settings.defaultNps, wallFor(m.walls, settings.wall) ?? m.defaultWall);
            update({ material: r.material, defaultNps: r.nps, wall: r.wall, defaultSchedule: calcSchedule(r.wall) });
          }}
        />
      ))}
      <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>
        {`${material(settings.material).name} · ${material(settings.material).spec}. ${JOINING_LABEL[material(settings.material).joining]}. Every calculator, the spool and the cut list work in this pipe until it is changed here or on the screen.`}
      </Text>
      <ChipRow
        label="Wall"
        options={wallsAt(settings.material, settings.defaultNps).map((w) => ({ value: w, label: wallLabel(w) }))}
        selected={settings.wall}
        onSelect={(w) => {
          const r = resolveSpec(settings.material, settings.defaultNps, w);
          update({ wall: r.wall, defaultSchedule: calcSchedule(r.wall) });
        }}
      />
      <ControlRow>
        <SelectorButton
          primary={sizeLabel(settings.defaultNps)}
          badge={`${material(settings.material).short} · ${wallLabel(settings.wall)} · ${settings.defaultKind}`}
          onPress={() => setSheetOpen(true)}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <FieldRow>
        <DimensionInput
          label="Weld gap"
          value={gapText}
          onChangeText={(text) => {
            setGapText(text);
            const parsed = u.parse(text);
            if (Number.isFinite(parsed) && parsed >= 0) update({ defaultGap: parsed });
          }}
          suffix={u.suffix}
        />
        <DimensionInput
          label="Stock length"
          value={stockText}
          onChangeText={(text) => {
            setStockText(text);
            const parsed = u.parse(text);
            if (Number.isFinite(parsed) && parsed > 0) update({ stockLength: parsed });
          }}
          suffix={u.suffix}
        />
        <DimensionInput
          label="Saw cut"
          value={kerfText}
          onChangeText={(text) => {
            setKerfText(text);
            const parsed = u.parse(text);
            if (Number.isFinite(parsed) && parsed >= 0) update({ cutAllowance: parsed });
          }}
          suffix={u.suffix}
        />
      </FieldRow>

      <ControlRow>
        <GhostButton label="Reset to defaults" icon="refresh-outline" onPress={reset} style={{ flex: 1 }} />
      </ControlRow>

      <View
        style={{
          marginHorizontal: t.layout.screenPadding,
          marginTop: t.space.md,
          padding: t.space.lg,
          borderRadius: t.radius.lg,
          backgroundColor: t.colors.bgSubtle,
          flexDirection: 'row',
          gap: t.space.md,
        }}
      >
        <Ionicons name="information-circle-outline" size={19} color={t.colors.textMuted} style={{ marginTop: 1 }} />
        <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>
          The calculator reads out in inches and stays there: 30 inches is 30 inches, not two foot six. Press FT on the keypad to
          convert an answer to feet and inches, IN to go back. Length readout sets which one it opens on.{'\n\n'}
          Fraction readouts round to the nearest tick of the denominator you pick. The decimal value above them is always the exact
          calculated figure — cut to the decimal when tolerance is tight.
        </Text>
      </View>

      <SectionHeader title="Updates" meta={runningBuild()} />
      <View
        style={{
          marginHorizontal: t.layout.screenPadding,
          marginBottom: t.space.md,
          padding: t.space.md,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: t.colors.bgSubtle,
          gap: t.space.xs,
        }}
        accessibilityLabel={`App version: ${versionRows().map((r) => `${r.label} ${r.value}`).join(', ')}`}
      >
        {versionRows().map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', gap: t.space.md }}>
            <Text style={[t.type.caption, { color: t.colors.textMuted, width: 72 }]}>{r.label}</Text>
            <Text style={[t.type.bodyStrong, { color: t.colors.text, flex: 1, fontFamily: r.label === 'Build' || r.label === 'Update' ? t.font.mono : undefined }]}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>
      {ota.enabled ? (
        <>
          <ControlRow>
            {ota.ready ? (
              <AccentButton label="Restart to apply update" icon="arrow-down-circle-outline" onPress={ota.apply} style={{ flex: 1 }} />
            ) : (
              <GhostButton
                label={ota.busy ? 'Checking\u2026' : 'Check for updates'}
                icon="cloud-download-outline"
                onPress={() => {
                  setOtaNote(null);
                  void ota.checkNow().then((found) => setOtaNote(found ? null : 'No update available.'));
                }}
                style={{ flex: 1 }}
              />
            )}
          </ControlRow>
          {(ota.error ?? otaNote) ? (
            <Text
              style={[
                t.type.caption,
                { color: ota.error ? t.colors.danger : t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.md, marginBottom: t.space.lg },
              ]}
            >
              {ota.error ?? otaNote}
            </Text>
          ) : null}
        </>
      ) : (
        <Text
          style={[
            t.type.caption,
            { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg },
          ]}
        >
          {Platform.OS === 'web'
            ? 'The web app is always the latest: reload the page to get it. Updates to the phone app arrive in the phone app.'
            : 'Over-the-air updates are off in development. They are live in the installed app.'}
        </Text>
      )}

      {/* The build, because "have I got the new one" was unanswerable from
          inside the app: the version string had not moved in six releases. */}
      <FooterNote
        text={`PipeFit Pro ${appVersion()} · build ${buildId()} · ${runningBuild()} · Settings are stored on this device only.`}
      />

      <PipeSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        nps={settings.defaultNps}
        kind={settings.defaultKind}
        schedule={settings.defaultSchedule}
        material={settings.material}
        wall={settings.wall}
        onSpec={(patch) => {
          // A new material keeps the wall in its own terms where it has it: Sch 40 steel becomes 40S stainless.
          const m = material(patch.material ?? settings.material);
          const w = patch.wall ?? wallFor(m.walls, settings.wall) ?? m.defaultWall;
          const r = resolveSpec(m.id, patch.nps ?? settings.defaultNps, w);
          update({ material: r.material, defaultNps: r.nps, wall: r.wall, defaultSchedule: calcSchedule(r.wall) });
        }}
        onChange={(patch) =>
          update({
            ...(patch.nps !== undefined ? { defaultNps: patch.nps } : {}),
            ...(patch.kind !== undefined ? { defaultKind: patch.kind } : {}),
            ...(patch.schedule !== undefined ? { defaultSchedule: patch.schedule } : {}),
          })
        }
      />
    </Screen>
  );
}

