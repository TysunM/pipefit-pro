// The pad
// -------
// Press where you want the pipe to go.
//
// That is the whole design, and everything below is in service of the one
// thing that makes it true: a button sits at the angle its leg will draw at.
// Not near it, not roughly — the button positions come out of the same
// projection that draws the pipe, so on an isometric the four level buttons
// land at the 30 degrees of iso paper and up lands straight up, and when the
// view is swung the pad turns with it.
//
// The alternative, which is what this replaces, was a compass row and a slope
// row: eight letters and five phrases, two coordinates a fitter had to combine
// in his head to point a leg somewhere he could already see. Nobody found the
// second row. A leg that needed to go up needed you to know the row existed.
//
// Six buttons in open space, eight in a run held to one plane. A direction the
// current view cannot show — a riser in a plan — is dimmed and says so rather
// than being hidden, because it is still where the leg would go; it is the
// drawing that cannot show it, and a control that disappears teaches nobody
// that.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Axis, axisOf } from '../calc/aim';
import { LegDir, dirVector } from '../calc/direction';
import { Camera, screenAngle, screenScale } from './spool3d/project';
import { useTheme } from '../theme/ThemeProvider';

/** Below this, a leg draws too short from here to read, so the button says so. */
const FLAT_ON = 0.2;

export function AimPad({
  axes,
  cam,
  value,
  onAim,
  size = 188,
  label,
}: {
  axes: readonly Axis[];
  cam: Camera;
  value: LegDir;
  onAim: (dir: LegDir) => void;
  size?: number;
  label?: string;
}) {
  const t = useTheme();
  const here = axisOf(value, axes);
  const button = Math.round(size * 0.27);
  const radius = (size - button) / 2;

  return (
    <View style={{ alignItems: 'center', marginBottom: t.space.lg }}>
      {label ? (
        <Text style={[t.type.label, { color: t.colors.textMuted, marginBottom: t.space.sm }]}>{label}</Text>
      ) : null}
      <View style={{ width: size, height: size }}>
        {/* The ground the buttons sit on, so the pad reads as one control
            rather than as loose buttons that happen to be near each other. */}
        <View
          style={{
            position: 'absolute',
            left: button / 2,
            top: button / 2,
            width: size - button,
            height: size - button,
            borderRadius: (size - button) / 2,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.bgSunken,
          }}
        />

        {/* The middle speaks only when no button can. A leg on an axis has
            that button lit, and repeating its name in the centre says nothing
            twice; a leg at some angle between them has nothing lit, and
            without this the pad would look like it had lost its place. */}
        {here ? null : (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: size,
              height: size,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            pointerEvents="none"
          >
            <Text style={[t.type.captionStrong, { color: t.colors.textFaint }]}>OFF AXIS</Text>
          </View>
        )}

        {axes.map((a) => {
          const v = dirVector(a.dir);
          const angle = screenAngle(v, cam);
          const seen = screenScale(v, cam);
          const flat = angle === null || seen < FLAT_ON;
          const active = here?.id === a.id;

          // A direction the view collapses has no angle to sit at. It keeps
          // its place rather than moving or vanishing: the pad's shape must
          // not change as the view swings, or the thumb loses its place.
          const at = angle ?? -Math.PI / 2;
          const cx = size / 2 + radius * Math.cos(at) - button / 2;
          const cy = size / 2 + radius * Math.sin(at) - button / 2;

          return (
            <Pressable
              key={a.id}
              onPress={() => onAim(a.dir)}
              accessibilityRole="button"
              accessibilityLabel={`Run this leg ${a.label}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                position: 'absolute',
                left: cx,
                top: cy,
                width: button,
                height: button,
                borderRadius: button / 2,
                borderWidth: active ? 2 : 1,
                borderColor: active ? t.colors.primary : flat ? t.colors.border : t.colors.borderStrong,
                backgroundColor: active
                  ? t.colors.primary
                  : pressed
                    ? t.colors.bgSubtle
                    : t.colors.bgRaised,
                opacity: flat && !active ? 0.45 : 1,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text
                numberOfLines={1}
                style={[
                  t.type.caption,
                  {
                    color: active ? t.colors.onPrimary : t.colors.text,
                    fontWeight: active ? '700' : '600',
                    fontSize: a.label.length > 4 ? 10 : 12,
                  },
                ]}
              >
                {a.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
