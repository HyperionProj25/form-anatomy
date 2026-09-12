# Phase 14: Swing Lab (one joint at a time) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A measured baseball swing drives one joint of the model at a time: pick a swing, scrub a timeline with foot plant, peak bat speed and contact, choose lead or back knee, hip, ankle, elbow or shoulder, and the joint follows the measured angle while the existing shortening and lengthening readout and lines of action report what happens between foot plant and contact (spec `2026-09-10-swing-lab-design.md`, sections 3, 4 and 5).

**Architecture:** An offline pipeline (`scripts/swings/`) turns the two captures into `form.swing.v1` files under `public/swings/` plus a static index. The app loads a swing on demand, builds the existing `MotionSetup` with the measured angle range between foot plant and contact, and hands the engine the angle curve so playback steps frames instead of sweeping. A `SwingCard` replaces the motion card while a swing is active.

**Tech Stack:** TypeScript, tsx scripts, vitest, React 19, three 0.185 (engine already in place).

## Global Constraints

- Sources: CMU subject 124 swing (`Downloads/AAAbaseline-biomech-realdata.zip` → `baseline-biomech/data/swing_124.json`) and the TrackMan demo extract (`Desktop/baseline-biomech/data/trackman-demo-swings.json`). Chase (11 Sep): TrackMan-derived curves may ship ("just a local tool"); no hitter IDs (none exist); no CMU pitch.
- Files carry derived joint-angle curves and events only: no timestamps, playIds, session ids.
- Every approximation is stated on the screen where it applies.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Kinematics and adapters (pipeline core)

**Files:**
- Create: `scripts/swings/types.ts`, `scripts/swings/kinematics.ts`, `scripts/swings/adapters.ts`
- Test: `tests/swings-kinematics.test.ts`

**Interfaces (produced):**
```ts
// types.ts
export type Vec3 = [number, number, number];
export type PointName = "head" | "neck" | "torso" | "shoulderL" | "shoulderR" | "elbowL" | "elbowR" | "wristL" | "wristR" | "hipL" | "hipR" | "kneeL" | "kneeR" | "ankleL" | "ankleR" | "toeL" | "toeR" | "heelL" | "heelR";
export type EventName = "footPlant" | "maxBatSpeed" | "contact" | "followThrough";
export type PointCloud = { hz: number; times: number[]; points: Partial<Record<PointName, Vec3[]>>; bat?: { knob: Vec3[]; tip: Vec3[] }; events: Partial<Record<EventName, number>>; eventsEstimated: boolean; handedness: "L" | "R"; source: { kind: "cmu" | "trackman"; attribution: string; captureHz: number } };
export type JointKey = "kneeL" | "kneeR" | "hipL" | "hipR" | "elbowL" | "elbowR" | "shoulderL" | "shoulderR" | "ankleL" | "ankleR" | "pelvisRotation" | "torsoRotation" | "separation";
export type Curves = Record<JointKey, number[]>;
// kinematics.ts
export function butterworth(series: number[], hz: number, cutoffHz: number): number[];   // zero-lag, 4th order
export function smooth(cloud: PointCloud, cutoffHz: number): PointCloud;
export function resample(cloud: PointCloud, toHz: number): PointCloud;                  // linear, uniform grid, events re-indexed
export function faceForward(cloud: PointCloud): PointCloud;                             // rotate about Y so the setup pelvis anterior is +Z
export function curves(cloud: PointCloud): Curves;                                       // degrees per frame, conventions in spec 3
export function estimateEvents(cloud: PointCloud, curves: Curves): PointCloud;          // CMU: foot plant, peak lead-wrist speed
export function trim(cloud: PointCloud, c: Curves, beforeS: number, afterS: number): { cloud: PointCloud; curves: Curves };
export function quality(c: Curves, events: PointCloud["events"], frames: number): { clippedPct: number; ordered: boolean; ok: boolean };
// adapters.ts
export function fromCmu(json: unknown): PointCloud;
export function fromTrackmanDemo(json: unknown, session: number, index: number): PointCloud | null; // null when events are absent or out of order
```

Angle conventions (all degrees): knee = 180 − ∠(hip, knee, ankle); elbow = 180 − ∠(shoulder, elbow, wrist); hip flexion = atan2(thigh·anterior, thigh·down) in the pelvis frame; shoulder flexion = atan2(arm·anterior, arm·down) in the thorax frame; ankle plantarflexion = 90 − ∠(shank, foot) with foot = heel→toe when the heel exists, else ankle→toe; pelvisRotation and torsoRotation = yaw of the segment anterior axis relative to frame 0; separation = torso − pelvis. Pelvis frame: lateral = hipL − hipR, up = torso − hipMid, anterior = lateral × up. Thorax frame: lateral = shoulderL − shoulderR, up = neck − torso.

- [x] Write the failing tests: a constant series survives `butterworth`; a 1 Hz sine at 120 Hz keeps amplitude within 2 % through a 12 Hz cut-off and a 50 Hz sine loses more than 90 %; a straight synthetic leg gives knee 0 and a right angle gives 90; a thigh swung 30° forward gives hip 30; a 40° pelvis turn gives pelvisRotation 40 and separation 0; `faceForward` puts the setup anterior on +Z; `resample` from 370 Hz to 120 Hz keeps event frames at the same time within one frame.
- [x] Implement `types.ts`, `kinematics.ts`, `adapters.ts`.
- [x] Run `npx vitest run tests/swings-kinematics.test.ts`; expected pass.

### Task 2: Build script and swing files

**Files:**
- Create: `scripts/build-swings.ts`, `public/swings/*.json`, `src/data/swings-index.json`
- Modify: `package.json` (script `build:swings`), `.gitignore` (nothing: files are committed)

**Interfaces:** reads env `SWING_CMU` (path to `swing_124.json`) and `SWING_TRACKMAN` (path to `trackman-demo-swings.json`); writes `form.swing.v1` files (spec 3, phase 14 subset: `schema, id, label, source, handedness, fps, frames, events, eventsEstimated, joints, bat, caveats`) and the index `{ id, label, handedness, kind, frames, fps, events, eventsEstimated, attribution, caveats }[]`.

- [x] Implement: CMU → smooth 15 Hz → faceForward → curves → estimateEvents → trim 0.5 s / 0.35 s → quality → write `cmu-124-swing.json`. TrackMan: every demo swing → adapter (null when events missing or out of order) → smooth 12 Hz → resample 120 → faceForward → curves → trim → quality; keep passing swings, pick up to two right-handed and one left-handed by lowest clipped percentage → `trackman-r-1.json`, `trackman-r-2.json`, `trackman-l-1.json`. Print a report (frames, events, clipped %, per-joint ranges). Fail the build on any swing with clipped > 2 % or events out of order.
- [x] Run the build; commit the outputs. Add `tests/swings.test.ts` checks: every index entry has a file, every curve has `frames` values, events lie inside the clip and in order, all curves within physiological ranges.

### Task 3: App data module, motion range, engine curve playback

**Files:**
- Create: `src/data/swings.ts`
- Modify: `src/data/motion.ts` (`motionSetup(joint, side, opts?)`), `src/viewer/engine.ts` (`MotionDrawing.curve`, `speed`; frame playback; `setMotionSpeed`), `src/viewer/Viewer.tsx` (`motionSpeed` prop)
- Test: `tests/swings.test.ts`, `tests/motion.test.ts`

**Interfaces:**
```ts
// swings.ts
export type Role = "lead" | "back";
export const SWING_JOINTS: JointId[] = ["knee", "hip", "ankle", "elbow", "shoulder"];
export function sideForRole(role: Role, handedness: "L" | "R"): MotionSide;   // R hitter: lead = left
export function roleForSide(side: MotionSide, handedness: "L" | "R"): Role;
export function curveOf(swing: SwingFile, joint: JointId, side: MotionSide): number[];
export function frameAt(swing: SwingFile, phase: number): number;
export function phaseAt(swing: SwingFile, frame: number): number;
export function swingRange(swing: SwingFile, joint: JointId, side: MotionSide): [number, number]; // angle at foot plant (else frame 0) and at contact (else last)
export function loadSwing(id: string): Promise<SwingFile>;                      // fetch `${BASE_URL}swings/${id}.json`, cached
export const SWING_INDEX: SwingIndexEntry[];
export const CAVEATS: Record<string, string>;
// motion.ts
export function motionSetup(joint: JointId, side: MotionSide, opts?: { range?: [number, number]; label?: string }): MotionSetup | undefined;
// engine.ts
MotionDrawing.curve?: { angles: number[]; fps: number }; MotionDrawing.speed?: number;
setMotionSpeed(speed: number): void;
```
Cable change with a range override measures the path at `range[0]` and `range[1]` (today `range[0]` is 0). With a curve the engine's angle is the curve sampled at the phase; playback advances `speed × fps / (frames − 1)` per second, holds 600 ms at the end, then restarts.

- [x] Tests first: `swingRange` on a fixture; `sideForRole`; `motionSetup("knee","left",{range:[68,31]})` reports quadriceps shortening (rectus femoris, vastus) and hamstrings lengthening; `frameAt`/`phaseAt` round trip.
- [x] Implement; run `npx vitest run tests/swings.test.ts tests/motion.test.ts`.

### Task 4: State, URL, swing card, toolbar, credits

**Files:**
- Modify: `src/state/store.tsx` (`Motion.swing`, actions `swingStart`, `swingJoint`, `swingSpeed`), `src/state/urlCodec.ts` (`sw`, `sj`, `ss`, `sp`), `src/App.tsx` (load the swing, build setup and drawing, dock), `src/features/stage/StageToolbar.tsx` (Measured swing group), `src/features/shared/CaveatChip.tsx` (label "Measured swing"), `src/features/guide/Modals.tsx` (Swing motion credits), `src/features/detail/StartPanel.tsx` (tile copy), `src/styles/globals.css`
- Create: `src/features/motion/SwingCard.tsx`, `src/features/motion/useSwing.ts`
- Test: `tests/urlCodec.test.ts`, `tests/store.test.ts`, `tests/a11y.test.tsx`

- [x] Store: `swing?: { id: string; speed: number }` on `Motion`; `swingStart { id, joint, side }` (phase 0, playing, lines false, frameNonce bump, filters.joint), `swingJoint { joint, side }` (keeps phase and swing), `swingSpeed { speed }`; `motionStop` clears as today.
- [x] URL: encode `sw`, `sj`, `ss` (l or r), `sp` (phase to 3 decimals when > 0); decode validates against `SWING_INDEX` and `SWING_JOINTS`.
- [x] `useSwing(id)`: fetches through `loadSwing`, returns `SwingFile | null`.
- [x] `SwingCard`: head with label and attribution, timeline (`input[type=range]` over frames, event ticks with labels, "Est." prefix when estimated), Play/Pause (hidden under reduced motion), speed chips 0.25× 0.5× 1×, Lead and Back joint chip rows, sparkline (`aria-hidden`) with playhead and the sentence "Lead knee: 68° at foot plant, 31° at contact, extends 37°", shortening and lengthening lists with the top five percentages, lines checkbox, `CaveatChip label="Measured swing"`.
- [x] Toolbar: group "Measured swing" listing `SWING_INDEX`; button label "Swing · lead knee" while active.
- [x] Credits: "Swing motion" paragraph (CMU attribution; TrackMan markerless capture line). Start tile: "Move a joint, or play a measured swing".
- [x] Tests: codec round trip; reducer for swingStart/swingJoint/swingSpeed; SwingCard axe test with a fixture swing.

### Task 5: Verify, document, deploy

- [x] Headless renders: `?sw=cmu-124-swing&sj=knee&ss=l&sp=0.4` and a TrackMan swing at the back hip; check the card, the ticks and the model pose.
- [x] README section; spec notes (shoulder flexion, TrackMan included); plan ticked; commit "Swing lab: a measured swing drives one joint at a time"; push; watch CI; verify live; update memory.
