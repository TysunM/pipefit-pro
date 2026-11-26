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
| Flanges | ASME B16.5 to 24"; ASME B16.47 Series A and Series B above |
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

## Make it yours: moving the tabs and tiles

The six tabs along the foot ship as **Home, Calculator, PipeFit, Weld, Projects, Edu**. PipeFit is the tab that used to be called Tools. The **Logs** are a tab at the top of the Projects page now, not one along the foot. A phone that already moved its tabs keeps its order without Logs, and Weld comes in right after PipeFit. Hold any tab until it lifts, carry it along the bar, let go. It stays there on every screen.

The tiles on Home, PipeFit, Weld, Logs and Edu, and the cards down the Projects page, move the same way: hold one until it lifts and buzzes, carry it, let go. A tile moves anywhere in its own section (Layout & fit-up, Bends & offsets, Records…); a card anywhere down the page. Carry one to the top or foot of the screen and the page scrolls with it. A finger that drifts while holding is a scroll, not a hold: hold still.

On Home, **Recently used** stays as you left it until you open a tool, which puts that one first, as it always has. The **Field tools** keep the order you put them in.

**Settings → Layout → Put everything back where it shipped** undoes all of it. The order goes into the backup file with the settings, so a new phone restored with **Also put back the settings and layout** stands the same way.

---

## The Projects tab
Today's date and the time run across the top, so the page left open on a job all day says what day it is.

Two tabs sit under the job line: **Projects**, the job's records below, and **Logs**: pressure tests, the joint log, the heat book, the shift report, calibration, the pre-task plan, the handbook and the fitting library. The page opens on whichever was used last. Say "logs" and it opens on the Logs.

The job chips pick what the page shows: the active job, another job, All jobs, or No project. Each card lists the newest work under it. **Share turnover PDF** makes the package for what is shown. After its sign-off it carries one Appendix R record page for every joint that was bolted, so the QC file needs nothing else from the phone.

**Today** and **Everything** sit under the job chips. The page opens on **Today**: each card lists only what was saved, changed or finished today, and the line above the cards counts it. Nothing is deleted. Earlier work is kept, and **Everything** shows it all. The page rolls over to the new day by itself: at midnight on days, at noon on nights (below). The turnover PDF and **Clear for a new start** always take the whole job, every day's work, whichever view is on.

**Night shift.** Set **Settings → In the field → Shift** to **Nights**. The work day then runs noon to noon and is dated by the night it started, so 6 pm Tuesday to 6 am Wednesday is all Tuesday's work.
- The Projects toggle reads **This shift**, and the clock line says which night it is.
- The shift report opens on the night's report. A weld count said at 4 am goes on it, and the written report is headed "Night shift of Tue 6 Oct 2026".
- Weld, test, exam and calibration dates stay the calendar day they happened. A hydro held at 2 am Wednesday is dated Wednesday, and still reported on Tuesday's night shift.

**Clear for a new start** is at the bottom. It takes everything shown under the chosen job off the phone: pressure tests, welds, joints, isos, spools, level readings, cuts and shift reports. With **All jobs** chosen, that is every job.
- **Back up, then clear** makes the backup file first and clears only once it has gone. Use this one.
- **Clear with no backup** needs a second tap, and nothing it takes can be got back.
- Kept every time: the heat book, the welder roster, the calibration register, the fitting library, your skills passport and your settings. They serve every job.

## The skills passport

**Edu → Skills passport.** What you can do, proved two ways, and yours to carry from job to job.

- **Records.** The work saved on this phone counts toward the skill it shows: every joint bolted up to pattern, every hydro held and signed, every iso drawn, every cut listed, every heat entered. Nothing is typed twice; the passport reads the records.
- **Sign-offs.** Tap a skill, put in the name of whoever watched it done, their role, a note if you like, and hand them the phone to sign. A skill with a sign-off stands as **Signed off**, whatever the count.
- **Standing.** Without a sign-off, enough records make a skill **Practised**; fewer make it **Started**. Skills the phone keeps no record of (rigging, oxyfuel, valves, orientation) stand only on a sign-off.
- **NCCER.** Each skill names the NCCER Pipefitting module it belongs to, by title and level, so a training office can read it straight across. Module numbers change between editions, so titles are what is kept.
- **Share passport PDF** prints the lot: every skill's standing and record counts, and every sign-off with its signature and a **record code**. The code is worked from the sign-off as it is held on the phone, so a printed page can be checked against the phone it came from. It is a checksum, not a seal.
- Put your name in **Settings** first: it heads every page and goes into every record code.
- The passport is kept through **Clear for a new start** and goes into every backup.

## The pre-task plan

**Projects → Logs → Pre-task plan.** The morning sheet, one per job per day: a JSA, a JHA, a tailgate, by whatever name the site uses.

- **The task** and where. **Hazards** are tapped off a library of what hurts pipefitting crews, and each comes with the control a journeyman would name; change it to say what this crew does about it here. Add any other hazard by typing it.
- **Permits** and **PPE beyond the basics** are chips. **Muster point** and where the eyewash, extinguisher, first aid and rescue are.
- **Toolbox talk:** the day suggests one of the nine built-in orientation modules in turn, so a crew hears every one over a fortnight; type any other topic, and what was said.
- **Crew sign-in:** add names, hand each the phone to sign. **Sign and close the plan** takes the foreman's signature. Any change after reopens it, so what was signed is what was read.
- **By voice:** "pre-task plan: hot work and lifting, toolbox talk on heat, crew Ruiz and Diaz" puts them on today's plan. Hazards are the library's.
- **Share PDF** prints the sheet with every signature. A closed plan is a record under **Pre-task planning and toolbox talks** in the skills passport. Plans clear with the job and go into every backup.

## Coaching on real work

The first bolt-ups, pressure tests and cut lengths come with a card at the top of the screen: the steps in order, the next one lit, and the reason under each, the way a journeyman would say it. Nothing is a lesson apart from the work.

- It fades on its own: once the skills passport shows the skill as **Practised** (enough records) or a foreman signs it off, the card is gone.
- **Hide** takes it off that one screen. **Settings → In the field → Coaching** turns it off for a hand who already knows.

## Site orientation

**Edu → Orientation.** The course a new hire takes before the gate, on the phone, in English or Spanish. It is plug and play for any company.

- **Nine modules are built in, in English and Spanish,** and work with no signal and no server: your first day on site, PPE, working at height, lockout/tagout and stored energy, hot work and fire, confined spaces and excavations, chemicals and the SDS, hands, tools, lifting and rigging, and heat, cold, weather and fatigue. They say general practice as OSHA and the trade hold it. **Your site's rules come first**, and the first module says so. Tap the eye to drop a module your site does not need.
- **The company's own rules go beside them.** **Add the company's rules**: a title, then paste or type the text, or **Read a page with the camera** to lift it off the printed sheet (the reading is done on the phone). One module is one subject. Say which language it is **written in**. The module is taught from exactly those words, cut into sections by paragraph (a short line above a paragraph becomes its heading).
- **The check is yours to write.** **Add a question** under the module: the question, two to four choices, which is right, and why. Three or more questions and they are the check, 80% to pass. Fewer, and the module is a read-through: the new hire reads it and signs off **I have read and understood these rules**, which is recorded as the pass. With signal, the server writes a course and questions from the words, and a Spanish one too, built once and kept on the phone: Cloudflare's free model first, Claude only if that cannot do it. The company's own questions still win.
- **Share pack** makes a file of the company's modules. On a new hire's phone: **Settings → Back up and restore → Restore from a backup file**. Nothing else on their phone is touched.
- **Taking a module:** read each section or tap the speaker to hear it; **Español** switches a built-in module to its Spanish course on the spot, and builds a company module's on the server (needs signal once); then **Take the check**. **80% passes.** A fail shows what was missed, with the rule, and can be taken again at once.
- **"Settings → Smart help → Test Claude shows why":** the free model could not write the Spanish course and Claude, asked last, said no. Press Test Claude: it shows the reason in Anthropic's words. The usual ones are an Anthropic account with no credit, and the `CLAUDE_MODEL` variable naming a model that is gone. The English course and the rules as written never need it.
- **"The Anthropic account behind the key is out of credit":** the company's Anthropic account needs credit (Plans & Billing on the Anthropic console). Until then every module is still taught from its rules as written with the company's questions, the nine built-in modules keep their English and Spanish courses and checks, and nothing else in the app is affected.
- **A pass goes into the skills passport** as a record under Site orientation and prints on the passport PDF with its date and job. If a module's rules are changed, it has to be passed again.

## Back up the phone

Everything you save lives on this phone only: pressure tests and signatures, the joint log, heat book, spools, isos, level readings, shift reports, fitting takeouts and the cut list. **Back it up weekly.**

- **Settings → Back up and restore → Back up now** (or say "back up my phone"). It makes one file and opens the share sheet: email it to yourself or save it to Drive.
- Settings shows when you last backed up, and turns to a warning after a week.
- **Home asks too:** with records on the phone and no backup in a week (or ever), an amber card on Home says what would be lost. **Back up now** makes the file right there; **Not today** hides it for a day.
- **Restore** on this phone or a new one: **Restore from a backup file**, pick it, and the app shows what it would add for each kind of record before anything is written. A backup that came as text can be pasted instead.
- **Restore only ever adds.** A record already on the phone stays as it is, so an old backup cannot undo newer work, and restoring the same file twice adds nothing the second time.
- **Also put back the settings and layout** is the one thing that replaces: units, job, pipe, name, and where the tabs and tiles stand, as they were on the phone that made the file. Leave it off to keep this phone's own.
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

A run of bought fittings worked to the bend formula cuts **every piece between two 45s about a quarter of an inch long** on 2" pipe: an eighth at each end.

**The app keeps them separate.** Anything made up from bought elbows — **Cut length**, **Simple offset**, **Rolling offset**, the **Spool builder** and the **Calculator** — takes out the handbook figure at 90° and 45°. The offsets and the Calculator also follow the job's material: screwed elbows for galvanised, the fitting library's socket elbows and no-hub bends for PVC and soil pipe (see Simple offset → Galvanised, PVC and soil pipe). The Spool builder is butt weld. Any other angle is an elbow cut down from a 90, which does take out the bend figure, and the screen says which it used under **Setback**. **Pipe bend** works the bend, because that is what a bender does; Cut length still offers a bend in the pipe, labelled.

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
| **Inside arc / Outside arc** | Throat and back of the elbow | Where to mark an elbow cut down to an odd angle |

### Worked example

**2" schedule 40, long radius, 12" offset at 45°, default 3/32" gap:**

| Figure | Value |
|---|---|
| Run | 12.0000" |
| Travel | 16.9706" |
| Shrink | 4.9706" |
| Setback (each end) | 1.3750" (1-3/8, handbook 2-42) |
| **PIPE CUT** | **14.0331"** |

**Check it in your head:** 12 × 1.414 = 16.97 travel ✓. Two takeouts of 1-3/8 = 2.75. 16.97 − 2.75 = 14.22, less two 3/32" gaps (0.19) = **14.03** ✓

### The square jog — 90°

Preset **90°**. The pipe goes straight across and advances nothing. **Run = 0, travel = the offset.**

**24" offset, 2" pipe:** run 0, travel 24.00, setback 3.00 each end → **PIPE CUT 17.81"**

### When the run is fixed instead

Tap **Set run** and type the run. The angle falls out of it and shows as **Cut angle**. A run of **0** gives you the square jog.

Use this when the space along the line is what is tight, not the angle.

### Galvanised, PVC and soil pipe

The screen works the elbows the job's pipe is made up with, set by the material (Settings, or "4 inch PVC" said anywhere):

| Material | Elbows | Takeout from | Gap |
|---|---|---|---|
| Steel, stainless, chrome-moly | Butt weld | Handbook 2-42; any other angle is an elbow cut down from a 90 | Your weld gap, at each weld |
| Galvanised | Screwed, 90° and 45° | Handbook 4-37 and 4-39, centre to the end of the pipe made up tight | None |
| PVC, CPVC | Socket, 90° and 45° | **Your fitting library**, for the line and size | None: the pipe bottoms in the socket |
| Cast iron soil | No-hub 1/4, 1/8 and 1/16 bends (90°, 45°, 22.5°) | **Your fitting library**, for the line and size | The coupling's **centre stop**, if you enter it |

The presets show only the angles those fittings are made in, and an angle they are not made in (or one a fixed run lands on) is refused with the reason. With a library figure not yet set, the screen says which one and **Open the fitting library** takes you to it. The throat and heel marks are for a butt weld elbow cut down, so they show for butt weld only; the weight is the pipe's own in the job's material, fittings not counted. **Rolling offset** works the same way.

### Where people go wrong

- **Measuring the offset to the pipe surface instead of the centre.** Everything in this app is centre to centre.
- **Forgetting the gap is already off.** PIPE CUT is ready to cut. Do not deduct again.
- **Bending the pipe instead of welding elbows.** This screen takes out bought elbows, the same figures as Cut length. For an offset bent into the pipe, use **Pipe bend**, which lays out the bend marks.

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
| Setback | 1.3750" (1-3/8, handbook 2-42) |
| **PIPE CUT** | **18.2757"** |

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

**Faster: photograph the box or the maker's sheet.** In the takeout box, tap **Photograph the box or sheet** and shoot the box label (or the dimension table) flat and square. Claude reads every fitting and size on it at once; with no paid Claude key, Cloudflare's free vision model reads it instead, from the same daily allowance as the free voice helper. Either way you get a list to check against the paper:

- **Ticked** rows are new or change a saved figure. Only ticked rows are saved, and only when you tap **Save**.
- **Unticked, in orange**: two figures for one fitting (tick the right one), a figure too long for the size (usually millimetres read as inches), a size the line doesn't come in, or a sheet for another schedule than the job's.
- Where a sheet gives centre-to-face and socket depth instead of the takeout, the app does the subtraction and shows it.
- Millimetre sheets are converted. The photo is read and not kept. Needs signal.
- The free model reads a clear, square-on label well and small print less well: check its figures against the box before you save, as you would any.

The same takeout box comes up on **Simple offset** and **Rolling offset** for a PVC or soil pipe job, under the answer, when the offset waits on a fitting's figure: photograph it there and the offset works as soon as it is saved. Say **"read the box"** with it on screen and the camera comes up right there.

**Hands-free: "read this box".** Say **"read this box"** (or "scan the label", "photograph the sheet") and the camera comes up for the job's line, with the mic left open:

- **"Take it"** shoots, once the label or table fills the frame.
- The read comes back to check on screen, the same as by hand.
- **"Save"** keeps what is ticked. **"Again"** goes back to the camera. **"Cancel"** closes it.
- It answers only those words, said on their own; a word a letter off one of them ("safe", "a gain") counts. Anything else, including the phone's own voice, is ignored.
- The job's pipe must be PVC, CPVC or cast iron soil; say it first ("2 inch PVC").

**The fitting library screen** (Projects → Logs → Fitting library, or say "fitting library") shows every saved takeout by line (PVC SCH 40, CI CISPI 301…):

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
- A tick word a letter or two off ("4 down", "text", "under 4") is heard as the tick. Anything else heard is ignored, including the phone's own voice.

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

## Knots

**The knots a fitter uses on tag lines and hand lines: watch each one tied, tie it on screen with a finger, then take the test.** PipeFit tab → **Rigging → Knots**, or say "knots".

> Knots are for tag lines, hand lines and light material on a hand line. Never knot a sling or a wire rope, and never use a knot for fall protection: a lift is rigged to its plan with rated gear.

| Knot | What it's for |
|---|---|
| Bowline | A fixed loop in the end of a line that won't slip, and unties after a load |
| Clove hitch | Two turns round a pipe, rail or post: quick to tie and adjust |
| Figure eight | A stopper, so a line can't run out through a block |
| Slip knot | Lets go with one pull on the tail. Never for a load |
| Round turn and two half hitches | Ties a line off to a rail or ring so it holds under load |
| Timber hitch | Grips a pipe or timber for a pull or a hand-line hoist (add a half hitch for a killick hitch) |
| Sheet bend | Joins two lines, even of different sizes |
| Square knot | Ties two ends round a bundle. Never to join lines that take a load |

**Learn:** the knot is tied in front of you a step at a time, the working end (taped black) moving over and under as it goes, on a loop like a short film. **Back** and **Next** move between steps; **Pause** holds the step done. With Reduce Motion on, each step shows done.

**Tie it:** the glowing end is yours. Put a finger on it and drag it along the dashed line. It follows only along the knot's path, over and under as the knot goes, step by step. Wander off the line and it counts a slip. Tied: your time, your slips and up to three stars, and the best is kept. Then tie it in a real line before you need it on a job.

**The knot test:** ten questions: which knot is this, which knot for this job, what comes next, and is that safe. Each answer says why. The missed ones link back to their knot, and the best score is kept.

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

Two calculators in one tab. The switch at the top picks **Trade** or **Standard**, and the tab opens on whichever you used last. Each keeps its own sum, so flipping across and back loses nothing. While this tab is open the mic sits at the end of that top row instead of floating over the keys.

### Say the sum

Tap the mic and say it the way you would say it to the man next to you. The sum is keyed into the calculator exactly as it would be typed, worked by the same keys, and the answer is shown on the display and read out.

| Say | What happens |
|---|---|
| "12 and a half plus 3 foot 2", "10 foot minus 3 and a quarter", "350 mil plus 2 inches" | Worked on the **Trade** calculator in feet, inches and fractions, whichever calculator is showing: 50-1/2", 116-3/4", 15-3/4". A bare figure in a sum of lengths is inches. |
| "2 foot times 3", "what's 12 times 8 divided by 3" | Times and divide keep a bare figure a plain number: 72". |
| "Times 2", "plus 3 foot", "minus 6" | Starts with an operation: carries on from the answer on the display. |
| "Square root of 144", "5 squared", "2 to the power of 10", "sine of 30", "200 plus 10 percent", "open bracket 2 plus 3 close bracket times 4" | Roots, powers, trig in degrees, percent and brackets, on either calculator. "5 factorial" works on Standard. |
| "Add 12 and 3", "subtract 3 from 10", "multiply 6 by 7", "divide 100 by 8" | Said verb first, worked the right way round. |
| "Convert 3 feet to millimetres", "how many psi in 10 bar", "100 degrees Fahrenheit to Celsius", "50 foot pounds to newton metres" | The converter opens at that figure, with every unit of the category under it; the answer is read out. |
| "Equals", "clear", "backspace" | Those keys. |
| "Trade calculator", "standard", "history", "unit converter", "scientific keys", "keypad" | Switches the calculator or its panel. |
| "Offset 12, run 30, what's the travel?", "travel for a 12 inch offset at 45 degrees", "offset 12 at 45, what's the cut?" | The triangle: the two given go in their registers (Offset, Run, Travel, Angle/Slope), the one asked is solved and left on the display, and the others are read out with it. Figures in feet and inches work; an angle is in degrees, and a plain figure after "at" is the angle. Ask for **the cut** and you get the pipe between the two elbows too. |
| "Rolling offset, rise 12, roll 8, at 45", "12 inch rise 8 inch roll 45 degrees what's the travel", "roll 8 rise 12 run 30" | A rolling offset on the Roll key: true offset, travel, run and the cut between the elbows, for the pipe set. The **ROLL** marker stays lit while a roll is held; a plain triangle said after it lets the roll go. |
| "What's the cut", "true offset", "roll angle" | After a triangle: the cut between the elbows (a takeout off each end and a gap at each weld), a rolling offset's true offset, and its roll angle. |
| "Takeout", "takeout at 30", "arcs for a 22 and a half" | T.O./Arc on the pipe set: the takeout, then where to mark the throat, centre line and heel, all read out. With no angle said it is the triangle's angle, or a 90. |
| "Pipe size 6", "gap an eighth", "welder's gap 3/32", "what's the gap" | Sets (or reads back) the pipe size and welder's gap. "6 inch schedule 80", "stainless", "short radius" set the pipe from any screen. |
| "The OD", "ID", "wall thickness", "weight per foot", "capacity" | The pipe set's figure, from the tables. |
| "Cutback for a 6 inch spread", "area of a 10 inch circle", "circumference of 10 inch", "force at 150 psi", "velocity at 10 gpm", "read the tape" | Those keys: concentric cutback at the triangle's angle, circle area and wrap, the push on a cap or blind of the pipe set, the speed through its bore, the last answer on the tape. |
| "Store that in 3", "recall 3", "memory plus", "memory minus", "recall memory", "clear memory" | The memory keys: registers 1 to 9, and the accumulator. |
| "In feet", "show it in inches", "in millimetres" | The answer on the display read in that unit. |
| "Takeout on a 6 inch 45", "takeout on a 6 inch 90 then minus 3" | The elbow's takeout goes on the display, ready for the next sum (see below). |

**Elbows, on any screen.** "Takeout on a 6 inch 45", "6 inch short radius 90 takeout", "screwed 2 inch 90 takeout", "flanged class 300 4 inch 90 takeout" answer from the same handbook figures Cut Length uses: butt weld 90s and 45s from page 2-42, screwed, street, solder and flanged from their pages. With no joint said, a galvanised job is screwed, plastic and soil pipe come from your fitting library, and the rest is butt weld, at the elbow radius set for the job. An odd angle ("6 inch elbow at 30 degrees") is a cut butt weld elbow, worked from the bend radius and said to be so. **"Cut a 6 inch 90 to 30 degrees"** gives where to mark the heel, the centre line and the throat from one end, and the takeout of the piece left.

Say a sum or a conversion on **any** screen and the Calculator opens and works it. Works with no signal.

### Standard: the phone calculator

Laid out like the calculator on the phone, so there is nothing to learn.

- **Type the sum as it reads.** `2` `+` `3` `×` `4` is 14: multiply and divide go before add and subtract. The answer shows under the sum as you type; **=** keeps it.
- **( )** is one key, as on the phone. It opens a bracket, or closes one when there is something to close. Brackets left open close themselves at =.
- **%** after **+** or **−** is a percentage of what it is added to: `200` `+` `10` `%` is 220, so price plus tax is one sum. Anywhere else 10% is 0.1.
- **+/−** makes the number being typed negative, and takes it back off.
- **Backspace** (top right of the strip) takes back the last thing typed. **C** clears it all.
- After **=**, a digit starts a new sum and an operator carries the answer on.
- A number against a bracket, π or a function multiplies: `2` `π` is 2×π.

The strip under the display:

- **History** (clock): every sum finished with **=**, newest first, kept on the phone. Tap one to put its answer into the sum you are on. **Clear history** empties it.
- **Unit converter** (arrows): see below.
- **Scientific** (flask): √, sin, cos, tan, ln, log, 1/x, x², xʸ, |x|, π, e and x!, with **2nd** for ∛, sin⁻¹, cos⁻¹, tan⁻¹, eˣ, 10ˣ and x³. **Deg** and **Rad** switch the angle; it opens in degrees and stays as you leave it. In degrees the angles a fitter uses come out exact: sin 30 is 0.5, tan 45 is 1, and tan 90 says *Invalid input* instead of a giant number.

What cannot be worked says why and leaves the sum on the display: *Can't divide by 0.*, *Invalid input.*, *Invalid format used.*, *Value too large.* Answers are kept to fifteen figures, so 0.1 + 0.2 is 0.3.

### The unit converter

Pick a category along the top, type the figure, and **every unit in the category shows under it at once**. Tap any of them to type in that unit instead. The category and the unit you type in are remembered.

| Category | Units |
|---|---|
| Length | mm, cm, m, km, inch, foot, yard, mile, nautical mile, thou, µm; plus **feet and inches** and **inches to the fraction** you read to in Settings |
| Area | mm², cm², m², hectare, km², in², ft², yd², acre, mi² |
| Volume | mL, L, m³, in³, ft³, yd³, US gallon, quart, pint, cup, fl oz, tbsp, tsp, imperial gallon, oil barrel |
| Mass | mg, g, kg, tonne, oz, lb, stone, short ton, long ton |
| Temperature | °C, °F, K, °R (use **+/−** for below zero) |
| Speed | m/s, km/h, mph, ft/s, ft/min, knot |
| Time | ms, s, min, h, day, week |
| Data | bit, B, kB, MB, GB, TB, and KiB, MiB, GiB, TiB |
| Pressure | psi, ksi, Pa, kPa, MPa, bar, mbar, atm, inHg, mmHg, inH₂O, ft H₂O |
| Flow | gpm, gph, L/min, L/s, m³/h, cfm, bbl/day |
| Torque | N·m, ft·lb, in·lb, kgf·m |
| Force | N, kN, lbf, kip, kgf |
| Power | W, kW, hp, BTU/h, ton of refrigeration |
| Energy | J, kJ, kWh, BTU, therm, cal, kcal |
| Angle | degree, radian, gradian, arc minute, arc second, revolution |

Water column is at 4 °C and mercury at 0 °C, the standard reference temperatures. Every unit agrees with the trade calculator's conversions wherever the two share one.

### Trade

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

The copper keys along the top are the pipefitting ones. **Conv** turns on the second function printed above each key. Every key on the pad does something: no key is decoration.

The trade keys work on **the pipe set**: its size, material, wall, elbow radius and welder's gap. That is the same pipe the rest of the app is set to (Settings, or "6 inch schedule 80" said anywhere), so changing it on the keypad changes it everywhere, and the other way round. The line under the figure always says what the figure is and what it was worked for: **T.O. · 6" LR 45°**, **OD · 2" SCH 40 CS**, **TRAVEL**.

| Key | What it does |
|---|---|
| **Offset**, **Run**, **Travel**, **Angle/Slope** | Key a figure and press one to hold it; press one with nothing keyed and it solves from the last two held. **Travel pressed again** gives the **cut**: the travel less the elbow takeout at each end and a welder's gap at each weld. Again goes back to the travel. |
| **Roll** (Conv Travel) | Key the roll of a rolling offset and press Roll. Offset is then the **rise**, and Travel, Run and Angle are worked on the true offset. Roll with nothing keyed reads the **true offset**, then the **roll angle**. `0` Roll lets it go. The **ROLL** marker shows while one is held. |
| **T.O./Arc** (Conv Angle/Slope) | The takeout of the pipe's elbow at the angle keyed, or the triangle's angle, or a 90: the handbook figure at 90 and 45, the bend radius at any other. Press again for where to mark a cut: **ARC IN** (throat), **ARC CTR** (centre line), **ARC OUT** (heel). |
| **Cutback** (Conv Run) | Pipes running together: key the spread between them and press Cutback for how far along each next pipe's elbow or bend is set, at the triangle's angle (a 90 with none). |
| **Welder's** (Conv Offset) | Key a gap and press it to set the welder's gap (0 to 1/2"). With nothing keyed it reads the gap back. |
| **Pipe Size** | Key a size and press it to set the pipe size; a size the material is not made in is refused. With nothing keyed it reads the size back. |
| **Pipe** (Conv Pipe Size) | The pipe set's figures, one a press: OD, ID, wall, lb/ft, lb/ft full of water, gallons a foot. The figure stays on the display to work with: OD then **Circle Circle** is the wrap. |
| **Pipe Mat'l** | Shows the material; each press after the first moves to the next. Key a number first to set the **wall**: `80` is SCH 80, `40` on stainless is 40S, `11` on HDPE is DR 11. |
| **Elbow** (Conv Pipe Mat'l) | Shows long or short radius; each press after the first changes it. Galvanised is screwed and plastic is the fitting library's, set by the material. |
| **Circle** | Key a diameter (or have one on the display): the area, then the circumference. |
| **Flow**, **Velocity** (Conv `(` and `)`) | Key one and press its key; press the other for it worked through the bore of the pipe set. 10 gpm in 2" schedule 40 is 0.956 ft/sec. |
| **Pressure**, **Force**, **Area** (Conv Circle, x², √x) | Key any two and press the third. With no area keyed, the area is the pipe set's bore: `150` Pressure, Force is the push on a 2" cap at 150 psi. |
| **%** (Conv Clear) | Percent of the figure before: `200 + 10 %` is 220. |
| **Store** / **Rcl**, **M+** / **M−**, **MC** | Registers 1 to 9, and the accumulator. |
| **Prefs** (Conv Store) | The fraction answers are read to; each press after the first steps 1/16, 1/32, 1/64, 1/8. Set here, it is set in Settings too. |
| **Tape** (Conv =) | The last 30 answers, newest first, a press each. |
| **Clear All** | Clears the sum, memory, triangle and roll. The pipe set stays: it is the job's. |

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
- **Do it in rounds.** Snug the whole joint, then 20–30%, then 50–70%, then 100%. Tightening any bolt relaxes its neighbours, so the first trip round is always uneven no matter how careful you are.

Then the two that get skipped more than any other step in pipefitting:

- **The check rounds go round, not across, at 100%, until no nut turns.** Their job is to pick up the relaxation the cross rounds left behind. One pass is rarely enough; the screen asks after each one.
- **The retightening round after a four-hour dwell.** The gasket keeps relaxing after the wrench is off. ASME PCC-1 asks for a round at 100% after at least four hours, before the test or start-up.

### The rounds, as ASME PCC-1 sets them out

| Round | Load | Order | What it is doing |
|---|---|---|---|
| Snug | Hand-tight, then 10–20 ft-lb, never over 20% | Round | Nuts on one side, stud ends marked, gap checked with feelers |
| 1 | 20–30% (set 30%) | Across | Seating the joint square. Gap check after |
| 2 | 50–70% (set 60%) | Across | The gasket is seating, so bolts done early have gone slack. Gap check after |
| 3 | 100% | Across | Full load, still crossing. Gap check after |
| Check | 100% | **Round** | Repeated until no nut turns. The screen asks after each one |
| Retighten | 100% | Round | After a dwell of at least four hours; recorded under **Retighten** |

That is the **Legacy** method. The screen also offers the faster patterns PCC-1 Appendix F accepts, and tensioning:

| Method | When | What changes |
|---|---|---|
| **Modified** | 12 bolts and up | First four bolts to 20–30%, next four to 50–70%, every bolt after that straight to 100%, all in cross order; then a round at 100% |
| **Quadrant** | 16 bolts and up | Four starters 90° apart, then the next loose bolt in each quadrant in turn; load steps up every four bolts |
| **Circular** | Kammprofile or grooved metal gaskets only | Four bolts 90° apart at 20–30%, then straight round at 100% |
| **2 tools / 4 tools** | Hydraulic wrenches on one pump | Pairs 180° apart or quads 90° apart worked as one bolt through the same rounds |
| **Tension 100 / 50 / 25%** | Hydraulic tensioners | Every stud at once; odds at pressure A then evens at B; or four groups A to D. Then a check pass |

The class never sets the torque. It sets the stud count and size; the stud size, the material, the lubricant and the gasket set the torque, and that figure comes from the job's bolting spec.

### The company's bolting spec

Enter the job's bolted-joint spec once, and every joint is bolted to it. **Settings → Bolting spec → Set up the bolting spec** (or the button on the bolt-up screen when there is none):

| Field | What it is | Ships as |
|---|---|---|
| **Spec** | The document and its revision, as it goes on every record | — |
| **Stud grade** and **target stress** | What the studs are and the stress on the root area they are pulled to. Chips for B7, B16, L7, B8 Cl.2 and B8M Cl.2 fill the grade; the stress is the spec's figure | ASTM A193 B7 at 50 ksi |
| **Lubricant** and **nut factor K** | What is on the threads and its tested K. Chips give PCC-1 Appendix J typical values (moly 0.16, nickel or copper 0.18, machine oil 0.20); put the lubricant maker's figure in the box | Moly-based anti-seize, K 0.16 |
| **Gasket** and **method** | What every joint starts on | Not set, Legacy |
| **Retighten after** | The dwell before the retightening round, hours; 0 where the spec asks for none | 4 h |
| **By class** | Any class bolted differently: its own method, gasket or stress (class 900 tensioned on ring joints at 40 ksi, say) | As the spec |

Every new joint then takes the spec's gasket and method for its class and works its own torque by the PCC-1 Appendix K formula, T = K × D × F / 12, with F the load on the root area at the target stress. A 3/4" B7 stud at 50 ksi and K 0.16 comes to 151 ft-lb. The screen shows the spec's line under the torque field, and if the figure is changed by hand it offers the spec's back. A flange the spec's method cannot be used on (too few bolts, the wrong gasket) is bolted by the Legacy pattern and the screen says so.

Each joint keeps a **copy** of the spec's figures on its record, so a spec revised next month does not rewrite what this joint was pulled up to. The turnover PDF lists each spec the joints were bolted to. Cast iron flanges and a bolt count set by hand have no stud size to work from: the spec names the lubricant and stress on the record, and the torque is typed from the spec.

The spec is a record like the joints: a backup from the QC phone carries it to every phone on the crew, and a phone with one spec bolts to it. With more than one, **Settings → Bolting spec** says which.

### Step by step

1. Tap **Flange bolt-up**. It opens on the size the app is set to, Class 150.
2. Set **CLASS** (150 to 2500 steel, or 125 and 250 cast iron) and **SIZE**. The stud count and size follow from ASME B16.5 — you do not set them. Above 24" a steel class is a B16.47 flange, and a **Standard** row appears under the class: **Series A** (the MSS SP-44 drilling, fewer and bigger studs) or **Series B** (API 605, more and smaller). Count the holes to tell them apart, and check the stud size on the screen against the studs in hand: the torque follows it. The tables carry both series in classes 150, 300, 400 and 600 to 60" and class 900 to 48"; in classes 400, 600 and 900 the two series are drilled the same from 38" up. Class 400 is a B16.47 class only, so its chip appears once a series is on. Class 75 is not tabled: set the bolt count by hand and take the stud size off the drawing. The caption names the gasket the flange takes, by standard, size, class and series, because a Series A and a Series B gasket of the same size and class are different sizes, and gives the flat ring gasket's bore and outside diameter for both series in classes 150 to 600 and the spiral wound gasket's four diameters in class 150 (both series), Series B class 400 and Series B class 900. For a B16.5 class 150 flange the caption gives the drilling and the full face gasket a flat face takes.
3. If the flange is in no table, set **BOLTS** directly. The sequence only needs the count.
4. Set the **GASKET**. It decides which methods are allowed and goes on the record.
5. Pick the **METHOD**. Legacy unless the job says otherwise. A method cannot be changed once a bolt is logged; Start over first.
6. Check the **final torque**. With a company spec on the phone it is already there, worked from the stud, the stress and the K on the spec; without one, type it from the job's bolting spec. The header then shows the figure for each step. On a steel flange with no spec the screen shows the PCC-1 Appendix K reference for that stud at 50 ksi, to check the figure against.
7. **All snugged** closes the snug round. Then the header says which bolt is next; find it on the face — it has a dark ring around it — and tighten it.
8. **Tap that bolt.** It changes colour and the header moves to the next one. Under two or four tools the whole group lights up, and any bolt of it marks the group.
9. After each cross round the screen asks for a **gap check**: feelers round the flange, bring the low side up, then **Gap checked, carry on**.
10. After the check round it asks **did any nut turn?** A nut that turned means another round. None turning reads **Joint complete**, and the four-hour dwell starts.

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

A flange bolt-up is five rounds or more over every bolt. On a real job you get called away in the middle of one — the crane needs a hand, the welder wants the fit checked, your phone goes in your pocket and stays there.

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

The bars are the rounds of the method, filled as far as the joint has got, in the **same colours the flange face uses** — grey for the snug, yellow, orange, blue, green. One glance tells you how far round it is without opening it.

### How the list is ordered

- **Working now** — the unnamed joint, if there is anything in it.
- **Part done** — live joints, most recently worked at the top. This is where you look when you come back from break.
- **Finished** — every round recorded and no nut turning on the last check, most recently finished first.

Delete asks first, in the row. On a joint that is only part done it says so before it goes.

### Changing the flange starts the bolt-up again

Pick a different size, class or bolt count on a joint and **the bolt-up resets**. That is deliberate: a level array for sixteen bolts means nothing on a flange with twelve, and carrying it across would put colours on bolts nobody touched.

Setting the **BOLTS** count by hand unsets the size, because a hand-set count belongs to no table row. The picture falls back to generic proportions rather than drawing a flange it is not.

### What it will not do

Two things it refuses on purpose, because both come down to the same rule — **the app would rather lose a joint than show you a wrong one.**

**A stored joint that does not add up is not loaded.** Every saved bolt-up is checked against itself on the way in: the colour of every bolt is worked out again from the method, the round and the step, and a stored joint whose colours disagree with its place is dropped, and the register says how many went. A half-repaired bolt-up state looks exactly like a real one on screen, and would put you on the wrong bolt. Joints saved by an earlier version, with four fixed passes, load as the Legacy method at the same place.

**A list written by a newer version of the app is left alone.** If the register was last written by a newer build — the web app and the APK do get out of step — nothing is saved at all, and the screen says so. The alternative is the older build quietly overwriting joints the newer one is holding. If you would rather start clean, **Start new** on that notice does it, and says what it costs.

### Where people go wrong

- **Assuming you have to name it.** You do not. The unnamed joint is saved the same as any other.
- **Naming every joint.** The register is for joints you will come back to. One-and-done joints do not need a tag.
- **Expecting it to sync.** It does not. The register lives on **that phone**. Two people on the same flange keep two lists.
- **Treating "Finished" as a sign-off.** It records that the sequence was followed. It did not measure torque and cannot see the gasket.

---

### The joint record (ASME PCC-1 Appendix R)

One page per joint, the record a QC file keeps. On a named joint, under **Sign-off**, tap **Share the joint record**: on a phone it becomes a PDF and goes to the share sheet; in a browser it prints. The page, like the turnover package, is headed by the app's own nameplate, so a sheet that gets separated from the rest still says what made it.

What is on it:

- The joint and the job, the flange (size and class, the stud count, size and threads from B16.5 or B16.47), the gasket and the method. A B16.47 flange's record also names the gasket it takes by series, with the flat ring's bore and outside diameter (classes 150 to 600, both series) and the spiral wound gasket's diameters (class 150 in both series, Series B classes 400 and 900) where the tables have them; a B16.5 class 150 record carries the drilling and the full face gasket.
- The bolting spec it was bolted to, with the stud grade, target stress, nut factor and lubricant as copied onto the joint when it was made.
- The final torque and the torque wrench, with the calibration register's word on it for the day the joint was finished.
- When the bolt-up started and finished, and **every round**: its load (the torque for that round), its order, the bolts in the sequence they were taken, when it closed, and how a check round ended.
- The retightening rounds, with torque and notes.
- **Signatures**: *Assembled by* and *Witnessed by*, drawn on the phone. Type the name, then **Sign as …**; a changed name clears its signature, because a different name is a different person. Unsigned lines print as lines to sign on paper.

An unfinished joint prints with **OPEN** under the title and says where it is; a finished one not yet retightened says that. The app records the sequence; it does not measure torque, and the record says so.

## Retightening log

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

1. Finish the bolt-up. The **Retighten** section appears under the controls — only on a joint that has been finished once, because there is nothing to retighten otherwise. Its heading says when the four-hour dwell is up.
2. After the dwell, and again once the line has been up to temperature and back, go round the flange **at 100%, in order**.
3. Tap **Record a retightening round**.
4. Answer **Bolts moved** or **All tight**.
5. Optionally add the torque you used and a note — "after 8 hr at temp", "two bolts took a quarter turn".
6. **Save.**

The heading above the log then reads one of four things: *Retighten after* a time, *Retightening round due*, *Still taking up*, or *Nothing moved last time*.

### The register sorts itself by what is left to do

| Section | What is in it |
|---|---|
| **Working now** | The unnamed joint |
| **Part done** | Bolt-ups still going |
| **Needs a re-check** | Finished, but never been back to — or still taking up when it was |
| **Closed out** | Finished, checked, nothing moved |

**Needs a re-check is the list to work from** after a startup. Finished is not the same as closed out, and the register stopped treating it that way.

**Clear closed out** only ever removes the settled ones. A joint still waiting on a retightening round is not finished with, whatever its rounds say.

### What the app will not do

**It will not tell you when to go back.** That depends on the service, the medium, the gasket and the spec — a hard cycle wants checking sooner than a line that warms up once and sits there. Inventing a schedule would be inventing engineering. The app records what you found and shows you what is outstanding; the timing comes from the job.

**A check cannot be recorded on an unfinished joint.** There is nothing to re-check on a bolt-up nobody has been through once.

**Reopening a bolt-up throws the log away.** Undo past the end, or change the size, class or bolt count, and the checks go with it — they were checks of a joint that no longer exists, and keeping them would be a record of something nobody finished.

### Where people go wrong

- **Treating the check round as the end.** It closes the *cold* bolt-up. The gasket keeps relaxing for hours, and on hot service the joint has not finished moving until it has been to temperature.
- **Logging the date and not the finding.** "Checked 14 Sep" tells the next person nothing. "Checked 14 Sep, two bolts took a quarter turn" tells them to come back.
- **Closing a joint out on one check where bolts moved.** That check said the opposite — it is still going. The app will keep it under **Needs a re-check** for exactly that reason.
- **Expecting it to sync.** It does not. The log lives on that phone, like the rest of the register.

---

## Measure: laser meter and AR

PipeFit → **Measure**. Both run in **Chrome on Android**, not in the installed app; in the app, the button opens the web app in Chrome on this screen.

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

Every hydro and pneumatic test on the job, as a record QC signs: Projects → Logs → **Pressure tests**.

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

## Heat input

**The heat input a WPS or PQR records, from the machine and a tape.** Weld tab → **Heat input**, or say "heat input".

### Step by step
1. **Volts & amps** for a conventional machine: type the amperage and voltage off the meters. **Total energy** for a waveform-controlled machine (pulse, STT, RMD and the like): type the kJ the machine shows for the pass. ASME IX QW-409.1(c) wants that figure on those machines; volts × amps reads them wrong.
2. **Weld:** **Length** for a straight run, or **Round a pipe** and type the OD. One full pass round the pipe is π × OD.
3. **Arc time:** type it as seconds or m:ss, or press **Start the timer** when the arc strikes and **Stop the timer** when it breaks.
4. **Process:** leave **None (ASME IX)** for an ASME WPS or PQR. Pick the process only when the document is to EN 1011-1 or ISO, which apply a thermal efficiency k.
5. **Save** puts it in the history with the date and the job, and the fields you named in Settings (WPS, welder, pass, joint) show under **Saved with it**. **Share** sends the figure as text. **Send the history as a spreadsheet** sends every saved heat input as a CSV file, one column per field.

### What each number means
- **Heat input:** the energy per length of weld after the efficiency k. With **None (ASME IX)** k is 1, so it equals the arc energy.
- **Arc energy:** volts × amps × seconds ÷ length, or total energy ÷ length.
- **Travel speed:** length ÷ arc time, in the speed unit you picked.

### Worked example
180 A at 24 V, 11.811" (300 mm) in 1:00.
- Arc energy: 180 × 24 × 60 ÷ 11.811 = 21,946 J/in = **21.9 kJ/in**. Travel speed **11.8 in/min**.
- To EN 1011-1 with SMAW (k = 0.8): 21.9 × 0.8 = **17.6 kJ/in**.
- Round a 6" pipe (6.625" OD) in the same minute: π × 6.625 = 20.813", so **12.5 kJ/in** arc energy, **9.96 kJ/in** with SMAW.
- A pulse machine that shows 52 kJ over 23.622" (600 mm): 52,000 ÷ 23.622 = **2.20 kJ/in**, or **1.76 kJ/in** with SMAW.

### Checking against the WPS
1. Under **WPS**, press **Check against a WPS** (or **New WPS**) and type the window off the WPS's parameter table: amps, volts, travel speed and heat input, a minimum and a maximum for each. A blank box is no limit. Where the WPS gives a different window per pass or process, enter each as its own: WPS-101 GTAW root, WPS-101 SMAW fill.
2. Pick the process, and how the WPS takes heat input: **ASME IX / AWS, no k**, or **EN ISO, with k**. Picking the WPS sets the Process chip to match, and the check always takes heat input the WPS's way.
3. Every figure is checked as you type. A green line under the result says **In range**; a red one names each figure out and the limit it missed. The table under **WPS** shows each figure against its range.
4. **Save** keeps the verdict with the result, as the WPS stood that day. The history shows it in green or red, and the spreadsheet has **Checked against** and **WPS check** columns.

The check reads each figure as the screen shows it: 21.946 kJ/in shows as 21.9, and passes a 21.9 maximum. Amps and volts are checked as typed. A field named WPS in Settings → Welding fills itself with the WPS picked. The WPS windows go into the backup file, so the QC phone's list reaches the crew with an ordinary restore.

### Where people go wrong
- **Applying k on an ASME job.** ASME IX has no efficiency factor. A PQR figure with 0.8 taken off reads 20% low, and the WPS range built on it is wrong.
- **Volts and amps on a pulse machine.** The meters average a waveform; use **Total energy** and the machine's own kJ.
- **Timing the stop and start.** Arc time is arc on, not the time at the joint. Use the timer per pass, or type the arc time the machine logs.
- **Mixing units.** The length goes in in the same units as the screen (inches in imperial, mm in metric). Settings → Welding changes the units shown, not the inputs. A WPS limit goes in in the units shown on its box, and follows a change of units.
- **One window for a multi-process WPS.** A GTAW root and an SMAW fill have different amps. Enter each pass's window as its own WPS entry, or the root reads out of range against the fill's numbers.

---

## Orbital welding

**Weld schedules you can see, the equipment they run on, the maths behind every figure, and a run sheet for every coupon and weld.** Weld tab → **Orbital welding**, or say "orbital welding". Written for high-purity fusion work: thin-wall tube in a closed head, no filler.

The strip at the top is the order the work goes in: **1 Equipment → 2 Programs → 3 Welds**. Tap a step to open it. **Equations** is the fourth tab.

### 1. Equipment
**Add equipment**, then pick the kind. Each kind asks only for what it needs:

| Kind | What it asks for |
|---|---|
| Closed (cartridge / chamber) head | OD range, fastest rotor, electrode constant C, water cooled |
| Open head | The same, plus filler wire, oscillation, AVC |
| Track-mounted head | Smallest OD, fastest carriage, wire, OSC, AVC |
| Specialty / low-clearance head | OD range, rotor, C, the room it needs |
| Precision tube / heavy-duty power supply | Most amps, levels it holds, calibration due |
| Modules | Water cooler, switch box, AVC / OSC unit, camera |

The figures come off **your** manual. The app ships no maker's figures. **C** sets the tungsten length (C − OD ÷ 2 − arc gap). If the manual doesn't give it, measure it once off a good setup: that electrode's length + OD ÷ 2 + its gap.

### 2. Programs
**New program.** The top of the page is the program as a picture:
- **Weld clock:** the tube end-on, each level an arc from the start at the top, clockwise. The overlap runs on round the outer ring, and a deeper colour means more current. Tap an arc, or an **L1 L2…** button, to edit that level.
- **Current against time:** gas on to gas off. Purges, upslope, rotation delay, each level from background to peak with its average, then downslope.
- **Underneath:** the times (round, arc on, gas on to off) and whether the levels add up to 360° plus the overlap. **Spread the degrees evenly** fixes it in one tap.

Then the level being edited (degrees, RPM, peak, background, pulse times), a table of all the levels, the tube and head, the sequence, and the tungsten and gas.

**Worked out** lists every equation the program has the figures for: the tungsten length, the ID, the travel speed, the average current, the heat input and the rest, updated as you type. A level's own figures sit under its editor.

**Checks against the equipment:**
- an OD outside the head's range;
- a rotor faster than the head's limit;
- amps over the power supply's limit;
- more levels than the power supply holds;
- calibration past due.

**From development to qualified:**
- A program in development saves itself as it changes. Weld coupons on it.
- A coupon that passes is named on the program. Name the WPS, then **Mark it qualified**.
- A qualified program is **locked**. **Revise** opens the next version in development and keeps the qualified one under Earlier versions.
- **Print / PDF** gives a one-page program sheet to check against the power supply.

**Sharing a program, phone to phone (no account, no server):**
- On the phone with the program: open it, tap **Share by QR**. The QR carries the program, the head and power supply it names, and any equations of your own that work on it.
- On the other phone: **Orbital welding → Programs → Receive a program**, and point the camera at the QR.
- Not side by side? **Send as text** puts the code in a message. On the other phone, paste it into **Receive a program** and tap **Read the code**.
- Before anything changes, it says what it would do: **new**, **update** an older version (the phone's own copy goes under Earlier versions), **already here**, or **this phone's is newer** (nothing taken).
- Equipment and equations already on the phone are kept as they are. Only missing ones are added.
- The code is checked for a misread or a message cut short, and every record is checked as if typed in. On its own that doesn't prove who made it: that's what QC signing is for.

**QC signing: proof a program came from your QC:**
- On the QC phone: **Orbital welding → Programs → QC signing**, put your name, tap **Make this the QC phone**. It shows the phone's key: sixteen characters like `K2JD-BR7D-WYZP-S31T`.
- Every program shared from the QC phone is signed. The share sheet says so and shows the key.
- On a crew phone, the first signed program shows the QC's key. Check it against the QC phone's screen, then tap **Trust … and add it**.
- From then on, a crew phone takes a **qualified** program only if a QC it trusts signed it. Programs in development still come in, marked **Not signed**.
- A program says **Signed by your QC** while it's exactly what was signed. Its program sheet and its run sheets carry the QC's name and key.
- A crew phone passing a program on sends the QC's own signed code, so the next phone sees the QC's signature too.
- **Key changed?** A code signed with a different key under a trusted QC's name is flagged in red. Trust the new key only after checking it on the QC's screen. It replaces the old key, which may be on a lost phone.
- The key never leaves the QC phone: it isn't in a backup or a code. If the QC phone is lost, make a new key on the next one.

### 3. Welds
**Weld a coupon** (or **Weld**, on a qualified program) opens the run sheet:
- **The weld:** number, line, both heats, operator.
- **Purge:** length purged and volume changes give the purge time. The oxygen reading is checked against the program's limit.
- **Steps**, ticked off as you go, with this weld's figures in them:
  1. head and power supply;
  2. cut, face and clean;
  3. tungsten, with its length worked out;
  4. fit-up;
  5. purge;
  6. shield gas;
  7. the program on the supply;
  8. weld.
- **The look:**
  - penetration;
  - bead width and position;
  - convexity and concavity;
  - misalignment;
  - heat tint;
  - defects;
  - tie-in.

  How much is too much comes from your spec (ASME BPE or the client's).
- **Fail:** pick what the coupon shows and the usual first moves come up. Change one thing, weld another coupon, and note what changed.
- **Weld report:** when the weld is done, tap **Read the weld report** and photograph the power supply's printout or screen. It goes to the free reader first, then Claude only if that can't read it. Each level is set against the program:
  - **Peak current, background and rotor speed:** what the report says over the program's figure. A difference past 5% shows in amber; what's acceptable is your WPS's call.
  - **Heat input:** worked out from the reported volts, the pulse averaged over the program's times, and the speed round the tube (V × A × 60 ÷ in/min, J/in). If the program names a WPS that's in the **WPS book** with a heat input window, each level reads **in WPS**, **under** or **over**.
  - **Also said in plain words:** a report for a different program, a different number of levels, a fault the supply stopped on, or an operator stop.
  - **Set figures:** a printout of the supply's set figures, not the measured ones, checks that the supply holds this program.
- **Keeping the report:** **Keep it on this weld** puts it on the run sheet and its PDF. It fills the weld number and operator if they're blank. **Take it off** removes it.

### Equations
Every figure comes from an equation anyone can open, test, change or write. A formula uses names (`pi * OD * RPM`) and + − × ÷ ^, brackets and sqrt, sin and the like, with angles in degrees.

**Names a program supplies:**
- OD, wall, gap, C, overlap, V (arc volts), CFH (purge flow);
- for each level: deg, RPM, Ip, Ib, tp, tb.

An answer feeds the next equation by its own name, so IPM and Iavg give the heat input. Give a program its own figure (say `k`) under **This program's own figures** and any equation that uses `k` is worked out on it.

**Guardrails:**
- An equation is kept only once its sample values give a number.
- A changed built-in shows **changed**, and **Put back** restores it as shipped.
- Two starting points, the starting amps and the step-down, show only on programs in development.

| Built in | Formula |
|---|---|
| Travel speed | IPM = π × OD × RPM |
| Rotor speed | RPM = IPM ÷ (π × OD) |
| Level time | deg ÷ 360 × 60 ÷ RPM |
| Average current | (Ip × tp + Ib × tb) ÷ (tp + tb) |
| Time at peak, pulse rate | tp ÷ (tp + tb) × 100; 1 ÷ (tp + tb) |
| Travel per pulse | IPM ÷ 60 × (tp + tb) |
| Heat input | V × Iavg × 60 ÷ IPM (ASME IX QW-409.1(a), pulse averaged) |
| Tungsten length | C − OD ÷ 2 − gap |
| Purge time | N × (π ÷ 4 × ID² × length ÷ 1728) × 60 ÷ CFH |
| Starting amps (development) | about 1 A per 0.001" of wall |

### Worked example
0.500" × 0.065" 316L in a closed head with C = 0.750". Four pulsed levels at 4 RPM: peaks 70, 67, 64 and 61 A, background 20 A, 0.1 s / 0.1 s, with 15° of overlap.
- The levels spread to 93.7° / 93.7° / 93.7° / 93.9°. The weld goes round in **15.6 s**.
- Travel speed π × 0.5 × 4 = **6.283 in/min**. Level 1 averages **45 A**. At 9.5 V its heat input is 9.5 × 45 × 60 ÷ 6.283 = **4,082 J/in**.
- Tungsten length 0.750 − 0.250 − 0.035 = **0.465"**.
- Purging 240" of 0.370" ID tube 7 times at 20 CFH takes about **19 s**. The oxygen meter, not the clock, says when it is clean.

### Sulphur between heats
Two heats welded together with different sulphur pull the puddle toward the **lower-sulphur** heat. The further apart they are, the further it goes: the bead walks off the joint and the root on the other side can go short. It's the classic orbital failure that no change at the power supply explains, because it's in the steel.

**Where it is checked:**
- **Heat book:** open a heat and type its **Sulphur (S)** off the MTR, in weight per cent. A 316 heat outside **0.005–0.017%** is flagged; that is the band ASME BPE gives 316L made to be orbital welded. Check the edition the job is built to.
- **Run sheet and weld log:** the two heats on a weld are checked against each other.
  - **Apart:** a warning names the low heat the puddle will pull toward, and says to match the heats or weld a coupon on that pair first.
  - **Matched:** a quiet line.
  - **A heat missing from the book, or missing its sulphur:** says which.
- **Print / PDF:** the run sheet carries the result.

**How far apart is too far:** no code sets it, so the crew does, in **Settings → Welding → Sulphur apart, warn at**. The app starts at **0.005%**.

**Reading it off the mill cert.** Open it from either place:
- **Heat book:** tap **Read a mill cert**.
- **A weld with a heat that has no sulphur:** tap **Read the mill cert**. The reader opens looking for that heat.

Then:
1. **Photograph** the heat numbers and the chemistry table, flat and square, filling the frame.
2. **Reading:** the free reader goes first and Claude only if that can't read it. The picture is not kept.
3. **Review:** each heat comes back set against the heat book.
   - **Ticked to start:** a heat not in the book, which gets added, and a heat in it with no sulphur, which gets filled in.
   - **Left for you to tick:**
     - a sulphur that would replace one already kept;
     - one heat read twice with two figures;
     - a figure higher than any pipe or tube cert prints (check the scale on the cert);
     - a heat with no sulphur read.
   - **Scaled figures:** a cert printing chemistry scaled (×1000, ppm) is converted to weight per cent and shows what was printed.
4. **Check each** against the paper, then **Save**. The spec, the mill and the cert number go only into boxes still empty. Nothing you typed is written over.

### Where people go wrong
- **Welding production on a development program.** Coupons only until it is qualified. The run sheet says so in red.
- **Purging by the clock.** The purge time is a guide. Strike only when the outlet reads under the program's oxygen limit.
- **A formula in the wrong units.** The built-ins take inches, seconds and CFH. An equation of your own works in whatever units its samples were typed in, so keep its inputs in the units the program holds.
- **Copying a maker's chart into the app.** Put the figures you weld to into your own program. Keep the maker's sheet as the maker's.

---

## Weldability

**The carbon equivalents off a mill cert, in one place.** Weld tab → **Weldability**, or say "carbon equivalent".

Type each element in weight percent, as the cert prints it. A blank counts as zero.

| Figure | Formula | What it is for |
|---|---|---|
| **CE (IIW)** | C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15 | The headline figure for carbon steels above 0.12% C |
| **CET** | C + (Mn+Mo)/10 + (Cr+Cu)/20 + Ni/40 | EN 1011-2 preheat method |
| **CE (AWS)** | C + (Mn+Si)/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15 | AWS D1.1 preheat guide |
| **Pcm** | C + Si/30 + (Mn+Cu+Cr)/20 + Ni/60 + Mo/15 + V/10 + 5B | Low carbon steels, 0.12% C or less |
| **PREN** | Cr + 3.3Mo + 16N | Pitting resistance of stainless: 316L about 24, 2205 about 35 |

The reading under CE (IIW): 0.35 or less excellent, up to 0.40 very good, up to 0.45 good, up to 0.50 fair (preheat and low-hydrogen practice likely), above 0.50 poor.

### Worked example
C 0.20, Mn 1.20, Si 0.30, Cr 0.10, Ni 0.10, Mo 0.05, Cu 0.15, V 0.02, N 0.008, B 0.0005.
- CE (IIW) = 0.20 + 0.20 + 0.034 + 0.017 = **0.45**, fair.
- CET **0.34**, CE (AWS) **0.50**, Pcm **0.292**, PREN **0.4**.

### Where people go wrong
- **Reading a preheat off the CE.** The CE says how hard the steel is to weld. The preheat comes from the WPS and the code it was qualified to.
- **Using the spec maximums.** The figure that matters is the heat in the joint. Type the cert, not the material spec.
- **Boron left off.** Pcm carries 5 × B. A cert showing B < 0.0005 is near enough zero; a cert showing 0.003 moves Pcm by 0.015.

---

## Weld log

**Every weld on the job, the welders who made it, and the NDE the code still asks for.** Weld tab → **Weld log**, or say "weld log".

### Logging welds
1. **Log a weld.** Line or iso, weld number (the next one on the line is filled in), the day, size, joint (butt, socket, fillet, branch), process and WPS.
2. **Welders:** tap the stamps from the roster, or type one. A stamp not on the roster, without the process, or lapsed is named under it before you save.
3. **Heats:** the heat numbers either side. One not in the heat book is named, so the MTR gets filed. With sulphur entered on both heats in the heat book, they are checked against each other (see **Sulphur between heats** under Orbital welding).
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

## Calibration register

**Every gauge, wrench and instrument a record is read off, and when each one is due.** Projects → Logs → **Calibration**, or say "calibration".

- **Add an instrument:** what it is (pressure gauge, torque wrench, relief valve, chart recorder, thermometer, meter, other), tag or serial as stamped on it, full scale, make and model, and how often it is calibrated. Gauges default to 6 months, the rest to 12. Enter the last calibration (the day, certificate number, lab) and it is due that many months on.
- **The list runs worst first:** Overdue, Never calibrated, Due soon (inside 30 days), In calibration, Out of service. A red banner says how many are overdue.
- **Tap one** to record a new calibration (the old one goes into its history), change its details, tag it **Out of service**, or remove it.
- **The phone alerts** 30 days before a due date and on the day, at 7 am, with the app closed. Tap the alert to open the register. Alarms need the 1.3.0 APK.
- **Print / PDF:** the register as an auditor reads it, with anything overdue or never calibrated at the top.

### Where it is used
- **Pressure tests:** under the test gauges, **From the calibration register** offers every gauge and chart recorder good on the day of the test. One tap puts it on the record with its range and the due date of the certificate in force that day. A gauge typed by hand that the register knows is out of calibration or out of service on the test day is said so in red. Relief valves are offered the same way, with their set pressure.
- **Flange bolt-ups:** the Sign-off panel has **Torque wrench**, with the wrenches good on the day. The wrench is printed in the turnover package's bolt-up record. A joint pulled up with a wrench out of calibration that day is an open item.

Each record is judged by the certificate in force **on the day it was made**, not today. A gauge that has since run out does not void last month's test, and one calibrated since does not save it.

## Shift report

The day, written up once at the end of it: Projects → Logs → **Shift report**.

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
7. **Build the report**: the plain version, from the records and your notes word for word. Or **Polish the wording**: the same facts go to the server, which writes the summary as sentences and tidies your notes into sentences a GC can read. Cloudflare's free model writes it; Claude only when the free one cannot, or writes something the app's checks turn down.
8. Read it over and change anything, then **Send as text** to a chat or email, or **Share as PDF**.

### What the polish is and is not allowed to do

It writes only the summary and rewrites the four notes. Every figure under them is the app's own, laid out by code. And the app checks the polished version before showing it (the server checks the free model's the same way, and asks Claude instead if it fails): every number in it must be a number in the facts or your notes; every rejected weld, failed or open test, joint that took up and heat without a cert must be named in the summary; a note you left empty stays empty and one you filled stays filled. If any of that fails, the plain version is used and the screen says why. Either way you read it before it goes.

With no signal, or with neither model able to write it, the plain report is there and is right.

### Where people go wrong

- **Logging the welds once at the end of the week.** One report per day; the figures are what the shift did.
- **Sending it without reading it.** The polished version is checked against the record, not against what you meant. A note it misread is yours to fix.

---

## Handbook

Every table from the printed book, searchable, **with its page number on it**.

Use it when you want to see the figure the calculation used rather than take it on trust. Search by what you are looking for — "reducer", "flange", "copper", "support" — and the table comes up with its source page so you can check it against the book in your truck.

---

## Voice

The round mic low on the right of every screen. Tap it, say it, and the app does it — for a hood, gloves or two dirty hands.

**Put it where you want it.** Press the mic and drag it anywhere on the screen; let go and it stays there, on every page and after the app is shut. A tap that wanders a little is still a tap, so a gloved press does not move it by accident. It keeps its place as a share of the screen, so turning the phone or restoring onto a bigger one still finds it on the screen. **Settings → In the field → Put the mic back in its corner** returns it, and so does **Settings → Layout → Put everything back where it shipped**. On the Calculator tab it sits in the top row instead, clear of both keypads.

### Anything on the screen, by what it says

Whatever you can see, you can say. Every button, chip, switch and box tells the voice its label, on every screen, so no screen has to be taught its words:

| Say | What happens |
|---|---|
| "Save", "share", "new WPS", "send the history" | That button is pressed. Part of a long label is enough when it can only mean one button; when it could mean two, the panel asks which. |
| "SMAW stick", "total energy", "logs", "process SMAW stick" | That chip or switch is picked. The row's name in front is optional. |
| "Amperage 180", "set the voltage to 24.5", "amps 180" | That box is filled. |
| "Amperage 180 voltage 24 length welded 11.8 arc time 60" | Several number boxes in one breath, each to the next box's name. |
| "WPS is WPS-101", "note the pump came in late" | A text box takes the words as said; a note box adds them to what is there. |
| "Clear the note", "amperage blank" | Empties that box. |
| "Close", "delete W14", "remove leg 2", "turn the light on", "read aloud", "hide the coaching", "open the joint register" | The icon buttons — a cross, a bin, a pencil, a torch — by the name they carry. A delete that asks for a second tap asks by voice too: "really delete". |
| "Day before", "yesterday", "today", "next day" | The day stepper on a record screen. Never past today. |
| "More bolts", "fewer bolts", "bolts 16" | The bolt-count slider on the bolt-up: only a count the flange has. |
| "One more 2 inch weld", "one fewer 6 inch weld" | The weld count steppers on the shift report. |
| "What can I say?" | Reads out what this screen answers to. |

"Tap", "press", "please" and "button" round a command are ignored. A sheet open over a page wins a tie: "cancel" presses the sheet's Cancel, not the page's. A button is pressed quietly; a box or a chip is said back, so a mishearing is caught. Works with no signal, at no cost.

### What you can say

| Say | What happens |
|---|---|
| "Bolt up", "hydro", "heat book", "shift report" | That tool opens. Works with no signal. |
| "Home", "projects", "PipeFit", "weld", "logs", "calculator", "edu" | That tab opens; "logs" opens the Logs tab on the Projects page. |
| "Rolling offset, rise 12, roll 8 and a half, run 30", "rolling offset rise 12 roll 8 at 45" | Rolling offset opens with the figures in. "3 foot 6", "12 and 3/8" and "350 millimetres" are understood, and a plain figure after "at" is the angle. Said on the Calculator, it is worked there instead (see Calculator → Say the sum). |
| "Simple offset, 14 and a half at 22 and a half degrees" | Any bend or offset tool opens filled in — see the table below. |
| "Rise 12", "leg b 3 foot 6" (with the tool open) | Fills that field on the screen you are on. |
| "Two 6 inch welds", "weld 14 rejected for porosity", "spools 3 and 4 done", "crew of 6", "10 hours" | Added to today's shift report for the job on the home screen. |
| "Safety: fire watch posted at the tank" | Added under Safety on today's report. Issue, Tomorrow and Note work the same way. |
| "Start the hold at 225", "reading 224 psi", "end the hold at 224", "test passed", "test failed, leak at flange 3" | Written on the pressure test on screen, or the job's latest open test. |
| "Hazards hot work and lifting", "toolbox talk ladders", "task is tie-in at rack 3", "crew is John and Luis" | Written on today's pre-task plan. Hazards are heard by any name a crew uses: "rigging", "heights", "LOTO", "trench". |
| "What's the takeout on a 45?", "look up the U-bolts" | The handbook opens at the table that holds it, with its page. |
| "Half inch stainless 40S", "6 inch chrome moly P22 schedule 80 long radius", "4 inch PVC" | Sets the job's pipe: size, material, wall, elbow radius — any of them. Said back with an Undo. A calculator already open follows it straight away (Cut Length also moves to the new material's joints) and shows an amber "Pipe changed to …" bar with a buzz, so it is seen as well as heard; changed from Settings, the bar shows when you go back to the calculator. A saved spool keeps its own pipe. |
| "What's 12 and a half plus 3 foot 2", "convert 3 feet to millimetres" | The Calculator opens and works it (see Calculator → Say the sum). |
| "Takeout on a 6 inch 45", "cut a 6 inch 90 to 30 degrees" | Answered where you are, from the handbook and the bend radius (see Calculator → Elbows). |
| "Back", "cancel" | Goes back a screen, or closes the panel. |

**What runs where.** Everything above is worked out on the phone, at once, with no signal and at no cost: the screen's labels first, then tool names and figures, then the record sentences. Only a sentence none of those make sense of goes to the cloud, which needs signal:

1. **Cloudflare's free model** first: no key, no bill. It works out what was meant, and points to the handbook table rather than reading a figure from it. It has a free allowance of 10,000 Neurons a day for the whole account, which comes back at midnight UTC.
2. **Claude**, the last resort, only when the free model cannot be reached, has used up the day's allowance, errors, or gives back an answer the app's checks turn down. Claude, when it answers, also reads a figure out of the handbook aloud.

The same order holds for every cloud job: the box and sheet reader, the shift report polish and orientation courses.

The app never writes a record from a cloud answer it has not checked against the same rules, whichever one answered.

**Misheard words are taken for what they nearly are.** The phone's recogniser knows everyday speech, not the trade, so it writes "12 volt" for 12 bolt, "bold cup" for bolt up, "hydra" for hydro, "rice 12, role 8" for rise 12, roll 8. The app hears those the way a fitter would: a word it does not know is taken as the nearest one it does, nearer still when it belongs to the tool just named, and every guess the recogniser offered is tried before anything goes to Claude. A command one word short of making sense is done anyway, and the panel says what it did not catch. A word near nothing the app knows is left as said, and that sentence goes to Claude as said, so nothing is quietly made up.

**It learns this phone.** A recogniser is consistent in its mistakes. When one of its other guesses, or Claude, makes sense of a word the top transcript got wrong, the pair is kept on the phone: say it the same way again and it is heard as meant at once, with no signal. A learned word only ever fires on the exact word it was learned from, never on a word the app knows. Settings → In the field → Voice shows what has been learned, with a button to forget it; the list goes into the backup. You can teach it yourself: under the answer, **Not that?** lists the recogniser's other guesses at what you said; tap the right one and the app does it and learns the word. And when nothing could make sense of what you said and you open the tool by hand within half a minute, the words that should have opened it are learned. The recogniser is also told the figure names, the materials and walls, and the camera and saw words, so it writes them right more often in the first place.

### Figures by voice

Every bend and offset tool takes its figures by name. Say the tool and the figures together, or open the tool and say just the figures. A number with no name goes in the first field.

| Tool | Say |
|---|---|
| Flange bolt-up | bolts (4 to 68, in fours) — "flange bolt-up, 12 bolt"; or size and class — "6 inch, class 250" takes the bolt count from the handbook. Above 24" the count picks the B16.47 series: "36 inch class 150, 44 bolt" is Series B, and with no count said it stays on the series the joint is on, else Series A |
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

The cloud answers handbook questions only from the handbook. If the book does not cover it, it says so rather than guess.

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
- **"The cloud helper is not set up on the server":** the Worker has neither an Anthropic key nor the Workers AI binding. The binding ships in `wrangler.jsonc`, so a deploy restores it. Everything on the screen still works.
- **"Today's free cloud allowance is used up":** the account's 10,000 free Neurons are spent; they come back at midnight UTC. Everything worked out on the phone still works. A Cloudflare Workers Paid plan ($5 a month) lifts the cap at about a dollar per thousand commands.
- **"Test Claude in Settings shows why":** Settings → Smart help → **Test Claude** asks Claude one word and shows what came back, in Anthropic's words when it is a no. An Anthropic account with no credit, or a retired model name in `CLAUDE_MODEL`, are the usual causes.
- **Misheard tools:** a word near a tool's name opens the tool ("hydra" opens the hydro test). If it still misses, say the name on the tile ("flange bolt-up", "pressure tests"). Every tile name is taught to the recogniser.

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
| **Welding** | The unit heat input is shown in (kJ or J, per inch or per mm), the travel speed unit, and up to four named fields saved with every heat input (WPS, welder, pass, joint). **Auto** follows Units. Heat input → **Units, and fields to save with it** opens here. |
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
