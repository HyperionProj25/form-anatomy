# Phase 12: Clarity on the Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the selection, the lines of action and the fascial-line path easy to see on the dark stage, and make joint motion read clearly and move smoothly, per spec section 14.

**Architecture:** Colour constants in `appearance.ts` and `engine.ts`; cable thickness scaled by the motion's frame radius; a `spotlight` set in `computeStyles` that fades muscles not taking part in a motion; eased playback; captions moved into the top-left stack on an opaque band. Verified with headless SwiftShader renders before and after.

**Tech Stack:** Three.js, React, headless Chrome renders.

## Global Constraints

- No change to the data or sources; caveats stay visible.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Selection, cables, path, spotlight, easing, captions

**Files:** `src/viewer/appearance.ts`, `src/viewer/engine.ts`, `src/App.tsx`, `src/features/motion/MotionCard.tsx`, `src/styles/globals.css`, `tests/appearance.test.ts`

- [x] Selection `#12a6c4` with emissive `#0b6d80` at 0.32; halo `#8fe9f7` at 0.55, scale 1.035.
- [x] Cable radii scale with `MotionDrawing.radius` (k = clamp(radius / 0.42, 0.3, 1)); opacity 0.85.
- [x] `spotlight` in `computeStyles`: muscles outside the moving set fade to 0.3 while a joint moves; test.
- [x] Eased playback (`motionT` linear, `motionPhase = easeInOut(motionT)`); jaw card names each muscle once.
- [x] Fascial path: glow + bright core + pale strand; line muscles emissive 0.16; ghosted muscles 0.16.
- [x] Captions inside `.stage-left` on an opaque band. Render before/after headlessly, verify in Chrome, contrast check, commit "Make selection, lines and motion easy to see".

### Task 2: Deploy

- [ ] Push, watch CI, verify live. Update memory.
