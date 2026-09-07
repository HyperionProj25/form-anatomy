# Form — Anatomy, connected

A free, no-account 3D anatomy atlas for students. Explore muscles and bones on
a full-body model, follow myofascial line teaching models, and read the
evidence behind them.

Live site: https://hyperionproj25.github.io/form-anatomy/

## Run locally

Requires Node.js 22.13 or newer.

    npm ci
    npm run dev

Open the Local URL the server prints (it includes the `/form-anatomy/` path).

## Validate

    npm run lint
    npm run typecheck
    npm test
    npm run build

`npm run preview` serves the production build locally.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which lints, tests,
builds, and publishes `dist/` to GitHub Pages. Pull requests run the same
checks without deploying.

## What is included

- Locally bundled Z-Anatomy GLB with 826 individually selectable mesh parts.
  Mesh-part counts are not counts of unique muscles or bones.
- Rotate, zoom, pan, camera presets, search, hide, restore, isolate and
  opacity controls.
- Five fascial-line teaching models with evidence notes and linked references.
- Curated explanations for selected structures; all other parts have
  identification and reference links.
- A short study check, responsive layout and keyboard-accessible controls.

Fascial highlights identify model components. They are not segmented fascial
sheets, measurements of force transmission or animated movement simulations.
Some connective tissues in the lesson paths are not separately represented in
this model.

## Roadmap

See `docs/superpowers/specs/2026-09-06-form-anatomy-roadmap-design.md` for the
planned phases: data catalog and deep links, evidence-graded fascial lines
with a research digest, guided tours, quizzes, compare mode, and offline use.

## Sources and licensing

The unmodified `public/body.glb` comes from
https://github.com/hpfrei/body-anatomy-3d-viewer and is distributed under
CC BY-SA 4.0. Z-Anatomy contributors include Gauthier Kervyn; underlying
BodyParts3D is © DBCLS. Preserve attribution and ShareAlike terms when
redistributing adapted model assets. See `public/ATTRIBUTION.md` and the
Sources & credits dialog in the app.

Original interface and lesson wording were created for this project. The
AI-generated `public/og.png` is a promotional card, not an anatomical
reference.

Educational references: OpenStax Anatomy & Physiology 2e; Wilke et al.
(2016), PMID 26281953; Krause et al. (2016), PMCID PMC5341578.
