# PipeFit Pro — User Guide

Everything in this app does one job: turn what you can **measure** into what you have to **cut**.

This guide goes module by module. For each one: what it is for, what to measure, what to type, what comes back, **why it comes back that way**, and how to check it against your own head before you cut steel.

---

# Part 1 — Read this first

## The one thing the whole app is about

A drawing gives you **centre-to-centre**. A saw needs **cut length**. They are never the same number, because a fitting occupies some of the distance between two centres.

```
    centre                                          centre
      |<---------------- centre to centre ---------->|
      |         |<-------- pipe cut -------->|       |
      |<------->|                            |<----->|
       takeout A                              takeout B
```

**Cut = centre-to-centre − takeout A − takeout B − any weld gaps.**

Every module in this app is that sentence, worked for a different shape of job. Once you see it, the app stops being ten calculators and becomes one.

## Where the numbers come from

Nothing here is a rule of thumb someone remembered.

| Kind of number | Source |
|---|---|
| Fitting takeouts | The Lindsey Pipefitters Handbook tables, transcribed and checked |
| Pipe OD and wall | ASME B36.10M |
| Butt weld fittings | ASME B16.9 |
| Flanges | ASME B16.5 |
| Screwed fittings | ASME B16.3 |
| Pipe threads | ASME B1.20.1 |
| Miter code limit | ASME B31.3 §304.2.3 |
| Bend geometry | The bend radius, worked exactly |

**1,370 automated tests** run on every change. Ten misprints were found in the printed handbook while transcribing it, and each one is pinned by a test so it cannot quietly come back.

## Why you can trust it without second-guessing

The app is checked against the multipliers a fitter already carries in his head. Multiply the offset by these:

| Fitting angle | Travel | Run | Shrink |
|---|---|---|---|
| 11.25° | × 5.126 | × 5.027 | × 0.098 |
| 22.5° | × 2.613 | × 2.414 | × 0.199 |
| 30° | × 2.000 | × 1.732 | × 0.268 |
| **45°** | **× 1.414** | **× 1.000** | **× 0.414** |
| 60° | × 1.155 | × 0.577 | × 0.577 |
| 90° | × 1.000 | × 0 | × 1.000 |

The app agrees with every one of them to **four decimal places**, and a test proves it on every build. If it ever disagrees with that table, the app is wrong — not the table.

## Set three things once

**Settings** (gear, top right of any screen).

| Setting | Set it to | Why |
|---|---|---|
| **Default size** | The pipe you are on today | Every screen opens on it. Saves a tap on every job. |
| **Weld gap** | Your standard root gap, default 3/32" | Comes off welded and flanged ends only. A screwed or soldered joint pulls up tight and never has it deducted. |
| **Fractions** | 1/16 for most work, 1/32 or 1/64 for tight tolerance | The decimal above the fraction is always the exact figure. Cut to the decimal when it matters. |
| **Length readout** | Inches | The calculator stays in inches. Press **FT** when you actually want feet. |

---

# Part 2 — The three ideas everything is built on

## 1. Takeout — why a fitting "eats" length

An elbow does not start at the centre point. The centre point is where two lines cross in the air; the fitting's face is some distance back from it. That distance is the **takeout**.

For a **bend you make yourself**, the takeout is pure geometry:

> takeout = bend radius × tan(half the angle)

A 2" long radius elbow bends on a 3" radius (1.5 × the size). At 90°, tan 45° = 1, so the takeout is **3"**. At 45°, tan 22.5° = 0.4142, so it is **1.2426"**.

For a **fitting you buy**, the takeout is whatever the manufacturer made it, out of the handbook table.

## 2. Every offset is a right triangle

```
                          ^
                          |
              travel  /   |  offset  (how far you must move over)
                    /     |
                  /       |
                / angle   v
    ----------+-----------------------
              |<-- run -->|
```

- **Offset** — how far the pipe has to shift. You measure this.
- **Run** — how far it advances along the original line while it shifts.
- **Travel** — centre to centre of the two fittings. **This is the number the cut comes from.**
- **Shrink** — travel minus run. What the offset costs you in length.

Pick any two and the third follows. That is all the offset screens do.

## 3. A bend is NOT a bought fitting

They agree at 90° and disagree everywhere else.

| 2" long radius, 45° | Takes out |
|---|---|
| Pipe you bent | 1.2426" |
| **Elbow you bought** | **1-3/8"** |

A run of bought fittings worked to the bend formula cuts **every piece an eighth of an inch long**.

**The app keeps them separate on purpose.** **Cut length** offers both, labelled. **Simple offset**, **Rolling offset** and **Pipe bend** work the bend, because that is what a bender does.

---

# Part 3 — The modules

---

## Simple offset

**Get around an obstruction in one plane.** The pipe moves one way — up, down, left or right — and carries on.

### What to measure

1. **Offset** — how far the pipe must shift to clear the obstruction, centre to centre.
2. Either the **fitting angle** you intend to use, or the **run** you have room for. Not both — the app solves whichever you do not give it.

### Step by step

1. Tap **Simple offset**.
2. Set the pipe with the wrench button at the bottom (size, LR/SR, schedule).
3. Type the **Offset**.
4. Tap an angle preset — **45°** is the one you will use most.
5. Read **PIPE CUT**.

### What each number means

| Result | What it is | Why you care |
|---|---|---|
| **PIPE CUT** | The piece between the two fittings | This is what you cut |
| **Travel** | Centre to centre of the two fittings | The cut before deductions |
| **Run** | How far it advances along the line | Tells you if it fits the space you have |
| **Shrink** | Travel − run | What the offset costs you in overall length |
| **Setback** | Takeout per fitting | What comes off each end |
| **Cut angle** | The angle the fittings turn through | Confirms the preset took |
| **Inside arc / Outside arc** | Throat and back of the bend | Marks for bending, not for buying |

### Worked example

**2" schedule 40, long radius, 12" offset at 45°, default 3/32" gap:**

| Figure | Value |
|---|---|
| Run | 12.0000" |
| Travel | 16.9706" |
| Shrink | 4.9706" |
| Setback (each end) | 1.2426" |
| **PIPE CUT** | **14.2978"** |

**Check it in your head:** 12 × 1.414 = 16.97 travel ✓. Two takeouts of 1.24 = 2.49. 16.97 − 2.49 = 14.48, less two 3/32" gaps (0.19) = **14.29** ✓

### The square jog — 90°

Preset **90°**. The pipe goes straight across and advances nothing. **Run = 0, travel = the offset.**

**24" offset, 2" pipe:** run 0, travel 24.00, setback 3.00 each end → **PIPE CUT 17.81"**

### When the run is fixed instead

Tap **Set run** and type the run. The angle falls out of it and shows as **Cut angle**. A run of **0** gives you the square jog.

Use this when the space along the line is what is tight, not the angle.

### Where people go wrong

- **Measuring the offset to the pipe surface instead of the centre.** Everything in this app is centre to centre.
- **Forgetting the gap is already off.** PIPE CUT is ready to cut. Do not deduct again.
- **Using a 45° preset while installing bought 45° elbows.** This screen works a *bend*. For bought fittings use **Cut length**, which has both.

---

## Rolling offset

**The obstruction makes the pipe move two ways at once** — up *and* over. A rolling offset is a simple offset that has been rotated around the pipe.

### Why it is two triangles, not one

Look down the pipe from the end. The **rise** (up/down) and the **roll** (left/right) are two legs of a right triangle. Their hypotenuse is the **true offset** — the real, straight-through distance the pipe has to move.

```
   end view                        side view
      ^                                   ^
      | rise                   travel  /  | true offset
      |                              /    |
      +-------->  roll             / -----+
       \                         run
        \  true offset
```

Then the **true offset** and the **run** form a second right triangle whose hypotenuse is the **travel**. Same theorem twice. That is the whole of it.

### Step by step

1. Tap **Rolling offset**.
2. Set the pipe.
3. Type **Rise / set** (up or down) and **Roll** (left or right).
4. Tap an **Elbow angle** preset, or tap **Run** to fix the run instead.
5. Read **PIPE CUT**.

### What each number means

| Result | What it is |
|---|---|
| **True offset** | The real diagonal distance, straight through |
| **Roll angle** | How far around the pipe the offset lies — which way to point the fitting |
| **Travel C2C** | Centre to centre of the two fittings |
| **Run** | Advance along the original line |
| **PIPE CUT** | The piece between them |

**The roll angle is the one people miss.** It is not a cut dimension — it tells you how far to rotate the fitting around the pipe so the offset lands where you measured it.

### Worked example

**2" schedule 40 LR, rise 12", roll 9", 45° elbows:**

| Figure | Value |
|---|---|
| True offset | 15.0000" |
| Roll angle | 36.87° |
| Run | 15.0000" |
| Travel C2C | 21.2132" |
| Setback | 1.2426" |
| **PIPE CUT** | **18.5404"** |

**Check it:** 12 and 9 is a 3-4-5 triangle scaled by three — true offset **15** ✓. At 45° the run equals the true offset, 15 ✓. Travel = 15 × 1.414 = **21.21** ✓

### Where people go wrong

- **Entering the true offset in the rise box.** Rise and roll are the two *separate* measurements. The app works the true offset out.
- **Ignoring the roll angle.** Get it wrong and the spool is geometrically perfect and points the wrong way.
- **Rise and roll both zero** — there is no offset to solve, and the app says so.

---

## Cut length

**The most used screen in the app.** You have a centre-to-centre dimension off a drawing and a fitting on each end.

### Step by step

1. Tap **Cut length**.
2. Set the pipe.
3. Type **C2C length**.
4. Pick **Joint** — screwed, welded, flanged or soldered.
5. If flanged, pick the **Class** — 150, 300, 600 and up.
6. Pick **End A** and **End B**.
7. Read **PIPE CUT**.

### Why the joint family matters

It changes two things at once:

1. **Which table the takeout comes from.** A screwed 90 and a welded 90 in the same size are different castings with different dimensions.
2. **Whether the weld gap is deducted.** Welded and flanged ends leave a root gap. Screwed and soldered joints pull up tight and never have one deducted.

That second one was a real bug once. It is now a rule in the code and a test.

### Worked example

**24" C2C, 2" schedule 40, welded long radius 90 on both ends:**

| Figure | Value |
|---|---|
| End A takeout | 3.0000" |
| End B takeout | 3.0000" |
| Total deduction | 6.0000" |
| **PIPE CUT** | **18.0000"** |
| Weight | 5.48 lb |

With a 1/8" gap on both ends: **17.75"**

### Anything not on the list

Pick **Custom** on that end and type the takeout yourself. Use it for a valve, a strainer, a specialty fitting, or anything a vendor drawing gives you directly.

### Where people go wrong

- **Leaving the joint on the wrong family.** Check the **Joint** chip before you read the number.
- **Assuming a 45 is a 45.** A bought 45 and a bent 45 have different takeouts. Both are on the list, labelled.
- **Not setting the class on flanged.** A 150 and a 300 flange are not the same length.

---

## Thread engagement

**How far a threaded joint pulls up**, and what that does to your cut.

### Why a threaded joint is different

On a welded joint the pipe stops at the fitting face. On a threaded joint the pipe **screws into** the fitting — so the pipe reaches past the face, and the deduction is smaller than the fitting's centre-to-face.

> **Deduction per end = fitting centre-to-face − total engagement**

Engagement has two parts:

- **Hand tight (L1)** — how far it goes in by hand. From ASME B1.20.1.
- **Wrench makeup** — how far your wrench turns take it further. Each turn advances the pipe by one **pitch**, and pitch is 1 ÷ threads per inch.

### Step by step

1. Tap **Thread engagement**.
2. Tap the **Size**.
3. Set **Wrench turns** if you pull up tighter or looser than standard.
4. Type **C2C length** to get the cut.

### Worked example

**1" NPT, standard 3 wrench turns, 24" centre to centre:**

| Figure | Value | Where it comes from |
|---|---|---|
| Threads per inch | 11.5 | from the standard |
| Pitch | 0.0870" | 1 ÷ 11.5 |
| Hand tight (L1) | 0.4000" | from the standard |
| Wrench makeup | 0.2609" | 3 × 0.0870 |
| **Total engagement** | **0.6609"** | hand tight + wrench |
| Thread remaining | 0.3236" | what is left unused |
| Fitting centre-to-face | 1.5000" | B16.3 90° elbow |
| **Deduction per end** | **0.8391"** | 1.5000 − 0.6609 |
| **PIPE CUT** | **22.3217"** | 24 − 2 × 0.8391 |

**Watch "Thread remaining".** If it goes negative the joint is over-threaded — the pipe bottoms out before it seals.

### Where people go wrong

- **Using the welded takeout on screwed pipe.** It is a different, bigger number and the piece comes out short.
- **Not adjusting wrench turns to how you actually pull up.** Two extra turns on 1" pipe moves the cut by about 3/16" over two ends.

---

## Pipe bend

**Any angle, any radius, on your own bender.** This is where the marks come from.

### Why bending needs different numbers from cutting

When you bend, the pipe does not go round the corner — it cuts the corner on an arc. Three numbers describe that:

- **Setback** — from the point where the two legs would cross, back to where the bend starts. `radius × tan(half the angle)`.
- **Arc length** — how much pipe is actually inside the bend.
- **Gain** — tangent total minus arc. **What you save by bending instead of mitring the corner.** Forget it and every piece comes out long.

```
            .-'''-.
          .'       `.   <- arc length (pipe in the bend)
         /           \
        |             |
   -----+             +-----
        ^             ^
     setback       setback
        |<-- to the point of intersection -->|
```

### Step by step

1. Tap **Pipe bend**.
2. Pick the **Size**, then a **Radius** rule — 3D tight, 5D common field minimum, 10D long sweep — or type a radius.
3. Type the **Angle**.
4. Type **Leg A** and **Leg B**, measured **to the point of intersection**.
5. Set **Stock** if you want to know how many legs come out of a length.
6. Read the marks.

### Worked example

**2" pipe, 5D radius (10"), 45°, legs 30" and 30":**

| Figure | Value |
|---|---|
| Setback (per tangent) | 4.1421" |
| Arc length | 7.8540" |
| Gain | 0.4303" |
| Tangent total | 8.2843" |
| **Mark from end** | **25.8579"** |
| End of bend | 33.7118" |
| Piece length | 59.5697" |

**Check it:** setback = 10 × tan 22.5° = 4.142 ✓. Mark = 30 − 4.142 = **25.858** ✓. Arc = 10 × 45° in radians = 10 × 0.7854 = **7.854** ✓

**At 90°, 5D radius, legs 24" and 18":** setback 10.00, arc 15.71, gain 4.29, mark from end 14.00, piece 37.71.

### Springback

If your bender overbends, put your known springback in and the app gives you the **overbend angle** to pull to. Leave it at zero if you have already dialled it out.

---

## Saddle bend

**Jump over a pipe or a beam without changing the line the conduit runs on.** It goes up, over, and back down to exactly where it was.

### Three point or four point

- **Three point** — for a round obstruction. One centre bend with two half-angle bends either side.
- **Four point** — for a wide obstruction. Two offsets back to back with a flat run over the top. Needs the **Width**.

### Why the centre bend is double the side bends

The conduit has to come back to the same line it started on. If the centre bend turns it through 45°, each side bend must turn it back through half that — 22.5° — for the two ends to end up parallel.

### Step by step

1. Tap **Saddle bend**.
2. Pick **Three point** or **Four point**.
3. Type the **Depth** — how far it has to rise to clear.
4. Type **To obstruction** — from the conduit end to the centre of the obstruction.
5. On a four point, type the **Width**.
6. Pick the centre bend angle.
7. Bend at the marks, in order.

### Worked example

**Three point, 2" deep, 20" from the end, 45° centre bend:**

| Figure | Value |
|---|---|
| Side bend angle | 22.5° |
| Multiplier | 2.6131 |
| Shrink per bend pair | 0.3978" |
| Total shrink | 0.7956" |
| Developed length | 10.4525" |
| Minimum clearance | 4.8284" |

| Mark | At | Bend | Note |
|---|---|---|---|
| Mark 1 | 15.172" | 22.5° | Bend up, arrow to the centre mark |
| Centre | 20.398" | 45° | Bend over the obstruction |
| Mark 3 | 25.624" | 22.5° | Bend down, back to level |

**Check it:** spacing = depth × multiplier = 2 × 2.6131 = 5.226". Centre mark is at 20 + 0.398 shrink = 20.398, and the outer marks sit 5.226 either side ✓

**Minimum clearance** is the one to watch. If the obstruction is closer to the end than that figure, the first bend would fall off the end of the conduit — and the app refuses rather than giving you a mark you cannot make.

---

## Miter bend

**Make an elbow out of straight pipe** when you do not have a fitting, or the size does not come as one.

### How the cut angle is worked out

With `n` segments you make `n − 1` cuts. Each cut face turns the pipe by **twice** the angle you cut it at, because both halves tilt. So:

> cut angle = total turn ÷ (2 × number of cuts)

A 90° elbow in 4 segments is 3 cuts, so each cut is 90 ÷ 6 = **15°**.

The two **end segments** have one mitred face. The **middle segments** have two, so their total included angle is double.

**Throat** is the short side of a segment, **back** is the long side. They come from the centreline radius minus and plus half the pipe OD.

### Step by step

1. Tap **Miter bend**.
2. Type the **Total turn** and pick the **Segments**.
3. Set the **Centreline radius**.
4. Mark and cut throat and back lengths on each segment.

### Worked example

**90° total, 4 segments, 2" schedule 40, 6" centreline radius:**

| Figure | Value |
|---|---|
| Cuts | 3 |
| **Cut angle** | **15.00°** |
| End segment | 15.00° (one mitred face) |
| Mid segment | 30.00° (two mitred faces) |
| Throat length | 2.5790" |
| Back length | 3.8518" |
| Cutback | 0.6364" |
| Centreline arc | 9.4248" |

**Check it:** 2" pipe OD is 2.375", so half is 1.1875. Throat = 2 × (6 − 1.1875) × tan 15° = 2 × 4.8125 × 0.2679 = **2.579** ✓

### The code check

Above a **22.5° cut angle** the app warns you: ASME B31.3 §304.2.3 requires design verification for miters above that. It does not stop you — it tells you, because that is an engineering decision, not a field one.

More segments = smaller cut angle = a smoother, stronger elbow. If you get the warning, add a segment.

---

## 3D spool

**Build a whole run and look at it before you cut any of it.**

### How a spool is described

Each leg turns off the one before it by two numbers:

- **Bend** — how far it turns (the elbow angle).
- **Roll** — how far around the previous leg's axis that turn is pointed.

Roll is the part people find odd. With a 90° bend and 0° roll the pipe turns up. Same 90° bend at 90° roll and it turns sideways instead. Bend says *how much*, roll says *which way*.

### Step by step

1. Tap **3D spool**.
2. Set the pipe and the gap.
3. Set the first leg's **Length**.
4. **Add leg**, then give it a length, a **Bend** and a **Roll**.
5. Drag the picture to turn it. **NE / NW / SW / SE** jump to the four isometric corners.
6. **Hold a leg in the picture and drag along it** to stretch or shorten it.
7. Read **TOTAL PIPE** and the per-leg cuts.

### Worked example

**2" schedule 40 LR, three legs: 36", then 24" at 90°, then 30" at 90°, 3/32" gap:**

| Figure | Value |
|---|---|
| Centre to centre | 90.00" |
| **Total pipe** | **77.63"** |
| Elbows | 2 |

| Leg | C2C | Cut |
|---|---|---|
| 1 | 36.00" | 32.91" |
| 2 | 24.00" | 17.81" |
| 3 | 30.00" | 26.91" |

Leg 1 loses one takeout (it has a fitting on one end only). Leg 2 sits between two elbows and loses two. That is the whole difference, and you can see it in the numbers.

### Turning the spool over

Three controls, and **not one of them changes a cut**. The cut comes from the
leg length and the takeout, the takeout comes from the bend angle, and all
three of these touch only the roll. Turn a spool over as many times as you
like: the pipe you buy and the pieces you cut are the same pieces.

| Control | Where | What it does |
|---|---|---|
| **Mirror** | under the legs | The opposite hand. Same lengths, same bends, every roll reversed. |
| **Flip all** | under the legs | Every leg turns the other way. What ran up now runs down. |
| **⇕ on a leg** | on the leg's row | Turns that one leg the other way, and everything past it comes with it. |

**Mirror** is the one you want when the same spool is needed handed for the
other side of a rack. **Flip all** is the one you want when the whole run
should fold the other way.

> **A flat spool is its own mirror.** If nothing has any roll in it, the spool
> lies in one plane, and reflecting a flat thing in its own plane does nothing.
> That is not the button failing — it is what a flat spool is. Use **Flip all**
> to fold it the other way instead. The hint under the buttons tells you which
> case you are in.

Flipping one leg carries the legs after it. That is correct and it is what you
want: each leg is described as a turn off the one before, so they travel with
it rather than the spool breaking in half.

### Why the drawing is drawn the way it is

It is a **true isometric** projection — yaw −45°, pitch 35.264°. That is the only orientation where all three axes are foreshortened equally and sit 120° apart, and it is what makes iso paper read as solid instead of flat.

Rotation is limited to about **260°** on purpose. The angles that are missing are the ones where the spool goes edge-on and legs hide behind each other. They are not skipped past — they are not in the range at all, so no matter how far you drag, every leg stays visible.

---

## Calculator

A trade calculator that understands feet, inches and fractions — and **stays in inches**.

### How to enter a dimension

Type the number, **then** the unit. Not the other way round.

| You want | Press |
|---|---|
| 30 inches | `3` `0` `Inch` |
| 6 feet | `6` `Feet` |
| 30-1/2 inches | `3` `0` `Inch` `1` `/` `2` `Inch` |
| 6 foot 3 | `6` `Feet` `3` `Inch` |

### It stays in inches

`30 Inch × 6 =` gives **180"**, not 15 feet. The **IN** marker top left tells you which unit you are reading.

- **Feet** converts what is on display to feet and inches — `2' 6"`. The marker changes to **FT-IN**.
- **Inch** takes it back.
- The choice sticks until you change it, and survives a **Clear**.

### The trade keys

The dark keys along the top are the pipefitting ones. **Conv** turns on the second function printed above each key.

| Key | What it does |
|---|---|
| **Offset**, **Run**, **Travel** | Enter any two, the third solves |
| **Angle/Slope** | Angle or slope of a run |
| **Pipe Size**, **Pipe Mat'l** | Set the pipe for the trade keys |
| **Circle**, **x²**, **√x** | Area and diameter work |
| **Store** / **Rcl** | Hold a figure while you work something else |

### Where people go wrong

- **Pressing the unit first.** It does nothing. Number, then unit.
- **Reading the fraction instead of the decimal.** The fraction is rounded to your setting. The decimal is exact.

---

## Handbook

Every table from the printed book, searchable, **with its page number on it**.

Use it when you want to see the figure the calculation used rather than take it on trust. Search by what you are looking for — "reducer", "flange", "copper", "support" — and the table comes up with its source page so you can check it against the book in your truck.

---

## Settings

| Setting | What it does |
|---|---|
| **Theme** | Light, dark or follow the phone |
| **Units** | Imperial or metric |
| **Fractions** | Off, 1/8, 1/16, 1/32, 1/64 |
| **Length readout** | Inches, or feet + inches, for the calculator |
| **Default size** | Pipe every screen opens on |
| **Weld gap** | Your standard root gap |
| **Stock length** | Length you buy, for counting legs out of a stick |
| **Updates** | What is running, and a manual check |

Settings are stored on the phone only. Nothing leaves it.

---

# Part 4 — Knowing when to trust it

## What is exact and what is not

| Figure | Value |
|---|---|
| **Exact** | Every length, angle, takeout, arc and cut. These are geometry and published tables. |
| **Estimate, and labelled as one** | Fitting weights. They are geometric approximations, not vendor catalogue figures. Pipe weight itself is exact. |

## Fractions versus decimals

The fraction is **rounded to the nearest tick** of the denominator you picked. The decimal above it is the exact figure.

On a 10-foot run at 1/16" rounding you can be out by up to 1/32". Usually nothing. On a tight flange-to-flange fit-up it is not nothing. **Cut to the decimal when the tolerance is tight.**

## When the app refuses to answer

It refuses rather than guessing, and it tells you why:

| Message | What it means |
|---|---|
| "Fitting takeoffs exceed travel" | The fittings are longer than the space. No pipe between them. Use a smaller angle or a shorter radius. |
| "Obstruction is too close to the conduit end" | The first bend would fall off the end. Move the mark or use a steeper angle. |
| "Fitting angle past 90° turns the run back on itself" | Past 90° the pipe doubles back. That is not an offset. |
| "Cut angle exceeds 22.5°" | Code check, ASME B31.3. Not a refusal — add a segment or get it verified. |
| "Thread remaining" going negative | Over-threaded. The pipe bottoms out before it seals. |

**A refusal is information.** It is the app telling you the job as measured cannot be built that way — which is much better news before you cut than after.

## The habit worth keeping

For anything that matters, do this once:

1. Read **PIPE CUT**.
2. Check **Travel** against the multiplier table in Part 1.
3. Check the **takeout** looks right for the fitting in your hand.

Three seconds, and you will never wonder whether the number is good.

---

*PipeFit Pro. Built for the job, tested against the book.*
