# PipeFit Pro — User Guide

*The only one an industrial fitter needs.*

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

## Set these once

**Settings** (gear, top right of any screen).

| Setting | Set it to | Why |
|---|---|---|
| **Default size** | The pipe you are on today | Every screen opens on it. Saves a tap on every job. |
| **Weld gap** | Your standard root gap, default 3/32" | Comes off welded and flanged ends only. A screwed or soldered joint pulls up tight and never has it deducted. |
| **Fractions** | 1/16 for most work, 1/32 or 1/64 for tight tolerance | The decimal above the fraction is always the exact figure. Cut to the decimal when it matters. |
| **Stock length** | What comes off the rack, default 20' | The cut list packs onto it. Get it wrong and the stick count is wrong. |
| **Length readout** | Inches | The calculator stays in inches. Press **FT** when you actually want feet. |

---

## Back up the phone

Everything you save lives on this phone only: pressure tests and signatures, the joint log, heat book, spools, isos, level readings, shift reports, fitting takeouts and the cut list. **Back it up weekly.**

- **Settings → Back up and restore → Back up now** (or say "back up my phone"). It makes one file and opens the share sheet: email it to yourself or save it to Drive.
- Settings shows when you last backed up, and turns to a warning after a week.
- **Home asks too:** with records on the phone and no backup in a week (or ever), an amber card on Home says what would be lost. **Back up now** makes the file right there; **Not today** hides it for a day.
- **Restore** on this phone or a new one: **Restore from a backup file**, pick it, and the app shows what it would add for each kind of record before anything is written. A backup that came as text can be pasted instead.
- **Restore only ever adds.** A record already on the phone stays as it is, so an old backup cannot undo newer work, and restoring the same file twice adds nothing the second time.
- Settings come back only if you tick **Also put back the settings**.

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
4. Pick **Joint** — screwed, welded, flanged, soldered, PVC socket or no-hub. PVC/CPVC specs start on PVC socket; cast iron soil starts on no-hub.
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

### PVC socket and no-hub — your fitting library

Socket and no-hub makeups differ by maker (Charlotte, Spears, Tyler, AB&I…), so the app does not guess them. **You set each one once and it is kept**, per material, wall and size.

1. Pick **PVC socket** or **No-hub**, and the fitting on each end.
2. The first time, a box asks for that fitting's **takeout**. Type it from the maker's sheet, or for socket fittings measure **Centre to face** and **Socket depth** and the app subtracts them.
3. Tap **Save**. From then on that fitting in that size reads straight from your library — **Change** to correct it, **Remove** to clear it.

| Family | Takeout is | Gap |
|---|---|---|
| PVC socket | Centre to the bottom of the socket (pipe bottoms out) | None |
| No-hub | Centre to the end of the fitting | Coupling centre stop, usually 0 |

**Faster: photograph the maker's sheet.** In the takeout box, tap **Photograph the maker's sheet** and shoot the dimension table (or the box label) flat and square. Claude reads every fitting and size on it at once, and you get a list to check against the paper:

- **Ticked** rows are new or change a saved figure. Only ticked rows are saved, and only when you tap **Save**.
- **Unticked, in orange**: two figures for one fitting (tick the right one), a figure too long for the size (usually millimetres read as inches), a size the line doesn't come in, or a sheet for another schedule than the job's.
- Where a sheet gives centre-to-face and socket depth instead of the takeout, the app does the subtraction and shows it.
- Millimetre sheets are converted. The photo is read and not kept. Needs signal.

**Hands-free: "read this box".** Say **"read this box"** (or "scan the label", "photograph the sheet") and the camera comes up for the job's line, with the mic left open:

- **"Take it"** shoots, once the label or table fills the frame.
- The read comes back to check on screen, the same as by hand.
- **"Save"** keeps what is ticked. **"Again"** goes back to the camera. **"Cancel"** closes it.
- It answers only those words, said on their own. Anything else, including the phone's own voice, is ignored.
- The job's pipe must be PVC, CPVC or cast iron soil; say it first ("2 inch PVC").

**The fitting library screen** (Logs tab → Fitting library, or say "fitting library") shows every saved takeout by line (PVC SCH 40, CI CISPI 301…):

- Tap a size to change or remove its figure.
- **Add a figure**: pick the fitting and size, type the takeout, Save. The size moves on to the next one up, so a maker's table goes in row after row.
- **Photograph a sheet** reads a whole table in at once, the same as from Cut Length.
- **Send** shares the line's takeouts as text to the foreman or another fitter.
- **Clear** removes a whole line; it asks for a second tap first.

**Worked example — 2" PVC sch 40, socket 90 both ends, 48" C2C:** centre to face 2, socket depth 7/8 → takeout **1 1/8"** each end, **PIPE CUT 45.75"**.

### The cut list

Work a cut, then tap **Add to cut list** under the answer (or say **"add it"**). It goes on with a mark to write on the pipe: the next number on the job, or type your own (L12-3) in **Mark** first.

The **Cut list** (Projects page, the link under the answer, or say "cut list"):

- Cuts grouped by pipe, in the order added: mark, length to cut, and the C-C and fittings it came from.
- Tick each one as it comes off the saw.
- Under each pipe, **Pull for…** packs what is still to cut onto sticks of your stock length, kerf included, so the rack is pulled once.
- **Print / PDF** for the saw, or **Send text** to a phone.
- **Clear the cut ones** or **Clear all**, each with a second tap to confirm.

**At the saw, by voice.** With the cut list open, say **"4 done"** (or "mark 4 is cut", "SP-12-1 done") and it is ticked off and the next cut is read out. **"Next"** reads the next one; **"undo 4"** puts it back. Tap **Hands-free at the saw** to leave the mic open, so the saw hand never touches the phone.

- A mark is matched by its letters and digits: "S P twelve one" finds SP-12-1.
- Saying "done" sets a cut done; it never flips it, so saying it twice is harmless.
- Anything else heard is ignored, including the phone's own voice.

**From a 3D spool:** tap **Send N legs to cut list** under the drawing (or say **"add it"** with the spool open). Each leg goes on marked by the spool, SP-12-1, SP-12-2…, with its elbows named. Change the spool and send it again: legs not yet cut are updated in place, never listed twice, and a leg already cut is left alone. An unsaved spool is saved first, because its name is the mark.

**From an iso sketch:** open the sketch and tap **Cuts** under the paper. The app reads the run lines as pipe:

- **One piece between two fittings.** A line drawn in two goes, dead in line, is one piece. A branch drawn off the middle of a line splits it at a tee. Two lines crossing that were never joined are no fitting.
- **The fittings come from the drawing.** A square turn is a 90, a diagonal off an axis is a 45, a branch is a tee or cross, a 45 branch on no-hub is a wye. Another angle is flagged; redraw it as 90s and 45s.
- **Give each piece its centre to centre.** Tap it on the drawing (or the row under it), type the C-C, fitting to fitting, the way it is written on the iso. An open end is measured to the end of the pipe. On the sketch itself, the **Dim** tool does the same, and the figures stay on the paper and print with **Share**.
- **Figures already written as notes** beside a piece are offered: check each is a length, not a pipe size, then tap **Use these**.
- **Joints:** butt weld or screwed, or the line's own socket or no-hub when the job is PVC, CPVC or cast iron. Welds take the root gap from Settings. Socket and no-hub figures come from your fitting library; any missing are named, with a button to open the library.
- **Send N to the cut list** (or say **"add it"**). Pieces go on marked by the sketch, L7-CW-1, L7-CW-2…, in the order they were drawn. A sketch still called "Sketch 6 Oct 14:30" is named first. Sending again updates the pieces not yet cut. If a piece already cut would now be cut to another length, its mark is named so the pipe can be checked.

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

A leg is **where it runs and how far**. Nothing else.

- **Length** — centre to centre, the way a spool is dimensioned.
- **Runs** — a point off the compass: N, NE, E, SE, S, SW, W, NW.
- **Rise** — level, straight up, straight down, or a slope in between.

So the spool everybody draws first is *36" east, 24" straight up, 30" north*,
and that is exactly what you type. **You never enter a bend angle and you never
enter a roll.** The app works out the turn between one leg and the next, tells
you what it is, and tells you whether it comes off a shelf:

> Turns 90° off leg 1 — 90° elbow

If a turn is not a stock angle you get told that too, with the nearest stock
angle beside it, and a warning above the leg list so it cannot be missed
before you order.

### Step by step

1. Tap **3D spool**.
2. Set the pipe and the gap.
3. Set the first leg's **Length** and where it **Runs**.
4. **Add leg**, then give it a length and a direction.
5. Read the turn the app worked out under each leg.
6. **Hold a leg in the picture and drag along it** to stretch or shorten it. Pull
   the way the leg runs and it gets longer; pull back the other way and it gets
   shorter. **The drawing holds still while you pull** — same scale, same
   place — so the leg follows your thumb one for one and the legs either side
   of it do not move. Let go and the whole run rescales to fit the canvas, the
   same as redrawing at a smaller scale when a run outgrows the sheet.
7. Read **TOTAL PIPE** and the per-leg cuts.

### The drawing

Every leg on the picture carries **its own length and where it runs**, and
every fitting carries **its angle**. The picture is the drawing — you do not
have to look anything up in a list to read it.

**Nine views**, under the drawing:

| View | What it is |
|---|---|
| **NE NW SW SE** | The four isometric corners. |
| **Plan** | Looking straight down, north up the page, east to the right. |
| **S / E / N / W elev** | Square-on elevations from each side. |

**It opens on the corner this spool reads best from.** Of the four isometric
corners, the app picks the one where no two legs cross on the page and nothing
is lost end-on — the same spool can read as a clean L from one corner and as a
closed triangle from another, and the second one is a puzzle, not a drawing.
Change the shape and it picks again; turn it by hand or pick a plan and it
leaves your view alone.

**Drag anywhere to turn it.** Pull right and it goes right, pull down and the
top comes over. The compass turns the whole way round — there is no direction
you cannot look from.

**The tilt has a floor and a ceiling, and they are there on purpose.** Turning
by hand stays between 15° and 75° above level, which is the band where all
three directions still show enough of their length to read. Below it you end up
under the spool looking up at it, which is a view no drawing has ever been made
from; above it the risers vanish while your thumb is still moving. **The square-on
views are not lost** — the plan and the four elevations are on the buttons,
where you choose them deliberately and the figures carry whatever has gone
end-on.

> **A leg drawn as a circle is a leg coming at you.** In a plan a riser has no
> length on the page, and in an elevation neither does a leg running toward
> you. That is not the drawing failing — it is what a plan is, and it is why
> the figure beside it says `24" UP`. Read the figure.

### Turning the spool over

Three controls, and **not one of them changes a cut**. All three are
reflections, and a reflection keeps every angle it finds — so the bends are the
same bends, the takeouts are the same takeouts, and the pipe you buy is the
same pipe.

| Control | What it does |
|---|---|
| **Mirror** | The opposite hand. The first leg stays where it was; everything after it comes off the other side. |
| **Turn over** | Every rise becomes a drop. What ran up now runs down. |
| **Swing 90°** | The whole spool a quarter turn round the compass. Same shape, facing elsewhere. |

**Mirror** is the one you want when the same spool is needed handed for the
other side of a rack. **Turn over** is the one you want when the whole run
should fold the other way. **Swing** is for when the shape is right and it is
simply pointing the wrong way on the drawing.

All three sit **directly under the drawing**, so the thing they change is on
the same screen as the button that changes it. Press one and the spool
**swings into its new position over about half a second** rather than
switching between one frame and the next — and the line underneath names what
just happened: *Mirrored — opposite hand. Not one cut changed.*

That matters more here than anywhere else in the app, because these are the
only three controls that move no figure at all. The total, the cuts, the
elbows and the weight are identical before and after. The drawing is the only
evidence any of them ran, so you get to watch it happen.

### Worked example

**2" schedule 40 LR, 36" east then 24" straight up then 30" north, 3/32" gap:**

| Figure | Value |
|---|---|
| Centre to centre | 90.00" |
| **Total pipe** | **77.63"** |
| Elbows | 2, both 90° |

| Leg | C2C | Cut |
|---|---|---|
| 1 | 36.00" | 32.91" |
| 2 | 24.00" | 17.81" |
| 3 | 30.00" | 26.91" |

Leg 1 loses one takeout (it has a fitting on one end only). Leg 2 sits between
two elbows and loses two. That is the whole difference, and you can see it in
the numbers.

### Saving a spool

A spool takes twenty minutes to lay out and a phone restart used to lose it.
Now it does not: **Save this spool**, give it the name you would call it out
by, and it is kept on the phone — through closing the app, restarting the
phone, and every update.

- **Save this spool** — name it, say where it goes, done. What is saved is the
  input — the legs, the pipe, the gap — so a saved spool always rebuilds to
  exactly the cuts it showed.
- **Tap a saved spool** to open it. The header above the list says whether
  what is on screen matches what is saved: *saved*, or *unsaved changes*.
- **Update** — with changes on screen, saving under the same name replaces the
  saved version. Saving under a **new name keeps both**, which is how you make
  a variant without losing the original.
- **Rename or copy** — with no changes on screen, the same sheet renames it.
- **Delete** takes two taps: the bin, then **Delete?**. There is no undo.

> **Saved spools live on the phone only.** Nothing leaves the device, and the
> web app and the APK each have their own shelf. As with the joint register, a
> store written by a newer version of the app is never overwritten by an older
> one — the older one tells you to update instead.

### Share drawing — the sheet you hand somebody

**Share drawing** sits under the picture, beside **Save this spool**. It turns
what is on screen into a **one-page sheet**: the spool
in three dimensioned views, the cut list, the elbow schedule and what to pull
off the rack. On a phone it becomes a PDF and goes to the share sheet — a
printer, a chat, an email, or the phone's own files. In a browser it opens the
print dialog, where print-to-PDF lives.

The sheet is a line drawing, not the shaded picture on screen: hairlines, no
fills, black on white, because that is what a site-office printer can hold and
what reads in bad light. Every fitting carries a tick at each weld, and the
spool's two open ends are closed off square, the way pipe cut to length is.

**Three views, chosen not fixed.** The isometric comes from the corner the
spool reads best from; the plan and the elevation are the two square-on views
that show it clearest. A leg square on to the viewer draws as a circle — a
bore looked down — and its length is the figure beside it.

The sheet carries nothing that has to be looked up anywhere else: the name, the
place, the pipe spec, the totals, every leg's centre-to-centre and cut, every
elbow's angle and arcs, and the sticks. If a turn is not a stock elbow, it says
so across the top before anybody orders anything.

> **Name it first if you want the name on it.** An unsaved spool prints as
> *Spool*. Save it and the sheet carries its name and where it goes.

### The cut list — what to pull off the rack

Knowing every cut is not the same as knowing what to go and get. Four pieces
totalling 180" are not fifteen feet of pipe; they are **one** twenty-foot stick
if they nest and **two** if they do not.

Under the elbows the app shows the sticks themselves, drawn to scale, with the
leg numbers on the pieces and the drop left blank on the end. Under them, in
words: how many to pull, the longest drop, and what the saw took.

Two things it is careful about, and both of them cost pipe:

- **The blade takes pipe.** Every piece severed off a stick costs a **saw cut**
  as well as its own length, so a stick that looks like it holds exactly four
  60" pieces holds three. Set your blade in **Settings → Saw cut**. The kerf is
  charged on the last piece too, which over-states the loss by one cut on a
  stick used right to the end — the only direction it is safe to be wrong in
  when you are ordering.
- **It finds the fewest sticks, not a good guess.** The usual way to pack a cut
  list is biggest first into the first stick that takes it, and it can call for
  a stick nobody needs — 7, 5, 4, 2, 2 on an 11 ft stick comes out as three
  that way and fits on two. For a spool the app tries every grouping and takes
  the best, and among the ones that use the same number of sticks it takes the
  one that **leaves the longest single drop**, because one long drop is
  material and the same footage in four short ones is scrap.

If any single cut is longer than a stick, it says so by name rather than
quietly planning something that cannot be built.

> **The same check on the single-cut screens.** Cut length, simple offset and
> rolling offset all show the stock length, and now all three say whether the
> cut comes off one stick and what is left. That figure used to sit there
> meaning nothing.

### Why the drawing is drawn the way it is

It is a **true isometric** projection — yaw −45°, pitch 35.264°. That is the
only orientation where all three axes are foreshortened equally and sit 120°
apart, and it is what makes iso paper read as solid instead of flat.

The drawing is scaled to what is actually on the page, so it **fills the
canvas in every view** rather than leaving a quarter of it empty. While your
thumb is down the scale is held so the picture cannot swell under you; it
refits the moment you let go.

## Order sheet

**One order for the whole job, instead of one order per spool.**

### Why it is not just the cut lists added up

Every spool ordered on its own rounds up to a whole stick. The part of that
last stick it does not use is bought and thrown away, and six spools ordered
separately round up six times.

Ordered together they round up once. A stick does not care which spool its
pieces belong to — the saw cannot tell the difference — so every cut from
every spool goes into one pile and the pile is packed. You buy fewer sticks
for exactly the same job.

On a job of six spools that is typically **one stick in five**. It grows with
the job: the more spools in the same pipe, the more of that rounding
disappears.

### What is on the screen

It opens with **every saved spool ticked**, because the whole job is the case
worth seeing. The three figures across the top are what to buy, what ordering
one at a time would have cost, and the difference.

Tap a spool to take it off the order and every figure moves at once. That is
the way to see what one spool is worth to the order — put it in, take it out,
watch the stick count.

### Marks

Pooling is only useful if the man at the saw can still tell what he is
cutting, so each spool gets a **letter** and every piece off it is stamped
with that letter and its leg number.

> **A3** is leg three of spool A.

The letters are on the pick list, on the bars of every stick, and in a key on
the printed sheet. Nothing on a stick is anonymous.

### What does not pool

**Pipe does not pool across sizes or schedules.** Two inch schedule forty and
two inch schedule eighty are different sticks on the rack, so they are packed
separately and listed separately. You will see one section per kind of stick,
biggest pipe first.

**Radius does pool.** Long and short radius elbows change the takeouts, and so
the cut lengths — but the pipe those cuts come off is the same pipe. A long
radius spool and a short radius spool of the same size and schedule share
sticks, and the key says which is which.

### Sharing it

**Share order sheet** makes one page: what to buy at the top, the mark key
under it, then every stick and the pieces that come off it. The top half is
what goes to whoever buys the pipe — size, schedule, stick count, total
length. The bottom half goes to the saw.

Anything that could not be ordered is listed at the bottom with the reason,
never silently left off.

### When it saves nothing

If every spool already fills its own sticks, ordering them together buys no
fewer, and the screen says so rather than showing a blank. That is a real
answer: it means there is nothing being wasted to recover.

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

## Flange bolt-up

**Work the bolts in the order the standard says, and have the app refuse the wrong one.**

### Why a flange is not tightened round the circle

A flange joint is a spring. Pull one bolt down hard and the flange tips towards it, which *unloads* the bolts on the far side. Go round the circle in order and you chase that tip all the way round: by the time you get back to bolt 1 it is slack, the gasket is crushed on one side and dry on the other, and the joint weeps.

Two rules fix it, and this module is nothing more than those two rules made hard to get wrong:

- **Cross the flange.** Every bolt is followed by the one **straight across** from it, so the two sides come down together and the flange stays parallel.
- **Do it in passes.** Snug the whole joint at about a third, go round again at about two thirds, then again at full. Tightening any bolt relaxes its neighbours, so the first trip round is always uneven no matter how careful you are.

Then one more that gets skipped more than any other step in pipefitting:

- **The last pass goes round, not across, at full torque.** Its job is to pick up the relaxation the three cross passes left behind. This is the *rotational* pass in ASME PCC-1, and it is the difference between a joint that holds and a joint that needs re-torquing next week.

### The four passes

| Pass | Torque | Order | What it is doing |
|---|---|---|---|
| 1 | ~30% | Across | Snugging the joint up square before anything is pulled down hard |
| 2 | ~60% | Across | The gasket is seating, so bolts done early have gone slack |
| 3 | 100% | Across | Full torque, still crossing |
| 4 | 100% | **Round** | The check. Picks up what the cross passes left |

Four passes over every bolt. On an 8 bolt flange that is 32 taps; on a 16 bolt flange, 64.

### Step by step

1. Tap **Flange bolt-up**. It opens on the size the app is set to.
2. Set **CLASS** (125 or 250 lb) and **SIZE**. The bolt count follows the size — you do not set it.
3. If the flange is not in the cast iron tables (a raised-face steel flange, say), set **BOLTS** directly. The sequence only needs the count.
4. Optional: put the **final torque from the job's bolting spec** in the torque field. The header then shows the figure for each pass instead of the percentage.
5. The header says which bolt is next. Find it on the face — it has a dark ring around it — and tighten it.
6. **Tap that bolt.** It changes colour and the header moves to the next one.
7. Work round until the header reads **Joint complete**.

### What happens if you tap the wrong bolt

Nothing moves. The app tells you which bolt you hit, which bolt it wants, and flashes red on the **right** one. Nothing is recorded, no colour changes, and the sequence does not advance.

That is the point. A bolt map you can tap anywhere is a picture. One that only accepts the bolt the sequence is asking for is a check.

**Undo** takes the last bolt back, including back into the previous pass if that is where you are. **Start over** clears the joint.

### What the colours mean

| Colour | Meaning |
|---|---|
| Grey outline | Not touched yet |
| **Yellow** | Snug, pass 1 at ~30% |
| **Orange** | Pass 2 at ~60% |
| **Blue** | Pass 3, full torque |
| **Green** | Checked on the final round |

Four flat, saturated colours rather than the soft tints the rest of the app uses, because you have to tell a bolt at a third from a bolt at two thirds *across the width of a phone, in daylight*.

### Worked example — 6" class 125

Eight bolts. The app shows this from the table:

| Figure | Value |
|---|---|
| Flange OD | 11" |
| Flange thickness | 1" |
| Bolt circle | 9-1/2" |
| Bolts | 8 × 3/4", 3-1/4" long |
| Bolt hole | 7/8" drilled |
| Bolt to bolt | 3.6355" |
| Ring gasket | 6" × 8-3/4" |

**Passes 1, 2 and 3 (across):**

```
1 → 5 → 3 → 7 → 2 → 6 → 4 → 8
```

**Pass 4 (round):**

```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
```

With a bolting spec of **300 ft-lb**, the app shows **90**, then **180**, then **300**, then **300** ft-lb.

Read the cross sequence and you can see the rule: 1 then 5 is straight across (180°), 5 then 3 is a quarter turn back, 3 then 7 straight across again. Every *pair* is opposite; the pairs themselves step round the flange.

### Worked example — 16" OD class 125

Sixteen bolts, and the sequence a lot of shops have taped inside a gang box:

```
1 → 9 → 5 → 13 → 3 → 11 → 7 → 15 → 2 → 10 → 6 → 14 → 4 → 12 → 8 → 16
```

The app generates this rather than looking it up, by the halving rule the tabulated sequences are built on: take the pattern for half the bolts and follow each entry with the bolt directly opposite. It reproduces the published **4, 8, 12 and 16** bolt orders exactly, which is the check that the rule is the right one.

### Where the bolt numbers are on the real flange

Bolt 1 is the first hole **clockwise of top dead centre**, and it sits **half a pitch off the centreline, not on it**. That is how flanges are drilled — it is what lets a fitting be turned a quarter turn and still bolt up — and it is how the app draws them.

- 8 bolts: first hole at 22.5°, then every 45°
- 16 bolts: first hole at 11.25°, then every 22.5°
- 24 bolts: first hole at 7.5°, then every 15°

Any starting bolt works as long as you keep the pattern. The app starts at its bolt 1; if you would rather start somewhere else, turn the screen so the app's bolt 1 lands on yours and keep going round the same way.

### Big flanges

A 48" flange has 44 bolts and a 96" has 68. Drawn to fit a phone those holes would be twelve pixels apart, and a touch target that spills into its neighbour would register the wrong bolt — which on a screen whose whole job is to refuse the wrong bolt is worse than useless.

So above about 40 bolts the face **grows and scrolls sideways** instead of the bolts shrinking into each other. Swipe the picture across. Every target stays at least 26 pixels from the next one, at every count in both tables.

### Where people go wrong

- **Skipping the last pass.** Three cross passes and no check round is the most common version of this job, and it is the one that comes back.
- **One bolt straight to full torque.** Tempting when you are near the end of a shift. It cocks the flange and unloads everything opposite.
- **Guessing the torque.** The app deliberately does not supply a final figure. It depends on the gasket, the stud material and whether the threads are lubricated, and a guess either crushes the gasket or leaves the joint loose. Get it from the bolting spec.
- **Treating "Joint complete" as a sign-off.** The app recorded a sequence. It did not measure torque and it cannot see the gasket. On anything that runs hot, check the joint again after the line has been up to temperature.

---

## Joint register

**Every bolt-up is saved as you work it, bolt by bolt.**

### What it is for

A flange bolt-up is four passes over every bolt. On a real job you get called away in the middle of one — the crane needs a hand, the welder wants the fit checked, your phone goes in your pocket and stays there.

Come back and you have two bad options: start the joint again, or guess which bolts you had already pulled down. **Guessing is how a bolt gets taken to full torque twice while its neighbour never gets touched at all** — which is exactly the uneven joint the passes exist to prevent.

So the app writes the joint down **on every bolt**, not when you leave the screen. Close the app, kill it, restart the phone: you come back on the same bolt, with the same bolts coloured in.

### Two kinds of joint

| | Where it lives | When to use it |
|---|---|---|
| **The unnamed joint** | Opens straight from **Flange bolt-up** | One joint, no paperwork. Still saved, still resumable. |
| **A named joint** | Kept in the register by its tag | You will come back to it, or you want a record of it |

You never have to name anything. Open **Flange bolt-up**, work the joint, and it is saved either way. Naming is for when you want it **kept** — several joints on the go, or a record that the joint was done.

### Step by step

1. Tap **Flange bolt-up** and work the joint as normal. The bar at the top reads **Unnamed joint · Saved as you go**.
2. To keep it, tap **Name it**. Give it whatever you would call it out by — a line number, a spool mark, a valve tag — and a note for where it is.
3. It moves into the register under that tag, **with the work you have already done**, and the unnamed slot is cleared for the next one.
4. Tap the **list icon** in that bar, or **Joint register** on the home screen, to see everything.
5. Tap any joint to pick it up exactly where it was.

### Reading a row

```
8-CWS-102 FL-3
6" · class 125 · 8 bolts
▬▬ ▬▬ ▬▬ ▬▬   Pass 2 · bolt 5 of 8
north rack, behind the pump
Worked 20 min ago
```

The four bars are the four passes, filled as far as the joint has got, in the **same colours the flange face uses** — yellow, orange, blue, green. One glance tells you how far round it is without opening it.

### How the list is ordered

- **Working now** — the unnamed joint, if there is anything in it.
- **Part done** — live joints, most recently worked at the top. This is where you look when you come back from break.
- **Finished** — all four passes recorded, most recently finished first.

Delete asks first, in the row. On a joint that is only part done it says so before it goes.

### Changing the flange starts the bolt-up again

Pick a different size, class or bolt count on a joint and **the bolt-up resets**. That is deliberate: a level array for sixteen bolts means nothing on a flange with twelve, and carrying it across would put colours on bolts nobody touched.

Setting the **BOLTS** count by hand unsets the size, because a hand-set count belongs to no table row. The picture falls back to generic proportions rather than drawing a flange it is not.

### What it will not do

Two things it refuses on purpose, because both come down to the same rule — **the app would rather lose a joint than show you a wrong one.**

**A stored joint that does not add up is not loaded.** Every saved bolt-up is checked against itself on the way in: in any state the app can actually reach, every bolt sits at either the current pass or one above it, and the number of bolts one above is exactly how far through the pass you are. If a stored joint fails that, it is dropped and the register says how many went. A half-repaired bolt-up state looks exactly like a real one on screen, and would put you on the wrong bolt.

**A list written by a newer version of the app is left alone.** If the register was last written by a newer build — the web app and the APK do get out of step — nothing is saved at all, and the screen says so. The alternative is the older build quietly overwriting joints the newer one is holding. If you would rather start clean, **Start new** on that notice does it, and says what it costs.

### Where people go wrong

- **Assuming you have to name it.** You do not. The unnamed joint is saved the same as any other.
- **Naming every joint.** The register is for joints you will come back to. One-and-done joints do not need a tag.
- **Expecting it to sync.** It does not. The register lives on **that phone**. Two people on the same flange keep two lists.
- **Treating "Finished" as a sign-off.** It records that the sequence was followed. It did not measure torque and cannot see the gasket.

---

## Re-torque log

**A joint that was right cold can be slack hot. This records what you find when you go back.**

### Why a joint needs checking again

A bolted joint is a spring holding a gasket squashed. Take the line up to temperature and three things happen at once:

- The **gasket creeps** under load and heat, and gives up some of its thickness for good.
- The **bolts and flanges grow at different rates**, because they are different steels in different sections.
- The whole joint **relaxes**, and what was 300 ft-lb cold is less than that hot.

None of it is a mistake anybody made. It is what the joint does. Which is why most bolting specs on hot service say to go round it again once it has been through a thermal cycle — and why that pass is the one that actually keeps the joint.

### The one thing worth writing down

Not the date. **Whether anything moved.**

A date on its own says somebody went back. It does not say what they found, and what they found is the whole reading:

| What you found | What it means |
|---|---|
| **Bolts took up** | Still relaxing. Go back to it after another cycle. |
| **All tight** | It has settled. That is the check that closes a joint out. |

So the app asks that question with **two buttons and no default answer**. A preselected answer is one somebody taps past without walking to the flange.

### Step by step

1. Finish the bolt-up. The **Re-torque** section appears under the controls — only on a joint that has been finished once, because there is nothing to re-check otherwise.
2. Once the line has been up to temperature and back, go round the flange **at full torque, in order**.
3. Tap **Record a check**.
4. Answer **Bolts moved** or **All tight**.
5. Optionally add the torque you used and a note — "after 8 hr at temp", "two bolts took a quarter turn".
6. **Save.**

The heading above the log then reads one of three things: *Not checked since it came up to temperature*, *Still taking up*, or *Nothing moved last time*.

### The register sorts itself by what is left to do

| Section | What is in it |
|---|---|
| **Working now** | The unnamed joint |
| **Part done** | Bolt-ups still going |
| **Needs a re-check** | Finished, but never been back to — or still taking up when it was |
| **Closed out** | Finished, checked, nothing moved |

**Needs a re-check is the list to work from** after a startup. Finished is not the same as closed out, and the register stopped treating it that way.

**Clear closed out** only ever removes the settled ones. A joint still waiting on a re-check is not finished with, whatever its four passes say.

### What the app will not do

**It will not tell you when to go back.** That depends on the service, the medium, the gasket and the spec — a hard cycle wants checking sooner than a line that warms up once and sits there. Inventing a schedule would be inventing engineering. The app records what you found and shows you what is outstanding; the timing comes from the job.

**A check cannot be recorded on an unfinished joint.** There is nothing to re-check on a bolt-up nobody has been through once.

**Reopening a bolt-up throws the log away.** Undo past the end, or change the size, class or bolt count, and the checks go with it — they were checks of a joint that no longer exists, and keeping them would be a record of something nobody finished.

### Where people go wrong

- **Treating the fourth pass as the end.** It closes the *cold* bolt-up. On hot service the joint has not finished moving yet.
- **Logging the date and not the finding.** "Checked 14 Sep" tells the next person nothing. "Checked 14 Sep, two bolts took a quarter turn" tells them to come back.
- **Closing a joint out on one check where bolts moved.** That check said the opposite — it is still going. The app will keep it under **Needs a re-check** for exactly that reason.
- **Expecting it to sync.** It does not. The log lives on that phone, like the rest of the register.

---

## Measure: laser meter and AR

Tools → **Measure**. Both run in **Chrome on Android**, not in the installed app; in the app, the button opens the web app in Chrome on this screen.

### Laser meter

Connect a **Leica DISTO** (D1, D2, D110, D510, X-series) or a **Bosch GLM** (50 C, 100-25 C, 120 C) once: turn the meter's Bluetooth on, tap **Connect a laser meter**, and pick it from the list. Each reading shows on the Measure screen with its time (and tilt, on a DISTO that has one).

While the meter is connected, **every length field in the app** shows a blue **⤓ Laser** chip under it with the last reading. Tap it to fill the field. A reading older than ten minutes is not offered.

- **DISTO:** set the meter's unit to metres. The app shows every reading in your own units anyway.
- **Bosch:** Bosch keeps its protocol private; the app reads it the way it has been worked out from the wire. If readings don't appear, the screen shows the bytes it could not read. Screenshot that and it can be fixed.

A laser reading is good to about 1.5 mm. That one you can cut from.

### AR tracing

Trace a run with the phone's camera before the tape comes out.

The phone needs **Google Play Services for AR** from the Play Store.

### Step by step

1. **Start measuring.** Move the phone slowly over the surface until a ring appears where the centre of the screen meets it.
2. Put the ring on the first point and tap **Mark**. Do the same for each point along the route. The camera shows each leg's length, and a live length and angle from the last mark to the ring.
3. **Done** closes the camera. Each leg comes back as length, run, rise or drop, slope, and fall per foot on a near-level line.
4. Each turn after the first leg shows the offset from the run before it: advance, roll, rise and true offset. Tap it to open **Rolling offset** with those figures filled in.

### Getting good figures

- Mark the same face of the pipe every time: all on top, or all on the side. Top to top is centre to centre.
- Stay within two or three metres and move the phone before you mark. Bare steel and white walls track worst; a strip of tape or a chalk mark helps.
- Mark a point back along the run first, then where it ends, then the next point. The turn is measured against the run before it.

### What it is good for

Phone AR is good to a centimetre or two on a textured surface at arm's length. That is enough to plan, order and rough out an offset, not to cut from. Tape the run before you cut.

---

## Pressure tests

Every hydro and pneumatic test on the job, as a record QC signs: Logs → **Pressure tests**.

### What it is for

A pressure test leaves paper, and the paper is what gets argued over. This keeps the test package's form on the phone that runs the test — the figures, the gauges, the relief valve, the walk-down, the hold timed from the phone's clock, the readings as they are taken, what was found and who signed — and prints it as one PDF with the boundary isos at the back.

It also does the arithmetic QC does on the back of the form, as you type: whether the test pressure is inside what ASME B31.3 or B31.1 allows for the design pressure, whether each gauge is in calibration on the day and the right size for the test, whether the relief valve is set where it protects the line without lifting before test pressure, and whether the hold ran long enough. Anything wrong is at the top of the screen, worst first. Nothing stops you saving; the inspector decides, the app makes sure the inspector sees.

### Step by step

1. **Start a test.** It is dated today and tagged to the active job.
2. **Fill in the test**: the package number, what is in it (lines, isos), the code, hydro or pneumatic, the medium, the design and test pressures and temperatures, and the hold the job asks for. The code's minimum hold is used if the job's is shorter.
3. **Gauges and relief valve**: tag, range and calibration due date for each gauge; the relief valve's tag and set pressure.
4. **Walk-down**: tick each step before pressure goes on. A pneumatic test has two more — the barricade, and the preliminary check at low pressure.
5. **Start the hold** when the gauge reads test pressure, typing what it reads. The clock runs from the phone's time, so it is right after the phone has been in a pocket, and the phone rings when the hold is met. **Log reading** as you take readings through the hold. **End the hold** with the final reading.

   **The phone rings for the hold, locked or not.** Starting a hold sets alarms the phone keeps itself, so they go off with the app closed and the phone in a pocket:
   - **5 minutes before** the hold is met, on holds of 15 minutes or more, to get back to the gauge.
   - **When the hold is met**, with the minutes and the start pressure.
   - **30 minutes after**, if the hold is still running. A hold never ended puts a wrong time on the record.

   Tap an alert to open the test. The alarms move if you change the start time or the hold minutes, and go when the hold is ended or cleared or the test is deleted. The first hold asks for leave to send alerts. Under the hold it says when the phone will ring, or, if alerts are off, has a button to the phone's settings. Alerts use the alarm volume, not the ringer. The web app has no alarms; it buzzes on the hold's own screen only.
6. **Result**: passed, failed or open, and what was found. A failed test says where it leaked.
7. **Sign-off**: type each name, then **Sign** draws the signature on the glass. The record carries it, with the time.
8. **Share the test record**: the PDF, to the inspector, the GC or the job folder. The isos you ticked under Boundary isos go at the back, one to a page.

A test that failed is never edited into a pass. **Start the retest** makes a new record with the same package, figures, gauges and people, numbered as the next attempt, and both stay in the log and in the turnover package.

### What the code figures are

| | Hydrostatic | Pneumatic |
|---|---|---|
| **ASME B31.3** | at least 1.5 × design | 1.1 × to 1.33 × design; relief set no higher than test pressure plus the lesser of 50 psi or 10%; preliminary check at the lesser of 25 psi or half the test pressure |
| **ASME B31.1** | at least 1.5 × design | 1.2 × to 1.5 × design |
| **Both** | hold at least 10 minutes before examining the joints | |

Gauge range is not in either code; the app uses ASME Section VIII's rule for test gauges, about twice the test pressure and never under 1.5 or over 4 times it, which is what most job specs adopt, so a gauge outside it is a warning rather than a fault. **Job spec** as the code turns the code checks off, for a test run to a spec that is neither.

### What it will not do

It does not work the B31.3 stress-ratio increase for a design temperature above the test temperature: that needs the material's allowable stresses, which the app does not hold. It flags the case and leaves the figure to the test package. The test pressure on the package is the engineer's; this checks the arithmetic around it.

### Where people go wrong

- **Starting the hold before the gauge is at test pressure.** The app flags a hold started under the test pressure, but it only knows what you typed.
- **A gauge out of calibration on the day.** The app stops on it; the inspector will too. Check the stickers before the pump is on.
- **Marking passed with no examiner named.** The code has the examiner certify the result; the record needs the name and the signature.

---

## Weld log

**Every weld on the job, the welders who made it, and the NDE the code still asks for.** Logs tab → **Weld log**, or say "weld log".

### Logging welds
1. **Log a weld.** Line or iso, weld number (the next one on the line is filled in), the day, size, joint (butt, socket, fillet, branch), process and WPS.
2. **Welders:** tap the stamps from the roster, or type one. A stamp not on the roster, without the process, or lapsed is named under it before you save.
3. **Heats:** the heat numbers either side. One not in the heat book is named, so the MTR gets filed.
4. **NDE:** the line class's percentage (Visual, 5%, 10%, 20%, 100%) and method (RT, UT, MT, PT). The last weld's values carry over.
5. **Log weld 14.** It saves and the form stays up on 15, so a run of welds goes in one after another.

The Welds page shows today's welds and **diameter-inches** (the sizes added up), the job total, and every weld by line with its state: Welded, Picked for NDE, Accepted or Repair.

### The weld map
Welds go on the iso the way they go on a paper weld map.
- **On the sketch, tap Weld**, then tap the pipe where each weld goes. Each tap drops the next number on the line, using the iso's name as the line. The weld goes in the log as **Not welded yet**, with the size, process, WPS and NDE carried over from your last weld.
- **Tap a weld on the map** to open it: stamps, heats, the rest.
- **Welded today** on a planned weld ticks it off with the day and the stamps. Only made welds count: planned ones add no diameter-inches and are in no NDE lot.
- The markers are coloured by state: grey planned, orange welded, blue picked for NDE, green accepted, red repair. The line headers read "12 of 18 welded".
- **Place on the iso / Move on the iso** on a weld opens its sketch with the Weld tool ready; the next tap puts it there. **Take it off the map** leaves it in the log.
- A weld is pinned to the point on the pipe, not to a piece. It stays put when a branch is added or a line is redrawn round it.
- **Share** on the sketch prints the map with every weld numbered. The turnover package's isos carry them too.

### NDE: what B31.3 still asks for
The NDE page works it out from the log, by **lot**: one welder's butt welds at one percentage and method. A weld two welders made is in both lots, and one shot serves both.
- **Random:** 5% means 1 in 20 of each welder's butt welds, rounded up. The welds to shoot are **starred** as a suggestion; tap any weld to pick it.
- **Tracers after a reject** (B31.3 341.3.4): two more of that welder's welds. If a tracer fails, two more for it. If one of those fails, **every weld in the lot**.
- **Waiting on results:** **Accept** or **Reject** each picked weld. Report numbers go in on the weld itself.
- **Repairs:** a rejected weld waits under Repairs. Tap **Repaired** and it becomes 14R1, picked for the same method again.
- **Send the NDE request:** every picked weld, by method, as text for the NDE crew.
- Socket and fillet welds are not in the random sample, as in B31.3. Pick them from the weld itself (**Pick for …, by the spec**) when the job calls for it.

### Welders and continuity
ASME IX QW-322: a welder's qualification on a process **lapses after six months without welding it**.
- **Add a welder:** stamp, name, the processes qualified, and the day continuity was last shown (the test, or the last signed continuity record).
- Every weld logged with that process carries continuity on. Each welder shows the date it holds to; red when lapsed, amber inside 30 days. A banner on every page names who is running out.
- **The phone alerts** 14 days before a lapse and on the last good day, at 7 am, with the app closed. Tap it to open the roster. Alarms need the 1.3.0 APK.
- Each welder also shows welds made, diameter-inches, and how many of their shot welds were rejected, with the rate.

### On paper
- **Print / PDF** on the Welds page: every weld by line, with stamps, heats and every examination; the welder table with continuity; the sampling by lot; and anything still owed at the top.
- The **turnover package** (Projects) now carries the job's weld log. What the welds still owe goes in its open items, and a heat welded in with no cert on file shows as one too.

### Where people go wrong
- **The job spec governs.** The app follows B31.3 normal fluid service at the percentage you set. Category M, severe cyclic, B31.1 and owner specs can ask for more: set the line's percentage to match.
- **Stamps typed two ways.** "W-12" and "W12" are the same welder here, but keep the roster tidy so the PDF reads right.
- **A weld deleted is gone from the sampling.** Delete only a weld logged by mistake.

## Shift report

The day, written up once at the end of it: Logs → **Shift report**.

### What it is for

A foreman reads a shift report for three things: what got done, what failed or is still open, and what held the crew up. The report leads with a few sentences that say exactly that, then the figures that back them, then the crew's own words.

Most of the figures the app already has, because they were logged as they happened — the pressure tests, the bolt-ups, the re-torque checks, the heats entered, the level readings, the isos drawn — and it reads them off those logs for the day and the job. What nobody else keeps is typed here: the welds made by size, any rejected, the spools finished, the crew and hours, and four notes: issues and delays, safety, tomorrow, and anything else.

### Step by step

1. Pick the job and the day. Opening the same day again opens the same report, so one started at lunch is finished at the end of the shift.
2. Check **Already logged**: what the app read off the records for that day. If a test or a bolt-up is missing, it was not logged on that day under that job.
3. Count the welds with the plus and minus buttons, one row per size. **Another size** adds a row. The total and the diameter-inches work themselves out.
4. Add any rejected weld by its number and why. Tick the spools finished, or type a mark.
5. Crew and hours each.
6. Write the notes in whatever shorthand you use.
7. **Build the report**: the plain version, from the records and your notes word for word. Or **Polish with Claude**: the same facts go to Claude, which writes the summary as sentences and tidies your notes into sentences a GC can read.
8. Read it over and change anything, then **Send as text** to a chat or email, or **Share as PDF**.

### What Claude is and is not allowed to do

Claude writes only the summary and rewrites the four notes. Every figure under them is the app's own, laid out by code. And the app checks Claude's version before showing it: every number in it must be a number in the facts or your notes; every rejected weld, failed or open test, joint that took up and heat without a cert must be named in the summary; a note you left empty stays empty and one you filled stays filled. If any of that fails, the plain version is used and the screen says why. Either way you read it before it goes.

With no signal, or with Claude not switched on at the server, the plain report is there and is right.

### Where people go wrong

- **Logging the welds once at the end of the week.** One report per day; the figures are what the shift did.
- **Sending it without reading it.** Claude's version is checked against the record, not against what you meant. A note it misread is yours to fix.

---

## Handbook

Every table from the printed book, searchable, **with its page number on it**.

Use it when you want to see the figure the calculation used rather than take it on trust. Search by what you are looking for — "reducer", "flange", "copper", "support" — and the table comes up with its source page so you can check it against the book in your truck.

---

## Voice

The round mic low on the right of every screen. Tap it, say it, and the app does it — for a hood, gloves or two dirty hands.

### What you can say

| Say | What happens |
|---|---|
| "Bolt up", "hydro", "heat book", "shift report" | That tool opens. Works with no signal. |
| "Rolling offset, rise 12, roll 8 and a half, run 30" | Rolling offset opens with the figures in. "3 foot 6", "12 and 3/8" and "350 millimetres" are understood. |
| "Simple offset, 14 and a half at 22 and a half degrees" | Any bend or offset tool opens filled in — see the table below. |
| "Rise 12", "leg b 3 foot 6" (with the tool open) | Fills that field on the screen you are on. |
| "Two 6 inch welds, weld 14 rejected for porosity" | Added to today's shift report for the job on the home screen. |
| "Safety note: fire watch posted at the tank" | Added under Safety on today's report. Issues, Tomorrow and Notes work the same way. |
| "Hold started at 225", "reading 224", "hold ended at 224", "test passed" | Written on the pressure test on screen, or the job's latest open test. |
| "What's the takeout on a 2 inch screwed 90?" | Answered out loud from the handbook, and the table opens with its page number. |
| "Half inch stainless 40S", "6 inch chrome moly P22 schedule 80 long radius", "4 inch PVC" | Sets the job's pipe: size, material, wall, elbow radius — any of them. Said back with an Undo. A calculator already open follows it straight away (Cut Length also moves to the new material's joints) and shows an amber "Pipe changed to …" bar with a buzz, so it is seen as well as heard; changed from Settings, the bar shows when you go back to the calculator. A saved spool keeps its own pipe. |
| "Back", "cancel" | Goes back a screen, or closes the panel. |

Tool names are matched on the phone, at once. Everything else is read by Claude through the app's server, which needs signal.

### Figures by voice

Every bend and offset tool takes its figures by name. Say the tool and the figures together, or open the tool and say just the figures. A number with no name goes in the first field.

| Tool | Say |
|---|---|
| Flange bolt-up | bolts (4 to 68, in fours) — "flange bolt-up, 12 bolt"; or size and class — "6 inch, class 250" takes the bolt count from the handbook |
| Simple offset | offset (or set, rise, drop), angle / degrees, run, gap |
| Rolling offset | rise (or set), roll, run, angle, gap |
| Cut length | center to center (or length), gap — "cut length, 4 foot 2"; then "add it" puts the cut on the cut list |
| Saddle bend | depth, to obstruction (or distance), width, angle |
| Miter bend | degrees (or turn), segments, radius — "miter, 90 degrees, 4 segments" |
| Pipe bend | degrees, leg a, leg b, radius, springback, stock |

A new flange starts the bolt-up over, so once a bolt is logged a spoken flange is refused with the reason; tap Start over first.

A value is matched to the name next to it: "4 inch depth, 30 to obstruction" and "depth 4, obstruction 30" both work. Said with a unit ("3 foot 6", "350 millimetres") it is converted to your units; a bare number goes in as said. Anything the phone cannot place goes to Claude, which knows the same fields.

**One field at a time:** every number field has a small mic beside its label. Tap it and say the figure — "3 foot 6 and a quarter" — and that field fills. Works with no signal.

### Nothing is written without you hearing it

Anything that goes into a record is **said back and left on screen with an Undo** for 15 seconds. Listen for the number. A loud shop will get one wrong sooner or later; Undo puts the record back exactly as it was. **Report** or **Test** on the panel opens what was written.

Claude only answers handbook questions from the handbook. If the book does not cover it, it says so rather than guess.

### Hands-free bolt-up

On the flange bolt-up, tap **Hands-free: say "done"**. The phone says the bolt and the torque, then listens:

- **"Done"** (or "next", "got it") — the bolt asked for is logged, and the phone says the next one.
- **"Undo"** — the last bolt is taken back.
- **"Repeat"** — the bolt is said again.
- **"Stop"** — hands-free ends. Leaving the screen ends it too.

Anything else it hears is shown and ignored, so a conversation nearby does not log a bolt. Earbuds with a mic work best: the phone hears you, not the impact gun.

### When it does not work

- **No mic button:** it is off under Settings → In the field → Voice, or the phone has no speech recogniser (install or update the Google app).
- **"The microphone is off for PipeFit":** phone Settings → Apps → PipeFit Pro → Permissions → Microphone → Allow.
- **"Claude is not set up on the server":** the Worker needs `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` (see RELEASE.md). Tool names still work.
- **Misheard tools:** say the name on the tile ("flange bolt-up", "pressure tests"). Every tile name is taught to the recogniser.

---

## Settings

| Setting | What it does |
|---|---|
| **Theme** | Light, dark or follow the phone |
| **Units** | Imperial or metric |
| **Fractions** | Off, 1/8, 1/16, 1/32, 1/64 |
| **Length readout** | Inches, or feet + inches, for the calculator |
| **Pipe & fitting** | Material, size, wall and elbow radius the job runs. Each material shows its own walls and sizes — see Materials below. |
| **Weld gap** | Your standard root gap |
| **Stock length** | The length you buy. The cut list packs onto it, and the offset and cut-length screens check against it. |
| **Saw cut** | What the blade takes, default 1/8". Charged on every cut in the cut list. |
| **Smart fill** | Whether a heat scan and the handbook search ask Jev, with signal |
| **Updates** | What is running, and a manual check |

Settings are stored on the phone only. Nothing leaves it.

## Materials

Pick the material with the size and wall (Settings → Pipe & fitting, or **Edit specs** on the home card, or say it). The home card's OD, wall, bore and weight are then that material's, not carbon steel's.

| Group | Materials | Walls offered | Joined by |
|---|---|---|---|
| Steels | Carbon steel (A106/A53), galvanized, stainless 304L and 316L (A312) | Steel: 10, 40, STD, 80, XS, 160, XXS. Stainless: 5S, 10S, 40S, 80S, 160, XXS | Welding |
| Chrome-moly | P11, P22, P9, P91 (A335) | 10, 40, STD, 80, XS, 160, XXS | Welding, with preheat and PWHT |
| Iron | Cast iron soil pipe, no-hub (CISPI 301); ductile iron (AWWA C151) | CISPI 301; pressure class or class 52 | No-hub couplings; push-on or mechanical joint |
| Plastics & lined | PVC (D1785), CPVC (F441), HDPE (DR), PTFE-lined steel | 40, 80; DR 7, 9, 11, 17 | Solvent cement; butt fusion; flanged spools |

Things the app gets right that are easy to get wrong:

- **Stainless walls are not steel walls from 12" up.** 12" 40S is 0.375"; 12" Sch 40 is 0.406". The app will not offer "Sch 40" on stainless.
- **Cast iron and ductile iron are not on the steel OD.** 4" no-hub is 4.38"; 4" ductile is 4.80"; 4" steel is 4.50".
- **Plastics move.** HDPE grows about 12" per 100 ft for a 100 °F rise; steel about 3/4".

The handbook's **Materials and welding** group has every wall table and a welding reference per material: P-number, typical filler, and the B31.3 preheat and PWHT. **That is a reference, not a procedure** — the job's WPS governs, and the B31.3 tables have changed between editions. Where a figure moved between editions, the table is named instead of a number.

The bend and offset calculators still work their elbow geometry in steel butt-weld fittings. For PVC socket fittings, no-hub and flanged spools, take the fitting makeup from the maker's catalog.

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
