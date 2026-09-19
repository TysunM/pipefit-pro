# PipeFit Pro — finding the common measurements

Every screen is reached from the home list. Type what you measured; read what you cut.

---

## 1. Offset around an obstruction — 45°

The one you do most.

**Simple offset** → **Offset** = how far you have to move over → tap preset **45°**.

Read **PIPE CUT**. That is the piece between the two fittings, gap already off.

> **12" offset, 2" pipe, 45°** → travel 16.97, setback 1.24 each end, **cut 14.30**
>
> (14.49 before the two 3/32" weld gaps come off)

`Run` fills itself in: at 45° it equals the offset.

---

## 2. Offset at any other angle

Same screen. Presets are **11.25° · 22.5° · 30° · 45° · 60° · 90°**, or type any angle into **Fitting angle**.

---

## 3. Square jog — 90°

Preset **90°**. The pipe goes straight across and advances nothing.

**Run = 0. Travel = the offset.**

> **24" offset, 2" pipe** → **cut 17.81**  (24 − 3 − 3 − two 3/32" gaps)

---

## 4. When the run is fixed, not the angle

You know how much room you have along the line, and the angle has to fall out of it.

**Simple offset** → **Offset** → tap **Set run** → type the run.

The angle is solved for you and shown as **Cut angle**. A run of **0** gives you the square jog.

---

## 5. Rolling offset — moves two ways at once

**Rolling offset** → **Rise / set** (up or down) → **Roll** (left or right) → tap an **Elbow angle** preset.

- **True offset** — the real diagonal distance, straight through
- **Cut angle** — what you set the fittings to
- **PIPE CUT** — the piece between them

> **12" up, 9" over** → true offset **15"**, roll angle **36.87°**

To fix the run instead of the angle, tap **Run** and type it.

---

## 6. Cut length between two fittings

You have a centre-to-centre dimension off a drawing and a fitting on each end.

**Cut length** → **C2C length** → pick **Joint** (screwed / welded / flanged / soldered) → pick **End A** and **End B**.

Read **PIPE CUT**.

> **24" C2C, 2" pipe, two long radius 90s** → **cut 18"**

Flanged adds a **Class** row — 150, 300, 600 and up. Anything not on the list: choose **Custom** and type the takeout.

---

## 7. Screwed pipe — how far it makes up

**Thread engagement** → **Size** → **C2C length**.

Gives makeup, takeout and tap drill. Override the fitting with **Fitting C-to-face** if yours is not standard.

---

## 8. Bending your own pipe

**Pipe bend** → radius and angle → setback, arc length and gain, with the bend marks.

**Saddle bend** for three and four point saddles. **Miter bend** for a segmented elbow — it checks the B31.3 22.5° limit for you.

---

## 9. Looking a figure up

**Handbook** → search. Every table carries its page number.

---

## 10. Checking the app in your head

Multiply the offset by these. The app agrees to four decimal places — it is tested against them.

| Fitting angle | Travel | Run | Shrink |
|---|---|---|---|
| 11.25° | × 5.126 | × 5.027 | × 0.098 |
| 22.5° | × 2.613 | × 2.414 | × 0.199 |
| 30° | × 2.000 | × 1.732 | × 0.268 |
| **45°** | **× 1.414** | **× 1.000** | **× 0.414** |
| 60° | × 1.155 | × 0.577 | × 0.577 |
| 90° | × 1.000 | × 0 | × 1.000 |

**Travel** = centre to centre of the two fittings.
**Run** = how far the offset advances along the line.
**Shrink** = travel − run, what the offset costs you.

---

## 11. The one trap — a bend is not a bought fitting

They are the same at 90° and different everywhere else.

| 2" long radius 45 | Takes out |
|---|---|
| Bent pipe | 1.2426" |
| **Bought elbow** | **1-3/8"** |

A run of bought fittings worked to the bend formula cuts **every piece an eighth long**.

The **Cut length** screen offers both, labelled. The **Simple offset**, **Rolling offset** and **Pipe bend** screens work the bend, which is what a bender does.

---

## Putting it on someone else's phone

Send them the web link. Works on iPhone and Android, no store, nothing to sign.

**iPhone** — open the link in **Safari** (it has to be Safari) → **Share** →
**Add to Home Screen**.

**Android** — open in Chrome → **⋮** → **Add to Home screen** / **Install app**.

It then opens from an icon like any other app, and works with no signal. It
updates itself the next time they open it after you push a change.

---

## The calculator reads in inches

It stays in inches. 30 inches is `30"`, not `2' 6"`. The **IN** marker top-left says so.

- **Feet** converts what is on display to feet and inches — `2' 6"`, not a decimal. The marker changes to **FT-IN**.
- **Inch** takes it back.
- The choice sticks until you change it, and survives a Clear.
- **Settings → Length readout** sets which one it opens on.

---

## Settings worth setting once

- **Weld gap** — default 3/32". Comes off welded and flanged ends only; a screwed or soldered joint pulls up tight and never has it deducted.
- **Length readout** — Inches (default) or Feet + inches, for the calculator.
- **Fractions** — off, 1/8, 1/16, 1/32, 1/64. The decimal under it is always the exact figure. Cut to the decimal when tolerance is tight.
- **Default size** — the pipe every screen opens on.

---

## Bolting a flange up

**Flange bolt-up** → set the class and size, and the bolt count follows.

- Three passes **across** the flange at about **30%**, **60%** and **100%**, then a fourth pass **round** it at full torque. The fourth is the one that gets skipped and the one that matters.
- Every bolt in a cross pass is followed by the bolt **straight across** from it.
- 8 bolts: `1 5 3 7 2 6 4 8`. 16 bolts: `1 9 5 13 3 11 7 15 2 10 6 14 4 12 8 16`.
- Tap each bolt as you tighten it. **Grey → yellow → orange → blue → green**, one step per pass.
- Tap the wrong bolt and nothing happens: it flashes red on the **right** one and stays put.
- Put the job's final torque in the box and it shows the ft-lb for each pass. It will not guess the figure for you.
- Bolt 1 is the first hole clockwise of top dead centre, half a pitch off the centreline — which is how flanges are drilled.
- **Joint complete** means the sequence was followed, not that the torque was measured. Re-check anything that runs hot once it is up to temperature.

---

## The joint register

**Joint register** on the home screen, or the list icon in the flange bolt-up bar.

- Every bolt-up is written down **on every bolt**. Close the app mid-pass and you come back on the same bolt.
- The **unnamed joint** is saved too. You never have to name anything.
- **Name it** keeps a joint by tag, with the work already done, and clears the unnamed slot for the next one.
- Four bars on a row are the four passes, in the same yellow/orange/blue/green as the face.
- **Part done** at the top, **Finished** below. Delete confirms in the row.
- Changing the size, class or bolt count **starts that joint again** — a sixteen-bolt pattern means nothing on a twelve-bolt flange.
- It lives on that phone. It does not sync, and two people on one flange keep two lists.

---

## The re-torque log

On a finished joint, under **Re-torque**.

- A joint that was right **cold can be slack hot**: the gasket creeps, the bolts and flanges grow at different rates, the whole thing relaxes.
- Once the line has been up to temperature and back, go round at full torque and tap **Record a check**.
- The question is **Bolts moved** or **All tight**, with no default. That finding is the reading, not the date.
- **Bolts took up** = still relaxing, go back after another cycle. **All tight** = settled, and that closes it out.
- The register splits into **Needs a re-check** and **Closed out**. Work the first list after a startup.
- **Clear closed out** never touches a joint still waiting on a check.
- The app will not tell you *when* to go back — that comes from the job's spec, not from an app.
- Reopening a bolt-up, or changing the flange, throws its log away with it.

---

## The 3D spool

**3D spool** → add legs. A leg is **a length and a direction** — 36" east, 24" straight up, 30" north. No bend angle, no roll.

- The app works out every turn and names the fitting: `Turns 90° off leg 1 — 90° elbow`. A turn that is not stock is flagged above the leg list.
- Every leg on the picture carries its length and direction; every fitting carries its angle.
- **Nine views:** the four isometric corners, **Plan**, and an elevation from each side.
- It **opens on the corner this spool reads best from** — the one with no legs crossing and nothing lost end-on.
- **Drag** to turn it: pull right and it goes right, pull down and the top comes over. Nothing is fenced off.
- A leg drawn as a **circle** is coming straight at you. Read its figure — that is what a plan is.
- **Hold a leg** in the picture and drag along it to stretch or shorten it.
- **Mirror** gives the opposite hand; **Turn over** swaps every rise for a drop; **Swing 90°** points the whole spool elsewhere. None of the three changes a cut.

**Saved spools** — under the handing buttons.

- **Save this spool** keeps the legs, pipe and gap on the phone, by name. Survives restarts and updates.
- Tap one to open it. The header says *saved* or *unsaved changes*.
- Same name updates it; a **new name keeps both**. Delete takes two taps.
- A shelf written by a newer app version is never overwritten by an older one.

**Share drawing** — next to Save.

- One page: the spool in three dimensioned views, the cut list, the elbows, and the sticks to pull.
- Phone → PDF to the share sheet. Browser → the print dialog.
- A line drawing, not the shaded screen picture: hairlines, black on white, weld ticks, open ends capped.
- The isometric is the corner it reads best from; a leg drawn as a circle is coming at you — read its figure.
- Unsaved spools print as *Spool*. Save it first to get its name on the sheet.

**Cut list** — under the elbows. How many sticks to pull, what comes off each, and what is left.

- Packed onto **Settings → Stock length**, with **Settings → Saw cut** charged on every piece.
- It finds the **fewest** sticks, and among those the one that leaves the **longest single drop**.
- A cut longer than a stick is named, not quietly planned around.
- Cut length, simple offset and rolling offset now say whether their one cut comes off one stick, and what is left.
