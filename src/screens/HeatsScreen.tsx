// The heat book
// -------------
// What the paperwork is for: proving every piece in a weld came from material
// somebody tested. The register holds each heat once, the joint register holds
// which heats went into which joint, and the summary at the top says what the
// job can actually prove.
//
// The one thing on this screen that is not filing is the warning under the
// entry field. A heat number is a meaningless string stamped into curved
// steel, and the characters people get wrong are always the same ones — O for
// zero, Z for two, S for five. `E7Z419` written down as `E72419` still looks
// like a heat number and passes every check but the one that matters, and it
// is found at turnover with the piece in the rack. So a new number that could
// be one already in the book says so, at the keyboard, before it is anywhere
// else.
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { FooterNote } from '../components/Results';
import { ControlRow, GhostButton } from '../components/Buttons';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { ChipRow } from '../components/ChipRow';
import { useTheme } from '../theme/ThemeProvider';
import { useHeats } from '../state/heats';
import { useJoints } from '../state/joints';
import { putHeat, removeHeat } from '../state/heatBook';
import { HEAT_FORMS, Heat, differingAt, findClash, newHeat, traceability } from '../calc/heat';
import { isScratch } from '../state/register';

export function HeatsScreen() {
  const t = useTheme();
  const { book, apply } = useHeats();
  const { register } = useJoints();

  const [entry, setEntry] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const clash = useMemo(() => findClash(entry, book.heats), [entry, book.heats]);
  const differs = clash && !clash.identical ? differingAt(entry, clash.existing) : [];

  // Only named joints count. The scratch joint is a calculator, not a record,
  // and counting it would put a permanent "unrecorded" on every job.
  const jobJoints = useMemo(
    () => register.joints.filter((j) => !isScratch(j)).map((j) => ({ id: j.id, heats: j.heats })),
    [register.joints],
  );
  const trace = useMemo(() => traceability(jobJoints, book.heats), [jobJoints, book.heats]);
  const owed = book.heats.filter((h) => !h.certified).length;

  const add = () => {
    const number = entry.trim();
    if (!number) return;
    if (clash?.identical) {
      setOpen(clash.existing);
      setEntry('');
      return;
    }
    apply((b) => putHeat(b, newHeat(number, Date.now())));
    setOpen(number);
    setEntry('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const edit = (h: Heat, patch: Partial<Heat>) =>
    apply((b) => putHeat(b, { ...h, ...patch, updatedAt: Date.now() }));

  const usedBy = (heat: string) => {
    const key = heat.toUpperCase().replace(/[^0-9A-Z]/g, '');
    return register.joints.filter(
      (j) => !isScratch(j) && j.heats.some((x) => x.toUpperCase().replace(/[^0-9A-Z]/g, '') === key),
    );
  };

  const tile = (label: string, n: number, tone: 'good' | 'warn' | 'plain') => (
    <View
      style={{
        flex: 1,
        padding: t.space.md,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: tone === 'warn' ? t.colors.warnBorder : tone === 'good' ? t.colors.border : t.colors.border,
        backgroundColor: tone === 'warn' ? t.colors.warnBg : tone === 'good' ? t.colors.dataSoft : t.colors.bgRaised,
        gap: 2,
      }}
    >
      <Text style={[t.type.h2, { color: tone === 'warn' ? t.colors.warnText : tone === 'good' ? t.colors.data : t.colors.text }]}>
        {n}
      </Text>
      <Text numberOfLines={2} style={[t.type.caption, { color: t.colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );

  return (
    <Screen>
      <HintRow text="Every heat once. Which heats went into a joint is recorded on the joint, so a cert filed somewhere else is one correction, not thirty." />

      <SectionHeader title="What the job can prove" meta={`${jobJoints.length} JOINTS`} />
      <View style={{ flexDirection: 'row', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
        {tile('Proved — every heat certified', trace.proved.length, 'good')}
        {tile('Heat with no cert in hand', trace.uncertified.length, trace.uncertified.length ? 'warn' : 'plain')}
        {tile('No heat recorded', trace.unrecorded.length, trace.unrecorded.length ? 'warn' : 'plain')}
      </View>

      <SectionHeader title="Add a heat" meta={owed ? `${owed} CERT${owed > 1 ? 'S' : ''} OWED` : 'ALL CERTS IN'} />
      <FieldRow>
        <DimensionInput
          label="Heat number"
          value={entry}
          onChangeText={setEntry}
          placeholder="E7Z419"
          autoCapitalize="characters"
        />
      </FieldRow>

      {/* The reason this screen exists. */}
      {clash ? (
        <View
          style={{
            marginHorizontal: t.layout.screenPadding,
            marginBottom: t.space.lg,
            padding: t.space.md,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: clash.identical ? t.colors.border : t.colors.warnBorder,
            backgroundColor: clash.identical ? t.colors.bgSubtle : t.colors.warnBg,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
            <Ionicons
              name={clash.identical ? 'checkmark-circle-outline' : 'warning-outline'}
              size={17}
              color={clash.identical ? t.colors.textMuted : t.colors.warnText}
            />
            <Text style={[t.type.captionStrong, { color: clash.identical ? t.colors.text : t.colors.warnText, flex: 1 }]}>
              {clash.identical ? `Already in the book as ${clash.existing}` : `This could be ${clash.existing}`}
            </Text>
          </View>
          <Text style={[t.type.caption, { color: clash.identical ? t.colors.textMuted : t.colors.warnText }]}>
            {clash.identical
              ? 'Adding it opens that entry rather than making a second one.'
              : `They differ only at character ${differs.map((i) => i + 1).join(', ')} — the pair that gets misread off a stamp. Check the steel against the cert before you add it.`}
          </Text>
        </View>
      ) : null}

      <ControlRow>
        <GhostButton
          label={clash?.identical ? 'Open that heat' : 'Add to the book'}
          icon={clash?.identical ? 'open-outline' : 'add-outline'}
          onPress={add}
          style={{ flex: 1 }}
        />
      </ControlRow>

      <SectionHeader title="Heats" meta={`${book.heats.length} IN THE BOOK`} />
      {book.heats.length === 0 ? (
        <FooterNote text="Nothing in the book yet. Add the heat off a stencil or a cert and it survives closing the app, restarting the phone, and every update." />
      ) : null}

      {book.heats.map((h) => {
        const on = open === h.heat;
        const joints = usedBy(h.heat);
        return (
          <View
            key={h.heat}
            style={{
              borderTopWidth: t.hairline,
              borderTopColor: t.colors.border,
              backgroundColor: on ? t.colors.bgSubtle : 'transparent',
            }}
          >
            <Pressable
              onPress={() => setOpen(on ? null : h.heat)}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.md,
                paddingHorizontal: t.layout.screenPadding,
                paddingVertical: t.space.lg,
              }}
            >
              <Ionicons
                name={h.certified ? 'shield-checkmark-outline' : 'shield-outline'}
                size={22}
                color={h.certified ? t.colors.data : t.colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{h.heat}</Text>
                <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                  {[
                    h.material || 'material not set',
                    HEAT_FORMS.find((f) => f.id === h.form)?.label,
                    h.certified ? 'cert in hand' : 'cert owed',
                    `${joints.length} joint${joints.length === 1 ? '' : 's'}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={20} color={t.colors.textMuted} />
            </Pressable>

            {on ? (
              <View style={{ paddingBottom: t.space.md }}>
                <FieldRow>
                  <DimensionInput
                    label="Material"
                    value={h.material}
                    onChangeText={(v) => edit(h, { material: v })}
                    placeholder="A106 Gr B"
                  />
                  <DimensionInput
                    label="Schedule"
                    value={h.schedule}
                    onChangeText={(v) => edit(h, { schedule: v })}
                    placeholder="40"
                  />
                </FieldRow>
                <FieldRow>
                  <DimensionInput
                    label="Mill"
                    value={h.mill}
                    onChangeText={(v) => edit(h, { mill: v })}
                    placeholder="Who made it"
                  />
                  <DimensionInput
                    label="Cert filed as"
                    value={h.mtr}
                    onChangeText={(v) => edit(h, { mtr: v })}
                    placeholder="MTR or folder"
                  />
                </FieldRow>
                <ChipRow
                  label="Form"
                  options={HEAT_FORMS.map((f) => ({ value: f.id, label: f.label }))}
                  selected={h.form}
                  onSelect={(f) => edit(h, { form: f })}
                />
                <ControlRow>
                  <GhostButton
                    label={h.certified ? 'Cert in hand' : 'Mark cert in hand'}
                    icon={h.certified ? 'shield-checkmark-outline' : 'shield-outline'}
                    onPress={() => {
                      edit(h, { certified: !h.certified });
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{ flex: 1 }}
                  />
                  <GhostButton
                    label="Remove"
                    icon="trash-outline"
                    onPress={() => {
                      apply((b) => removeHeat(b, h.heat));
                      setOpen(null);
                    }}
                    style={{ flex: 1 }}
                  />
                </ControlRow>
                {joints.length ? (
                  <Text
                    style={[
                      t.type.caption,
                      { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding },
                    ]}
                  >
                    {`In: ${joints.map((j) => j.tag || j.id).join(', ')}`}
                  </Text>
                ) : (
                  <Text
                    style={[
                      t.type.caption,
                      { color: t.colors.textFaint, paddingHorizontal: t.layout.screenPadding },
                    ]}
                  >
                    Not recorded against any joint yet. Open a joint in the register to put it on one.
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      <FooterNote text="A cert marked in hand is a claim by whoever tapped it. Nothing on a phone can prove a mill cert exists — this records that somebody checked, and which joints depend on them having been right." />
    </Screen>
  );
}
