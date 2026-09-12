# Swing Lab: measured swings on the anatomy model

Design spec, 10 September 2026. Written to be built later; nothing here is
implemented yet. It covers the whole feature in two deliverable phases: phase
14 (one joint at a time, driven by a measured swing) and phase 15 (the whole
body swings, every crossing muscle deforms). Phase 14 is complete and useful on
its own and is a prerequisite for phase 15.

Chase's ask (10 September): "use the TrackMan biomech data we used to show
muscle pulls and shortening during a swing … build the plan to the whole
thing."

## 1. Goals and non-goals

Goals

- Show a real, measured baseball swing on the atlas: which muscles shorten,
  which lengthen, by how much, and when (foot plant, peak bat speed, contact).
- Keep every number traceable: the angle on screen is the angle in the
  capture, transformed by rules this document states.
- Stay inside the atlas's honesty rules: every approximation is named on the
  screen where it applies, not buried in a guide.
- Work for both audiences: A&P students (what a kinetic chain looks like on the
  actual muscles) and Baseline hitters and coaches (what their own capture
  means anatomically).

Non-goals

- No coaching claims. The atlas says what moved and what that does to muscle
  length. It never says what the hitter should change.
- No forces, torques, EMG or "muscle activation". Path-length change is not
  activation, and the screen says so.
- No player identity. The samples carry none and the atlas adds none.
- Pitching is an extension, not part of these two phases (section 12).

## 2. Data sources and licensing

Two sources exist on Chase's machine (`Desktop/baseline-biomech`, and the
`Downloads/AAAbaseline-biomech-realdata.zip` archive).

### 2.1 TrackMan markerless hitting sample

- Files: `DataSampleBaseline/hpepose3d_Session{1..4}.json` (3D pose, 122 to
  164 MB each) and `hittermetrics_Session{1..4}.json` (derived metrics, 74 to
  101 MB each); `trackman-index.json` (byte offsets per swing) and
  `data/trackman-demo-swings.json` (a curated 20-swing extract, 5 per session,
  with pose, events and swing plane inline).
- Content per swing: 21 body points (headTip, ears, shoulders, neck, elbows,
  wrists, centerTorso, hips, knees, ankles, heels, shoe tips) and 3 bat points
  (tip, leadHandTop, leadHandBottom), absolute metres in TrackMan's coordinate
  system (origin at the plate tip, +Y up, +X plate to second base, right
  handed), about 370 Hz, about 551 frames (about 1.5 s). Metrics: handedness,
  `swingEvents` frame indices (frontFootPlant, maxBatSpeed, batInStrikeZone,
  batHorizEnd; 0 means not detected), pelvis and torso Euler rotations, swing
  plane on full swings only (about 46 %).
- Facts that matter for the pipeline, all verified in the data dictionary
  that ships with the sample: pose and metrics align by first timestamp, never
  by playId; there is no hitter ID and a session mixes left- and right-handed
  swings; `swingPlane.centroid` is in feet.
- Licensing: this is a sample TrackMan supplied to Baseline Analytics. Chase
  (11 September) decided derived, anonymised joint-angle curves from a few
  swings may ship ("this is just a local tool"); the files carry angles and
  event frames only, no timestamps, ids or session details.

### 2.2 CMU motion capture, subject 124, swing

- File: `baseline-biomech/data/swing_124.json` (schema
  `baseline.biomech.pose.v0`), converted from `tools/raw/124_07.bvh`.
- Content: 19 joints (pelvis, spine, chest, neck, head, shoulders, elbows,
  wrists, hips, knees, ankles, toes), 120 Hz, 228 frames, metres, Y up, right
  handed batter. No bat.
- Licensing: CMU Graphics Lab Motion Capture Database (NSF EIA-0196217).
  Free, commercial use permitted, attribution required, resale of the data
  itself not permitted. This source ships publicly from day one.
- Quality: older optical capture with visible jitter; feet and hands are
  single points, so foot and hand orientation is inferred (section 4.3).

### 2.3 Which source drives what

| | CMU 124 | TrackMan sample |
|---|---|---|
| Public site | yes | only after written permission |
| Joint angles | all lower- and upper-limb joints, trunk | the same, plus foot orientation from heel and shoe tip |
| Bat | none | tip and hands |
| Events | estimated from the motion (4.4) | measured (`swingEvents`) |
| Hitter | one, right-handed | many, unnamed, both hands |

## 3. Canonical swing format `form.swing.v1`

One JSON file per swing, produced offline, loaded on demand. Target size under
80 kB uncompressed.

```
{
  "schema": "form.swing.v1",
  "id": "cmu-124-swing",
  "label": "Hitter A · right-handed · optical capture",
  "source": { "kind": "cmu" | "trackman", "attribution": "…", "captureHz": 120 | 370 },
  "handedness": "R" | "L",
  "fps": 120,
  "frames": 132,
  "events": { "footPlant": 41, "maxBatSpeed": 88, "contact": 92 },   // frame indices; absent when not available
  "eventsEstimated": true | false,
  "segments": {                       // unit quaternions [x,y,z,w] per frame, in the model frame (section 4.5)
    "pelvis": [[...], ...], "lumbar": [...], "thorax": [...], "head": [...],
    "upperArmL": [...], "forearmL": [...], "handL": [...], "upperArmR": ..., "forearmR": ..., "handR": ...,
    "thighL": [...], "shankL": [...], "footL": [...], "thighR": ..., "shankR": ..., "footR": ...
  },
  "root": [[x, y, z], ...],           // pelvis origin per frame, model units, floor-corrected
  "joints": {                         // degrees per frame, one scalar curve each
    "kneeL": [...], "kneeR": [...], "hipL": [...], "hipR": [...],
    "elbowL": [...], "elbowR": [...], "shoulderL": [...], "shoulderR": [...],
    "ankleL": [...], "ankleR": [...],
    "pelvisRotation": [...], "torsoRotation": [...], "separation": [...]
  },
  "bat": { "knob": [[x,y,z], ...], "tip": [[x,y,z], ...] } | null,
  "caveats": ["markerless", "twist-held", "events-estimated", ...]   // keys into a caveat table in the app
}
```

Conventions

- Time: resampled to 120 Hz; trimmed to 0.5 s before foot plant and 0.35 s
  after contact (or after the last frame when contact is absent); frame 0 is
  the trimmed start; event indices refer to the trimmed clip.
- Angles: knee flexion 0° straight; hip flexion 0° in the pelvis frame's
  neutral, positive flexion; elbow flexion 0° straight; shoulder elevation
  0° arm along the trunk; ankle 0° neutral, positive plantarflexion;
  pelvisRotation and torsoRotation are rotation about vertical relative to
  frame 0; separation is torsoRotation minus pelvisRotation (the same
  quantity the Baseline biomech demo calls hip-shoulder separation).
- Segments carry orientation only. Positions come from the model's own bone
  lengths and pivots, so the hitter's limb lengths never distort the model.

## 4. Offline pipeline: `scripts/build-swings.ts`

Runs on Chase's machine. Reads a source, writes `public/swings/<id>.json` and
updates `src/data/swings-index.json` (id, label, source kind, handedness,
events, caveat keys, attribution). Unit-tested on synthetic poses.

### 4.1 Adapters to a common point cloud

Both adapters produce `{ hz, points: Record<PointName, Vec3[]>, bat?, events?, handedness }`
in metres, Y up, with the hitter's setup facing +Z (the model's anterior;
`PRESET_DIRECTIONS.front` is `[0, 0, 1]`) and the model's left on +X (as the
pivots in `geometry.json` are laid out). Facing is derived, not assumed: the
adapter takes the hip line at frame 0, builds the pelvis frame (section 4.3),
and rotates the whole capture about vertical so that frame's anterior axis is
+Z. Left-handed swings are not mirrored; the model is bilateral.

- `cmu-pose.ts`: maps the 19 CMU joints. `spine`, `chest`, `neck`, `head` give
  the trunk; toes give foot direction; there is no heel, so foot pitch is
  taken as the shank-to-toe angle at frame 0 held constant (caveat
  `foot-held`).
- `trackman-hpe.ts`: reads one play by byte range using `trackman-index.json`
  (never the whole file), joins metrics by first timestamp, maps the 21
  points and the bat, converts TCS to the model frame, and keeps
  `swingEvents` where the frame index is greater than 0.

### 4.2 Smoothing

Zero-lag fourth-order Butterworth (two passes of a second-order biquad) at
12 Hz for TrackMan and 15 Hz for CMU, applied to every point before any angle
is computed; then linear resampling to 120 Hz. The cut-offs are the common
choices for whole-body kinematics; the plan's first task records the
residual per point so the choice is checked, not assumed.

### 4.3 Segment frames from points

Each segment gets an origin and an orthonormal basis per frame (long axis,
anterior axis, lateral axis), then a quaternion relative to the model's rest
basis for that segment (section 4.5).

| Segment | Origin | Long axis | Anterior axis from |
|---|---|---|---|
| pelvis | hip midpoint | up: hip midpoint to centerTorso (CMU: pelvis to spine) | cross of hip line and long axis |
| lumbar | hip midpoint | to centerTorso | pelvis anterior, blended 50/50 with thorax anterior |
| thorax | centerTorso (CMU: chest) | to neck | cross of shoulder line and long axis |
| head | neck | to headTip (CMU: head) | ear line cross long axis; CMU: thorax anterior |
| upperArm | shoulder | to elbow | normal of the shoulder-elbow-wrist plane (undefined when the elbow is straight within 8°: hold the last defined value) |
| forearm | elbow | to wrist | same plane normal; pronation is not observable (caveat `twist-held`) |
| hand | wrist | TrackMan: wrist to leadHandBottom for the lead hand, forearm direction otherwise; CMU: forearm direction | forearm anterior (caveat `hand-held`) |
| thigh | hip | to knee | normal of the hip-knee-ankle plane; when the knee is straight within 8°, pelvis anterior |
| shank | knee | to ankle | same plane normal (tibial rotation is not observable: caveat `twist-held`) |
| foot | ankle | TrackMan: heel to shoeTip; CMU: ankle to toe | up = cross of long axis and shank lateral |

Where the basis needs a plane and the joint is straight, the basis is held
from the last frame where it was defined; this is standard and the caveat
key names it.

### 4.4 Joint angles and events

Angles are computed from the smoothed points, not from the quaternions, so
they can be checked against the raw data by anyone with the file:

- knee = 180° minus the hip-knee-ankle angle; elbow likewise with
  shoulder-elbow-wrist.
- hip = angle between the thigh long axis and the pelvis long axis, signed in
  the pelvis sagittal plane.
- shoulder = flexion: the upper-arm long axis projected on the thorax
  sagittal plane, measured from the trunk's down axis, positive forward (the
  model's shoulder axis is flexion, so elevation would not map onto it).
- ankle = 90° minus the angle between the shank long axis and the foot long
  axis, positive plantarflexion.
- pelvisRotation, torsoRotation = heading of the pelvis and thorax anterior
  axes about vertical, relative to frame 0; separation = the difference.

Events. TrackMan: taken from `swingEvents` (`batInStrikeZone` serves as
contact; `batHorizEnd` is kept as `followThrough`). CMU has no bat, so events
are estimated and flagged `eventsEstimated: true`: foot plant is the first
frame after the lead toe's peak height where its vertical speed falls under
0.05 m/s; peak bat speed is replaced by peak lead-wrist speed; contact is that
same frame (the best available proxy without a bat) and the timeline labels it
"Est. contact".

Quality flags recorded per swing: any angle outside the physiological range
the atlas already uses (knee 0 to 140, elbow 0 to 150, hip minus 20 to 120,
shoulder 0 to 180, ankle minus 30 to 50) is clipped and counted; a swing with
more than 2 % clipped frames or events out of order is rejected by the build.

### 4.5 Retargeting to the model

The model has no rig. Its pose is a set of rigid segment transforms applied to
bone meshes, and (phase 15) skinning of soft parts. Retargeting uses
orientation only:

1. Model rest basis per segment, computed once in `scripts/build-geometry.ts`
   from the pivots that already exist (hip, knee, ankle, shoulder, elbow,
   wrist, TMJ) and the new ones (section 6.2): long axis from the proximal
   pivot to the distal pivot, anterior axis +Z projected perpendicular to it,
   lateral by cross product. The model stands in anatomical position, so this
   is the segment's zero.
2. Measured basis per frame from 4.3, in the same handedness and axis order.
3. Segment rotation = measured basis × inverse(rest basis). Stored as the
   quaternion in `segments`.
4. Root: the pelvis origin per frame, scaled by the ratio of the model's hip
   pivot height to the hitter's setup hip height, then shifted per frame so
   the lower of the two posed feet touches the floor plane the engine already
   draws (the ground `box.min.y`). This removes capture height drift and the
   limb-length mismatch at the feet.

Child segments are expressed relative to the world, not to the parent, so the
runtime composes nothing: it places each segment's pivot by walking the chain
(section 6.4) and rotates the segment by its stored world quaternion.

### 4.6 Outputs and the private path

- `public/swings/cmu-124-swing.json` and `src/data/swings-index.json`
  committed.
- TrackMan swings are written to `swings-private/` (gitignored). The app reads
  `import.meta.env.VITE_SWINGS_URL` (default `${BASE_URL}swings/`); a private
  build points it at a Baseline-hosted folder, or Chase runs the app locally
  with the folder in place. The index for private swings is fetched from that
  same URL, so the public index never lists them.
- Attribution strings live in the index and appear in the swing card and in
  Sources & credits.

### 4.7 Validation in the build

- Round trip: pose the model's segment rest bases with the stored quaternions,
  recompute the joint angles from the posed pivots, and compare with the
  measured curves. Pass: RMS under 3° for knee and elbow, under 5° for hip and
  shoulder, under 4° for trunk rotations. The build prints the numbers and
  fails above the threshold.
- Events in order (foot plant before peak speed before contact) and inside
  the clip.
- Synthetic tests: a straight leg gives knee 0; a right angle gives 90; a
  pure 30° pelvis turn gives pelvisRotation 30 and separation 0; a CMU clip
  and a TrackMan clip each build under 2 s.

## 5. Phase 14: Swing lab, one joint at a time

### 5.1 What the student sees

- Entry points: the toolbar's "Move a joint" menu gets a second group,
  "Measured swing", listing the swings in the index (public build: one). The
  Start panel's third tile becomes "Move a joint, or play a measured swing".
  A study set "Kinetic chain of the swing" (phase 15) is not in this phase.
- The swing card (docked bottom-left, replacing the motion card while a swing
  is active):
  - Title: swing label and attribution line ("CMU Graphics Lab, subject 124").
  - Timeline: scrubber over the clip with event ticks and labels (Foot plant,
    Peak bat speed, Contact or Est. contact), a Play/Pause button, speed
    chips 0.25×, 0.5×, 1× (default 0.5×). Under reduced motion, Play is
    hidden and the scrubber remains, as the motion card does today.
  - Joint chips: Lead knee, Back knee, Lead hip, Back hip, Lead elbow, Back
    elbow, Lead shoulder, Back shoulder, Lead ankle, Back ankle. Lead and back
    follow handedness (right-handed: lead is the left side).
  - Angle strip: a 120 px sparkline of the chosen joint's curve with the
    playhead and the current value in degrees, and the change between foot
    plant and contact ("Lead knee: 68° at foot plant, 31° at contact, extends
    37°").
  - Shortening and lengthening lists (existing readout), computed between foot
    plant and contact rather than over a fixed sweep, sorted by percentage
    change, with the percentage shown for the top five.
  - "Show lines of action" (existing cables, scaled as today).
  - Caveat chip "Measured swing · approximate" opening: "One hitter, captured
    without markers (or: with optical markers, 2003), on a generic adult model.
    Each joint moves about one anatomical axis by the measured angle; the
    other axes are held. Lengths are path lengths between attachments, not
    fibre lengths. Events estimated from the motion where marked."

### 5.2 Behaviour

- Starting a swing frames the chosen joint the way "Move a joint" does (side
  view for knee, elbow and ankle; front for hip and shoulder) and hides the
  same far-side parts.
- Scrubbing sets the frame; playing advances frames at `speed × 120` per
  second, looping with a 0.6 s pause at the end.
- Switching the joint chip keeps the frame.
- The selected muscle, attachments, pins, Latin names and the quiz all work as
  during "Move a joint"; the cable colour rule is unchanged.

### 5.3 Engine and data changes

- `MotionDrawing` gains `curve?: { angles: Float32Array; fps: number; events: Record<string, number> }`.
  When present, `applyMotion` uses `angles[frame]` instead of the range sweep;
  `setMotionPhase(phase)` maps to the nearest frame; playback steps frames.
- `motionSetup(joint, side)` gains an optional `curve` argument so the cables'
  `change` is computed between two frames (foot plant and contact) instead of
  over the range; `cableRoles` is unchanged.
- The joint's axis and pivot are the ones in `geometry.json`; the measured
  angle is applied about that axis. Hip and shoulder use flexion and
  elevation respectively; abduction and rotation are held (stated in the
  caveat). This is the honest limit of phase 14 and the reason phase 15
  exists.
- Loader: `src/data/swings.ts` fetches `swings-index.json` at startup (tiny)
  and a swing file on demand; both cached by the service worker with the
  model.

### 5.4 State and URL

- Store: `swing: { id, joint: JointId, frame, playing, speed, lines } | null`;
  `motion` and `swing` are mutually exclusive (starting one clears the other).
  Actions: swingStart, swingStop, swingScrub, swingPlay, swingSpeed,
  swingJoint, swingLines, swingTick.
- URL: `sw=<id>&sj=<joint>&f=<frame>` (frame omitted when 0); decoding an
  unknown id ignores the parameter.

### 5.5 Tests

- `swings.test.ts`: index shape; curve resampling; frame from phase and back;
  lead and back mapping for both handednesses; change between events.
- `motion.test.ts`: cables' change with a curve equals the path-length
  difference between the two frames.
- `urlCodec.test.ts`: round trip of `sw`, `sj`, `f`.
- `a11y.test.tsx`: the swing card has labelled controls and the sparkline is
  `aria-hidden` with a text equivalent.
- Headless renders at foot plant and contact for the lead knee and the back
  hip.

Effort: one phase.

## 6. Phase 15: the whole body swings

### 6.1 Segments

Eighteen rigid segments. Bone meshes belong to exactly one segment; the table
reuses the key sets in `src/data/joints.ts` (HAND, FOOT, VERTEBRAE, RIBS,
SKULL).

| Segment | Bones |
|---|---|
| pelvis | hip-bone (both), sacrum, coccyx |
| lumbar | vertebra-l1 to l5 |
| thorax | vertebra-t1 to t12, ribs, costal cartilages, sternum parts |
| head | cervical vertebrae, skull bones, mandible, hyoid, teeth, ear ossicles, laryngeal cartilages |
| clavicle-scapula (L, R) | clavicle, scapula |
| upperArm (L, R) | humerus |
| forearm (L, R) | radius, ulna |
| hand (L, R) | HAND |
| thigh (L, R) | femur, patella |
| shank (L, R) | tibia, fibula |
| foot (L, R) | FOOT |

Scapula and clavicle follow the thorax plus a quarter of the arm's rotation
about the sternoclavicular pivot (built: a third, the textbook 2:1 rhythm,
threw the scapular muscles too far). The patella rides with the tibia (built:
through the patellar ligament, so the quadriceps lengthen as the knee bends;
with the femur they did not).

### 6.2 New pivots (in `scripts/build-geometry.ts`, spec 12.1 method)

- lumbosacral: centre of the L5 bottom face and the sacral top face.
- thoracolumbar: between T12 and L1 bodies.
- cervicothoracic: between C7 and T1 bodies (head segment root).
- sternoclavicular and acromioclavicular (both sides): from the clavicle
  ends and the acromion landmark.
- The seven existing joints stay as they are.

### 6.3 Spine distribution

The measured pelvis-to-thorax rotation is split across the lumbar and
thoracic segments rather than applied at one point. Starting split, to be
checked against White and Panjabi, Clinical Biomechanics of the Spine, before
it ships: axial rotation 25 % lumbar and 75 % thoracic; flexion and extension
65 % lumbar and 35 % thoracic; lateral bending 50/50. The lumbar segment
rotates about the lumbosacral pivot by its share and the thorax about the
thoracolumbar pivot by the rest. Head orientation is measured directly.

### 6.4 Rigid pose of the bones

Per frame, walk the chain from the pelvis: place the pelvis at `root[f]` with
`segments.pelvis[f]`; for each child, the child's pivot is the parent's posed
copy of the shared joint pivot, and the child rotates about it by its own
world quaternion. Chains: pelvis → lumbar → thorax → head; thorax →
clavicle-scapula → upperArm → forearm → hand (both sides); pelvis → thigh →
shank → foot (both sides). Each bone mesh gets its segment's matrix (the
engine's `posed` mechanism, generalised from one moving set to eighteen).

### 6.5 Skinning of soft parts

Muscles and connective parts deform by linear blend skinning over the eighteen
segments. Weights are computed offline in `scripts/build-skin.ts`:

1. For each part, its candidate segments are the segments of the bones it
   attaches to (from `attachments.ts`), expanded along the chain so a
   two-joint muscle gets the segment between (rectus femoris: pelvis, thigh,
   shank). A part with no matched attachments (118 connective parts and the
   unmatched muscles) takes the segment of the nearest bone surface at its
   centroid and, if its bounding box crosses a joint plane, the neighbour
   too.
2. For each vertex, weights over the candidate segments come from signed
   distance to each joint plane between them, through `bandWeight` with a
   band of 8 % of the part's extent (the value phase 10 settled on for the
   two-bone case), normalised to sum to 1, at most four segments.
3. Output `public/skin.bin`: per part, `Uint8Array` skin indices and
   `Uint8Array` weights, four per vertex, plus a small JSON header with byte
   offsets. Loaded only when a full-body swing starts, and cached by the
   service worker. The plan's first task measures the model's vertex count
   and records the file size; the budget is 2 MB gzipped, and if the count
   exceeds it the weights are computed in a worker on the client instead
   (the same function, run once and stored in IndexedDB).

Runtime: on the first full-body swing, every soft part gets a `SkinnedMesh`
twin sharing its geometry, bound to one `Skeleton` of eighteen bones, the way
`deform()` builds two-bone twins today; the original meshes are hidden and the
twins mirror their materials each frame (existing `mirrorDeformed`). Bulge:
each muscle with a path (section 6.6) gets the existing bulge uniform driven
by its path-length ratio for the frame. Raycasting includes twins, so
selection, hover, attachments and the quiz keep working.

### 6.6 Muscle length curves

For every muscle with contacts in `geometry.json`, the origin and insertion
contact points are posed by their bone's segment, the via point by the
muscle's belly segment weights, and the two-leg path length is computed per
frame. Per muscle: length ratio versus frame 0, and change between foot plant
and contact. These drive:

- "Colour by change" toggle: amber for shortening, blue for lengthening,
  intensity proportional to the magnitude up to 15 %; the rest of the body
  keeps its colour.
- Two ranked lists in the swing card: "Shortening most, foot plant to
  contact" and "Lengthening most" (eight each, with percentages), each name a
  button that selects the muscle.
- The per-joint lists of phase 14 remain available by joint chip.

The caveat next to the toggle: "Path length between attachments on a generic
model. Tendon, wrapping and fibre angle are not modelled; a shortening path
means the muscle-tendon unit shortened, not that it contracted."

### 6.7 Bat

TrackMan swings carry the bat: a cylinder from `bat.knob` to `bat.tip`, drawn
in the connective colour with a dark grip, hands unchanged. CMU has no bat;
the hands are empty and the timeline says "no bat in this capture".

### 6.8 Camera and cinematics

Preset views for the swing: pitcher's view (front), catcher's view (back),
open side (lateral from the lead side). The whole body is framed on start.
While a swing plays at High graphics, depth of field stays off (the dolly and
bokeh are for tours). Reduced motion: no play, scrub only.

### 6.9 Accuracy targets and validation

- Posed-model angles versus measured (4.7 thresholds) on every shipped swing,
  in CI.
- Foot penetration below the floor under 1 cm on every frame.
- Skin weights: sum to 1, at most four segments, only candidate segments;
  no vertex of a one-joint muscle assigned to a segment beyond that joint.
- Headless renders at setup, foot plant, contact and follow-through, front
  and open side, compared by eye against the Biomech demo's stick figure at
  the same frames.
- Anatomist review by Chase's team of ten named muscles' change direction
  against textbook function (lead-leg quadriceps shorten as the knee extends
  into contact; back-hip adductors and gluteals; obliques with trunk
  rotation; lead-arm triceps into extension; back-arm biceps). Any mismatch
  is a data or rig bug to fix before shipping, not a caveat.

### 6.10 Performance

- Skinning is on the GPU; eighteen bones is well under the uniform limit.
- Twins share geometry; memory grows by the weight buffers only.
- Frame budget at High: 6 ms for the swing on an RTX-class GPU; Auto's meter
  applies and drops to Low. Phones get the full-body swing at Low only.
- The swing files, index and skin weights are lazy; the home page's startup
  cost does not change.

Effort: three phases (rig and pose; skinning and length curves; UI and
validation).

## 7. Copy and honesty statements

- Swing card kicker: "MEASURED SWING".
- Under the title: "Angles from motion capture; the model is a generic
  adult."
- Estimated events: "Est. contact" with a tooltip "No bat was captured; this
  is the peak lead-wrist speed."
- Held axes (phase 14): "Other axes held" chip on the joint row.
- Twist (phase 15): "Forearm and shin rotation are not visible to the capture
  and are held at neutral."
- Attribution in Sources & credits: "Swing motion: CMU Graphics Lab Motion
  Capture Database, subject 124, funded by NSF EIA-0196217." TrackMan swings,
  if permitted: "Swing motion: TrackMan markerless capture, used with
  permission."

## 8. Changes by file (summary)

| Area | Phase 14 | Phase 15 |
|---|---|---|
| `scripts/build-swings.ts`, adapters, `build-geometry.ts` | new; rest bases for the seven joints | new pivots, rest bases for eighteen segments, `build-skin.ts` |
| `src/data/swings.ts`, `swings-index.json`, `public/swings/` | new | unchanged |
| `src/data/motion.ts` | `curve` in setup; change between frames | length curves per muscle |
| `src/viewer/engine.ts` | `curve` in `MotionDrawing`; frame playback | eighteen-segment pose, skinned twins, colour by change, bat |
| `src/state/store.tsx`, `urlCodec.ts` | `swing` state; `sw`, `sj`, `f` | `full` flag; `sf` for the view |
| `src/features/motion/SwingCard.tsx` | new | ranked lists, colour toggle |
| `src/features/library/LibraryPanel.tsx`, toolbar menu | "Measured swing" group | "Whole body" toggle |
| Modals, README, Sources | attribution, caveats | attribution, caveats |

## 9. Tests by phase

Phase 14: 4.7 synthetic tests; 5.5 list; contrast check on the new card.
Phase 15: 6.9 list; skin-weight tests on three hand-checked muscles (rectus
femoris across two joints, biceps brachii across two, a one-joint deep
muscle); a full-body headless render set in CI.

## 10. Rollout

1. Build the pipeline and phase 14 on the CMU swing; ship publicly.
2. Ask TrackMan for written permission to publish derived curves; meanwhile
   the TrackMan path runs as a private build for Baseline.
3. Phase 15 on the CMU swing; ship; then the same for TrackMan swings under
   the same permission.
4. Pilot: the four pilot-guide questions plus "did the swing change how you
   think about a muscle you knew?"

## 11. Open questions

1. TrackMan: may Baseline publish derived, anonymised joint-angle curves from
   a few sample swings, with attribution? (Blocks the public TrackMan path
   only.)
2. TrackMan: is there a hitter ID to join sessions on? (Not needed for the
   atlas; needed if Chase wants "this hitter's swings".)
3. Chase: include the CMU pitch (`124_01`) once the rig exists? The pipeline
   and rig are the same; only events and camera presets differ.
4. Chase: is a licensed elite dataset (Driveline OpenBiomechanics) worth
   pursuing for fidelity? It changes nothing in this design.

## 12. Risks

Built: phase 14 on 11 September 2026 (plan
`docs/superpowers/plans/2026-09-11-phase-14-swing-lab.md`) and phase 15 on
12 September 2026 (plan `docs/superpowers/plans/2026-09-11-phase-15-full-body-swing.md`).
Departures from section 6 as built: skin weights fall off with distance from
each candidate segment's bones (Gaussian over the part's band) rather than
across joint planes, because attachment text sometimes names a bone on the
wrong limb and an infinite joint plane let the arm claim trunk muscles;
candidate segments also include every bone the part's box overlaps; the
foot's long axis is ankle-to-toe on both sources; hands turn exactly with
their forearms; the whole-body ranking leaves out neck muscles; skin weights
are computed in the browser on first use (about 150 ms), not shipped as a
file.

- Twist is not observable in either source (forearm pronation, tibial
  rotation, hand orientation without the bat). Held at neutral and said so.
- Markerless joint centres are estimates; hips in particular drift. The
  smoothing and the floor clamp limit the damage; the validation thresholds
  catch the rest.
- The spine split is an approximation of a continuous curve; the numbers are
  checked against the cited text before use.
- The model is one generic adult; limb proportions differ from the hitter.
  Orientation-only retargeting keeps the model's anatomy intact at the cost
  of never matching the hitter's silhouette exactly.
- Path length is not fibre length. Every screen that shows a percentage
  carries the sentence in 6.6.

## 17. Second pass (12 September 2026): skeleton and muscle lines, swing report

Chase, after seeing phase 15 live: "the muscles and the joints are horrible
and not actually mapped … we need to map the muscle length and shortening
etc, get something actionable out of this." Close up he is right: skinning
557 separate meshes with automatic weights across joints that turn 60 to 90
degrees smears the trunk like a twisted sheet, the open hands hold nothing,
and the eye reads a lunge, not a swing. The posed skeleton is correct (the
validation proves it); the soft-tissue guess is what fails.

### 17.1 Default whole-body view: skeleton plus muscle lines

- Bones follow their segments rigidly as before. Soft parts are hidden.
- Every muscle with a measured path is drawn as a line of action, origin to
  belly to insertion, posed through the same segment transforms that drive
  the report. Colour is the muscle's current path-length change against its
  setup length: amber shortening, blue lengthening, neutral grey within 1 %.
  The selected muscle's line is cyan and thicker; hovering a line names it;
  clicking selects it. This is how OpenSim and Visual3D show muscles, and it
  is honest: a line's length is exactly the number the report uses.
- The bat's knob sits at the midpoint of the two posed hand tips, along the
  measured bat direction.
- The skinned muscle shapes stay available as "Muscle shapes (approximate)",
  off by default, with their caveat.

### 17.2 Swing report

- Functional groups (`src/data/muscle-groups.ts`): calf, shin, knee
  extensors, knee flexors, hip extensors, hip flexors, hip adductors, hip
  abductors and rotators, trunk rotators, trunk flexors, back extensors,
  shoulder front, back and top, scapula movers, elbow flexors, elbow
  extensors, forearm and wrist. Each is reported per side, lead and back.
- Per row: mean path-length ratio series; ratio at foot plant and at
  contact; change between them; fastest shortening and fastest lengthening
  (ratio per second) and when, in ms relative to contact; the longest path
  before contact (the load point) and when.
- Kinematic sequence: the time and size of peak rotation speed of pelvis,
  torso, lead shoulder and lead elbow, relative to contact.
- A report modal from the swing card: the table with sparklines and the
  sentence per row, the sequence, a second swing for side-by-side deltas,
  and a CSV download of every number.
- Wording: the report says what moved and when. It never says what the
  hitter should change. Path length is not fibre length; the modal says so.

### 17.3 Not changed

- Phase 14's per-joint readout and phase 15's rig, pipeline and validation.
- The caveats: twist held, girdle share, patella with the shin, head as a
  block, neck muscles excluded from rankings.

## 18. Session mode (12 September 2026)

Chase: "feed a hitter's real session, report averages across their swings
with the spread." Built as `scripts/build-session.ts` (`npm run build:session
-- 1`), reading one play at a time by byte range from the full TrackMan
exports through `trackman-index.json`, never the whole file.

- Every full swing (one with a swing plane) goes through the swing pipeline;
  rejected swings (clipping, events out of order, posed angles off) are
  dropped and counted. Per swing: bat speed from the tracked tip (peak, mph),
  hip-shoulder separation at foot plant and its peak, lead knee at foot plant
  and contact, the kinematic sequence (pelvis and torso rotation about
  vertical; lead upper arm and forearm whole-orientation rate, as TrackMan's
  own segment velocities are defined; peaks searched to 25 ms past contact),
  TrackMan's own sequence from its angular velocities, every muscle group's
  change, peak shortening and timing, and the agreement between this
  pipeline's pelvis and torso rotation and TrackMan's own segment angles on
  the same swing (RMS, sign convention allowed to differ, differences taken
  modulo 360).
- The session file (`public/sessions/<id>.json`, `form.session.v1`) holds
  every swing's metrics without series, aggregates per hand (mean, sd, min,
  max), and exemplars: the fastest and the median swing per hand written as
  full swing files that open in the swing lab.
- Session 1: 306 swings, 142 full, 112 passed. Agreement with TrackMan:
  pelvis 3 to 5° RMS, torso 7 to 8° RMS. Torso timing matches TrackMan's
  (−82 versus −52 ms right-handed, −85 versus −85 ms left-handed).
- The session report modal: per-hand aggregates, the sequence beside
  TrackMan's, the muscle-group table, a sortable swing list with "Open" on
  the exemplars, and a CSV of every swing's numbers.
- Found on the way: trunk rotation curves wrapped at ±180° in the
  follow-through, which broke peak-velocity timing and the comparison; the
  pipeline now writes unwrapped rotations (ranges ±360°).
- Not fixed by this: the export has no hitter identity, so a session's
  averages describe a group of hitters, not one. Product plan:
  `docs/product/2026-09-12-swing-product-plan.md`.

## 19. Session in, report out (12 September 2026)

The hero flow's first step from the product plan: a TrackMan export loaded
in the browser. "Load a TrackMan export…" under Move a joint takes the pose
and metrics files of one session (or the curated extract), joins plays by
first timestamp, runs each through the same pipeline as the built sessions
in a Web Worker, registers the resulting session and its two exemplar swings
per hand for the visit, and opens the session report. Nothing is uploaded.
Verified live with the curated extract: 14 of 20 plays passed in about 25
seconds. The full 130 MB exports parse in the worker; expect a minute.

## 20. Pitching (12 September 2026)

The pipeline carries `motion: "swing" | "pitch"`. For a pitch, foot strike
is the lead ankle's landing as before and release is the throwing wrist's
peak speed; the card and reports say foot strike, peak arm speed and release.
Tested on the CMU subject 124 pitch as a local fixture; not shipped in the
menu at Chase's direction. Ships the day TrackMan pitching pose captures
arrive: the adapter, rig, report and session build need no change.
