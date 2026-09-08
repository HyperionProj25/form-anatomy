# Phase 10: Mesh Geometry and Muscle Deformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bounding-box estimates with decoded mesh geometry for joint centres and attachment contacts, then deform crossing muscles during joint motion and pulse a selected muscle, per spec section 12.

**Architecture:** A build script decodes Draco geometry once and writes JSON; runtime helpers read it with fallbacks. The engine adds SkinnedMesh copies with procedural weights and a bulge shader.

**Tech Stack:** draco3d (Node decoder), Three.js SkinnedMesh and onBeforeCompile, vitest.

## Global Constraints

- The GLB is never modified; geometry.json is derived and committed.
- Every deformation carries its caveat; nothing claims measured mechanics.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Geometry build

**Files:** `scripts/build-geometry.ts`, `src/data/geometry.json`, `src/data/geometry.ts`, `package.json`, `tests/geometry.test.ts`

- [ ] Decode positions per node; landmark helpers; joint pivots per spec 12.1; contacts for attachment pairs.
- [ ] `npm run geometry`; runtime helpers with fallbacks; tests. Commit "Derive joint centres and attachment contacts from the mesh".

### Task 2: Use the geometry

**Files:** `src/data/motion.ts`, `src/data/pull.ts`, `tests/motion.test.ts`

- [ ] Pivots and contacts from geometry with fallbacks; diagnostics re-run; pronator teres deep head shortens at the elbow. Commit "Drive motion and pull from mesh contacts".

### Task 3: Deformation

**Files:** `src/viewer/engine.ts`, `src/viewer/Viewer.tsx`, `src/App.tsx`, `src/features/motion/MotionCard.tsx`, `src/styles/globals.css`

- [ ] SkinnedMesh copies with two bones and band weights for crossing muscles; bulge shader; per-frame material mirroring; pickable.
- [ ] Lines toggle in the card (off by default). Contraction pulse for the selected muscle with attachments on. Caveats. Verify in Chrome. Commit "Bend, shorten and bulge crossing muscles during joint motion".

### Task 4: Docs, deploy

- [ ] README and guide; spec appended; plan ticked. Commit, push, watch CI, verify live. Update memory.
