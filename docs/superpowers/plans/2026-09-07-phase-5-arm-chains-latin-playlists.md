# Phase 5: Arm Chains, Latin Names, Playlists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three upper-limb chains from Wilke & Krause 2019 with honest chain-level evidence badges, a Latin/English name toggle backed by Wikidata labels, shareable teacher playlists encoded in the URL, and a separate Three.js bundle chunk.

**Architecture:** Arm chains are three more `Line` entries with `group: "arm"` and a new `chain-reported` evidence status; everything downstream (tours, cables, quiz sets, deep links) is data-driven and needs no new mechanics. Latin names ride on the existing facts pipeline as a `latin` field. Playlists are a small store slice mirrored to the URL, with a floating card that reuses the focus/fly channel. The bundle split is a Vite output option.

**Tech Stack:** unchanged. Wikidata `wbgetentities` API (no key).

## Global Constraints

- Everything from earlier phases (base path, commit trailer, port 3131, real Chrome for 3D, strip `\r`, screenshot before reading camera state).
- Arm-chain badges must not claim hop-level study counts; the 2019 abstract gives only chain totals (5, 4, 6).
- Latin labels come from Wikidata (CC0); when absent, English is shown and nothing is invented.
- Playlist ids are validated against the catalog on decode; max 30 ids, title max 80 characters.

## File map

Create: `src/data/names.ts`, `src/features/playlist/PlaylistCard.tsx`, `tests/names.test.ts`
Modify: `src/data/lines.ts`, `src/data/quiz-pool.ts`, `src/data/facts.ts`, `src/data/facts.json` (regenerated), `scripts/fetch-facts.ts`, `src/state/store.tsx`, `src/state/urlCodec.ts`, `src/features/fascia/EvidenceBadge.tsx`, `src/features/fascia/FasciaPanel.tsx`, `src/features/library/LibraryPanel.tsx`, `src/features/detail/DetailPanel.tsx`, `src/viewer/Viewer.tsx`, `src/App.tsx`, `src/data/groups.ts`, `vite.config.ts`, `src/styles/globals.css`, `README.md`, `src/features/guide/Modals.tsx`, tests: `lines`, `data`, `quiz-pool`, `generators`, `facts`, `store`, `urlCodec`

---

### Task 1: Arm chains

**Files:** `src/data/lines.ts`, `src/data/quiz-pool.ts`, `src/features/fascia/EvidenceBadge.tsx`, `src/features/fascia/FasciaPanel.tsx`, `src/features/library/LibraryPanel.tsx`, `tests/lines.test.ts`, `tests/data.test.ts`, `tests/quiz-pool.test.ts`, `tests/generators.test.ts`

- [ ] **Step 1: Types and data.** In `lines.ts`: `LineId` adds `"val" | "lal" | "dal"`; `EvidenceStatus` adds `"chain-reported"`; `Line` adds `group: "body" | "arm"` and `evidence.grade` adds `"reported"`. Set `group: "body"` on the six existing lines. Append the three arm lines with the stops in the spec table; every transition is `{ status: "chain-reported", studies: N, note: "The 2019 review identified this chain from N dissection studies. Hop-level counts are not reported in its abstract.", source: "wilkeKrause2019" }`. Colors: val `#c4586e`, lal `#5c7fb8`, dal `#8a5fb0`. Views: val front, lal side, dal back; per-stop `view` where a stop faces differently (trapezius back, brachioradialis front). Export `LINE_GROUPS = [{ id: "body", label: "Body lines" }, { id: "arm", label: "Arm chains" }]`.
- [ ] **Step 2: Badges.** `EvidenceBadge`: `STATUS_LABEL["chain-reported"] = "Chain reported"`, detail text `${studies} studies for the whole chain`; CSS `.evidence-chain-reported .evidence-pill` uses the moderate palette. `GradeBadge` handles `"reported"` with the label "Reported chain (2019 review)".
- [ ] **Step 3: Lists.** `LibraryPanel` renders the line list grouped by `LINE_GROUPS` with a section label each. `FasciaPanel` keeps the global numbering.
- [ ] **Step 4: Evidence questions.** Add three bank entries (ids `arm-ventral`, `arm-lateral`, `arm-dorsal`) tagged with the arm line ids, source `wilkeKrause2019`, about which muscles form each chain and that mechanical relevance was not established.
- [ ] **Step 5: Tests.** `lines.test`: `LINE_IDS` equals the nine ids in order; counts for `chain-reported` are 2, 3, 3; every arm stop key exists. `data.test`: nine lines. `quiz-pool.test`: still passes (each line has a question). `generators.test`: `line:dal` set draws only from that chain's keys.
- [ ] **Step 6: Verify and commit.** Full check, Chrome `?m=fascia&l=dal&t=1` shows the dorsal chain tour at the triceps with the cable down the arm; commit "Add the three upper-limb chains from Wilke & Krause 2019 with chain-level evidence badges".

---

### Task 2: Latin names

**Files:** `scripts/fetch-facts.ts`, `src/data/facts.ts`, `src/data/facts.json`, `src/data/names.ts`, `src/data/groups.ts`, `src/state/store.tsx`, `src/features/library/LibraryPanel.tsx`, `src/features/detail/DetailPanel.tsx`, `src/viewer/Viewer.tsx`, `src/App.tsx`, `tests/names.test.ts`, `tests/facts.test.ts`

- [ ] **Step 1: Wikidata pass.** After the infobox loop in `fetch-facts.ts`, batch the titles 50 at a time to `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=…&props=labels|sitelinks&languages=la&format=json`, map `sitelinks.enwiki.title` back to the catalog title (case-insensitive, and also try the entry's resolved `title`), and set `latin` on existing entries. Log coverage. `FactEntry.latin?: string`. Run `npm run facts`.
- [ ] **Step 2: `names.ts`.** `export type NameLang = "english" | "latin"`; `latinName(part)` from facts; `displayName(part, lang)` returns Latin when requested and available, else English; `secondaryName(part, lang)` returns the other language when it differs; `loadNamePref()` / `saveNamePref()` on `localStorage` key `form.names.v1`.
- [ ] **Step 3: Store.** `names: NameLang` (initial from `loadNamePref()` guarded for SSR-less environments), action `setNames`. Persist in a small effect in App.
- [ ] **Step 4: UI.** `LibraryPanel`: segmented "English | Latin" control under the search box; group rows show `displayName` and a `small` secondary line; `groups.ts` search matches Latin too. `DetailPanel`: title = displayName, `.latin` line = secondary name (falls back to the existing group text). `Viewer` gets a `nameOf(id)` prop for the hover tooltip; App passes `displayName`.
- [ ] **Step 5: Tests.** `facts.test`: at least 150 entries carry `latin`, none contain `[[`. `names.test`: fallback, secondary, and pref round-trip with a fake storage.
- [ ] **Step 6: Verify and commit.** Chrome: toggle Latin, library shows "Musculus gastrocnemius" with "Lateral Head Of Gastrocnemius" beneath, detail title follows, search "musculus soleus" finds the soleus, tooltip on hover is Latin; reload keeps the preference. Commit "Add a Latin/English name toggle backed by Wikidata labels".

---

### Task 3: Teacher playlists

**Files:** `src/state/store.tsx`, `src/state/urlCodec.ts`, `src/features/playlist/PlaylistCard.tsx`, `src/features/detail/DetailPanel.tsx`, `src/App.tsx`, `src/styles/globals.css`, `tests/store.test.ts`, `tests/urlCodec.test.ts`

- [ ] **Step 1: Store.** `playlist: { title: string; ids: string[]; step: number | null } | null`; actions `playlistAdd(id)` (creates when null, ignores duplicates, max 30), `playlistRemove(id)`, `playlistTitle(title)`, `playlistPlay(step)`, `playlistNext`, `playlistPrev`, `playlistStop`, `playlistClear`. Playing a step sets `selected`, `focus` (fly, direction by z), ends tour and quiz, bumps the nonce. `hydrate` keeps a decoded playlist with `step: null`.
- [ ] **Step 2: URL.** Encode `pl` (valid ids, max 30) and `plt` (title, trimmed, max 80) when the playlist has ids; decode both (ids filtered by `isPartId`).
- [ ] **Step 3: Card.** `PlaylistCard` inside a `.stage-left` column with `PinLegend`: title input, ordered chips with remove, controls, `CopyLink`, Clear; keyboard arrows and Escape while playing. `DetailPanel`: "Add to playlist" / "Remove from playlist" button.
- [ ] **Step 4: Tests.** Store: add/remove/dedupe/max, play/next/prev/stop wiring of `selected` and `focus`. Codec: `pl`/`plt` round trip, junk ids dropped, title clipped.
- [ ] **Step 5: Verify and commit.** Chrome: add three structures, title "Knee day", copy link, open it fresh: card restores, Play flies to the first structure with its facts, arrows step. Commit "Add shareable teacher playlists encoded in the URL".

---

### Task 4: Bundle split, docs, deploy

- [ ] `vite.config.ts` `build.rollupOptions.output.manualChunks = { three: ["three"] }`; confirm `dist/assets/three-*.js` exists and the app chunk shrinks. If Vite 8 ignores it, use `rolldownOptions.output.advancedChunks.groups`.
- [ ] README bullets for arm chains, Latin toggle, playlists; guide step text; spec addendum section 7 appended to the design doc.
- [ ] Tick, commit, push, watch CI, verify live: `?m=fascia&l=val`, a playlist link, the Latin toggle, and the split chunk in the network list.

## Self-review

Covers spec 7.1 to 7.4. Chain-level badges avoid invented numbers; Latin fallback avoids invented names; playlist validation follows the existing codec rules. Types: `LineId` widened in one place and consumed by the store, codec, quiz generators and bank; `NameLang` shared by store and names module.
