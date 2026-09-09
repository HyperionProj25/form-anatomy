# Phase 13: Graphics Tiers A and B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A High graphics level with ambient occlusion, soft shadows, physical tissue materials with fibre striations, a bloomed selection, a graded and anti-aliased image, cinematic tours with depth of field and a slow dolly, and a floor reflection; a Low level that is today's renderer; an Auto level that chooses and self-corrects, per spec section 15.

**Architecture:** `src/viewer/quality.ts` decides and persists the level and meters frames. `src/viewer/post.ts` builds the EffectComposer chain from three's addons (GTAO, UnrealBloom, Output, a grade ShaderPass, SMAA, Bokeh for tours). `src/viewer/materials.ts` makes tissue materials and injects the striation shader. `src/viewer/floor.ts` builds the shadow-catching floor and the on-demand reflector. The engine gains `setGraphics(level)` and `setCinematic(on, focusDistance)` and renders through the composer at High. The store carries `graphics`; the left panel foot has the control; App toasts when Auto downgrades.

**Tech Stack:** three 0.185 addons (EffectComposer, RenderPass, GTAOPass, UnrealBloomPass, OutputPass, ShaderPass, SMAAPass, BokehPass, Reflector), React, vitest.

## Global Constraints

- No change to the data, the model file or the sources; Low must look exactly as phase 12 does.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Quality level, preference, control

**Files:** `src/viewer/quality.ts`, `src/state/store.tsx`, `src/features/library/LibraryPanel.tsx`, `src/App.tsx`, `src/viewer/Viewer.tsx`, `tests/quality.test.ts`

- [x] `GraphicsLevel`, `loadGraphicsPref/saveGraphicsPref` (`form.graphics.v1`), `decideGraphics(signals)`, `FrameMeter` with `shouldDowngrade`; tests.
- [x] Store field `graphics` + `setGraphics`; App persists it and passes it to Viewer; Viewer forwards to the engine and reports an Auto downgrade for a toast.
- [x] Left-panel foot: "Graphics" segmented Auto · High · Low.

### Task 2: High renderer (tier A)

**Files:** `src/viewer/post.ts`, `src/viewer/materials.ts`, `src/viewer/floor.ts`, `src/viewer/engine.ts`

- [x] Composer chain (render, GTAO, bloom, output, grade, SMAA) sized with the host; in-scene background at High.
- [x] Physical tissue materials with striations along each muscle's long axis and per-muscle lightness variation; Low keeps MeshStandardMaterial.
- [x] Shadow-casting key light, shadow-catching floor, on-demand shadow map updates; halo at HDR brightness.
- [x] `setGraphics` switches everything at runtime without reloading the model.

### Task 3: Cinematics (tier B)

**Files:** `src/viewer/post.ts`, `src/viewer/floor.ts`, `src/viewer/engine.ts`, `src/viewer/Viewer.tsx`, `src/App.tsx`

- [x] Bokeh pass focused on the tour stop while a tour plays; slow dolly per stop; stronger vignette in cinematic.
- [x] Reflector floor at 512 px, faded and tinted, re-rendered only when the camera or appearance changes.

### Task 4: Verify, document, deploy

- [x] Headless renders High vs Low (home, selection, tour stop, knee motion); frame times in real Chrome; contrast check; a11y test.
- [ ] README and spec note; plan ticked; commit "Graphics: ambient occlusion, shadows, tissue materials, cinematic tours"; push; watch CI; verify live; update memory.
