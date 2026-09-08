import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { ControlRow, GhostButton, SelectorButton } from '../components/Buttons';
import { FooterNote } from '../components/Results';
import { PipeSheet } from '../components/PipeSheet';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useUnits } from '../hooks/useUnits';
import { findSize } from '../calc/pipe';
import { FractionDenominator } from '../calc/format';
import { fromInches } from '../calc/units';

export function SettingsScreen() {
  const t = useTheme();
  const u = useUnits();
  const { settings, update, reset } = useSettings();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [gapText, setGapText] = React.useState(String(fromInches(settings.defaultGap, settings.unitSystem)));
  const [stockText, setStockText] = React.useState(String(fromInches(settings.stockLength, settings.unitSystem)));

  React.useEffect(() => {
    setGapText(fromInches(settings.defaultGap, settings.unitSystem).toFixed(settings.unitSystem === 'metric' ? 1 : 5).replace(/0+$/, '').replace(/\.$/, ''));
    setStockText(fromInches(settings.stockLength, settings.unitSystem).toFixed(settings.unitSystem === 'metric' ? 0 : 2));
  }, [settings.unitSystem, settings.defaultGap, settings.stockLength]);

  return (
    <Screen>
      <SectionHeader title="Appearance" />
      <ChipRow
        label="Theme"
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'System' },
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

      <SectionHeader title="Defaults" meta="Applied to every calculator" />
      <ControlRow>
        <SelectorButton
          primary={findSize(settings.defaultNps).label}
          badge={`${settings.defaultKind} · SCH ${settings.defaultSchedule}`}
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
          Fraction readouts round to the nearest tick of the denominator you pick. The decimal value above them is always the exact
          calculated figure — cut to the decimal when tolerance is tight.
        </Text>
      </View>

      <FooterNote text={`PipeFit Pro ${'1.0.0'} · Settings are stored on this device only.`} />

      <PipeSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        nps={settings.defaultNps}
        kind={settings.defaultKind}
        schedule={settings.defaultSchedule}
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

