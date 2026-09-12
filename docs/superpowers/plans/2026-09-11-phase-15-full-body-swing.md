# Phase 15: Full-Body Swing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The whole model swings: eighteen rigid segments posed from the capture's segment orientations, every muscle and connective part skinned across them, per-muscle path-length curves, a "colour by change" view, ranked lists of what shortens and lengthens most into contact, and the bat when the capture has one (spec `2026-09-10-swing-lab-design.md`, section 6).

**Architecture:** `src/data/segments.ts` names the eighteen segments, their parent chain, which bone belongs where, each segment's pivot and rest basis (from `geometry.json`, which gains six new pivots). The pipeline computes a measured basis per segment per frame and stores `segments` (world quaternions relative to rest) and `root` in the swing file. `src/data/body.ts` composes segment transforms per frame by walking the chain, computes linear-blend skin weights from joint-plane bands along each part's chain path, and measures every muscle's path length per frame. The engine binds one eighteen-bone skeleton, skins twins of all soft parts, poses bones rigidly, follows cables and draws the bat.

**Tech Stack:** three 0.185 `SkinnedMesh`/`Skeleton`, draco3d in the geometry build, vitest.

## Global Constraints

- No change to the model file; `geometry.json` gains pivots only.
- Angles on screen are the measured angles; segment twist not visible to the capture is held and stated on the card.
- Skin weights sum to 1, use at most four segments, and only segments on the part's chain path.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Segments, pivots, rest bases

**Files:**
- Create: `src/data/segments.ts`, `src/data/quat.ts`
- Modify: `scripts/build-geometry.ts` (pivots lumbosacral, thoracolumbar, cervicothoracic, headTop, sternoclavicular L/R, handTip L/R, toeTip L/R), `src/data/geometry.ts` (`pivotOf(name, side)`)
- Test: `tests/segments.test.ts`, `tests/quat.test.ts`

**Interfaces:**
```ts
export type SegmentId = "pelvis" | "lumbar" | "thorax" | "head" | "girdleL" | "girdleR" | "upperArmL" | "upperArmR" | "forearmL" | "forearmR" | "handL" | "handR" | "thighL" | "thighR" | "shankL" | "shankR" | "footL" | "footR";
export const SEGMENT_IDS: SegmentId[]; export const PARENT: Record<SegmentId, SegmentId | null>;
export function segmentOfBone(part: CatalogPart): SegmentId | null;   // every bone maps
export function segmentPivot(seg: SegmentId): Vec3; export function segmentEnd(seg: SegmentId): Vec3;
export type Basis = { side: Vec3; long: Vec3; second: Vec3 };            // orthonormal columns; second is anterior (up for feet)
export function restBasis(seg: SegmentId): Basis;                          // long from pivot to end; second = +Z (feet +Y) projected
export function chainPath(a: SegmentId, b: SegmentId): SegmentId[];       // through the lowest common ancestor
// quat.ts: Quat = [x, y, z, w]; quatFromBases(measured, rest) = R_m · R_rᵀ; rotate(q, v); mul(a, b); inverse(q); slerp(a, b, t); IDENTITY
```

- [x] Tests: every bone key maps to one segment; rest bases are orthonormal and long axes point down for limbs and up for the trunk; `quatFromBases(b, b)` is identity; a 90° basis turn gives a 90° quaternion; `chainPath("pelvis", "shankL")` is pelvis, thighL, shankL and `chainPath("thorax", "upperArmL")` is thorax, girdleL, upperArmL.
- [x] Implement; rebuild `geometry.json` (`npx tsx scripts/build-geometry.ts`); run the tests.

### Task 2: Pipeline: segment orientations and root

**Files:**
- Create: `scripts/swings/body.ts`
- Modify: `scripts/build-swings.ts`, `src/data/swings.ts` (`SwingFile.segments`, `root`)
- Test: `tests/swings-body.test.ts`

**Interfaces:**
```ts
export function measuredBases(cloud: PointCloud, i: number, previous?: Partial<Record<SegmentId, Basis>>): Record<SegmentId, Basis>;
export function segmentQuats(cloud: PointCloud): Record<SegmentId, Quat[]>;   // per frame, relative to rest; girdle = slerp(thorax, upperArm, 1/3); hand = forearm
export function rootTrack(cloud: PointCloud): Vec3[];                       // pelvis offset per frame in model units, scaled by hip height, relative to frame 0
export function validateBody(file: SwingFile): { kneeRms: number; elbowRms: number; hipRms: number; lowestToe: number };
```
Measured bases: pelvis and thorax from their frames; lumbar long = pelvis long, second = mean of pelvis and thorax anterior; head long = head − neck, second = thorax anterior; limbs long = distal − proximal with second from the flexion plane (arm: cross(N, L); leg: cross(L, N); N = cross(L, distal direction)), held from the previous frame when the joint is within 8° of straight, else the parent's second projected; feet long = heel→toe (else ankle→toe), second = cross(shank side, long).

- [x] Tests: a synthetic capture standing exactly on the model's pivots gives identity for every segment; bending the synthetic knee 90° gives a shank quaternion of 90° about the knee axis and identity elsewhere; `rootTrack` is zero at frame 0 and scales a 10 cm hip rise by the height ratio.
- [x] Implement; extend the build (write `segments` rounded to 4 dp and `root` to 3 dp; print `validateBody`; fail when knee or elbow RMS exceeds 3° or hip exceeds 5°); rebuild the four swings; extend `tests/swings.test.ts` (segments present for every id, quaternions unit length, root length = frames).

### Task 3: Body data: transforms, skin weights, muscle paths

**Files:**
- Create: `src/data/body.ts`, `src/data/skin.ts`
- Test: `tests/body.test.ts`, `tests/skin.test.ts`

**Interfaces:**
```ts
// body.ts
export type SegmentTransform = { q: Quat; pivot: Vec3; posed: Vec3 };     // v' = rotate(q, v − pivot) + posed
export function transformsAt(swing: SwingFile, frame: number): Record<SegmentId, SegmentTransform>;
export function applyTransform(t: SegmentTransform, v: Vec3): Vec3;
export type MusclePath = { id: string; from: Vec3; via: Vec3; to: Vec3; fromSeg: SegmentId; toSeg: SegmentId; viaWeight: number };
export function musclePaths(): MusclePath[];                                // from geometry contacts; cached
export function pathLength(path: MusclePath, t: Record<SegmentId, SegmentTransform>): number;
export function lengthRatios(swing: SwingFile): Map<string, Float32Array>;  // per muscle id, ratio vs frame 0 per frame; cached per swing id
export function changeRanking(swing: SwingFile): { shortening: Ranked[]; lengthening: Ranked[] }; // between foot plant and contact, Ranked = { id, key, name, change }
export function bodyDrawing(swing: SwingFile): BodyDrawing;                 // the engine's view of all this
// skin.ts
export function candidateSegments(part: CatalogPart): SegmentId[];          // attachments' bones' segments expanded along chain paths; fallback nearest bone
export function skinFor(part: CatalogPart, positions: Float32Array, center: Vec3): { segments: SegmentId[]; index: Uint16Array; weight: Float32Array } | null;
```
Vertex weights along a chain path s0..sk: t_i = bandWeight(dot(v − pivot_i, dir_i), band) at each joint i between s_i and s_{i+1}; w(s0) = 1 − t_0, w(s_i) = t_{i−1}(1 − t_i), w(sk) = t_{k−1}; band = 8 % of the part's extent clamped to 2..6 cm.

- [x] Tests: identity quaternions give posed = pivot for every segment; a vertex far proximal weighs 1 on s0 and far distal 1 on sk; weights sum to 1 across a synthetic chain; rectus femoris candidates include pelvis, thighL, shankL; gluteus maximus candidates are pelvis and thighL; `lengthRatios` at frame 0 are all 1.
- [x] Implement; run the tests.

### Task 4: Engine: skeleton, twins, rigid bones, cables, bat

**Files:**
- Modify: `src/viewer/engine.ts` (`setBody`, `BodyDrawing` type, `applyBody`, twins, raycast, mirror, bat), `src/viewer/Viewer.tsx` (`body` prop)

**Interfaces:**
```ts
export type BodyDrawing = {
  frames: number; fps: number;
  transformsAt(frame: number): Record<string, { q: Quat; pivot: Vec3; posed: Vec3 }>;
  segmentOf(partId: string): string | null;                                       // rigid parts
  skinOf(partId: string, positions: Float32Array): { segments: string[]; index: Uint16Array; weight: Float32Array } | null;
  bulgeOf(partId: string): { axisFrom: Vec3; axisTo: Vec3; belly: Vec3 } | null;
  ratioAt(partId: string, frame: number): number;
  bat: { knob: Vec3[]; tip: Vec3[] } | null;
};
setBody(body: BodyDrawing | null): void;
```
One `Skeleton` of eighteen `Bone`s with identity bind; each soft part gets a `SkinnedMesh` twin sharing its geometry attributes plus skin attributes, bound at identity; each frame bones' `matrixWorld` = T(segment) in mesh-local coordinates and rigid meshes take the same matrix. Cables in body mode: `from` by its origin segment, `to` by its insertion segment, `via` lerped by `viaWeight`. Bulge from `ratioAt`. The bat is a cylinder between knob and tip.

- [x] Implement; the single-joint pose and two-bone twins are skipped while a body is set; twins raycast, mirror materials, cast shadows at High; `setBody(null)` restores everything.

### Task 5: State, card, appearance, docs, deploy

**Files:**
- Modify: `src/state/store.tsx` (`swing.body`, `swing.colour`; actions `swingBody`, `swingColour`), `src/state/urlCodec.ts` (`sb=0`, `sc=1`), `src/App.tsx` (body memo, tint styles, framing), `src/viewer/appearance.ts` (`tint`), `src/features/motion/SwingCard.tsx` (Whole body, Colour by change, ranked lists), `src/features/guide/Modals.tsx`, `README.md`, spec, plan
- Test: `tests/swing-card.test.tsx`, `tests/swings.test.ts`, `tests/appearance.test.ts`

- [x] Whole body on by default; colour by change amber/blue up to 15 %; ranked lists of eight each with select-on-click; the caveat sentence from spec 6.6; camera frames the whole body from the open side.
- [x] Headless renders at setup, foot plant, contact, follow-through; real-GPU check; contrast check; commit "Full-body swing: eighteen segments, skinned muscles, length curves"; push; CI; live; memory.
