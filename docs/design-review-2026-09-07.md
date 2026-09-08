# Form design review — 7 September 2026

Heuristic review of the main screen, a step-by-step walkthrough of the five pilot tasks, a prioritised fix list, layout sketches (described in words here; drawn in the PDF/HTML version), and a measured palette for the model against its ground.

- Build reviewed: https://hyperionproj25.github.io/form-anatomy/ (live on 7 Sep 2026)
- Viewports: 1440×900, 1366×768, 375×812 at 2×, Chrome
- Every size, position and colour below was measured from the rendered page, not estimated.
- Not done: sessions with real students. Section 4 is a walkthrough that stands in for them and says what to watch.

The PDF and HTML versions carry the annotated screenshots and the background A/B renders. This Markdown carries every number and recommendation.

---

## Fix these five first

1. **Put the model on a dark slate ground.** Muscle measures 1.80:1 against today's cream stage and the skeleton 1.06:1, which is why the founder cannot see it. The same render on slate measures 5.66:1 and 9.20:1. Panels stay light.
2. **Remove the intro banner and the start-panel headline.** Topbar plus banner cost 230px. On a 900px laptop the structure library begins at pixel 893; on a 1366×768 laptop it never appears, and neither do the camera buttons.
3. **Quiet the defaults, light the choices.** Five filled green pills (English names, All regions, Any joint, All layers, Both sides) each mean "no filter". They are the most prominent objects on the screen.
4. **Put the model's actions on the stage.** A bottom toolbar: views, Move a joint, Layer (Surface/Deep), zoom. Today "Animate" only exists after a joint chip is clicked in the left panel, and Deep does nothing to the model.
5. **Change the selection colour and add a rim.** The green is ΔE 3 from the muscle colour for a protanope: invisible to roughly one male student in twelve. Cyan-teal with a bright rim stays distinct for everyone and from origin blue and insertion amber.

---

## 1. How I looked

I read the source to learn what each control does, then drove the live build in headless Chrome to capture every state the pilot guide touches: the start screen, a selected muscle, attachments on, the knee animation, a fascial-line tour, a quiz question, a study set, the handout, the learning guide, and phone width for each. From those renders I sampled the actual on-screen colours of muscle, bone, the selection and the origin and insertion highlights, and computed WCAG contrast and CIE ΔE colour distance, including simulated red-green colour-blindness.

**On the usability sessions.** I could not sit students down for twenty minutes each. Section 4 walks the five pilot-guide tasks step by step on the real build and predicts where people will hesitate, with the measurement behind each prediction. Treat it as the hypothesis list for your sessions. The pilot guide already has the right protocol; I have added a "watch for" column so an observer knows what to look at.

---

## 2. The main screen, annotated

What a student sees on a 1440×900 laptop after the model loads:

1. The banner: 152px of tagline under a topbar that already says "Anatomy, connected".
2. The model: about 200px wide on an 838px stage, pastel pink on cream, no edge to speak of. Muscle 1.80:1, bone 1.06:1.
3. Five filled pills, each meaning "nothing chosen". The eye goes here first and finds no decision to make.
4. The structure library (221 entries) begins at pixel 893. Typing "soleus" in the search box changes nothing a student can see.
5. The right panel opens with a headline ("Every structure. Part of a whole.") and three tips. A student looking for what to do reads copy.
6. Study sets, the second pilot task, show one and a half above the fold.
7. Three camera views are the only visible model controls. Nothing says a joint can move or a layer can be peeled.
8. Orientation and zoom float mid-stage with 9px labels.
9. "Test your knowledge" is the page's one strong action and it lives in the banner that should go.
10. The interaction hint is 8px at 2.4:1. It is also the only place that says "click to explore".

| Measurement | Value | Why it matters |
|---|---|---|
| Space above the workspace (topbar + banner) | 230 px | A quarter of a 900px screen, a third of 768px |
| Top edge of the structure library | 893 px | Below the fold on both laptop sizes tested |
| Model width on the stage | ≈200 / 838 px | The subject occupies a quarter of its own stage |
| Muscle vs stage background | 1.80:1 (fail) | Founder's "hard to see", measured |
| Bone vs stage background | 1.06:1 (fail) | Bones mode is nearly invisible |
| Smallest text | 8 px | Hints, tags and legend; seven text colours fail 4.5:1 |
| Filter buttons before the list | 25 in 5 rows | The list is the thing people came for |
| Right panel content when a muscle is selected | 1472 px in a 698 px panel | "Show on model" sits 460px below the fold |
| Phone: header before the stage | 295 px | Details sit 1,734px below the model with no cue |

At 1366×768 (the commonest student laptop) the library, the camera buttons and the interaction hint are all off screen; the first study set is cut in half. After typing "soleus" the match exists (Soleus Muscle, L and R) but its row is at pixel 893; the student sees no change and assumes search is broken.

---

## 3. Findings, in the order to fix them

Cost uses your scale: **cheap** is colour, spacing, copy or defaults; **medium** is a layout change; **engineering** touches the viewer.

### P0 · 1 — Give the model a dark ground and keep the chrome light
- **Evidence:** muscle 1.80:1 and bone 1.06:1 against the cream stage; the dot grid adds noise at the same lightness as the model. On slate the same render measures 5.66:1 and 9.20:1, and the dimmed state used by attachments and quizzes (currently 1.36:1) becomes readable.
- **Fix:** stage background `radial-gradient(ellipse at 50% 40%, #3e4d55, #2c3940 70%, #232d33)`; remove the dot pattern; stage text `#dbe2dc`, stage muted `#aab4ad`. Cards floating over the stage stay paper-white so they read as UI, not anatomy. Mid-grey grounds were tested and rejected: muscle 2.0:1, muddy. Charcoal (`#2e332f→#1b1e1c`) is a close second but heavier, and gives bone less edge.
- **Cost:** cheap. One CSS block, three text tokens, the ground-shadow disc turned down to about a third.

### P0 · 2 — Remove the banner and the start-panel headline; let the workspace fill the viewport
- **Evidence:** 230px above the workspace; library at 893px; at 1366×768 the camera buttons sit at 836px. The workspace is fixed at 700px tall, so a bigger screen gets more page below, not more model.
- **Fix:** delete the intro block. "Test your knowledge" becomes "Quiz" in the top nav. Workspace height `calc(100vh − topbar)` with the panels scrolling inside. The right panel's start state becomes a short "Start here" list instead of the headline. Drop the "Free for every curious mind" badge and the footer tagline; put "Free, no account" in the About dialog.
- **Cost:** cheap.

### P0 · 3 — Invert the filter emphasis and halve the rows
- **Evidence:** five dark-filled "All/Any/Both" pills and 25 chips in five rows before the list. Filled means "selected" everywhere else in the UI, so the defaults read as choices the student already made.
- **Fix:** only an active filter is filled; defaults are plain text. Region and Joint become two compact selects on one row (lists of 8 and 7). Side stays segmented. Layer moves to the stage toolbar because it now acts on the model. English/Latin moves to the panel foot next to opacity. Result: search, system switch, one filter row, then the list, all within 260px of the panel top.
- **Cost:** cheap.

### P0 · 4 — Put "Move a joint" where the model is
- **Evidence:** the animate button renders only after a joint chip is chosen, at pixel 801 of the left panel; the Learning guide is the only text that mentions it, in a 100-word paragraph. While the knee animates, the right panel still shows the welcome headline, and the motion card (236×385px) sits over the model it explains.
- **Fix:** a stage toolbar: **Anterior · Posterior · Lateral | Move a joint ▾ | Layer: Surface · Deep | zoom · reset**. "Move a joint" opens a seven-item menu (Jaw, Shoulder, Elbow, Wrist, Hip, Knee, Ankle); choosing one runs the existing `motionStart`, frames the joint and opens the motion card. Every muscle's Crosses row also gets a "Move the knee" link. Rename "Animate the knee" to "Move the knee".
- **Cost:** cheap. The actions exist; this is placement and one menu.

### P0 · 5 — Make Deep peel the model, not just the list
- **Evidence:** with Deep on, the list drops from 221 to 95 entries and the render is pixel-identical (`src/data/groups.ts` filters the list only).
- **Fix:** in `computeStyles`, when layer is **Deep**, muscles classified superficial drop to opacity 0.12 and stop catching hover; deep muscles stay full. When **Surface**, the model is unchanged and only the list filters. Show a stage caption while peeled: "Surface layer peeled · approximate". Rename the control **Layer: Surface · Deep** and move it to the stage toolbar. Keep "approximate": the classification comes from bounds (soleus already lands in Deep, which is right).
- **Cost:** cheap to medium. One branch in a pure function plus a caption.

### P0 · 6 — Replace the selection green with cyan-teal and a bright rim
- **Evidence:** rendered selection `#6bb392` against rendered muscle `#dfad9b`: ΔE 47 for typical vision, **3 under protanopia, 15 under deuteranopia**. Origin and insertion survive (ΔE 45 to 138) because they differ in lightness as well as hue. Two collisions elsewhere: the compare pins reuse origin blue and insertion orange, and the motion card draws "shortening" cables in red over a red model.
- **Fix:** selection fill `#2ac7e0` with the existing emissive, plus the back-face halo brightened to `#eafffb` and widened so the rim carries the cue for anyone. ΔE against muscle becomes 61 / 33 / 49 (typical / protan / deutan). Pins take violet, magenta, yellow and deep purple. Motion cables use insertion amber for shortening and origin blue for lengthening; the two overlays never coexist, and the metaphor holds: warm is the end that moves.
- **Cost:** cheap. Four constants.

### P1 · 7 — Give each panel one job and say it in the heading
- **Evidence:** left is headed "Explore the body" and holds a system switch, search, names toggle, three chip rows, an animate button, two segmented rows, the list, opacity, restore and a help link. Right is headed "Your exploration starts here" and, once a muscle is selected, shows four equal-weight buttons, copy-link, tabs, prose, facts, attachments and applied notes in a 1472px scroll. The selected soleus is a 30px green patch; the list does not echo the selection because it is below the fold; the kicker is 8px.
- **Fix:** left heading **Find a structure**. Right heading **Selected** with the structure name, or **Nothing selected** with three starting points (study set, quiz, fascial line) and the study-set list. In the detail state, Attachments becomes a chip directly under the name alongside Isolate, Hide, Pin and +Playlist (icon plus label, one row), so "Show on model" is visible without scrolling. Facts stay as they are.
- **Cost:** cheap.

### P1 · 8 — One dock for floating cards, nothing over the orientation gizmo
- **Evidence:** the quiz card overlaps the orientation widget and hides the reset button. The playlist and motion cards sit top-left and cover the model at 236 to 260px wide. On a phone the motion card covers the whole stage. Opening the Rotator cuff set flies the camera inside the shoulder because supraspinatus is under trapezius.
- **Fix:** a single dock at the bottom-left of the stage holds one card at a time (quiz, playlist, motion) with a collapse chevron that leaves a one-line strip ("Knee flexion · 22° ▸"). Orientation and zoom move into a top-right corner stack. On phones the dock is the bottom sheet.
- **Cost:** medium.

### P1 · 9 — Set a type scale with a 12px floor and fix seven failing colours
- **Evidence:** sizes 8, 9, 10, 11, 12, 13, 15, 29, 30px. Seven pairs still measure under 4.5:1 (table in section 6). The axe test runs in jsdom with colour-contrast disabled, so CI cannot catch them.
- **Fix:** scale 12 · 13.5 · 15 · 18 · 24 · 30. Nothing under 12px. Secondary text on paper no lighter than `#5c665e` (5.9:1); on slate no darker than `#aab4ad` (5.3:1). The Latin name in body size, not 12px italic at 2.65:1.
- **Cost:** cheap.

### P1 · 10 — Tell reduced-motion users what is off, and give them the scrubber
- **Evidence:** with `prefers-reduced-motion: reduce`, `src/viewer/engine.ts` sets `motionPlaying = on && !reduced`, so Play does nothing: pressed, then read 0° and 0° a second later. The tour's drift and the contraction pulse are also silently off. Snapping instead of tweening is right; a dead button is not.
- **Fix:** under reduced motion hide Play and show one line: "Animation is off because your system prefers reduced motion. Drag the angle." The tour card says "Auto-advance is off; use Next."
- **Cost:** cheap.

### P1 · 11 — Phone: model first, details in a bottom sheet
- **Evidence:** 295px of header before the stage; the stage is a fixed 650px; the detail panel is 1,734px of content below it with nothing telling the student to scroll; the layers drawer covers 80% of the width; the motion card covers the model entirely.
- **Fix:** no banner. Stage height = viewport minus topbar. A search pill floats over the top of the stage and opens Find as a half-height sheet with the list scrolling inside it. Details, quiz, playlist and motion all live in a bottom sheet that peeks at about 96px ("Soleus · Musculus soleus"), drags to half, expands to full. The stage toolbar shrinks to icons with short labels.
- **Cost:** medium.

### P1 · 12 — Restyle the caveats as a chip that opens, and never hide them
- **Evidence:** the motion caveat is a five-line paragraph inside the card (200px on a phone); the fascia legend's caveat is 8px at 2.4:1; the attachments caveat is 10px.
- **Fix:** a small labelled chip in the card header, **Teaching model** for motion and paths, **Approximate** for attachments, always visible while the overlay is on. Tapping opens the full sentence; on first use it opens by itself. In the tour caption band the legend sits at 12px.
- **Cost:** cheap.

### P2 · 13 — Copy pass
- "Explore the body" → "Find a structure". "Your exploration starts here" → "Nothing selected". "Every structure. Part of a whole." → gone.
- "Animate the knee" → "Move the knee". "Layer controls" → "Opacity". "A little help exploring" → "Help".
- List and card names drop the "Muscle" suffix and title case: "Soleus", "Long head of biceps femoris".
- "Show on model" → "Show attachments". "Crosses: Ankle" → "Crosses the ankle · Move it".
- The first evidence badge on any line carries its one-line gloss inline ("Verified · dissection found tissue continuity") rather than in a collapsed disclosure.
- **Cost:** cheap.

### P2 · 14 — Replace the learning guide's wall of text with three anchored hints
- **Evidence:** five paragraphs of 60 to 100 words in a modal; the only place that explains joints, peeling and tours.
- **Fix:** on first visit, three small callouts anchored to the UI, one at a time: "Click any muscle", "Move a joint", "Follow a line". Dismiss on click. Keep the guide for reference, cut each entry to two sentences.
- **Cost:** medium.

### P2 · 15 — When a selection is hidden, ghost what hides it
- **Evidence:** selecting supraspinatus from the study set flies into the shoulder; soleus from the list is under gastrocnemius from every angle.
- **Fix:** when a selection comes from the list, search, playlist or quiz and its centroid is occluded from the chosen camera, apply the existing "revealed" opacity (0.28) to the occluders until the next selection.
- **Cost:** engineering.

### P2 · 16 — Add a real-browser contrast check so the palette cannot regress
- **Evidence:** `tests/a11y.test.tsx` disables colour-contrast because jsdom cannot compute it. Every failing pair in this review passed CI.
- **Fix:** run axe once in headless Chrome against the built site at 1440×900 and 375×812, asserting zero colour-contrast violations.
- **Cost:** cheap.

### P2 · 17 — Search selects on Enter and shows results where the eye is
- **Fix:** with P0·3 the list is in view. Add Enter to select the first match on the current side, and a "1 match" strip under the search box that names it.
- **Cost:** cheap.

---

## 4. Walkthrough of the five pilot tasks

"Predicted hesitation" is where I expect a student to stop or go wrong; "watch for" is what an observer should note.

### Task 1 · Find the soleus, two ways
| Step | What the build does | Predicted hesitation · watch for |
|---|---|---|
| Type "soleus" | Filters the list to one row at pixel 893, below the fold at both laptop sizes | **High.** The screen does not visibly change. Watch whether they retype, press Enter, or scroll the panel; time to first scroll. |
| Click the row, choose L or R | Selects; camera does not move; soleus is under gastrocnemius from the front | Moderate. The green patch is 30px and on the back of the leg. Watch whether they rotate or believe nothing happened. |
| Region "Leg & foot" | List of about 40, also below the fold | Same as step 1. |
| Click the model | Clicking the calf selects gastrocnemius; its copy does not mention soleus | **High.** Watch for repeated clicks on the calf and whether anyone finds "Hide". |

### Task 2 · Rotator cuff study set, arrow keys, "Show on model"
| Step | What the build does | Predicted hesitation · watch for |
|---|---|---|
| Find "Rotator cuff" | First study set, at pixel 732; cut in half at 768px | Low at 900px, moderate at 768px. |
| Open it | Playlist card top-left; camera flies into the shoulder; supraspinatus occluded | Moderate. Watch for "where is it?" |
| Arrow keys | Works; focus must not be in an input | Low once the card's hint is read. |
| "Show on model" | Button at pixel 1160 of a 698px panel; label does not say "attachments" | **High.** Watch how long until they scroll the right panel, and whether they try the opacity slider first. |

### Task 3 · Quiz on a region, ten questions, weak spots
| Step | What the build does | Predicted hesitation · watch for |
|---|---|---|
| "Test your knowledge" | Clear modal with region and line grids | Low. The best-structured screen in the app. |
| "Click the … on the model" | Card top-right over the gizmo; a metatarsal is a few pixels at default zoom; muscles mode hides most bones | **High.** Watch for zoom attempts, mis-clicks, Skip. Ask afterwards whether they knew they could zoom. |
| Read weak spots | Results card with score and "Practice weak spots (n)" | Low. Watch whether they expect a list of missed names. |

### Task 4 · Superficial back line tour, read a badge
| Step | What the build does | Predicted hesitation · watch for |
|---|---|---|
| Switch to Fascia | Panel switch or top nav; SBL preselected | Low. |
| Start the tour | "Start the guided tour" is the one strong button in the panel | Low. Good pattern; copy it for Move a joint. |
| Read one badge | Badge in the tour card and again in the caption band; "How to read the badges" collapsed below | **Cannot judge from a walkthrough.** Watch whether "Verified" is read as "this line is real" rather than "dissection found tissue continuity at this hop". If their sentence does not mention dissection or a study, the gloss needs to be inline. |

### Task 5 · Handout: print or download the Anki deck
| Step | What the build does | Predicted hesitation · watch for |
|---|---|---|
| Find "Handout" | 12px text button with a printer icon in the playlist card | Moderate. Watch whether they look in the right panel first. |
| Print or download | Modal with "Print", "Download for Anki" and one line of Anki instructions | Low. The modal is good. |

Two questions to add after the session: "What did you think the Superficial and Deep buttons would do?" and "Did you know the model could move?"

---

## 5. Sketches (described; drawn in the PDF/HTML)

**Laptop.** Same three columns, each with one job.
- A. No banner; Quiz and Help in the topbar. Workspace fills the viewport.
- B. Left panel "Find a structure": search first, system switch, one row of three selects (Region, Joint, Side), then the list, with the selected row highlighted. Names toggle and opacity at the panel foot.
- C. Stage on slate. Toolbar at the bottom: Anterior · Posterior · Lateral | ↻ Move a joint ▾ | Layer: Surface · Deep | zoom. Orientation and zoom in a top-right stack.
- D. One dock at the bottom-left for the quiz, playlist and motion cards, collapsible to a strip, with the caveat as a "Teaching model" chip in the header.
- E. Selection: cyan fill and a bright rim, with a label leader ("Soleus").
- F. Right panel "Selected": name, Latin and region line, one row of chips (Attachments · Isolate · Hide · Pin · +Playlist), Overview/Connections tabs, facts, "Crosses the ankle · Move it →", an "Approximate" chip on attachments, the source line.

**Phone (375px).** Stage is the viewport minus the topbar. A search pill floats over the top of the stage and opens Find as a half-height sheet. The same toolbar sits at the bottom of the stage with short labels. A bottom sheet (peek ≈96px, half, full) carries details, quiz, playlist and motion, never over the model.

**Toolbar detail.** "Move a joint" opens a two-column menu of the seven joints with a "Teaching model · not measured motion" strip. "Layer: Surface · Deep" peels superficial muscles to 12% on the model and filters the list; the stage caption reads "Surface layer peeled · approximate".

---

## 6. Palette and contrast

Principle: the model is the only colourful thing on the page, so its ground is dark and neutral, its chrome light and quiet, and its four highlight roles are separated by lightness as well as hue so they survive colour-blindness.

### The ground (live model, only the stage CSS changed)
| Candidate | Values | Muscle | Bone | Verdict |
|---|---|---|---|---|
| Current cream | `#f6f4ec` | 1.80:1 | 1.06:1 | Founder's complaint, measured |
| Mid grey | `#7b807a` | 2.03:1 | 3.31:1 | Rejected: muddy |
| **Slate (recommended)** | `#3e4d55 → #2c3940 → #232d33` | **5.66:1** | **9.20:1** | Cool ground, warm model sits forward; origin blue keeps 3.4:1 |
| Charcoal | `#2e332f → #1b1e1c` | ≈6:1 | ≈10:1 | Close second; heavier, less edge on bone |

Attachments on slate: origin, insertion and the dimmed body all read (dimmed muscles on cream are 1.36:1). Bones mode today: skeleton `#e4e2d8` on `#f6f4ec`, 1.06:1.

### Tokens
**Stage:** gradient centre `#3e4d55`, mid `#2c3940`, edge `#232d33`; stage text `#dbe2dc` (8.5:1); stage muted `#aab4ad` (5.3:1); cards over the stage `#fffefb`.

**Chrome:** page `#f7f6f2`; panel `#fffefb`; ink `#273a31` (keep); secondary text floor `#5c665e` (5.9:1); brand green `#365646` for active states only; rules `#dfe3d7`.

**Model (material values; highlights carry emissive so they render close to these):**
| Role | Value | Note |
|---|---|---|
| Muscle | `#a35b4c` | keep; renders ≈ `#dfad9b` |
| Bone | `#e0d3b7` | keep; renders ≈ `#ece9d9` |
| Selected fill | `#2ac7e0` | was `#477965` |
| Selection rim / halo | `#eafffb` | was `#9fc7b4`; widen it |
| Origin bones | `#3d8bff` | was `#2b7bd9`, lifted for the dark ground |
| Insertion bones | `#f2a531` | was `#d9822b`, toward amber |
| Motion: shortening | `#f2a531` | was red `#c8473f` |
| Motion: lengthening | `#3d8bff` | |
| Compare pins | `#5b3fa6` `#a86ee0` `#e0569f` `#e8c547` | no blue, no orange |

Dimmed structures stay at opacity 0.28 (≈ `#8c7f79` on slate, 2.9:1). Fascial line colours can stay; check each against slate once (sage `#809571` and mauve `#9e7c9b` will want lifting).

### The four highlight roles under colour-blindness
Rendered colours sampled from screenshots; Viénot–Brettel–Mollon dichromat simulation. ΔE below about 20 is hard to tell apart on a curved, lit surface.

| Pair | Current ΔE typical / protan / deutan | Proposed ΔE typical / protan / deutan |
|---|---|---|
| Selected vs muscle | **47 / 3 / 15** | **61 / 33 / 49** |
| Selected vs bone | 38 / 23 / 26 | 46 / 31 / 43 |
| Selected vs origin | 83 / 79 / 79 | 63 / 53 / 48 |
| Selected vs insertion | 77 / 44 / 61 | 103 / 81 / 101 |
| Origin vs insertion | 123 / 119 / 138 | 132 / 130 / 147 |
| Insertion vs muscle | 49 / 45 / 50 | 51 / 49 / 53 |
| Muscle vs ground (WCAG) | 1.80:1 | 5.66:1 |
| Bone vs ground (WCAG) | 1.06:1 | 9.20:1 |
| Origin vs ground (WCAG) | 4.01:1 | 3.38:1 |

Simulated swatches, current: protanopia selected `#adad92` vs muscle `#b4b49b`; deuteranopia `#a2a294` vs `#bdbd99`. Proposed: protanopia selected `#bdbde0` vs muscle `#b4b49b`; deuteranopia `#acace2` vs `#bdbd99`.

### Text that fails today
| Element | Now | Ratio | Set to | Ratio |
|---|---|---|---|---|
| Interaction hint | 8px `#97a08a` on stage | 2.41 | 12px `#c2cbc4` on slate | 6.75 |
| Stage subtitle | 9px `#949d8b` | 2.49 | 12px `#aab4ad` on slate | 5.26 |
| Line legend and caveat | 9/8px `#7b846f` `#9aa18e` | 3.45 / 2.36 | 12px `#e6ebe4` in the caption band | 9.28 |
| View selector, inactive | 10px `#859077` | 3.25 | 12px `#5c665e` on paper | 5.8 |
| Latin name | 12px italic `#9aa18e` | 2.65 | 13.5px `#5c665e` | 5.92 |
| Line chapter "01 / 09" | 9px `#a4ac99` | 2.33 | 12px `#5c665e` | 5.92 |
| "Free for every curious mind" | 10px `#6e7b64` | 4.02 | remove | — |
| Icon buttons | `#7f8a76` | 3.20 | `#5c665e` | 6.0 |

Evidence pills, section labels, body copy, the detail title and the active chips all pass today and keep their colours. Badges stay on light paper in the panel at 12px with Wilke's wording.

---

## 7. The five questions

**Two panels or one flow?** Two panels on a laptop, one flow on a phone. The split is right; the jobs are wrong. Left is where you find things, right is where you read about the one thing you chose. Make each heading say that, move everything that acts on the model (opacity, layer, animate) onto the stage, and keep the right panel's empty state to three starting points and the study sets. On a phone the same two jobs become a search sheet and a details sheet over a full-height stage.

**Where should "Animate this joint" live?** On the stage toolbar as "Move a joint", plus a link on every muscle that crosses one. It is an action on the model, so it belongs with the camera controls, visible before any filter is chosen. A menu of the seven joints is faster than the chip row and needs no explanation.

**What should Superficial and Deep do to the model?** Deep peels the surface layer to a ghost; Surface leaves the model whole. Rename it "Layer: Surface · Deep", put it beside the views. Deep drops superficial muscles to 12% opacity and out of hover, keeps deep muscles solid, filters the list to match, and shows "Surface layer peeled · approximate" on the stage.

**Is the intro banner worth its space?** No. It costs 152px on every visit for a sentence the brand line already says, and it is why the library and camera buttons are below the fold. The quiz button moves to the top nav. A welcome, if any, is three actions in the right panel's empty state.

**What is the first thing a new visitor should see and do?** See the model, large, on a dark ground. Do: click a muscle. Everything else flows from a selection. The first frame makes the model the obvious thing to touch: biggest object on the page, high contrast, hover name, one line on the stage: "Click any muscle". The right panel's empty state offers the other doors (study set, quiz, fascial line). A one-time highlight of the deltoid with its name on first load would show what clicking does; skip it under reduced motion.

---

## 8. Issues to file

| # | Issue | Priority | Cost |
|---|---|---|---|
| 1 | Stage: dark slate ground, remove dot grid, light stage text tokens | P0 | cheap |
| 2 | Remove intro banner and start-panel headline; workspace fills the viewport; Quiz in top nav | P0 | cheap |
| 3 | Filters: only active filters filled; Region and Joint as selects; list within 260px of panel top | P0 | cheap |
| 4 | Stage toolbar with "Move a joint" menu; "Move the …" link in Crosses row; rename Animate | P0 | cheap |
| 5 | Layer: Deep ghosts superficial muscles on the model with a stage caption | P0 | cheap–medium |
| 6 | Selection colour #2ac7e0 with bright rim; pins avoid origin/insertion hues; motion cables amber/blue | P0 | cheap |
| 7 | Panels: "Find a structure" / "Selected" headings; attachments chip under the name; "Start here" empty state | P1 | cheap |
| 8 | One collapsible dock for quiz, playlist and motion cards; gizmo and zoom to a corner stack | P1 | medium |
| 9 | Type scale with a 12px floor; fix the seven failing text colours | P1 | cheap |
| 10 | Reduced motion: hide Play, explain, keep the scrubber; tour says auto-advance is off | P1 | cheap |
| 11 | Phone: full-height stage, search pill, half-height Find sheet, bottom sheet for details and cards | P1 | medium |
| 12 | Caveats as always-visible chips that expand; legend caveat in the caption band at 12px | P1 | cheap |
| 13 | Copy pass (labels, suffixes, badge gloss inline) | P2 | cheap |
| 14 | Three anchored first-visit hints replace the guide as onboarding | P2 | medium |
| 15 | Ghost occluders when a list, search, playlist or quiz selection is hidden from the camera | P2 | engineering |
| 16 | CI: axe colour-contrast in headless Chrome at laptop and phone widths | P2 | cheap |
| 17 | Search: Enter selects the first match; "1 match" strip under the box | P2 | cheap |

---

## 9. Method notes

Screens were rendered by headless Chrome with the SwiftShader GPU so the WebGL model draws. Layout numbers are `getBoundingClientRect()` and computed styles from the live DOM. Model colours were sampled from the screenshots by region, discarding background pixels and taking the dominant clusters. Text contrast is the WCAG 2.x relative-luminance ratio. Colour distance is CIE76 ΔE in Lab. Colour-blindness is the Viénot, Brettel and Mollon 1999 dichromat simulation in linear RGB. Background candidates were tested by injecting one CSS rule into the live page, so the model, lighting and highlights are exactly what ships.

Nothing in this document changes the model, the data or the sources; every recommendation is colour, layout, copy, defaults or placement of existing actions, except issues 8, 11, 14 and 15, which are marked medium or engineering.
