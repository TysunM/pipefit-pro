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
| Keypad screen | `screens/CalculatorScreen.tsx` | LCD with unit word and annunciators, Conv shift layer |
| Pipe dimensions, steel and stainless | `calc/pipeData.ts` | Sch 40, 80, 120, Std, XS, 40S, 80S; bore area, weight, filled weight, capacity |
| Framing square layout | `calc/square.ts` | Pitch, rise on a twelve inch run, angle, travel multiplier |
| Bend setback, arc and gain, any angle | `calc/bender.ts` | Checked against the printed multipliers from a quarter degree to 179 |
| Piece length from two legs, and the inverse from stock | `calc/bender.ts` | Every printed single-bend worked example passes |
| Offset bend layout | `calc/offsetBend.ts` | Full mark list for a two-bend offset in bent pipe |
| Two or more pipes at equal spread | `calc/offsetBend.ts` | The advance C, spread times the tangent of half the angle |

## Remaining

| Function | Guide | Blocker |
|---|---|---|
| Pipe Size key | p22, App. A | Data now present for steel schedules 40, 80, 120, Std and XS, and stainless 40S and 80S. Copper and plastic still need their tables. |
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
| Flow rate | p37 | Unblocked — bore area is available |
| Velocity | p39 | Unblocked |
| Pressure loss | p40 | Needs surface roughness per material |
| Pressure and force | p42 | |
| Area key | p42 | |
| Pipe capacity | p43 | Built into `pipeDims` as gallons per foot |
| Weight of filled pipe | p43 | Built into `pipeDims` |
| Circle area and circumference | p45 | |
| Welder's Gap setting | p6 | Default 1/8 inch encoded; not yet applied to cut lengths |
| Preference settings | p9, App. C | Types encoded; no UI |

## Data this project still needs

Pipe dimension tables cannot be recalled accurately and will not be guessed.
Each of these has a published source:

- **Steel, brass, aluminium, cast iron** — schedules 40, 80, 120, Std and XS
  are now in `calc/pipeData.ts`. Schedules 60, 100, 140, 160, XXS, 20 and 30
  are still missing.
- **Stainless steel** — 40S and 80S are present. 5S, 10S and 160 are missing.
- **Copper** — ASTM B88 for types K, L and M; B306 for DWV; B819 for medical;
  B280 for ACR.
- **Plastic** — ASTM D1785 for schedules 40, 80 and 120; D2241 for the SDR
  series.
- **Surface roughness per material**, for pressure loss.

Supplying any one of these unblocks the functions listed against it.
