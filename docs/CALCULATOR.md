# Keypad calculator — build status

Tracks the trade-calculator module against the Pipe Trades Pro 4095 user
guide, so nothing is lost between sessions. Page numbers refer to that guide.

Behaviour is matched from documented keystrokes. Where a function needs
reference data this project cannot source, it is listed as **data needed** and
left unimplemented rather than filled with plausible numbers.

## Done

| Function | Where | Notes |
|---|---|---|
| Order of operations, parentheses | `calc/engine.ts` | Nested; `=` with a bracket open is refused |
| Feet-inch-fraction entry and display | `calc/ftin.ts` | Carries rounding up through the inch into the foot |
| Square and cubic entry by repeated unit | `calc/ftin.ts` | `100 Feet Feet` is 100 sq ft, not 100 ft squared |
| Linear, area, volume, weight, flow, velocity, pressure, force, temperature conversion | `calc/dim.ts` | Factors derived from SI definitions |
| Dimensional algebra | `calc/dim.ts` | Refuses meaningless products rather than returning them |
| Trig and inverse trig, degrees | `calc/dim.ts` | Refuses tan 90°, arcsin outside ±1 |
| D:M:S toggle | `calc/engine.ts` | |
| Percent | `calc/engine.ts` | Follows the pending operation |
| Reciprocal, x², √x, xʸ, x^(1/y), π, +/− | `calc/engine.ts` | |
| Nine memory registers plus accumulator | `calc/engine.ts` | `Store`/`Rcl` + 1–9; `Rcl M+`, `Rcl Rcl`, `Conv Rcl` |
| Cost and stored unit cost | `calc/engine.ts` | All three worked examples pass |
| Paperless tape | `calc/engine.ts` | Last 30 results |
| Angle/Slope, Offset, Run, Travel | `calc/triangle.ts` | Any two of four solve the rest |
| Documented defaults | `calc/defaults.ts` | Appendix B and C |
| Full keypad map | `calc/keys.ts` | 40 keys, every shift bound |

## Remaining

| Function | Guide | Blocker |
|---|---|---|
| Keypad UI | — | Next piece of work |
| Pipe Size key, per-type data | p22, App. A | **data needed** — OD, ID, wall, weight per foot, filled weight, internal area, for 7 materials |
| Pipe Material and Pipe Type keys | p21, p23 | Menus are encoded; selecting one needs the data above |
| Elbow Type | p23 | Long radius butt weld is the default; short radius and threaded need take-out values |
| Take-out and butt weld elbow cut marks | p32 | Partly covered by `calc/cutLength.ts` |
| Cut length from a known take-out | p33 | |
| Simple offset, known and unknown bend angle | p24–25 | Partly covered by `calc/offset.ts` |
| Simple offset cut length | p25 | Needs Welder's Gap wired in |
| Rolling offset, known and unknown angle, cut length | p27–29 | Partly covered by `calc/rolling.ts` |
| Concentric pipe bend cutback | p31 | |
| Combination rolling offset | p34 | |
| Horizontal to horizontal | p36 | |
| Drop | p37 | |
| Flow rate | p37 | Needs internal area, so waits on pipe data |
| Velocity | p39 | Same |
| Pressure loss | p40 | Needs surface roughness per material |
| Pressure and force | p42 | |
| Area key | p42 | |
| Pipe capacity | p43 | Needs internal area |
| Weight of filled pipe | p43 | Needs weight per foot; water default 62.42796 lb/cu ft is encoded |
| Circle area and circumference | p45 | |
| Welder's Gap setting | p6 | Default 1/8 inch encoded; not yet applied to cut lengths |
| Preference settings | p9, App. C | Types encoded; no UI |

## Data this project still needs

Pipe dimension tables cannot be recalled accurately and will not be guessed.
Each of these has a published source:

- **Steel, brass, aluminium, cast iron** — ASME B36.10M. Partly present in
  `calc/pipe.ts` for schedules 10, 40 and 80; Std, 60, XS, 100, 120, 140, 160,
  XXS, 20 and 30 are missing.
- **Stainless steel** — ASME B36.19M, for 5S, 10S, 40S and 80S.
- **Copper** — ASTM B88 for types K, L and M; B306 for DWV; B819 for medical;
  B280 for ACR.
- **Plastic** — ASTM D1785 for schedules 40, 80 and 120; D2241 for the SDR
  series.
- **Surface roughness per material**, for pressure loss.

Supplying any one of these unblocks the functions listed against it.
