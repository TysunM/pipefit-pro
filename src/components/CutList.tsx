import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CutPlan } from '../calc/cutList';
import { useTheme } from '../theme/ThemeProvider';
import { SectionHeader } from './SectionHeader';
import { WarningBanner } from './Results';

/**
 * What to pull off the rack, drawn as the sticks it is.
 *
 * Each stick is a bar to scale, so the plan reads before any of the figures
 * are: how full it is, how many pieces come off it, and how much is left. A
 * cut list as a table of numbers is a table nobody checks; a cut list as a
 * picture of a stick is one somebody notices is wrong.
 */
export function CutList({
  plan,
  stock,
  length,
  short,
  title = 'Cut list',
  meta,
}: {
  plan: CutPlan;
  stock: number;
  /** A length with its unit, for the figures that are read. */
  length: (inches: number) => string;
  /** A length on its own, for the figures that are only glanced at. */
  short: (inches: number) => string;
  /**
   * What the section is called. Left alone on a screen showing one list; set
   * where the list is one of several and already has a name above it, so the
   * screen does not announce the same block twice.
   */
  title?: string;
  /** Said beside the title, in place of the stick count. */
  meta?: string;
}) {
  const t = useTheme();

  if (!plan.ok)
    return (
      <>
        <SectionHeader title={title} meta={meta ?? 'What to pull'} />
        <WarningBanner text={plan.error} />
      </>
    );

  // Big enough to be worth walking back to the rack with. Anything under a
  // foot is an offcut whatever the arithmetic says.
  const keeper = plan.longestDrop >= 12;

  return (
    <>
      <SectionHeader
        title={title}
        meta={meta ?? `${plan.count} stick${plan.count === 1 ? '' : 's'} of ${short(stock)}`}
      />

      {plan.sticks.map((stick) => (
        <View
          key={stick.number}
          style={{
            paddingHorizontal: t.layout.screenPadding,
            paddingVertical: t.space.lg,
            borderBottomWidth: t.hairline,
            borderBottomColor: t.colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
            <Text style={[t.type.captionStrong, { color: t.colors.textMuted, flex: 1 }]}>
              {`Stick ${stick.number}`}
            </Text>
            <Text style={[t.type.caption, { color: stick.drop >= 12 ? t.colors.data : t.colors.textFaint }]}>
              {stick.drop < 0.01 ? 'Nothing left' : `${length(stick.drop)} left`}
            </Text>
          </View>

          {/* The stick, to scale. */}
          <View
            style={{
              flexDirection: 'row',
              height: 22,
              marginTop: t.space.sm,
              borderRadius: t.radius.sm,
              overflow: 'hidden',
              backgroundColor: t.colors.bgSunken,
              borderWidth: t.hairline,
              borderColor: t.colors.border,
            }}
          >
            {stick.pieces.map((piece, i) => (
              <View
                key={piece.id}
                style={{
                  flex: Math.max(piece.length, 0.0001),
                  backgroundColor: i % 2 === 0 ? t.colors.primary : t.colors.data,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRightWidth: t.hairline,
                  borderRightColor: t.colors.bg,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={[t.type.caption, { color: i % 2 === 0 ? t.colors.onPrimary : t.colors.onData, fontSize: 9 }]}
                >
                  {piece.tag ?? piece.label}
                </Text>
              </View>
            ))}
            {stick.drop > 0.01 ? <View style={{ flex: stick.drop }} /> : null}
          </View>

          <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.sm }]}>
            {stick.pieces.map((p) => `${p.label} ${short(p.length)}`).join('  ·  ')}
          </Text>
        </View>
      ))}

      <View
        style={{
          flexDirection: 'row',
          gap: t.space.md,
          alignItems: 'flex-start',
          paddingHorizontal: t.layout.screenPadding,
          paddingVertical: t.space.lg,
        }}
      >
        <Ionicons name={keeper ? 'archive-outline' : 'trash-outline'} size={18} color={t.colors.textMuted} />
        <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>
          {keeper
            ? `Pull ${plan.count} stick${plan.count === 1 ? '' : 's'}. The longest drop is ${length(
                plan.longestDrop
              )} — that one goes back on the rack. ${length(plan.kerfLoss)} of it goes to the saw.`
            : `Pull ${plan.count} stick${plan.count === 1 ? '' : 's'}. Nothing left over is long enough to keep. ${length(
                plan.kerfLoss
              )} of it goes to the saw.`}
          {plan.best ? '' : ' This is a good packing rather than a proven best one — the list is too long to prove.'}
        </Text>
      </View>
    </>
  );
}
