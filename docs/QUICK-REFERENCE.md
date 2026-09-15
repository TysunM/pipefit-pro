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

## The 3D spool

**3D spool** → add legs, each with a length, a bend angle off the last one and a roll.

- **Drag** to turn it. The rotation is the sweep where nothing goes edge on — about 260°, with the dead views taken out rather than passed through.
- **Hold a leg** in the picture and drag along it to stretch or shorten it.
- **NE / NW / SW / SE** jump to the four isometric corners.
