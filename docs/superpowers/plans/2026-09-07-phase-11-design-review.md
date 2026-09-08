# Phase 11: Design Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 7 September 2026 design review ("Make the model the page"): dark stage, colour-blind-safe highlights, a 12px type floor, the workspace filling the viewport, one filter row, a stage toolbar with "Move a joint" and Layer, Deep that peels the model, panel headings that say their job, a card dock, reduced-motion messaging, caveat chips, the copy pass, search on Enter, and a real-browser contrast check, per spec section 13.

**Architecture:** Colour and type changes live in CSS and three constant tables. Layout changes are in App, LibraryPanel, StartPanel, DetailPanel and the cards. Layer peeling is one branch in `computeStyles`. The contrast check is a Node script driving headless Chrome over the DevTools protocol with axe-core injected.

**Tech Stack:** React 19, CSS, axe-core, headless Chrome (present on GitHub's Ubuntu runners).

## Global Constraints

- No change to the model, data or sources; every caveat and evidence badge stays visible.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Colour, contrast, layer peel (issues 1, 5, 6, 9)

**Files:** `src/styles/globals.css`, `src/viewer/appearance.ts`, `src/viewer/engine.ts`, `src/App.tsx`, `src/features/motion/MotionCard.tsx`, `tests/appearance.test.ts`

- [x] Slate stage gradient, no dot grid, stage text tokens, ground shadow at a third.
- [x] Selection #2ac7e0 with halo #eafffb; origin #3d8bff; insertion #f2a531; pins violet/magenta/yellow/purple; cables amber/blue.
- [x] `computeStyles` `layer`: Deep dims superficial muscles to 0.12; stage caption; test.
- [x] 12px floor and the seven text colours. Verify in Chrome. Commit "Dark stage, colour-blind-safe highlights, Deep peels the model".

### Task 2: Layout (issues 2, 3, 4, 7, 8, 13, 17)

**Files:** `src/App.tsx`, `src/features/library/LibraryPanel.tsx`, `src/features/detail/StartPanel.tsx`, `src/features/detail/DetailPanel.tsx`, `src/features/quiz/QuizOverlay.tsx`, `src/features/motion/MotionCard.tsx`, `src/features/playlist/PlaylistCard.tsx`, `src/data/names.ts`, `src/styles/globals.css`, tests

- [x] Remove the banner; Quiz and Help in the nav; workspace fills the viewport; panels scroll inside.
- [x] Left panel: "Find a structure", search first, one filter row (Region and Joint selects, Side), names toggle at the foot, "Move the knee" wording, Enter selects the first match with a match strip.
- [x] Stage toolbar: views, Move a joint menu, Layer, zoom, reset; orientation to the top-right corner.
- [x] Right panel: "Selected" / "Nothing selected" with three starting points; Attachments chip in the action row; "Crosses the knee · Move it".
- [x] Dock: quiz, playlist and motion cards bottom-left, collapsible.
- [x] Copy pass with `prettyName`. Verify at 1440×900, 1366×768 and 375 wide. Commit "Make the model the page".

### Task 3: Reduced motion and caveat chips (issues 10, 12)

- [x] `usePrefersReducedMotion`; motion card hides Play and explains; tour card notes auto-advance is off.
- [x] Caveat chips that expand; legend caveat in the caption band. Commit "Explain what reduced motion turns off; caveats as chips".

### Task 4: Real-browser contrast check (issue 16)

**Files:** `scripts/check-contrast.ts`, `package.json`, `.github/workflows/deploy.yml`

- [x] Headless Chrome over CDP, axe-core injected, two viewports, zero colour-contrast violations. Runs in CI after the build. Commit "Check colour contrast in a real browser in CI".

### Task 5: Docs, deploy

- [ ] README and guide; plan ticked; remaining issues (11, 14, 15) filed on GitHub. Commit, push, watch CI, verify live. Update memory.
