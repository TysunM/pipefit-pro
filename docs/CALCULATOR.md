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
| Standard threads and engagement | `calc/thread.ts` | 18 sizes; thread, hand-tight and tight engagement, bore size |
| Screwed fitting dimensions | `calc/screwedFitting.ts` | Both classes, 17 sizes, centre to end and band diameter |
| Screwed reducing fittings | `calc/reducingFitting.ts` | 65 combinations across elbow, cross and tee; heavy class separate |
| Reducing couplings | `calc/coupling.ts` | Length depends only on the larger size |
| Reducer couplings, cast iron | `calc/reducerCoupling.ts` | Two patterns, forty two combinations, one shoulder rule fills the rest |
| Malleable straight couplings | `calc/coupling.ts` | Held as the gap it leaves; the length works back from it |
| Wall and parallel line clearances | `calc/clearance.ts` | Swept radius and spacing computed from the book's own rule |
| Screwed elbow takeout, 90 and 45 | `calc/takeout.ts`, `calc/takeout45.ts` | Worked to 12 inch, past where the print stops |
| Screwed wye laying lengths | `calc/takeout45.ts` | Cast iron and malleable; sizes not made held as no value |
| Street elbows | `calc/streetElbow.ts` | 90 is the ordinary takeout; 45 is its own casting, to 2 inch |
| Malleable reducer couplings | `calc/reducerCoupling.ts` | Forty combinations, same shoulder rule, two suspect rows flagged |
| Unions and union fittings | `calc/union.ts` | Gap, takeout and worked length |
| Tee with a street elbow in it | `calc/union.ts` | Centre to centre with a 90 and a 45 |
| Minimum bending radius | `calc/bendRadius.ts` | Steel and wrought iron, with the advised five times size |
| Pipe nipples | `calc/nipple.ts` | Long, short and close; stocked lengths generated |
| Flanged fitting laying lengths | `calc/flangedFitting.ts` | All seven steel classes, raised face and ring joint |
| Flanged laterals and reducers | `calc/flangedFitting.ts` | 150, 300 and 400 lb |
| Flanged base elbows and tees | `calc/flangedFitting.ts` | 150 and 300 lb |
| Flanged gate valve laying lengths | `calc/valve.ts` | Cast iron 125/175/250, steel 150 to 2500, both facings |
| Globe, angle and swing check valves | `calc/valve.ts` | Cast iron and steel; angle is half the globe figure |
| Flange thickness and overall length | `calc/flange.ts` | All seven classes; screwed, slip-on, lapped and blind |
| Drilling templates and bolt-up | `calc/boltUp.ts` | 125 and 250 lb cast iron: bolt circle, count, size, length, gasket, hole layout |
| Welding neck flange length | `calc/weldingNeck.ts` | All seven classes, length through the hub |
| Butt welding elbows, tees, reducers, returns, caps | `calc/weldFitting.ts` | Held as rules where the pages are rules, so they answer past 24 inch |
| Butt welding reducing tees, crosses and reducing elbows | `calc/weldFitting.ts` | Run and elbow figures follow the plain fitting; only the outlet is held |
| Pipe support spacing | `calc/support.ts` | Water and gas or steam, by temperature and grade, with the grade capped by temperature |
| U-bolts for pipe hangers | `calc/uBolt.ts` | Fourteen sizes, seven bolt diameters |
| Plastic pipe dimensions and pressure limits | `calc/plasticPipe.ts` | PVC schedules A, 40, 80 and 120 in both types; polyethylene in three series |
| Framing square layout | `calc/square.ts` | Pitch, rise on a twelve inch run, angle, travel multiplier |
| Bend setback, arc and gain, any angle | `calc/bender.ts` | Checked against the printed multipliers from a quarter degree to 179 |
| Piece length from two legs, and the inverse from stock | `calc/bender.ts` | Every printed single-bend worked example passes |
| Offset bend layout | `calc/offsetBend.ts` | Full mark list for a two-bend offset in bent pipe |
| Double offset bend layout | `calc/offsetBend.ts` | Four bends, nine marks, parallel section between |
| Wrap-around miter template | `calc/template.ts` | Ordinates at any segment count, exact plane-cuts-cylinder |
| Branch and hole templates | `calc/template.ts` | Tee and lateral, exact cylinder intersection |
| Dividing the circumference | `calc/template.ts` | Segment length from actual outside diameter |
| Two or more pipes at equal spread | `calc/offsetBend.ts` | The advance C, spread times the tangent of half the angle |

## Remaining

| Function | Guide | Blocker |
|---|---|---|
| Pipe Size key | p22, App. A | Steel and stainless present. Copper and plastic still need their tables. |
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
- **Plastic** — PVC schedules A, 40, 80 and 120 and Type I polyethylene are
  now in `calc/plasticPipe.ts`, with the pressure limits. The SDR series is
  still missing.
- **Surface roughness per material**, for pressure loss.

Supplying any one of these unblocks the functions listed against it.

## Reading the scanned handbooks

`tools/scan.py` decodes the JBIG2 ink layer out of the scans. See
`tools/README.md`. Everything below was transcribed from those pages and
checked against a property the data has to hold, never against itself.

### Handbook pages transcribed

| Page | Content |
|---|---|
| 4-13 | Standard threads for steel pipe |
| 4-14 | Length of engagement |
| 4-15 | Overall dimensions, 125 lb cast iron and 150 lb malleable |
| 4-16 | Overall dimensions, 250 lb cast iron and 300 lb malleable |
| 4-17, 4-18 | Reducing elbows, cast iron |
| 4-19, 4-20 | Reducing crosses, cast iron |
| 4-21 to 4-23 | Reducing outlet tees, cast iron |
| 4-24 | Reducing elbows, 150 lb malleable |
| 4-26 | Reducing outlet tees, 150 lb malleable |
| 4-29 | Reducing couplings, 300 lb malleable |
| 4-30 | Reducing outlet tees, 300 lb malleable |
| 4-25 | Reducing crosses, 150 lb malleable |
| 4-27 | Reducing outlet tees, 150 lb malleable, continued |
| 4-28 | Reducing elbows, 300 lb malleable |
| 4-31 | Pipe nipple lengths |
| 4-32 to 4-36 | Wall and parallel line clearances |
| 4-37, 4-38 | Takeout, 90 degree screwed elbows; screwed wyes |
| 4-39 | Takeout, 45 degree screwed elbows |
| 4-40, 4-41 | Reducer couplings, cast iron |
| 4-42 | Couplings and close nipples, malleable |
| 4-43 | Street elbows, 45 and 90, malleable |
| 4-44 | Reducer couplings, malleable |
| 4-45 | Unions and union fittings, malleable |
| 4-46 | Combined tees and street elbows, malleable |
| 4-71 to 4-75 | 150 lb steel flanged fittings, laterals, reducers, ring joint and bases |
| 4-77 to 4-81 | 300 lb steel, the same set |
| 4-83 to 4-85 | 400 lb steel elbows, laterals and ring joint |
| 4-88, 4-89 | 600 lb steel, raised face and ring joint |
| 4-91, 4-92 | 900 lb steel |
| 4-94, 4-95 | 1500 lb steel |
| 4-97, 4-98 | 2500 lb steel |
| 4-99 to 4-104 | Gate valves, cast iron and steel, every class and both facings |
| 4-51 to 4-54 | Drilling templates, 125 and 250 lb cast iron flanges |
| 4-68, 4-69 | Welding neck flanges, every class |
| 4-70, 4-76, 4-82, 4-87, 4-90, 4-93, 4-96 | Flange thickness and overall length, every class |
| 4-105 to 4-108 | Globe and angle valves, cast iron and steel |
| 4-111, 4-112 | Swing check valves, steel |
| 1-106 | Minimum bending radius, standard weight pipe |

| 2-42, 2-43 | Butt welding elbows and straight tees |
| 2-48, 2-50 | Butt welding reducers |
| 2-51 | Butt welding 180 degree returns |
| 2-44 to 2-47 | Butt welding reducing outlet tees and reducing elbows |
| 2-53 | Butt welding caps |
| 2-66 | U-bolts for pipe hangers |
| 2-67, 2-68 | Spacing of pipe supports, water and gas or steam |
| 3-26, 3-27 | Polyvinyl chloride pipe, dimensions and pressure limits |
| 3-29, 3-30 | Type I polyethylene pipe, dimensions and pressure limits |

### Still to transcribe

Screwed: done, 4-13 to 4-46.

Flanged: 4-49 to 4-70 (drilling templates, 25 lb cast iron, 125 and 250 lb
cast iron, welding neck flanges), 4-76, 4-82, 4-86, 4-87, 4-90, 4-93, 4-96
(the flange tables themselves and the remaining lateral pages), and 4-99 to
4-109 and 4-110, the remaining globe valve pages.

Part 2: 2-52 (lap joint stub ends), 2-54 to 2-57 (crosses), 2-58 to 2-63
(butt weld valve laying lengths), 2-64, 2-65 (bull nose and dead end cap
templates). Part 3: 3-9 to 3-21, the cast brass solder joint fittings. Part 5:
copper tube, the rest of the steel schedules, pipe expansion.

### Rules found behind the printed tables

Where a printed block turns out to follow one rule, the rule is held and the
print is used to check it. That is smaller, cannot go internally inconsistent,
and answers combinations the book never printed.

| Table | Rule |
|---|---|
| Screwed elbow takeout, 90 and 45 | centre to end, less the engagement when tight |
| Reducer couplings, both patterns | the casting's shoulder depth, less the small end's engagement |
| Reducing couplings | the length depends only on the larger size |
| Parallel line spacing | swept radius of the larger, plus half the smaller's band |
| Street elbow, 90 degree | the ordinary elbow takeout, exactly |
| Malleable coupling, union and close nipple | the length, less the two threads buried in it |
| Butt welding 90 elbow | one and a half times the nominal size long radius, the size itself short radius |
| Butt welding 45 elbow | five eighths of the nominal size, from four inch up |
| Butt welding reducer | the length depends only on the larger size |
| Butt welding 180 return | spacing is twice the bend radius; height is that radius plus half the outside diameter |
| Butt welding reducing tee and cross | the run keeps the plain tee's centre to end; only the outlet changes |
| Butt welding reducing elbow | the long radius rule on the larger of the two sizes |
| Sloping support spacing | never longer than the figure for the temperature, which is the rule printed under both tables |
| Plastic pipe outside diameter | the iron pipe size, so only the bore is held |
| Threaded plastic pipe | about 55 per cent of the plain end pressure |
| Flanged ring joint, every class | the raised face figure, plus an allowance for each flange face in the dimension |
| Ring joint gate valves | the raised face figure plus twice that allowance, a valve carrying it at both ends |
| Heavy class valves | gate, globe and swing check share one face to face table in 900, 1500 and 2500 lb |
| Angle valve | half the globe valve's face to face, the same casting opened out |
| Bolt hole layout | a multiple of four holes, straddling the centreline, so a fitting turns a quarter and still bolts up |
| Cast iron flange thickness | the same as the matching steel class, once past the sizes where the steel raised face makes the difference |
| 900 lb, every table | below three inch it is the 1500 lb casting, so its three inch is smaller than its two and a half |

The reducer coupling shoulders work back to thread engagements for 4, 5, 6 and
8 inch that match this project's thread table, which that page never prints.
The close nipple gaps work back to the close nipple column on all fifteen
sizes. Neither was fitted to; both fell out.

### Disagreements found in the printed book

Each is kept as printed where the print is the only source, or corrected
where the book contradicts itself. All are pinned by tests.

| Where | Printed | Should be |
|---|---|---|
| Steel square, 17-1/2° | 1.0457 | that is sec 17°; sec 17-1/2° is 1.0485, per the book's own trig table |
| Steel square, 37-1/2° | 1.2521 | that is sec 37° |
| Worked example 1, leg b | 16.50 | 22 cos 41° is 16.6036 |
| Double offset, 75° centre bend setback | .763 | .7673, per the book's own universal table |
| Reducing elbow 1/2 x 3/8 | X 1-1/16, Z 1 | inverted against all 35 other rows; printed the same way twice |
| Reducing tee 3-1/2 x 3-1/2 x 2 | outlet 2-1/8 | 3-1/8, per the cross table and the run of outlets either side |
| Reducer coupling 1 x 1/2, dimension J | 1/2 | 11/16, per the shoulder every other row on both pages obeys |
| Malleable reducer coupling 1/2 x 1/2 | not a reducer | 1/2 x 3/8: the gap works back to the 3/8 engagement, and 3/8 is the one size otherwise missing from that block |
| Malleable reducer coupling 3 x 2-1/2 | 1 | 1-3/4 per the rule; 1 is the cast iron figure for the same pair |
| Malleable reducer coupling 6 x 4 | 1-15/16 | unknown; that is the cast iron figure, and it would make the six inch casting shallower than the five. Refused rather than served |
| 1500 lb ring joint 5 inch 45 elbow | 3-13/16 | 8-13/16: shorter as printed than both the four and the six inch, and the allowance every other row on the page obeys gives 8-13/16 |
| 180 degree return, 1/2 inch | O 3, K 1-7/8 | O 1-1/2, K 1-3/16 per the geometry every other row obeys; the printed O is the one inch figure and the printed K is taller than the 3/4 inch below it |

### Corrections made to this project's own data

| What | Was | Now |
|---|---|---|
| 6 inch screwed elbow centre to end | 5.30 | 5.13 |
| Screwed elbow range | stopped at 6 inch | runs to 12 |
