# PipeFit Pro

Field calculators for pipe, tube and conduit. Expo SDK 57 / React Native 0.86 / TypeScript.

## Run

```
npm install
npx expo start
```

## Structure

| Path | Role |
| --- | --- |
| `src/calc/` | Pure calculation modules. No React, no UI imports. Unit tested. |
| `src/theme/` | Design tokens, typography scale, light/dark provider. |
| `src/components/` | Shared UI kit: fields, chips, result banner, stat grid, sheets. |
| `src/screens/` | One file per calculator. Presentation only. |
| `src/hooks/` | Unit formatting and pipe-selection state. |
| `src/state/` | Persisted settings (AsyncStorage). |

## Calculators

Simple offset · Rolling offset · Cut length · Saddle bend · Miter bend · Thread engagement · Hand bender.

## Geometry

All elbow figures derive from the centreline bend radius `R` (1.5×NPS long radius, 1.0×NPS short radius):

- Setback / takeout: `R · tan(θ/2)`
- Centreline arc: `R · θ`
- Throat arc: `(R − OD/2) · θ`
- Back arc: `(R + OD/2) · θ`
- Pipe weight: `10.6802 · t · (OD − t)` lb/ft

Pipe OD and wall thickness follow ASME B36.10M. Tee and flange takeouts follow ASME B16.9 and B16.5. NPT values follow ASME B1.20.1. Miter cut angles are checked against the ASME B31.3 §304.2.3 22.5° threshold.

Fitting weights are geometric estimates, not vendor catalogue figures. They are labelled as estimates in the UI.

## Data provenance

Every number the app deducts comes from one of three places. Know which before you cut.

| Source | Used for | Confidence |
| --- | --- | --- |
| Derived geometry | Elbow takeout, arcs, offsets, saddles, miters, bender setback | Exact — proven by unit test against the closed-form identity |
| ASME B36.10M | Pipe OD and wall thickness, all schedules | Published table |
| ASME B16.9 | Tee centre-to-end | Published table |
| ASME B16.5 | Weld-neck flange length through hub, Class 150 and 300 | Published table |
| ASME B1.20.1 | NPT thread engagement, pitch, tap drill | Published table |
| ASME B16.3 | Threaded 90° elbow centre-to-face | Published table |
| Estimate | Fitting and weld weights | Labelled as estimates in the UI |

Catalogue dimensions are reproduced tables, not a live vendor feed. The app always shows the takeout it used, and every fitting screen has a Custom field. **Check the number against the fitting in your hand before cutting.**

## Verification

```
npm run typecheck
npm test
```

167 unit tests. They fall into three groups:

**Pinned regressions** — values read directly off the reference design:

- 10" offset at 45° on 2" LR → travel 14.1421, pipe cut 11.6569, setback 1.2426, throat 1.4235, back 3.2887, arc 2.3562
- Rise 12 / roll 5 / run 36 on 2" LR → true offset 13.00, travel 38.2753, elbow 19.86°, roll 22.62°, pipe cut 37.2249

**Invariants swept across every size, schedule and angle** — these catch a whole class of error that spot values cannot:

- `travel² = run² + offset²` and `shrink = travel − run`
- `pipeCut + 2 × setback = travel` at zero gap, for every size and angle
- Locking the run round-trips back to the same angle
- Throat < centreline < back arc, and their mean is the centreline
- A rolling offset with zero roll collapses exactly onto the simple offset
- Miter cut angles reconstruct the total turn; back − throat = 2 × cutback
- Saddle marks reconstruct the obstruction position when projected back to horizontal
- Every 1/16 and 1/32 tick round-trips through the fraction parser
- Cross-solver agreement: cut length, bender and saddle reproduce the offset solver's figures

**Guards** — every solver is asserted to reject zero, negative, NaN, out-of-range and over-deducted input rather than return a plausible wrong number.

## Audit log

A full audit was run against the first build. Five defects were found and fixed:

1. **Four-point saddle marks were placed past the obstruction.** The first mark ignored the horizontal run of the offset, putting the conduit into the obstruction it was meant to clear. Now derived from `distance − depth/tan(θ)` and unit-tested by projecting the marks back to horizontal.
2. **Offset shrink used the wrong row of the trade table**, understating shrink by a factor of two. Replaced with exact `tan(θ/2)` geometry.
3. **Thread engagement computed cut length with no fitting dimension**, subtracting engagement from centre-to-centre. Corrected to `C2C − 2 × (centre-to-face − engagement)` with a B16.3 elbow table and an override field.
4. **Flange takeout values were not traceable to a standard.** Replaced with ASME B16.5 weld-neck length through hub, and the fitting's source is now printed under the result.
5. **A locked run that was blank silently fell back to the chip angle** instead of asking for the run.

## Theming

Tokens live in `src/theme/tokens.ts`. Light and dark palettes are complete and independent; every screen reads colours from `useTheme()` and hard-codes none. Theme preference (light / dark / system) persists per device.

## Units

Imperial and metric. Imperial adds an optional fractional readout at 1/8, 1/16, 1/32 or 1/64. The decimal figure is always the exact calculated value; the fraction is a rounded convenience.

Fraction *entry* (`11 5/8`) is parsed by `parseNumber`. On iOS the numeric keyboard includes `/` and space. On Android the decimal pad does not, so fraction entry there requires switching `keyboardType` in `src/components/DimensionInput.tsx`.

## Continuous integration

`.github/workflows/ci.yml` runs typecheck, the full test suite and a web bundle on every pull request and on pushes to `main`, with a concurrency group so a new push supersedes an in-flight run.

## Not built

The header in the reference design carries save and print actions. Those need persistence and `expo-print` and are not implemented — no dead buttons were added in their place.
