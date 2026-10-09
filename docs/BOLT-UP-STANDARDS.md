# Flange bolt-up: what the standard says now, and what PipeFit Pro should do

Research note and product spec, 8 October 2026. Governing document: ASME PCC-1-2022, *Pressure Boundary Bolted Flange Joint Assembly*. Sources are listed at the end. Where a figure could only be confirmed from secondary sources, it says so.

## 1. Three premises, corrected

**"The star pattern isn't industry standard anymore."** Half right. PCC-1-2022 still carries the cross (star) pattern as its baseline method. The standard calls it the **Legacy** pattern, and it remains the default on small and mid-size flanges. What changed since the old shop-card version:

- The staging is now specified: hand-tight, snug to 10–20 ft-lb (never above 20% of target), then rounds at 20–30%, 50–70% and 100% in cross order, then **circular passes at 100% until no nut turns**, then a retightening round after a dwell of at least four hours.
- A gap check with feeler gauges is called for after each round, and the low side is brought up before the next round.
- Faster **alternative patterns** (Nonmandatory Appendix F) are accepted and are what crews use on 16-bolt-and-up flanges and with multiple tools.
- The real modern change is **load control**, not the pattern: a target bolt stress derived from the gasket, a documented nut factor for the lubricant, calibrated tools, qualified bolters (Appendix A), and an assembly record (new Appendix R in 2022).

**"The torque goes by 150 lb, 300 lb, 600 lb, 900 lb."** No. Those are pressure classes. Class sets the **stud count and stud size** for a given pipe size, and the stud size sets the torque. Torque is a function of stud diameter × target bolt stress × nut factor, checked against the gasket's stress window. A 6-inch Class 150 flange and a 2-inch Class 600 flange both carry 3/4-inch studs and get the same torque per stud with the same lubricant. The app must go class → studs → torque, never class → torque.

**"Different flanges need different patterns."** Partly. Every ASME B16.5 flange uses the same pattern family. What changes by flange type is the staging, the torque ceiling, the gasket window and the tool: torque wrench or hydraulic tensioner. The exceptions that truly need their own procedure are listed in section 5.

## 2. The PCC-1 Legacy method, as the app should run it

PCC-1-2019 Table 1 and the 2022 rewrite, confirmed from the standard's text where quoted:

| Step | What | Order | Load |
|---|---|---|---|
| 0 | Mark stud ends, nuts on the same side; hand-tighten; snug | Cross | 10–20 ft-lb, never over 20% of target |
| 1 | Round 1, then gap check | Cross | 20–30% of target |
| 2 | Round 2, then gap check | Cross | 50–70% of target |
| 3 | Round 3, then gap check | Cross | 100% |
| 4 | Check round(s) | Circular, clockwise | 100%, repeated **until no nut rotates** (two passes is typical) |
| 5 | Retightening round after dwell | Circular | 100%, after at least 4 hours, before test or start-up |

The app today runs 30% → 60% → 100% → one circular pass. That is close but not the standard: the first two rounds sit at the top of the PCC-1 ranges, there is no snug step, no gap checks, the check round is a single pass instead of "until nothing moves", and there is no 4-hour retightening round. All five are cheap to add.

**Bolt numbering.** PCC-1 numbers bolts clockwise, 1 at 12 o'clock, and reads the cross order from a table. The app's `crossPattern()` reproduces that table by halving: 8 bolts 1-5-3-7-2-6-4-8; 12 bolts 1-7-4-10-2-8-5-11-3-9-6-12; 16 bolts 1-9-5-13-3-11-7-15-2-10-6-14-4-12-8-16; 24 bolts 1-13-7-19-4-16-10-22-2-14-8-20-5-17-11-23-3-15-9-21-6-18-12-24. These match the published sequences. PCC-1 also allows an **alternative numbering** where the number painted on the bolt *is* its turn in the sequence, which crews like because nobody reads a table in the rain. The app should offer both.

## 3. The alternative patterns (Appendix F)

Appendix F exists because the Legacy method's three cross rounds send the wrench across the flange more than needed. The alternatives below reach the same gasket stress uniformity in less time. Numbering follows PCC-1-2019; the 2022 edition keeps the same set.

| # | Name | Where it is used | Procedure |
|---|---|---|---|
| 1 | **Modified Legacy** (modified star) | Any bolt count, one tool | Pass 1: first 4 bolts in cross order to 20–30%; next 4 bolts to 50–70%; every remaining bolt in cross order straight to 100%. Then circular passes at 100% until no nut turns. |
| 2 | **Quadrant** | 16 bolts and up, one tool | Four starter bolts 90° apart (cross: 2nd bolt at 180°, 3rd at 90°, 4th at 270°; or circular: 90°, 180°, 270°). Load steps up after every four bolts, 20–30% → 50–70% → 100%. After the first four, the next bolt is always the next loose bolt in the quadrant being worked. Then circular passes at 100% until no nut turns. |
| 3 | **Circular, single tool** | Hard gaskets only (kammprofile, grooved metal); not spiral wound, RTJ or double-jacketed | Four bolts 90° apart seat the joint, then the remaining bolts are taken round the flange. Then circular passes at 100% until no nut turns. |
| 4 | **Four tools, simultaneous** | Large flanges, hydraulic wrenches on one pump | Four tools 90° apart tighten together and move together through the sequence. Staging as Legacy. |
| 5 | **Two tools, simultaneous** | Thin flanges and soft gaskets (chemical industry) | Two tools 180° apart start at 20–30%, then move to the bolts 90° from the last pair, circular thereafter. |

**Grouping.** On large bolt counts PCC-1 lets the bolts within a 30° arc be treated as one bolt in the sequence, which turns a 48-bolt exchanger into a 12-position pattern.

**Cautions the appendix lists** for every alternative: localised gasket over-compression, flange distortion from uneven tightening, non-uniform seating load, load/unload cycling of the gasket, and non-parallel flanges. Those are exactly what the gap checks and the check rounds catch.

The exact bolt-by-bolt figures for the Quadrant and single-tool Circular patterns (Figures F-3 and F-9 in the 2019 edition) could only be confirmed from secondary sources in this research. Before the app labels a sequence "PCC-1 Quadrant" it should be checked against the figure in a licensed copy; the rule-based description above is enough to implement and test it.

## 4. Load control: where the torque figure comes from

**Target bolt stress (Appendix O).** The assembly bolt stress is chosen from the gasket's target stress and the areas: Sb = SgT × Ag / (nb × Ab), then checked against the bolt and flange limits. Common owner specs settle on **50 ksi for ASTM A193 B7** studs (about 48% of yield), lower for B8 stainless (Class 1 is soft; Class 2 is strain-hardened and size-dependent), and lower again where the flange or a lined gasket governs.

**Torque from stress (Appendix K).** T (ft-lb) = K × D × F / 12, with D the nominal stud diameter in inches, F the target bolt load in pounds on the root area, and K the nut factor. PCC-1's reference table is built on 50 ksi and K = 0.16 and 0.20, which correspond to thread friction coefficients of 0.12 and 0.16 for carbon-steel bolting.

**Nut factor by lubricant (Appendix J).** Typical values: molybdenum-based anti-seize 0.12–0.16; copper or nickel anti-seize 0.15–0.18; machine oil 0.20; dry threads 0.25 and up and never acceptable. K must be the tested value for the lubricant actually on the job, and it goes in the record.

**Reference torque at 50 ksi on root area, B7 studs, computed by the Appendix K formula** (not copied from the standard; verify against the job's bolting specification before use):

| Stud | TPI | Root area in² | Bolt load lb | K = 0.16 ft-lb | K = 0.20 ft-lb |
|---|---|---|---|---|---|
| 1/2 | 13 | 0.126 | 6,300 | 42 | 52 |
| 5/8 | 11 | 0.202 | 10,100 | 84 | 105 |
| 3/4 | 10 | 0.302 | 15,100 | 151 | 189 |
| 7/8 | 9 | 0.419 | 20,950 | 244 | 305 |
| 1 | 8 | 0.551 | 27,550 | 367 | 459 |
| 1-1/8 | 8 | 0.728 | 36,400 | 546 | 683 |
| 1-1/4 | 8 | 0.929 | 46,450 | 774 | 968 |
| 1-3/8 | 8 | 1.155 | 57,750 | 1,059 | 1,323 |
| 1-1/2 | 8 | 1.405 | 70,250 | 1,405 | 1,756 |
| 1-5/8 | 8 | 1.680 | 84,000 | 1,820 | 2,275 |
| 1-3/4 | 8 | 1.979 | 98,950 | 2,308 | 2,885 |
| 1-7/8 | 8 | 2.303 | 115,150 | 2,879 | 3,599 |
| 2 | 8 | 2.652 | 132,600 | 3,536 | 4,420 |
| 2-1/4 | 8 | 3.423 | 171,150 | 5,135 | 6,418 |
| 2-1/2 | 8 | 4.292 | 214,600 | 7,153 | 8,942 |

Root area here is π/4 × (D − 1.3/n)², the basis PCC-1 and ASME VIII use for bolt load. Charts that use the tensile stress area run about 10% higher.

**Gasket stress windows.** Appendix O works from four numbers per gasket: minimum seating stress, minimum operating stress, target assembly stress and maximum stress. PCC-1's own default example sits at roughly 12.5 / 6 / 30 / 40 ksi. The real values are the gasket maker's, and they differ by an order of magnitude between a PTFE sheet and a kammprofile. The app should hold the family, not invent the numbers: soft sheet (PTFE, fibre) low; spiral wound middle; kammprofile and corrugated metal high; RTJ metal-to-metal where bolt stress governs.

**Torque or tension.** Hydraulic tensioning stretches the stud directly and removes the nut factor from the problem. Common owner practice: torque up to 1-inch studs, tension from 1-1/8 or 1-1/4 inch and on critical or hot joints. Tensioning has its own patterns:

| Coverage | Procedure |
|---|---|
| **100%** (a tensioner on every stud) | One pressurisation of all tools, nuts run down, release, then a check pass. The preferred method: uniform and fastest. |
| **50%** (every second stud) | Studs numbered 1 and 2 alternately. Pressure A on the 1s, pressure B on the 2s, with A set higher than B to pay for the load the 1s lose when their neighbours are tensioned. Repeat both passes if any nut still turns. |
| **25%** (every fourth stud) | Four groups, four pressures, same logic. Used only where the tooling cannot cover more. |

The tensioner vendor's load-loss (load transfer) factor sets pressure A, and it rises with grip length over stud diameter.

**Dwell and retightening.** PCC-1-2019 recommends at least four hours of dwell before the retightening round. Manufacturer test data behind the next edition: skived PTFE loses about 12% in the first 15 minutes and little more by four hours; expanded and restructured PTFE relax in 15 minutes what virgin PTFE takes 24 hours to lose; compressed fibre gains little after one hour; spiral wound and kammprofile barely relax at all. "Hot torque" has been renamed the **start-up retorque** and is done only to the owner's procedure, never by habit.

**Alignment (Appendix E).** PCC-1 sets limits for centreline high/low, parallelism (gap variation round the flange), rotational two-hole offset and excessive spacing, in Table E-2-1. Typical owner adoptions are 1/16 inch (1.5 mm) centreline, 1/32 inch (0.8 mm) parallelism and 1/16 inch two-hole, tighter for Class 600 and up. The table itself was not retrievable in this research; the app should prompt the checks and let the company enter its limits.

## 5. Flange types and what changes

| Flange | What changes | Pattern |
|---|---|---|
| ASME B16.5 raised face, Class 150–2500, steel | Nothing special. Stud count and size from the class table. | Legacy or any Appendix F alternative |
| B16.5 ring-type joint (RTJ) | Metal ring seats on a small area: low first round to seat the ring square, then normal staging; tensioning common at Class 900 and up; never the single-tool Circular pattern | Legacy, Modified, Quadrant, tensioning |
| B16.47 Series A and B, 26–60 inch | Large counts (28–64+): group bolts by 30° arc, multiple tools, tensioning | Quadrant, #4/#5, tensioning |
| Cast iron Class 125/250 (B16.1), bronze | Flat face, full-face gasket, brittle: torque ceilings well below steel, never mate a raised-face steel flange to a flat cast-iron one without a full-face gasket and the raised face considered | Legacy; conservative staging; lower stress target |
| Glass-lined, PTFE-lined, FRP flanges | Very low torque (vendor figures), spring washers, mandatory retorque after 24 hours, never hot-torque glass | Legacy; extra rounds at low increments |
| Heat-exchanger girth flanges | High bolt counts, thick flanges, thermal cycling: multi-tool or tensioning, hot start-up retorque per owner | Quadrant or #4, tensioning 50/100% |
| API 6A / 6BX wellhead | BX gasket, metal-to-metal face contact at full load; bolt stress targets from API 6A; tensioning typical | Cross; tensioning |
| Compact flanges (Norsok L-005, Vector/Techlok, SPO) | Elastic seal ring, two-stage make-up to face contact; vendor procedure governs | Vendor procedure, usually two passes 50/100% |
| Wafer and lug valves (through bolts) | Soft seats: hit the valve maker's torque, not the flange's; alignment first, no over-torque | Legacy |
| Orifice flanges, spectacle blinds | Thickness only; gasket on both faces of a blind | Legacy |

## 6. Steel flange bolting, B16.5, to drive the app

Stud count × stud diameter per NPS and class (from B16.5 dimensional tables; spot-checked for Class 150 against published charts; the full table must be checked against B16.5 before it ships):

| NPS | 150 | 300 | 600 | 900 | 1500 | 2500 |
|---|---|---|---|---|---|---|
| 1/2 | 4 × 1/2 | 4 × 1/2 | 4 × 1/2 | 4 × 3/4 | 4 × 3/4 | 4 × 3/4 |
| 3/4 | 4 × 1/2 | 4 × 5/8 | 4 × 5/8 | 4 × 3/4 | 4 × 3/4 | 4 × 3/4 |
| 1 | 4 × 1/2 | 4 × 5/8 | 4 × 5/8 | 4 × 7/8 | 4 × 7/8 | 4 × 7/8 |
| 1-1/4 | 4 × 1/2 | 4 × 5/8 | 4 × 5/8 | 4 × 7/8 | 4 × 7/8 | 4 × 1 |
| 1-1/2 | 4 × 1/2 | 4 × 3/4 | 4 × 3/4 | 4 × 1 | 4 × 1 | 4 × 1-1/8 |
| 2 | 4 × 5/8 | 8 × 5/8 | 8 × 5/8 | 8 × 7/8 | 8 × 7/8 | 8 × 1 |
| 2-1/2 | 4 × 5/8 | 8 × 3/4 | 8 × 3/4 | 8 × 1 | 8 × 1 | 8 × 1-1/8 |
| 3 | 4 × 5/8 | 8 × 3/4 | 8 × 3/4 | 8 × 7/8 | 8 × 1-1/8 | 8 × 1-1/4 |
| 3-1/2 | 8 × 5/8 | 8 × 3/4 | 8 × 7/8 | — | — | — |
| 4 | 8 × 5/8 | 8 × 3/4 | 8 × 7/8 | 8 × 1-1/8 | 8 × 1-1/4 | 8 × 1-1/2 |
| 5 | 8 × 3/4 | 8 × 3/4 | 8 × 1 | 8 × 1-1/4 | 8 × 1-1/2 | 8 × 1-3/4 |
| 6 | 8 × 3/4 | 12 × 3/4 | 12 × 1 | 12 × 1-1/8 | 12 × 1-3/8 | 8 × 2 |
| 8 | 8 × 3/4 | 12 × 7/8 | 12 × 1-1/8 | 12 × 1-3/8 | 12 × 1-5/8 | 12 × 2 |
| 10 | 12 × 7/8 | 16 × 1 | 16 × 1-1/4 | 16 × 1-3/8 | 12 × 1-7/8 | 12 × 2-1/2 |
| 12 | 12 × 7/8 | 16 × 1-1/8 | 20 × 1-1/4 | 20 × 1-3/8 | 16 × 2 | 12 × 2-3/4 |
| 14 | 12 × 1 | 20 × 1-1/8 | 20 × 1-3/8 | 20 × 1-1/2 | 16 × 2-1/4 | — |
| 16 | 16 × 1 | 20 × 1-1/4 | 20 × 1-1/2 | 20 × 1-5/8 | 16 × 2-1/2 | — |
| 18 | 16 × 1-1/8 | 24 × 1-1/4 | 20 × 1-5/8 | 20 × 1-7/8 | 16 × 2-3/4 | — |
| 20 | 20 × 1-1/8 | 24 × 1-1/4 | 24 × 1-5/8 | 20 × 2 | 16 × 3 | — |
| 24 | 20 × 1-1/4 | 24 × 1-1/2 | 24 × 1-7/8 | 20 × 2-1/2 | 16 × 3-1/2 | — |

Studs 1 inch and under are UNC; 1-1/8 and up are 8-UN. Class 400 follows Class 300 counts with Class 600 diameters above 4 inch and is rarely stocked.

## 7. What PipeFit Pro should build

The current tool is a Class 125/250 cast-iron bolt-up with one pattern. It should become the bolting standard on the phone. In order of value:

1. **Steel flanges first.** Class 150–2500 from the table above, with Class 125/250 cast iron kept. Pick the class and size and the joint fills in stud count and size. Later: B16.47 A/B.
2. **Six methods, one gate.** Legacy, Modified Legacy, Quadrant (offered at 16 bolts and up), Circular (offered only when the gasket is hard), Two tools, Four tools, and Tensioning at 100/50/25% coverage. The screen keeps its rule that only the bolt the sequence asks for can be tapped; with two or four tools it asks for the group.
3. **PCC-1 staging.** Snug ≤ 20%, then 20–30%, 50–70%, 100%, then circular passes that repeat until the bolter answers "no nut moved", then a 4-hour retightening round that the joint record tracks and the Projects Today view nudges. Gap checks between rounds, with the company's alignment limits.
4. **Reference torque, not a guess.** Stud size × material (B7 default 50 ksi, B8 Class 1 and 2, B16, L7, B8M) × lubricant chip (moly, copper or nickel, oil) by the Appendix K formula, shown as "reference; the job's bolting spec governs", with a gasket-family sanity band. The formula stays visible, so a foreman can reproduce the number.
5. **A company bolting spec, entered once.** Target stress, lubricant and K, gasket family and method per class and size. Every joint inherits it. This is the plug-and-play layer a buyer pays for, and it is what makes a 20-hire crew bolt the same way.
6. **The joint record becomes an Appendix R record.** Tool and calibration ID (from the Calibration tool), lubricant and K, target stress and torque, gasket, pattern, rounds with times, bolter and witness signatures, retighten time. PDF per joint, as the shift report already does.
7. **Voice and Edu.** "Sixteen bolt, class 600, quadrant" opens the right joint. A bolting module in Orientation carries the PCC-1 Appendix A content a qualified bolter has to know, and feeds the passport's flange bolt-up skill.

Nothing above needs a server or a key.

## Sources

Primary and secondary sources consulted. Direct page fetches were blocked from this environment, so figures marked "secondary" were confirmed through search summaries of these pages and should be checked against a licensed copy of PCC-1 before they are printed on a tag.

- [ASME PCC-1-2022, ANSI webstore listing](https://webstore.ansi.org/standards/asme/asmepcc2022-2482719)
- [ASME PCC-1-2022: Pressure Boundary Flange Joints, ANSI blog](https://blog.ansi.org/ansi/asme-pcc-1-2022-pressure-boundary-flange-joints/)
- [What's New in ASME PCC-1-2022 (ResearchGate)](https://www.researchgate.net/publication/376058701_What's_New_in_ASME_PCC-1-2022)
- [ASME PCC-1-2019 text (hosted copy)](https://ssmalloys.com/wp-content/uploads/2024/10/ASME-PCC-1%E2%80%932019.pdf)
- [Hex Technology: Bolt Tightening Sequence Recommendations and Restrictions](https://www.hextechnology.com/articles/bolt-tightening-sequences/)
- [Teadit: Alternative Flange Assembly Methods](https://teadit.com/us/article/alternative-flange-assembly-methods/)
- [Valve World Americas Tech Talk, Brad Allen, October 2023](https://teadit.com/wp-content/uploads/2024/02/VWAM_October2023_Pgs-32-33_Tech-Talk_Brad-Allen_HR.pdf)
- [Enerpac: Bolt Tightening Sequence, Why it Matters](https://blog.enerpac.com/bolt-tightening-sequence-why-it-matters/)
- [Bolting Resources: Bolt Tightening Sequence](http://www.mike.boltingresources.com/index_htm_files/Bolt%20Tightening%20Sequence.pdf)
- [EPCLand: ASME PCC-1 Bolt Torque Calculation](https://epcland.com/asme-pcc-1-bolt-torque-calculation/)
- [Eng-Tips: Bolt target torque, ASME PCC-1](https://www.eng-tips.com/threads/bolt-target-torque-asme-pcc-1.432641/)
- [Metalmark Engineering: PCC-1 Appendix O stresses](https://www.metalmarkengineering.com/codecalculationexamples/blog-post-pcc1-appo-stress)
- [Teadit: Going Beyond Torque, the values of PCC-1 Appendix O](https://teadit.com/us/article/going-beyond-torque-the-values-of-asme-pcc-1-appendix-o-on-bolted-flange-joint-assembly/)
- [Atlas Copco: What is 25, 50 and 100 percent bolt tensioning](https://www.atlascopco.com/en-us/itba/expert-hub/product-training/what-is-25-50-100-percent-bolt-tensioning)
- [Atlas Copco: Tensioning procedure, 50% bolt-to-tensioner ratio](https://picontent.atlascopco.com/cont/external/dir/87/16434663307_A2770001_html5_external/en-US/16361577227.html)
- [Nord-Lock: What is the load transfer factor](https://www.designworldonline.com/what-is-the-load-transfer-factor/)
- [Valve World Americas: Optimizing dwell time for bolted flange installation](https://valve-world-americas.com/optimizing-dwell-time-for-bolted-flange-installation/)
- [Pumps & Systems: Gasket relaxation and the importance of retorques](https://www.pumpsandsystems.com/gasket-relaxation-importance-retorques-bolted-flange-joints)
- [Valve Magazine: Going beyond torque, July 2025](https://valvemagazine.com/articles/going-beyond-torque/)
- [Lilly Fasteners: ASTM A193 B7 stud torque chart](https://www.kglilly.com/blog/astm-a193-b7-stud-torque-chart)
- [Fastenal: Torque-tension relationship for ASTM A193 B7](https://crafter.fastenal.com/static-assets/pdfs/Torque-Tension_Chart_for_B7.pdf)
- [Projectmaterials: Class 150 flange bolt chart](https://www.blog.projectmaterials.com/quick-answers/gaskets-bolts/flange-bolt-chart/)
- [Engineering Toolbox: ASME B16.5 flanges and bolt dimensions](https://www.engineeringtoolbox.com/amp/flanges-bolts-dimensions-d_464.html)
- [Hydratight: Why ASME PCC-1 is the benchmark](https://www.hydratight.com/en-gb/why-asme-pcc-1-is-the-benchmark-for-bolted-flange-joint-assembly/)
- [Industrial Monitor Direct: PCC-1 flange alignment tolerances](https://industrialmonitordirect.com/blogs/knowledgebase/asme-pcc-1-flange-alignment-tolerances-for-ansi-b165-class-150)
