# Phase 9: Motion and Beauty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the atlas look and move like a piece of educational film without inventing anatomy: lighting and transitions, cinematic tours, animated pull direction, and rigid joint motion with muscle lines of action, per spec section 11.

**Architecture:** The engine gains tweened appearance, environment lighting, a halo, a ground shadow, auto-rotate, a pull path and a joint pose API. Pure geometry for motion lives in `src/data/motion.ts` and is unit tested without Three.js. React passes commands through Viewer props as today.

**Tech Stack:** Three.js 0.185 (addons: RoomEnvironment, PMREMGenerator), React 19, vitest.

## Global Constraints

- No claim about anatomy beyond what the data supports; every animated element carries its caveat text.
- Keep the app usable without WebGL and with reduced motion.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Rendering polish

**Files:** `src/viewer/engine.ts`, `src/viewer/Viewer.tsx`, `src/App.tsx`, `src/styles/globals.css`

- [x] RoomEnvironment PMREM, lights rebalanced, `envMapIntensity` on materials, ground shadow disc after load.
- [x] Tweened `applyAppearance` (per-mesh target styles eased in the render loop; fade-out before hide; fade-in on show), hover emissive lift, selected halo via `setSelected(id)`.
- [x] Reduced-motion handling. Verify visually in Chrome. Commit "Light the model with an environment and tween every appearance change".

### Task 2: Cinematic tours

**Files:** `src/viewer/engine.ts`, `src/viewer/Viewer.tsx`, `src/App.tsx`, `src/features/fascia/TourPlayer.tsx`, `src/styles/globals.css`

- [x] `engine.setAutoRotate(on, speed)`; Viewer prop `autoRotate`; App passes `tour?.playing`.
- [x] Caption band and vignette while playing. Verify. Commit "Cinematic fascial-line tours".

### Task 3: Pull direction

**Files:** `src/viewer/engine.ts`, `src/viewer/Viewer.tsx`, `src/App.tsx`, `src/features/detail/DetailPanel.tsx`

- [x] `engine.showPull({ muscleId, originIds, insertionIds } | null)`: nearest-vertex endpoints, curve through the muscle centroid, particles insertion to origin, arrowhead, DOM labels.
- [x] Shown whenever attachments are on; caveat in the panel. Verify. Commit "Animate the direction of pull for a selected muscle".

### Task 4: Joint motion

**Files:** `src/data/motion.ts`, `src/viewer/engine.ts`, `src/viewer/Viewer.tsx`, `src/state/store.tsx`, `src/features/motion/MotionCard.tsx`, `src/features/library/LibraryPanel.tsx`, `src/App.tsx`, `src/styles/globals.css`, `tests/motion.test.ts`

- [x] `motion.ts`: pivot, axis, range, moving set, crossing cables, `rotatePoint`, `cableRoles(joint, side)` returning shortening and lengthening keys.
- [x] Store `motion` with actions start, scrub, play, pause, side, stop; ends when the joint filter changes or mode leaves.
- [x] Engine `setPose({ pivot, axis, angle, movingIds })` and `drawCables(cables)`; Viewer props.
- [x] MotionCard in `.stage-left`; "Animate" button beside the joint chips; camera flies to the joint's lateral view.
- [x] Tests per spec 11.4. Verify elbow, knee and ankle in Chrome. Commit "Animate joints with rigid bones and muscle lines of action".

### Task 5: Docs, deploy

- [x] README and guide text; spec appended; plan ticked. Commit, push, watch CI, verify live. Update memory.
