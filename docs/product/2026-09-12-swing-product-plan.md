# Form for Hitting: product plan

12 September 2026. Written for Chase as project manager. The question: TrackMan
could pay a great deal for software that makes a swing understandable from
their markerless capture. What would it take to build that at an Apple level
of visual and understanding, and what do we do first.

## 1. What we are actually building

**One sentence:** the understanding layer for markerless swing capture. TrackMan
sells the camera and the numbers; nobody sells the *why*. Form turns a capture
into what the body did, in anatomical terms a hitter and a coach can see,
compare and act on, with every number traceable to the capture.

**Who it is for, in order:** a hitting coach reviewing a session with the
athlete beside them; the athlete alone on a phone that evening; a TrackMan
sales engineer showing a college program why the camera is worth it.

**The hero flow (the thing to make perfect before anything else):**

1. A session lands (TrackMan export or API).
2. Ten seconds later the coach sees the athlete's swings ranked, a median and
   a best, and three sentences about what changed in the body between them.
3. They open one swing: the skeleton swings, the muscle lines light up, the
   timeline shows foot plant and contact, and the report gives the numbers.
4. They put two swings side by side and see the deltas.
5. They share one link or export the CSV.

Everything else in the atlas (the student anatomy features) stays, but it is
not the product TrackMan is buying.

## 2. What "Apple level" costs, honestly

Three pillars. I can carry one of them alone; the other two need people and
money.

| Pillar | State today | What it takes | Who |
|---|---|---|---|
| Trust in the numbers | Joint angles reproduce the capture to 0.01°; muscle paths are straight lines; caveats are on screen | A validation note: our pelvis and torso rotation against TrackMan's own segment angles on every swing (built into the session pipeline now), then a marker-based or force-plate reference study on 10 to 20 swings; a biomechanist signs off the metric definitions | Me for the tooling; a biomechanist (paid, part time); TrackMan for reference data |
| Visual quality | A clean posed skeleton with coloured muscle lines, real lighting; skinned muscle shapes are off by default because they cannot look right without a rig | A rigged, artist-built musculoskeletal model (license from Zygote or Anatomography, or commission), motion design for the hero flow, one designer owning typography, colour and the report; a 90-second film | A 3D artist or a model licence (five figures), the designer who did the September review, me for integration |
| Product focus | An anatomy atlas with a swing lab inside it | A separate product surface, "Form for Hitting", sharing the engine: session in, insights out, phone-first for athletes; the atlas becomes the reference behind the "learn more" links | Me, with Chase deciding the positioning and the name |

If only one pillar gets funded, fund trust. A beautiful tool with numbers a
biomechanist can pick apart is worth nothing to TrackMan. An honest tool with
plain visuals can still be sold.

## 3. The metrics that matter (and how we get them)

All from the pose alone, so they work on any TrackMan capture:

- Kinematic sequence: peak rotation speed and timing of pelvis, torso, lead
  arm, and bat (bat from the tip positions), relative to contact. Order and
  gaps.
- Hip-shoulder separation at foot plant and its peak.
- Lead-leg block: lead knee angle at foot plant and contact, and its
  extension speed.
- Muscle-group loading: for each group and side, the longest path before
  contact (load), the shortening from there to contact, and its peak rate.
- Consistency: the spread of every metric across a session's swings.
- Bat speed at contact from the tip track, so every body metric can be
  plotted against the outcome the hitter cares about.

What we cannot claim without more data: forces, activation, injury risk,
and anything about outcomes (exit velocity, launch) until those fields are
joined to the pose.

## 4. Roadmap

| Phase | Weeks | Deliverable |
|---|---|---|
| 17 Session mode (now) | 1 | Full TrackMan sessions through the pipeline; per-swing metrics; session report with mean and spread per group, ranked swing list, best and median swings openable; agreement with TrackMan's own segment angles printed per session |
| 18 Metrics and validation | 2 | The section 3 metrics, definitions written up; bat speed from the tip; validation note v1; a biomechanist review |
| 19 Hero flow and design | 3 | "Form for Hitting" surface: session → insights → swing → compare → share, phone-first; designer pass; rigged model v2 if licensed |
| 20 TrackMan integration | 2 | Ingest from the V3 API, per-athlete identity when TrackMan supplies it, export, the demo script and the deck |

Validation runs alongside every phase, not after.

## 5. What Chase does this month

1. Ask TrackMan two things: a hitter ID in the export, and a small set of
   swings with a marker-based reference (or force plates) for validation.
2. Fund a biomechanist review (a few hours) of the metric definitions in
   section 3.
3. Decide on the model: license a rigged musculoskeletal model, or accept the
   skeleton-and-lines look as the product's signature. The second is honest
   and fast; the first is what "Apple level" looks like.
4. Put the swing lab in front of two hitting coaches and record what they ask
   for first.

## 6. Risks

- No hitter ID in the sample: a session mixes people, so session averages
  today describe a group, not a hitter. Fixed by TrackMan supplying the ID.
- Markerless joint centres drift; our numbers inherit that. The validation
  note has to say how much.
- Straight-line muscle paths understate wrapping (quadriceps at the knee).
  Either a wrapping model (weeks) or clear labelling; labelling first.
- Scope: the atlas has 16 phases of features. The product needs one flow
  made perfect. Say no to everything else until phase 19 ships.
