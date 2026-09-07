# Form — Anatomy, connected

A free, no-account anatomy explorer built with React, Three.js and vinext.

## Run locally

Requires Node.js 22.13 or newer.

    npm ci
    npm run dev

Use the Local URL printed by the server. Scripts work on Windows, macOS and Linux.

## Validate

    npm run build
    node --test tests/rendered-html.test.mjs
    npx tsc --noEmit

## Included

- Locally bundled Z-Anatomy GLB, with 826 individually selectable mesh parts. Mesh-part counts are not counts of unique muscles or bones.
- Rotate, zoom, pan, camera presets, search, hide, restore, isolate and opacity controls.
- Five fascial-line teaching models, evidence notes and linked references.
- Curated explanations for selected structures; all other parts have identification and reference links.
- Four-question study check, responsive layout and keyboard-accessible controls.

Fascial highlights identify model components. They are not segmented fascial sheets, measurements of force transmission or animated movement simulations. Some connective tissues in the lesson paths are not separately represented in this model.

## Sources and licensing

The unmodified body.glb comes from https://github.com/hpfrei/body-anatomy-3d-viewer and is distributed under CC BY-SA 4.0. Z-Anatomy contributors include Gauthier Kervyn; underlying BodyParts3D is © DBCLS. Preserve attribution and ShareAlike terms when redistributing adapted model assets. See public/ATTRIBUTION.md and the Sources & credits dialog.

Original interface and lesson wording were created for this project. The AI-generated public/og.png is a promotional card, not an anatomical reference. Its prompt requested the Form wordmark, ivory and sage palette, exact site headline and an anatomical torso illustration.

Educational references: OpenStax Anatomy & Physiology 2e; Wilke et al. (2016), PMID 26281953; Krause et al. (2016), PMCID PMC5341578.
