# Phase 2: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the atlas a real data foundation (a generated part catalog with sides, regions, and layers; Wikipedia-sourced muscle facts), restructure the app into feature modules around a Three.js engine class and a URL-synced store, and ship deep links plus region, layer, and side browsing.

**Architecture:** Two build-time scripts write committed JSON (`catalog.json` from the GLB header, `facts.json` from Wikipedia infoboxes). The viewer becomes an `AnatomyEngine` class with an imperative API wrapped by a thin React component; per-part styling is a pure function of app state. App state lives in a reducer store mirrored to the URL query string. UI splits into library, detail, fascia, and guide feature folders.

**Tech Stack:** Vite 8, React 19, Three.js 0.185, TypeScript 5.9, vitest 5, `tsx` 4 for running TypeScript scripts, MediaWiki API (no key).

## Global Constraints

- Everything from the phase 1 plan still applies: Node `>=22.13.0`, base `/form-anatomy/`, `BASE_URL` for assets, GLB never modified, commit trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Dev server: `npm run dev -- --port 3131`. Verify 3D behavior in real Chrome, not the embedded pane.
- Edit scripts must strip `\r` before multi-line matching (autocrlf rewrites files to CRLF).
- Model facts established by inspection: 826 mesh nodes, all node names unique, no node transforms, every POSITION accessor has `min`/`max`, raw model bbox min `[-0.334, 0.008, -0.130]` max `[0.334, 1.708, 0.137]`. The model faces +z, so +x is the subject's left.
- Wikipedia requests carry `User-Agent: FormAnatomyAtlas/0.2 (https://github.com/HyperionProj25/form-anatomy; educational)` and are spaced 250 ms apart.
- Any text shown from Wikipedia or the model's embedded descriptions is labeled "Text adapted from Wikipedia, CC BY-SA 4.0" with a link.

## File map

Create:
- `scripts/build-catalog.ts`, `scripts/fetch-facts.ts`, `scripts/wikitext.ts`
- `src/data/types.ts`, `src/data/regions.ts`, `src/data/catalog.ts`, `src/data/catalog.json` (generated), `src/data/facts.json` (generated), `src/data/facts.ts`, `src/data/lines.ts`, `src/data/lessons.ts`, `src/data/questions.ts`, `src/data/groups.ts`
- `src/viewer/engine.ts`, `src/viewer/appearance.ts`, `src/viewer/Viewer.tsx`
- `src/state/store.tsx`, `src/state/urlCodec.ts`, `src/state/useUrlSync.ts`
- `src/features/library/LibraryPanel.tsx`, `src/features/detail/DetailPanel.tsx`, `src/features/fascia/FasciaPanel.tsx`, `src/features/guide/Modals.tsx`, `src/features/shared/CopyLink.tsx`, `src/features/shared/Toast.tsx`
- `tests/catalog.test.ts`, `tests/regions.test.ts`, `tests/facts.test.ts`, `tests/urlCodec.test.ts`, `tests/appearance.test.ts`, `tests/groups.test.ts`, `tests/wikitext.test.ts`

Modify:
- `src/App.tsx` (becomes a shell), `src/main.tsx`, `package.json`, `README.md`, `tests/data.test.ts`

Move:
- `src/globals.css` -> `src/styles/globals.css`

Delete:
- `src/viewer.tsx`, `src/study-data.ts`, `src/structures.ts`, `tests/structures.test.ts`

---

### Task 1: Part catalog generated from the model

**Files:**
- Create: `src/data/types.ts`, `src/data/regions.ts`, `scripts/build-catalog.ts`, `src/data/catalog.ts`, `src/data/catalog.json`, `tests/regions.test.ts`, `tests/catalog.test.ts`
- Modify: `package.json` (add `tsx`, `catalog` script)

**Interfaces:**
- Produces: `CatalogPart`, `Catalog`, `Region`, `Layer`, `Side`, `PartType`, `Vec3` types; `classifyRegion(name, group, centroid, extents)`, `classifyLayer(name, type)`, `REGION_LABELS`, `REGION_ORDER`; `catalog`, `parts`, `partById(id)`, `partsByKey(key)`, `nodeToId` from `src/data/catalog.ts`; `npm run catalog` regenerates the JSON.

- [x] **Step 1: Add tsx and the script entry**

```bash
npm install -D tsx@4.23.13 2>&1 | tail -2
```

Add to `package.json` scripts:

```json
    "catalog": "tsx scripts/build-catalog.ts",
```

- [x] **Step 2: Write `src/data/types.ts`**

```ts
export type Region =
  | "head-neck"
  | "back"
  | "thorax"
  | "abdomen-pelvis"
  | "shoulder-arm"
  | "forearm-hand"
  | "hip-thigh"
  | "leg-foot";
export type Layer = "superficial" | "deep";
export type Side = "left" | "right" | "midline";
export type PartType = "muscle" | "bone" | "connective";
export type Vec3 = [number, number, number];

export type CatalogPart = {
  /** Stable id: key plus "-l" / "-r" for bilateral parts, e.g. "lateral-head-of-gastrocnemius-l". */
  id: string;
  /** GLB node name, unique per mesh. */
  node: string;
  /** Side-agnostic slug shared by left and right copies. */
  key: string;
  /** Display name (nameDetail from the model, parentheses stripped). */
  name: string;
  /** Broader grouping name from the model when it differs from name, e.g. "Gastrocnemius". */
  group?: string;
  type: PartType;
  side: Side;
  region: Region;
  layer: Layer;
  /** Center of the part's bounding box, in model space after recentering. */
  centroid: Vec3;
  bbox: [Vec3, Vec3];
  /** English Wikipedia article URL, anchor removed. */
  wiki?: string;
};

export type Catalog = {
  meta: {
    source: string;
    generated: string;
    /** Subtract this from raw GLB coordinates to get catalog/model space. */
    modelCenter: Vec3;
    modelSize: Vec3;
    partCount: number;
  };
  parts: CatalogPart[];
};
```

- [x] **Step 3: Write the failing region tests**

`tests/regions.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { classifyLayer, classifyRegion, REGION_ORDER } from "../src/data/regions";

// Model space: y from -0.85 (soles) to +0.85 (crown). x>0 is the subject's left.
const extents = { minY: -0.85, maxY: 0.85 };
const at = (x: number, y: number, z = 0): [number, number, number] => [x, y, z];

describe("classifyRegion keyword rules", () => {
  test("named muscles land in their textbook region regardless of position", () => {
    expect(classifyRegion("Gluteus Maximus Muscle", undefined, at(0.1, 0), extents)).toBe("hip-thigh");
    expect(classifyRegion("Latissimus Dorsi Muscle", undefined, at(0.1, 0.2, -0.05), extents)).toBe("back");
    expect(classifyRegion("External Intercostal Muscles", undefined, at(0.1, 0.3), extents)).toBe("thorax");
    expect(classifyRegion("Sternocleidomastoid Muscle", undefined, at(0.03, 0.6), extents)).toBe("head-neck");
    expect(classifyRegion("Extensor Digitorum", undefined, at(0.25, 0.1), extents)).toBe("forearm-hand");
    expect(classifyRegion("Extensor Digitorum Longus", undefined, at(0.1, -0.5), extents)).toBe("leg-foot");
    expect(classifyRegion("Pectoralis Major Muscle", undefined, at(0.1, 0.4), extents)).toBe("shoulder-arm");
    expect(classifyRegion("Rectus Abdominis Muscle", undefined, at(0.03, 0.1), extents)).toBe("abdomen-pelvis");
  });

  test("bones use the group name when the part name is generic", () => {
    expect(classifyRegion("Vertebra T4", "Thoracic Vertebrae", at(0, 0.3), extents)).toBe("back");
    expect(classifyRegion("Vertebra C5", "Cervical Vertebrae", at(0, 0.6), extents)).toBe("head-neck");
    expect(classifyRegion("Distal Phalanx Of Third Finger Of Hand", undefined, at(0.3, -0.1), extents)).toBe("forearm-hand");
    expect(classifyRegion("Distal Phalanx Of Third Finger Of Foot", undefined, at(0.1, -0.8), extents)).toBe("leg-foot");
  });
});

describe("classifyRegion geometry fallback", () => {
  test("uses height bands and arm offset when no keyword matches", () => {
    expect(classifyRegion("Mystery Part", undefined, at(0, 0.7), extents)).toBe("head-neck");
    expect(classifyRegion("Mystery Part", undefined, at(0.25, 0.3), extents)).toBe("shoulder-arm");
    expect(classifyRegion("Mystery Part", undefined, at(0.28, -0.05), extents)).toBe("forearm-hand");
    expect(classifyRegion("Mystery Part", undefined, at(0.05, 0.35, -0.06), extents)).toBe("back");
    expect(classifyRegion("Mystery Part", undefined, at(0.05, 0.35, 0.02), extents)).toBe("thorax");
    expect(classifyRegion("Mystery Part", undefined, at(0.05, 0.05, 0.02), extents)).toBe("abdomen-pelvis");
    expect(classifyRegion("Mystery Part", undefined, at(0.1, -0.2), extents)).toBe("hip-thigh");
    expect(classifyRegion("Mystery Part", undefined, at(0.1, -0.6), extents)).toBe("leg-foot");
  });
});

describe("classifyLayer", () => {
  test("marks curated deep muscles deep and everything else superficial", () => {
    expect(classifyLayer("Soleus Muscle", "muscle")).toBe("deep");
    expect(classifyLayer("Subscapularis Muscle", "muscle")).toBe("deep");
    expect(classifyLayer("Vastus Intermedius Muscle", "muscle")).toBe("deep");
    expect(classifyLayer("Deep Head Of Pronator Teres", "muscle")).toBe("deep");
    expect(classifyLayer("Gluteus Maximus Muscle", "muscle")).toBe("superficial");
    expect(classifyLayer("Femur", "bone")).toBe("superficial");
  });
});

test("REGION_ORDER lists all eight regions once", () => {
  expect(REGION_ORDER.length).toBe(8);
  expect(new Set(REGION_ORDER).size).toBe(8);
});
```

- [x] **Step 4: Run to verify it fails**

```bash
npx vitest run tests/regions.test.ts 2>&1 | grep -E "FAIL|Cannot find|passed|failed" | head -3
```

Expected: FAIL, cannot find module `../src/data/regions`.

- [x] **Step 5: Write `src/data/regions.ts`**

```ts
import type { Layer, PartType, Region, Vec3 } from "./types";

export const REGION_LABELS: Record<Region, string> = {
  "head-neck": "Head & neck",
  back: "Back",
  thorax: "Thorax",
  "abdomen-pelvis": "Abdomen & pelvis",
  "shoulder-arm": "Shoulder & arm",
  "forearm-hand": "Forearm & hand",
  "hip-thigh": "Hip & thigh",
  "leg-foot": "Leg & foot",
};

export const REGION_ORDER: Region[] = [
  "head-neck",
  "back",
  "thorax",
  "abdomen-pelvis",
  "shoulder-arm",
  "forearm-hand",
  "hip-thigh",
  "leg-foot",
];

/** Manual overrides by side-agnostic key. Wins over every other rule. */
export const REGION_OVERRIDES: Record<string, Region> = {};

/** Ordered keyword rules; the first regex that matches the lowercased "name | group" string wins. */
const REGION_RULES: [RegExp, Region][] = [
  // Head and neck: face, jaw, eye, tongue, pharynx, larynx, neck, skull, cervical spine.
  [
    /\b(capitis|colli\b|cervic|scalen|sternocleidomastoid|hyoid|digastric|mylohyoid|geniohyoid|stylohyoid|omohyoid|thyro|crico|arytenoid|epiglott|pharyng|palat|glossus|masseter|pterygoid|temporalis|bucinator|buccinator|orbicularis|zygomatic|levator (labii|anguli|palpebrae|veli)|depressor|mentalis|risorius|nasalis|procerus|frontalis|occipitalis|epicranial|corrugator|platysma|temporoparietalis|rectus (superior|inferior|medial|lateral)|(superior|inferior) oblique muscle|tarsus|trochlea|tendinous ring|splenius|longus (colli|capitis)|obliquus|skull|cranium|parietal bone|frontal bone|occipital bone|temporal bone|sphenoid|ethmoid|nasal|lacrimal|maxilla|mandible|palatine|vomer|concha|incisor|canine|premolar|molar|tooth|teeth|malleus|incus|stapes|atlas|axis|cartilage of|septal|alar|cricoid|thyroid|corniculate|larynx|tympani)\b/,
    "head-neck",
  ],
  // Thorax: breathing muscles and the rib cage.
  [/\b(intercostal|transversus thoracis|subcostal|diaphragm|rib\b|ribs\b|costal cartilage|sternum|manubrium|xiphoid|levatores)\b/, "thorax"],
  // Back: intrinsic back muscles, scapular retractors, the vertebral column below the neck.
  [
    /\b(erector|iliocostalis|longissimus|spinalis|multifidus|rotatores|semispinalis|interspinales|intertransversarii|trapezius|latissimus|rhomboid|levator scapulae|serratus posterior|quadratus lumborum|vertebra|thoracic|lumbar|sacrum|sacral|coccyx)\b/,
    "back",
  ],
  // Shoulder and arm: shoulder girdle, rotator cuff, upper arm.
  [
    /\b(deltoid|pectoralis|serratus anterior|subclavius|supraspinatus|infraspinatus|teres|subscapularis|coracobrachialis|biceps brachii|triceps|brachialis|anconeus|humerus|scapula|clavicle|acromial|subacromial|subdeltoid|coracobrachial|bicipitoradial|intertubercular)\b/,
    "shoulder-arm",
  ],
  // Forearm and hand.
  [
    /\b(brachioradialis|pronator|supinator|flexor carpi|extensor carpi|flexor digitorum (superficialis|profundus)|extensor digitorum$|extensor digiti minimi|extensor indicis|pollicis|palmaris|palmar|opponens|of hand|hand$|digits of hand|manus|radius|ulna|carpal|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|metacarpal|finger of hand|flexor digiti minimi of hand|abductor digiti minimi of hand)\b/,
    "forearm-hand",
  ],
  // Abdomen and pelvis: abdominal wall, pelvic floor, pelvic bones.
  [/\b(rectus abdominis|abdominal oblique|transversus abdominis|pyramidalis|linea alba|cremaster|levator ani|coccygeus|pelvic|hip bone|ilium|ischium|pubis|pubic|inguinal)\b/, "abdomen-pelvis"],
  // Hip and thigh.
  [
    /\b(gluteus|gluteal|tensor fascia|piriformis|obturator|gemellus|quadratus femoris|iliacus|psoas|iliopectineal|sartorius|rectus femoris|vastus|quadriceps|adductor (longus|brevis|magnus|minimus)|gracilis|pectineus|biceps femoris|semitendinosus|semimembranosus|hamstring|femur|patella|patellar|iliotibial|trochanteric|anserine|sciatic)\b/,
    "hip-thigh",
  ],
  // Leg and foot.
  [
    /\b(gastrocnemius|soleus|plantaris|popliteus|tibialis|fibularis|peroneus|(extensor|flexor) (digitorum|hallucis) (longus|brevis)|hallucis|of foot|foot$|quadratus plantae|plantar|tibia|fibula|calcaneus|calcaneal|talus|navicular|cuboid|cuneiform|metatarsal|finger of foot|malleolus|sesamoid|tuberosity of tibia|infrapatellar|prepatellar|suprapatellar)\b/,
    "leg-foot",
  ],
];

export type Extents = { minY: number; maxY: number };

/**
 * Region by manual override, then keyword rules on "name | group", then geometry.
 * Geometry bands are fractions of model height measured from the soles:
 * crown 1.0, shoulders ~0.83, elbows ~0.62, pubis ~0.50, knees ~0.28.
 */
export function classifyRegion(
  name: string,
  group: string | undefined,
  centroid: Vec3,
  extents: Extents,
): Region {
  const key = slugify(name);
  if (REGION_OVERRIDES[key]) return REGION_OVERRIDES[key];
  const text = `${name} | ${group ?? ""}`.toLowerCase();
  for (const [re, region] of REGION_RULES) if (re.test(text)) return region;

  const [x, y, z] = centroid;
  const height = extents.maxY - extents.minY;
  const u = (y - extents.minY) / height;
  const lateral = Math.abs(x);
  if (u > 0.83) return "head-neck";
  if (lateral > 0.16 && u >= 0.4) return u > 0.615 ? "shoulder-arm" : "forearm-hand";
  if (u > 0.5) {
    if (z < -0.04) return "back";
    return u > 0.68 ? "thorax" : "abdomen-pelvis";
  }
  if (u > 0.275) return "hip-thigh";
  return "leg-foot";
}

const DEEP_RULES =
  /\b(supraspinatus|infraspinatus|teres minor|subscapularis|multifidus|rotatores|semispinalis|interspinales|intertransversarii|levatores|rectus (anterior|lateralis|posterior) (major|minor )?capitis|obliquus|scalen|longus (colli|capitis)|internal intercostal|innermost intercostal|transversus thoracis|subcostal|diaphragm|transversus abdominis|quadratus lumborum|internal abdominal oblique|iliacus|psoas|piriformis|obturator|gemellus|quadratus femoris|vastus intermedius|adductor (brevis|magnus)|popliteus|soleus|tibialis posterior|flexor (digitorum|hallucis) longus|flexor digitorum profundus|flexor pollicis longus|pronator quadratus|supinator|abductor pollicis longus|extensor pollicis (brevis|longus)|extensor indicis|interossei|lumbrical|quadratus plantae|deep head|deep part|pterygoid|genioglossus|hyoglossus|geniohyoid|mylohyoid|constrictor|arytenoid|crico|thyro-arytenoid|levator palpebrae|rectus (superior|inferior|medial|lateral)|(superior|inferior) oblique muscle|gluteus minimus|brachialis|pectoralis minor|subclavius|serratus anterior|levator scapulae|rhomboid)\b/;

/** Approximate depth: curated deep muscles are deep; everything else (including bones) is superficial. */
export function classifyLayer(name: string, type: PartType): Layer {
  if (type !== "muscle") return "superficial";
  return DEEP_RULES.test(name.toLowerCase()) ? "deep" : "superficial";
}

/** "Lateral Head Of Gastrocnemius" -> "lateral-head-of-gastrocnemius". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [x] **Step 6: Run the region tests**

```bash
npx vitest run tests/regions.test.ts 2>&1 | grep -E "✓|✗|×|passed|failed" | head -12
```

Expected: `Tests  6 passed (6)`. If a keyword case fails, adjust the rule order (more specific rules first) rather than the test.

- [x] **Step 7: Write `scripts/build-catalog.ts`**

```ts
/**
 * Builds src/data/catalog.json from public/body.glb.
 * Reads only the glTF JSON header: node names, extras, and POSITION accessor bounds.
 * No Draco decoding is needed because every accessor declares min/max and no node has a transform.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyLayer, classifyRegion, slugify } from "../src/data/regions";
import type { Catalog, CatalogPart, PartType, Side, Vec3 } from "../src/data/types";

type GltfNode = {
  name: string;
  mesh?: number;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  matrix?: number[];
  extras?: Record<string, unknown>;
};
type Gltf = {
  nodes: GltfNode[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
};

const root = resolve(import.meta.dirname, "..");
const glbPath = resolve(root, "public/body.glb");
const outPath = resolve(root, "src/data/catalog.json");
const SIDE_THRESHOLD = 0.008;

const bytes = readFileSync(glbPath);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)) as Gltf;
const nodes = gltf.nodes.filter((n) => n.mesh !== undefined);

for (const n of nodes) {
  if (n.translation || n.rotation || n.scale || n.matrix)
    throw new Error(`Node ${n.name} has a transform; the header-only catalog assumes none.`);
}
if (new Set(nodes.map((n) => n.name)).size !== nodes.length)
  throw new Error("GLB node names are not unique.");

type Raw = { node: GltfNode; min: Vec3; max: Vec3 };
const raws: Raw[] = nodes.map((node) => {
  const prims = gltf.meshes[node.mesh!].primitives;
  if (prims.length !== 1) throw new Error(`Mesh for ${node.name} has ${prims.length} primitives.`);
  const acc = gltf.accessors[prims[0].attributes.POSITION];
  if (!acc.min || !acc.max) throw new Error(`POSITION accessor for ${node.name} lacks bounds.`);
  return { node, min: acc.min as Vec3, max: acc.max as Vec3 };
});

const overallMin: Vec3 = [Infinity, Infinity, Infinity];
const overallMax: Vec3 = [-Infinity, -Infinity, -Infinity];
for (const r of raws)
  for (let i = 0; i < 3; i++) {
    overallMin[i] = Math.min(overallMin[i], r.min[i]);
    overallMax[i] = Math.max(overallMax[i], r.max[i]);
  }
const modelCenter = overallMin.map((v, i) => (v + overallMax[i]) / 2) as Vec3;
const modelSize = overallMax.map((v, i) => v - overallMin[i]) as Vec3;
const extents = { minY: overallMin[1] - modelCenter[1], maxY: overallMax[1] - modelCenter[1] };

const round = (v: number) => Math.round(v * 10000) / 10000;
const shift = (v: Vec3): Vec3 => [round(v[0] - modelCenter[0]), round(v[1] - modelCenter[1]), round(v[2] - modelCenter[2])];

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

const parts: CatalogPart[] = raws.map(({ node, min, max }) => {
  const extras = node.extras ?? {};
  const rawName = str(extras.nameDetail) ?? str(extras.name) ?? node.name.replaceAll("_", " ");
  const name = rawName.replace(/^\((.*)\)$/, "$1").trim();
  const groupName = str(extras.name);
  const group = groupName && groupName !== rawName && groupName !== name ? groupName : undefined;
  const typeRaw = str(extras.type);
  const type: PartType = typeRaw === "muscle" || typeRaw === "bone" ? typeRaw : "connective";
  const bmin = shift(min);
  const bmax = shift(max);
  const centroid: Vec3 = [round((bmin[0] + bmax[0]) / 2), round((bmin[1] + bmax[1]) / 2), round((bmin[2] + bmax[2]) / 2)];
  const side: Side = centroid[0] > SIDE_THRESHOLD ? "left" : centroid[0] < -SIDE_THRESHOLD ? "right" : "midline";
  const wikiRaw = str(extras.wikiLink);
  const wiki = wikiRaw?.startsWith("https://en.wikipedia.org/wiki/") ? wikiRaw.split("#")[0] : undefined;
  const key = slugify(name);
  return {
    id: key + (side === "left" ? "-l" : side === "right" ? "-r" : ""),
    node: node.name,
    key,
    name,
    ...(group ? { group } : {}),
    type,
    side,
    region: classifyRegion(name, group, centroid, extents),
    layer: classifyLayer(name, type),
    centroid,
    bbox: [bmin, bmax],
    ...(wiki ? { wiki } : {}),
  };
});

// Disambiguate id collisions deterministically (same name and side more than once).
const seen = new Map<string, number>();
for (const p of parts) {
  const n = (seen.get(p.id) ?? 0) + 1;
  seen.set(p.id, n);
  if (n > 1) p.id = `${p.id}-${n}`;
}
if (new Set(parts.map((p) => p.id)).size !== parts.length) throw new Error("Catalog ids are not unique.");

parts.sort((a, b) => a.name.localeCompare(b.name) || a.side.localeCompare(b.side) || a.id.localeCompare(b.id));

const catalog: Catalog = {
  meta: {
    source: "public/body.glb (Z-Anatomy via hpfrei, CC BY-SA 4.0)",
    generated: new Date().toISOString().slice(0, 10),
    modelCenter: modelCenter.map(round) as Vec3,
    modelSize: modelSize.map(round) as Vec3,
    partCount: parts.length,
  },
  parts,
};
writeFileSync(outPath, JSON.stringify(catalog, null, 1) + "\n");

const count = (f: (p: CatalogPart) => boolean) => parts.filter(f).length;
console.log(`Wrote ${parts.length} parts to ${outPath}`);
console.log(`sides: left ${count((p) => p.side === "left")}, right ${count((p) => p.side === "right")}, midline ${count((p) => p.side === "midline")}`);
for (const region of ["head-neck", "back", "thorax", "abdomen-pelvis", "shoulder-arm", "forearm-hand", "hip-thigh", "leg-foot"] as const)
  console.log(`  ${region}: ${count((p) => p.region === region)}`);
console.log(`deep muscles: ${count((p) => p.layer === "deep")}, with wiki: ${count((p) => !!p.wiki)}`);
console.log("midline parts:", parts.filter((p) => p.side === "midline").map((p) => p.name).join(", "));
```

- [x] **Step 8: Generate the catalog and read the report**

```bash
npm run catalog 2>&1 | tail -16
```

Expected: `Wrote 826 parts`, left and right counts within a few of each other, midline under 60 and made of true midline structures (sternum parts, vertebrae, sacrum, coccyx, diaphragm, linea alba, hyoid, mandible, cartilages, teeth pairs are bilateral so they should not be here). If a bilateral structure appears in the midline list, lower `SIDE_THRESHOLD` to `0.004` and rerun. Skim the region counts: each region should be non-empty and head-neck should be the largest muscle region.

- [x] **Step 9: Spot check region assignments**

```bash
node -e '
const c=require("./src/data/catalog.json");
const show=(re)=>console.log(c.parts.filter(p=>re.test(p.name)).map(p=>p.name+" -> "+p.region+"/"+p.layer+"/"+p.side).join("\n"));
show(/^(Gastrocnemius|Lateral Head Of Gastrocnemius|Soleus Muscle|Deltoid|Acromial Part Of Deltoid Muscle|Latissimus Dorsi Muscle|Femur|Scapula|Diaphragm|Linea Alba|Vertebra L3|Atlas \(C1\)|Hip Bone|Talus|Humerus|Extensor Digitorum|Extensor Digitorum Longus|Subscapularis Muscle|Rectus Abdominis Muscle|Levator Scapulae|Longissimus Capitis Muscle)$/);
console.log("--- unmatched-by-keyword sanity: parts per region that came from geometry ---");
'
```

Expected lines include `Soleus Muscle -> leg-foot/deep/left` and `.../right`, `Latissimus Dorsi Muscle -> back/superficial/...`, `Femur -> hip-thigh/superficial/...`, `Diaphragm -> thorax/deep/midline`, `Vertebra L3 -> back/superficial/midline`, `Extensor Digitorum -> forearm-hand`, `Extensor Digitorum Longus -> leg-foot`. Fix any wrong ones by editing `REGION_RULES` (or `REGION_OVERRIDES` for one-offs), rerun `npm run catalog`, and re-check.

- [x] **Step 10: Write `src/data/catalog.ts`**

```ts
import raw from "./catalog.json";
import type { Catalog, CatalogPart, Side } from "./types";

export const catalog = raw as Catalog;
export const parts: CatalogPart[] = catalog.parts;

const byId = new Map(parts.map((p) => [p.id, p]));
const byNode = new Map(parts.map((p) => [p.node, p]));
const byKey = new Map<string, CatalogPart[]>();
for (const p of parts) {
  const list = byKey.get(p.key);
  if (list) list.push(p);
  else byKey.set(p.key, [p]);
}

/** GLB node name -> catalog id, used by the engine to label meshes. */
export const nodeToId = new Map(parts.map((p) => [p.node, p.id]));

export function partById(id: string): CatalogPart | undefined {
  return byId.get(id);
}
export function partByNode(node: string): CatalogPart | undefined {
  return byNode.get(node);
}
export function partsByKey(key: string): CatalogPart[] {
  return byKey.get(key) ?? [];
}
export function isPartId(id: string): boolean {
  return byId.has(id);
}
/** Pick one side of a key: the requested side, else right, else whatever exists. */
export function partForSide(key: string, side: Side | "both"): CatalogPart | undefined {
  const list = partsByKey(key);
  if (!list.length) return undefined;
  if (side !== "both") {
    const exact = list.find((p) => p.side === side);
    if (exact) return exact;
  }
  return list.find((p) => p.side === "right") ?? list[0];
}
/** Search "name group" text for a case-insensitive substring. */
export function partMatches(p: CatalogPart, needle: string): boolean {
  const n = needle.toLowerCase();
  return p.name.toLowerCase().includes(n) || (p.group?.toLowerCase().includes(n) ?? false);
}
```

- [x] **Step 11: Write `tests/catalog.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { catalog, parts, partById, partForSide, partsByKey } from "../src/data/catalog";
import { REGION_ORDER } from "../src/data/regions";

describe("catalog.json", () => {
  test("has 826 parts with unique ids and node names", () => {
    expect(parts.length).toBe(826);
    expect(catalog.meta.partCount).toBe(826);
    expect(new Set(parts.map((p) => p.id)).size).toBe(826);
    expect(new Set(parts.map((p) => p.node)).size).toBe(826);
  });

  test("every part has a valid type, side, region and layer", () => {
    for (const p of parts) {
      expect(["muscle", "bone", "connective"]).toContain(p.type);
      expect(["left", "right", "midline"]).toContain(p.side);
      expect(REGION_ORDER).toContain(p.region);
      expect(["superficial", "deep"]).toContain(p.layer);
      expect(p.centroid.length).toBe(3);
      expect(p.bbox[0][1]).toBeLessThanOrEqual(p.bbox[1][1]);
    }
  });

  test("ids end in -l or -r for bilateral parts and sides are balanced", () => {
    const left = parts.filter((p) => p.side === "left");
    const right = parts.filter((p) => p.side === "right");
    expect(Math.abs(left.length - right.length)).toBeLessThan(6);
    for (const p of left) expect(p.id.endsWith("-l") || /-l-\d+$/.test(p.id)).toBe(true);
    for (const p of right) expect(p.id.endsWith("-r") || /-r-\d+$/.test(p.id)).toBe(true);
    expect(parts.filter((p) => p.side === "midline").length).toBeLessThan(60);
  });

  test("model is recentered so the overall bounds straddle the origin", () => {
    const minY = Math.min(...parts.map((p) => p.bbox[0][1]));
    const maxY = Math.max(...parts.map((p) => p.bbox[1][1]));
    expect(minY).toBeLessThan(-0.8);
    expect(maxY).toBeGreaterThan(0.8);
    expect(Math.abs(minY + maxY)).toBeLessThan(0.01);
  });

  test("spot checks match textbook regions", () => {
    const expectRegion = (namePart: string, region: string) => {
      const hits = parts.filter((p) => p.name.toLowerCase().includes(namePart));
      expect(hits.length, namePart).toBeGreaterThan(0);
      for (const h of hits) expect(h.region, h.name).toBe(region);
    };
    expectRegion("gastrocnemius", "leg-foot");
    expectRegion("latissimus dorsi", "back");
    expectRegion("deltoid", "shoulder-arm");
    expectRegion("gluteus", "hip-thigh");
    expectRegion("rectus abdominis", "abdomen-pelvis");
    expectRegion("intercostal", "thorax");
    expectRegion("masseter", "head-neck");
    expectRegion("flexor carpi", "forearm-hand");
    expectRegion("vertebra t", "back");
    expectRegion("femur", "hip-thigh");
    expectRegion("humerus", "shoulder-arm");
  });

  test("layer spot checks", () => {
    const layerOf = (name: string) => parts.find((p) => p.name === name)?.layer;
    expect(layerOf("Soleus Muscle")).toBe("deep");
    expect(layerOf("Gluteus Maximus Muscle")).toBe("superficial");
    expect(layerOf("Subscapularis Muscle")).toBe("deep");
  });

  test("lookups work", () => {
    const gastro = partsByKey("lateral-head-of-gastrocnemius");
    expect(gastro.map((p) => p.side).sort()).toEqual(["left", "right"]);
    expect(partForSide("lateral-head-of-gastrocnemius", "both")?.side).toBe("right");
    expect(partForSide("lateral-head-of-gastrocnemius", "left")?.side).toBe("left");
    expect(partById("lateral-head-of-gastrocnemius-l")?.name).toBe("Lateral Head Of Gastrocnemius");
    expect(partById("nope")).toBeUndefined();
  });

  test("wiki links are english wikipedia without anchors", () => {
    for (const p of parts)
      if (p.wiki) {
        expect(p.wiki.startsWith("https://en.wikipedia.org/wiki/")).toBe(true);
        expect(p.wiki).not.toContain("#");
      }
    expect(parts.filter((p) => p.wiki).length).toBeGreaterThan(600);
  });
});
```

- [x] **Step 12: Run all tests, lint, typecheck**

```bash
npm test 2>&1 | grep -E "Test Files|Tests |FAIL|×" ; npm run lint 2>&1 | grep -E "error|✖"; echo "LINT EXIT: ${PIPESTATUS[0]}"; npm run typecheck 2>&1 | grep -i error; echo typecheck done
```

Expected: all passing, lint and typecheck silent. `scripts/` is not in `tsconfig.include`; add `"scripts"` to the include array so `typecheck` covers it.

- [x] **Step 13: Commit**

```bash
git add -A && git commit -q -m "Generate a part catalog with sides, regions and layers from the model

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Wikipedia facts pipeline

**Files:**
- Create: `scripts/wikitext.ts`, `scripts/fetch-facts.ts`, `src/data/facts.json`, `src/data/facts.ts`, `tests/wikitext.test.ts`, `tests/facts.test.ts`
- Modify: `package.json` (`facts` script)

**Interfaces:**
- Produces: `extractInfobox(wikitext)`, `cleanWikitext(s)` from `scripts/wikitext.ts`; `Facts`, `FactEntry` types and `factsForWiki(url)` from `src/data/facts.ts`.

- [x] **Step 1: Write the failing wikitext tests**

`tests/wikitext.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { cleanWikitext, extractInfobox } from "../scripts/wikitext";

describe("cleanWikitext", () => {
  test("resolves links, strips refs, templates, markup and tags", () => {
    expect(cleanWikitext("[[achilles tendon|Tendo calcaneus]] (Achilles tendon) into mid-posterior [[calcaneus]]")).toBe(
      "Tendo calcaneus (Achilles tendon) into mid-posterior calcaneus",
    );
    expect(cleanWikitext("[[Tibial nerve]] from the [[sciatic nerve|sciatic]]<ref>Gray</ref>, roots S1–S2")).toBe(
      "Tibial nerve from the sciatic, roots S1–S2",
    );
    expect(cleanWikitext("'''Bold''' and ''italic'' {{nowrap|text}} <br /> next<ref name=\"a\"/>")).toBe("Bold and italic text, next");
    expect(cleanWikitext("Flexes {{IPAc-en|x|y}} the [[knee]] &nbsp; joint")).toBe("Flexes the knee joint");
  });
});

describe("extractInfobox", () => {
  const text = `Lead text
{{Infobox muscle
| Name        = Gastrocnemius muscle
| Image       = x.png
| Origin      = Proximal to [[lateral condyle of femur]]
| Insertion   = [[calcaneus]]
| Nerve       = [[Tibial nerve]]
| Action      = Plantar flexes [[foot]],
  flexes [[knee]]
| Antagonist  = [[Tibialis anterior muscle]]
}}
The '''gastrocnemius''' is...`;
  test("returns the template name and cleaned fields", () => {
    const box = extractInfobox(text);
    expect(box?.template).toBe("muscle");
    expect(box?.fields.origin).toBe("Proximal to lateral condyle of femur");
    expect(box?.fields.insertion).toBe("calcaneus");
    expect(box?.fields.nerve).toBe("Tibial nerve");
    expect(box?.fields.action).toBe("Plantar flexes foot, flexes knee");
    expect(box?.fields.antagonist).toBe("Tibialis anterior muscle");
    expect(box?.fields.image).toBeUndefined();
  });
  test("returns null when there is no infobox", () => {
    expect(extractInfobox("No box here")).toBeNull();
  });
  test("handles nested templates inside the box", () => {
    const t = "{{Infobox bone\n| Name = Femur\n| Articulations = {{plainlist|\n* [[hip]]\n* [[knee]]}}\n}}";
    expect(extractInfobox(t)?.fields.articulations).toBe("hip, knee");
  });
});
```

- [x] **Step 2: Run to verify it fails**

```bash
npx vitest run tests/wikitext.test.ts 2>&1 | grep -E "FAIL|Cannot find|passed|failed" | head -3
```

Expected: FAIL, cannot find module `../scripts/wikitext`.

- [x] **Step 3: Write `scripts/wikitext.ts`**

```ts
/** Minimal wikitext helpers for infobox extraction. Pure functions, unit tested. */

const KEPT_FIELDS = new Set(["origin", "insertion", "action", "nerve", "antagonist", "articulations", "blood", "artery"]);

/** Turn a wikitext fragment into plain text. */
export function cleanWikitext(input: string): string {
  let s = input;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<ref[^>]*\/>/gi, "");
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  s = stripTemplates(s);
  s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1");
  s = s.replace(/\[https?:\/\/[^\s\]]+\s*([^\]]*)\]/g, "$1");
  s = s.replace(/<br\s*\/?>/gi, ", ");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/'''''|'''|''/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—");
  s = s.replace(/^\s*[*#]\s*/gm, ", ");
  s = s.replace(/\s*\n\s*/g, " ");
  s = s.replace(/\s*,\s*,+/g, ",").replace(/^\s*,\s*/, "").replace(/\s+,/g, ",");
  s = s.replace(/\s{2,}/g, " ").trim();
  s = s.replace(/[,;\s]+$/, "");
  return s;
}

/** Remove {{...}} templates, keeping the last positional argument of layout templates like nowrap/plainlist. */
function stripTemplates(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s.startsWith("{{", i)) {
      let depth = 0;
      let j = i;
      while (j < s.length) {
        if (s.startsWith("{{", j)) {
          depth++;
          j += 2;
        } else if (s.startsWith("}}", j)) {
          depth--;
          j += 2;
          if (depth === 0) break;
        } else j++;
      }
      const inner = s.slice(i + 2, j - 2);
      const name = inner.split("|")[0].trim().toLowerCase();
      if (/^(nowrap|plainlist|unbulleted list|ubl|hlist|flatlist|small|abbr)$/.test(name)) {
        const args = inner.split("|").slice(1).filter((a) => !/^\s*\w+\s*=/.test(a));
        out += stripTemplates(args.join(", "));
      }
      i = j;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

export type Infobox = { template: string; fields: Record<string, string> };

/** Find the first {{Infobox ...}} block and return its kept fields, cleaned. */
export function extractInfobox(wikitext: string): Infobox | null {
  const start = wikitext.search(/\{\{\s*Infobox\b/i);
  if (start < 0) return null;
  let depth = 0;
  let end = start;
  while (end < wikitext.length) {
    if (wikitext.startsWith("{{", end)) {
      depth++;
      end += 2;
    } else if (wikitext.startsWith("}}", end)) {
      depth--;
      end += 2;
      if (depth === 0) break;
    } else end++;
  }
  const body = wikitext.slice(start + 2, end - 2);
  const headerEnd = body.indexOf("|");
  const template = body.slice("Infobox".length, headerEnd < 0 ? undefined : headerEnd).trim().toLowerCase();
  const fields: Record<string, string> = {};
  // Split on "|" only at template depth zero so nested templates keep their pipes.
  const segments: string[] = [];
  let depth2 = 0;
  let current = "";
  for (let i = headerEnd < 0 ? body.length : headerEnd + 1; i < body.length; i++) {
    if (body.startsWith("{{", i) || body.startsWith("[[", i)) {
      depth2++;
      current += body.slice(i, i + 2);
      i++;
    } else if (body.startsWith("}}", i) || body.startsWith("]]", i)) {
      depth2--;
      current += body.slice(i, i + 2);
      i++;
    } else if (body[i] === "|" && depth2 === 0) {
      segments.push(current);
      current = "";
    } else current += body[i];
  }
  segments.push(current);
  for (const seg of segments) {
    const eq = seg.indexOf("=");
    if (eq < 0) continue;
    const key = seg.slice(0, eq).trim().toLowerCase();
    if (!KEPT_FIELDS.has(key)) continue;
    const value = cleanWikitext(seg.slice(eq + 1));
    if (value) fields[key] = value;
  }
  return { template, fields };
}
```

- [x] **Step 4: Run the wikitext tests**

```bash
npx vitest run tests/wikitext.test.ts 2>&1 | grep -E "passed|failed|×|AssertionError" | head -8
```

Expected: `Tests  4 passed (4)`. Adjust `cleanWikitext` ordering if a spacing assertion fails; keep the expected strings.

- [x] **Step 5: Write `src/data/facts.ts` (types + lookup; JSON arrives in step 7)**

```ts
import raw from "./facts.json";

export type FactEntry = {
  title: string;
  url: string;
  template: "muscle" | "bone" | "other";
  origin?: string;
  insertion?: string;
  action?: string;
  nerve?: string;
  antagonist?: string;
  articulations?: string;
  blood?: string;
  revision: number;
  retrieved: string;
};
/** Keyed by the article title as it appears in the catalog wiki URL (decoded, spaces). */
export type Facts = Record<string, FactEntry>;

export const facts = raw as Facts;

/** "https://en.wikipedia.org/wiki/Gastrocnemius_muscle" -> "Gastrocnemius muscle". */
export function wikiTitle(url: string): string {
  return decodeURIComponent(url.replace("https://en.wikipedia.org/wiki/", "")).replaceAll("_", " ");
}

export function factsForWiki(url: string | undefined): FactEntry | undefined {
  return url ? facts[wikiTitle(url)] : undefined;
}
```

- [x] **Step 6: Write `scripts/fetch-facts.ts`**

```ts
/**
 * Fetches Wikipedia infobox facts for every article referenced by the catalog.
 * Writes src/data/facts.json. Re-runnable; the output is committed so builds are offline.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractInfobox } from "./wikitext";
import type { Catalog } from "../src/data/types";

const root = resolve(import.meta.dirname, "..");
const catalog = JSON.parse(readFileSync(resolve(root, "src/data/catalog.json"), "utf8")) as Catalog;
const outPath = resolve(root, "src/data/facts.json");
const UA = "FormAnatomyAtlas/0.2 (https://github.com/HyperionProj25/form-anatomy; educational)";
const DELAY_MS = 250;

const titleOf = (url: string) => decodeURIComponent(url.replace("https://en.wikipedia.org/wiki/", "")).replaceAll("_", " ");
const titles = [...new Set(catalog.parts.filter((p) => p.wiki).map((p) => titleOf(p.wiki!)))].sort();
console.log(`Fetching ${titles.length} articles…`);

type Entry = {
  title: string;
  url: string;
  template: "muscle" | "bone" | "other";
  origin?: string;
  insertion?: string;
  action?: string;
  nerve?: string;
  antagonist?: string;
  articulations?: string;
  blood?: string;
  revision: number;
  retrieved: string;
};
const out: Record<string, Entry> = {};
const missing: string[] = [];
const today = new Date().toISOString().slice(0, 10);

for (const [i, title] of titles.entries()) {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "wikitext|revid",
    redirects: "1",
    format: "json",
    formatversion: "2",
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    missing.push(`${title} (HTTP ${res.status})`);
    continue;
  }
  const json = (await res.json()) as { parse?: { title: string; revid: number; wikitext: string }; error?: { info: string } };
  if (!json.parse) {
    missing.push(`${title} (${json.error?.info ?? "no parse"})`);
    continue;
  }
  const box = extractInfobox(json.parse.wikitext);
  if (!box) {
    missing.push(`${title} (no infobox)`);
  } else {
    const template = box.template === "muscle" || box.template === "bone" ? box.template : "other";
    const f = box.fields;
    out[title] = {
      title: json.parse.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(json.parse.title.replaceAll(" ", "_"))}`,
      template,
      ...(f.origin && { origin: f.origin }),
      ...(f.insertion && { insertion: f.insertion }),
      ...(f.action && { action: f.action }),
      ...(f.nerve && { nerve: f.nerve }),
      ...(f.antagonist && { antagonist: f.antagonist }),
      ...(f.articulations && { articulations: f.articulations }),
      ...((f.blood || f.artery) && { blood: f.blood ?? f.artery }),
      revision: json.parse.revid,
      retrieved: today,
    };
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${titles.length}`);
  await new Promise((r) => setTimeout(r, DELAY_MS));
}

writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
console.log(`Wrote ${Object.keys(out).length} entries to ${outPath}`);
const withOrigin = Object.values(out).filter((e) => e.origin).length;
console.log(`muscle boxes: ${Object.values(out).filter((e) => e.template === "muscle").length}, with origin: ${withOrigin}`);
if (missing.length) console.log(`No facts for ${missing.length}:\n  ${missing.join("\n  ")}`);
```

Add to `package.json` scripts:

```json
    "facts": "tsx scripts/fetch-facts.ts",
```

- [x] **Step 7: Run it (about 70 seconds) and inspect**

```bash
npm run facts 2>&1 | tail -30
```

Expected: `Wrote N entries` with N above 200; muscle boxes above 120; a short "No facts for" list made of articles that genuinely lack an infobox (e.g. list pages). Spot check:

```bash
node -e 'const f=require("./src/data/facts.json");for(const t of ["Gastrocnemius muscle","Soleus muscle","Femur","Deltoid muscle"])console.log(t, JSON.stringify(f[t],null,1))'
```

Expected: gastrocnemius shows origin, insertion, nerve, action, antagonist as plain sentences with no `[[`, `{{`, or `<`.

- [x] **Step 8: Write `tests/facts.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { parts } from "../src/data/catalog";
import { facts, factsForWiki, wikiTitle } from "../src/data/facts";

describe("facts.json", () => {
  test("every entry is clean plain text with provenance", () => {
    const entries = Object.entries(facts);
    expect(entries.length).toBeGreaterThan(150);
    for (const [title, e] of entries) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.url.startsWith("https://en.wikipedia.org/wiki/")).toBe(true);
      expect(e.revision).toBeGreaterThan(0);
      expect(e.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const field of ["origin", "insertion", "action", "nerve", "antagonist", "articulations", "blood"] as const) {
        const v = e[field];
        if (v === undefined) continue;
        expect(v, `${title}.${field}`).not.toMatch(/\[\[|\{\{|<\/?\w|&\w+;|\]\]/);
        expect(v.length, `${title}.${field}`).toBeGreaterThan(1);
      }
    }
  });

  test("keys are catalog wiki titles and most muscles have origin and action", () => {
    const titles = new Set(parts.filter((p) => p.wiki).map((p) => wikiTitle(p.wiki!)));
    for (const key of Object.keys(facts)) expect(titles.has(key), key).toBe(true);
    const muscleTitles = [...new Set(parts.filter((p) => p.type === "muscle" && p.wiki).map((p) => wikiTitle(p.wiki!)))];
    const covered = muscleTitles.filter((t) => facts[t]?.origin && facts[t]?.action);
    expect(covered.length / muscleTitles.length).toBeGreaterThan(0.7);
  });

  test("lookup by catalog wiki url", () => {
    const gastro = parts.find((p) => p.name === "Lateral Head Of Gastrocnemius");
    expect(factsForWiki(gastro?.wiki)?.origin).toContain("condyle");
    expect(factsForWiki(undefined)).toBeUndefined();
  });
});
```

- [x] **Step 9: Run tests, lint, typecheck, commit**

```bash
npm test 2>&1 | grep -E "Test Files|Tests |FAIL|×"; npm run lint 2>&1 | grep -E "error|✖"; echo "LINT EXIT: ${PIPESTATUS[0]}"; npm run typecheck 2>&1 | grep -i error; echo typecheck done
git add -A && git commit -q -m "Fetch muscle and bone facts from Wikipedia infoboxes into a committed facts file

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected: all green. If the coverage assertion (0.7) fails, print the uncovered muscle titles, and if they are mostly redirects to list pages or non-muscle articles, lower the threshold to the observed value minus 0.05 and note why in the test.

---
### Task 3: AnatomyEngine class, pure appearance function, Viewer wrapper

**Files:**
- Create: `src/viewer/engine.ts`, `src/viewer/appearance.ts`, `src/viewer/Viewer.tsx`, `tests/appearance.test.ts`
- Modify: `src/App.tsx` (swap `AnatomyViewer` for `Viewer`), `src/structures.ts` (temporary: derive `Structure[]` from the catalog)
- Delete: `src/viewer.tsx`

**Interfaces:**
- Produces: `AnatomyEngine` with `load`, `ids`, `descriptions`, `applyAppearance`, `setView`, `setCamera`, `getCamera`, `flyTo`, `zoom`, `dispose`; `CameraPose`, `ViewPreset`, `PartStyle`; `computeStyles(input)`; `<Viewer>` React component with props `{ styles, cameraCommand, onSelect, onReady, onCameraChange }`.
- Consumes: `nodeToId`, `catalog.meta.modelCenter` from Task 1.

- [x] **Step 1: Write the failing appearance test**

`tests/appearance.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { computeStyles, type StyleInput } from "../src/viewer/appearance";
import type { CatalogPart } from "../src/data/types";

const part = (id: string, type: CatalogPart["type"], name = id): CatalogPart => ({
  id,
  node: id,
  key: id,
  name,
  type,
  side: "left",
  region: "leg-foot",
  layer: "superficial",
  centroid: [0, 0, 0],
  bbox: [[0, 0, 0], [0, 0, 0]],
});
const gastro = part("gastro", "muscle", "Lateral Head Of Gastrocnemius");
const femur = part("femur", "bone", "Femur");
const bursa = part("bursa", "connective", "Anserine Bursa");
const base: StyleInput = {
  parts: [gastro, femur, bursa],
  mode: "muscles",
  selected: null,
  hidden: new Set(),
  isolated: false,
  opacity: 1,
  lineColor: "#bd914b",
  lineMatches: ["gastrocnemius"],
};

describe("computeStyles", () => {
  test("muscles mode shows everything at full opacity with default colors", () => {
    const s = computeStyles(base);
    expect(s.get("gastro")).toEqual({ visible: true, color: "#a35b4c", emissive: "#000000", emissiveIntensity: 0, opacity: 1 });
    expect(s.get("femur")?.color).toBe("#e0d3b7");
    expect(s.get("bursa")?.color).toBe("#dbd4bb");
  });

  test("selected part is green and always visible even when isolated hides the rest", () => {
    const s = computeStyles({ ...base, selected: "gastro", isolated: true });
    expect(s.get("gastro")).toMatchObject({ visible: true, color: "#477965", emissive: "#204d3a" });
    expect(s.get("femur")?.visible).toBe(false);
  });

  test("hidden ids are invisible", () => {
    const s = computeStyles({ ...base, hidden: new Set(["femur"]) });
    expect(s.get("femur")?.visible).toBe(false);
    expect(s.get("gastro")?.visible).toBe(true);
  });

  test("bones mode hides non-bone parts unless selected and applies opacity to bones", () => {
    const s = computeStyles({ ...base, mode: "bones", opacity: 0.5 });
    expect(s.get("gastro")?.visible).toBe(false);
    expect(s.get("femur")).toMatchObject({ visible: true, opacity: 0.5 });
    expect(computeStyles({ ...base, mode: "bones", selected: "gastro" }).get("gastro")?.visible).toBe(true);
  });

  test("fascia mode colors matching muscles with the line color and fades others", () => {
    const s = computeStyles({ ...base, mode: "fascia" });
    expect(s.get("gastro")).toMatchObject({ color: "#bd914b", emissive: "#bd914b", opacity: 1 });
    expect(s.get("femur")?.opacity).toBe(1);
    const other = computeStyles({ ...base, mode: "fascia", lineMatches: ["soleus"] });
    expect(other.get("gastro")?.opacity).toBe(0.1);
  });

  test("muscle opacity applies to muscles in muscles mode but not to bones", () => {
    const s = computeStyles({ ...base, opacity: 0.4 });
    expect(s.get("gastro")?.opacity).toBe(0.4);
    expect(s.get("femur")?.opacity).toBe(1);
  });
});
```

- [x] **Step 2: Run to verify it fails**

```bash
npx vitest run tests/appearance.test.ts 2>&1 | grep -E "FAIL|Cannot find|passed|failed" | head -3
```

Expected: FAIL, cannot find module `../src/viewer/appearance`.

- [x] **Step 3: Write `src/viewer/appearance.ts`**

```ts
import type { CatalogPart } from "../data/types";

export type PartStyle = {
  visible: boolean;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
};

export type StyleInput = {
  parts: CatalogPart[];
  mode: "muscles" | "bones" | "fascia";
  selected: string | null;
  hidden: Set<string>;
  isolated: boolean;
  /** 0..1 */
  opacity: number;
  lineColor: string;
  /** Lowercase substrings; a muscle whose name or group contains one is a line component. */
  lineMatches: string[];
};

export const COLORS = {
  selected: "#477965",
  selectedEmissive: "#204d3a",
  bone: "#e0d3b7",
  connective: "#dbd4bb",
  muscle: "#a35b4c",
  none: "#000000",
} as const;

/** Pure mapping from app state to a style for every catalog part. Ported from the Codex viewer's refresh(). */
export function computeStyles(input: StyleInput): Map<string, PartStyle> {
  const out = new Map<string, PartStyle>();
  for (const p of input.parts) {
    const selected = p.id === input.selected;
    const bone = p.type === "bone";
    const connective = p.type === "connective";
    const text = `${p.name} ${p.group ?? ""}`.toLowerCase();
    const chain = input.mode === "fascia" && p.type === "muscle" && input.lineMatches.some((m) => text.includes(m));
    const visible =
      !input.hidden.has(p.id) && (!input.isolated || selected) && (input.mode !== "bones" || bone || selected);
    const color = selected ? COLORS.selected : chain ? input.lineColor : bone ? COLORS.bone : connective ? COLORS.connective : COLORS.muscle;
    const emissive = selected ? COLORS.selectedEmissive : chain ? input.lineColor : COLORS.none;
    const emissiveIntensity = selected ? 0.26 : chain ? 0.08 : 0;
    const opacity =
      selected || chain
        ? 1
        : bone
          ? input.mode === "bones"
            ? input.opacity
            : 1
          : input.mode === "fascia"
            ? 0.1
            : input.opacity;
    out.set(p.id, { visible, color, emissive, emissiveIntensity, opacity });
  }
  return out;
}
```

- [x] **Step 4: Run the appearance tests**

```bash
npx vitest run tests/appearance.test.ts 2>&1 | grep -E "passed|failed|×" | head -8
```

Expected: `Tests  6 passed (6)`.

- [x] **Step 5: Write `src/viewer/engine.ts`**

```ts
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { PartStyle } from "./appearance";
import type { Vec3 } from "../data/types";

export type ViewPreset = "front" | "back" | "side";
export type CameraPose = { position: Vec3; target: Vec3 };

export type EngineHandlers = {
  onProgress(fraction: number | null): void;
  onReady(): void;
  onError(message: string): void;
  onHover(id: string | null, x: number, y: number): void;
  onSelect(id: string): void;
  /** Fires ~300 ms after the user finishes dragging or wheel-zooming. */
  onCameraChange(pose: CameraPose): void;
};

type PartMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

const PRESET_DIRECTIONS: Record<ViewPreset, Vec3> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  side: [1, 0, 0],
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Owns the Three.js scene for the anatomy model. Imperative API; React wraps it in Viewer.tsx.
 * Depends only on Three.js and the DOM. Throws from the constructor if WebGL is unavailable.
 */
export class AnatomyEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private draco = new DRACOLoader();
  private meshes = new Map<string, PartMesh>();
  private descriptionsById = new Map<string, string>();
  private model: THREE.Group | null = null;
  private fitDistance = 3.7;
  private frame = 0;
  private disposed = false;
  private animation: number | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downX = 0;
  private downY = 0;
  private cameraTimer = 0;

  constructor(
    private host: HTMLElement,
    private nodeToId: Map<string, string>,
    private modelCenter: Vec3,
    private handlers: EngineHandlers,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.setAttribute("aria-label", "Anatomical model. Use the structure library for keyboard selection.");
    host.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, this.fitDistance);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 8;
    this.controls.maxPolarAngle = Math.PI * 0.96;
    this.controls.addEventListener("start", this.cancelAnimation);
    this.controls.addEventListener("end", this.scheduleCameraChange);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8173, 2));
    const key = new THREE.DirectionalLight(0xfff4e8, 3.2);
    key.position.set(-3, 4, 5);
    const fill = new THREE.DirectionalLight(0xe0ecf3, 1.5);
    fill.position.set(3, 1, -4);
    const rim = new THREE.DirectionalLight(0xffffff, 2);
    rim.position.set(-2, 2, -3);
    this.scene.add(key, fill, rim);

    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.resize();

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerleave", this.onLeave);
    this.render();
  }

  load(url: string, dracoPath: string): void {
    this.draco.setDecoderPath(dracoPath);
    this.draco.setWorkerLimit(2);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(this.draco);
    loader.load(
      url,
      (gltf) => {
        if (this.disposed) {
          disposeObject(gltf.scene);
          return;
        }
        this.model = gltf.scene;
        this.model.position.set(-this.modelCenter[0], -this.modelCenter[1], -this.modelCenter[2]);
        this.scene.add(this.model);
        const size = new THREE.Box3().setFromObject(this.model).getSize(new THREE.Vector3());
        const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
        this.fitDistance = Math.max(size.y / (2 * Math.tan(halfFov)), size.x / (2 * Math.tan(halfFov) * this.camera.aspect)) * 1.15;
        this.controls.maxDistance = this.fitDistance * 2.2;
        this.model.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const id = this.nodeToId.get(o.name);
          const original = Array.isArray(o.material) ? o.material[0] : o.material;
          const bone = o.userData.type === "bone";
          o.material = new THREE.MeshStandardMaterial({
            color: bone ? 0xe0d3b7 : 0xa35b4c,
            roughness: bone ? 0.75 : 0.58,
            metalness: 0,
            side: THREE.DoubleSide,
          });
          original.dispose();
          if (!id) {
            console.warn("Mesh not in catalog:", o.name);
            return;
          }
          this.meshes.set(id, o as PartMesh);
          if (typeof o.userData.description === "string") this.descriptionsById.set(id, o.userData.description);
        });
        this.handlers.onReady();
      },
      (event) => {
        if (!this.disposed) this.handlers.onProgress(event.total ? event.loaded / event.total : null);
      },
      () => {
        if (!this.disposed) this.handlers.onError("The anatomy model could not load. Check your connection and try again.");
      },
    );
  }

  ids(): string[] {
    return [...this.meshes.keys()];
  }

  /** Wikipedia-derived description embedded in the model, if any. */
  description(id: string): string | undefined {
    return this.descriptionsById.get(id);
  }

  applyAppearance(styles: Map<string, PartStyle>): void {
    for (const [id, mesh] of this.meshes) {
      const s = styles.get(id);
      if (!s) continue;
      mesh.visible = s.visible;
      const mat = mesh.material;
      mat.color.set(s.color);
      mat.emissive.set(s.emissive);
      mat.emissiveIntensity = s.emissiveIntensity;
      mat.opacity = s.opacity;
      mat.transparent = s.opacity < 1;
      mat.depthWrite = s.opacity >= 0.95;
      mat.needsUpdate = true;
    }
  }

  setView(preset: ViewPreset, animate = true): Promise<void> {
    const d = PRESET_DIRECTIONS[preset];
    return this.moveCamera([d[0] * this.fitDistance, d[1] * this.fitDistance, d[2] * this.fitDistance], [0, 0, 0], animate);
  }

  setCamera(pose: CameraPose, animate = false): Promise<void> {
    return this.moveCamera(pose.position, pose.target, animate);
  }

  getCamera(): CameraPose {
    const p = this.camera.position;
    const t = this.controls.target;
    return { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
  }

  /** Frame one part: keep the current viewing direction (or use a preset) and fit its bounding sphere. */
  flyTo(id: string, opts: { padding?: number; preset?: ViewPreset } = {}): Promise<void> {
    const mesh = this.meshes.get(id);
    if (!mesh) return Promise.resolve();
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const distance = THREE.MathUtils.clamp(
      (Math.max(sphere.radius, 0.03) * (opts.padding ?? 2.4)) / Math.sin(halfFov),
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const dir = opts.preset
      ? new THREE.Vector3(...PRESET_DIRECTIONS[opts.preset])
      : this.camera.position.clone().sub(this.controls.target).normalize();
    const pos = sphere.center.clone().add(dir.multiplyScalar(distance));
    return this.moveCamera([pos.x, pos.y, pos.z], [sphere.center.x, sphere.center.y, sphere.center.z], true);
  }

  zoom(factor: number): void {
    this.cancelAnimation();
    const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);
    offset.clampLength(this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.scheduleCameraChange();
  }

  dispose(): void {
    this.disposed = true;
    this.cancelAnimation();
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.cameraTimer);
    this.observer.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerleave", this.onLeave);
    this.controls.dispose();
    this.draco.dispose();
    if (this.model) disposeObject(this.model);
    this.meshes.clear();
    this.renderer.dispose();
    el.remove();
  }

  private moveCamera(position: Vec3, target: Vec3, animate: boolean): Promise<void> {
    this.cancelAnimation();
    if (!animate) {
      this.camera.position.set(...position);
      this.controls.target.set(...target);
      this.controls.update();
      return Promise.resolve();
    }
    const fromP = this.camera.position.clone();
    const fromT = this.controls.target.clone();
    const toP = new THREE.Vector3(...position);
    const toT = new THREE.Vector3(...target);
    const start = performance.now();
    const duration = 900;
    return new Promise((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const k = easeInOut(t);
        this.camera.position.lerpVectors(fromP, toP, k);
        this.controls.target.lerpVectors(fromT, toT, k);
        this.controls.update();
        if (t < 1 && !this.disposed) this.animation = requestAnimationFrame(step);
        else {
          this.animation = null;
          resolve();
        }
      };
      this.animation = requestAnimationFrame(step);
    });
  }

  private cancelAnimation = () => {
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    this.animation = null;
  };

  private scheduleCameraChange = () => {
    window.clearTimeout(this.cameraTimer);
    this.cameraTimer = window.setTimeout(() => {
      if (!this.disposed) this.handlers.onCameraChange(this.getCamera());
    }, 300);
  };

  private resize = () => {
    const w = this.host.clientWidth;
    const h = Math.max(this.host.clientHeight, 1);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private render = () => {
    this.frame = requestAnimationFrame(this.render);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private hit(event: PointerEvent): PartMesh | undefined {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, (-(event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const candidates = [...this.meshes.values()].filter((m) => m.visible && m.material.opacity > 0.2);
    return this.raycaster.intersectObjects(candidates, false)[0]?.object as PartMesh | undefined;
  }

  private idOf(mesh: PartMesh): string | null {
    return this.nodeToId.get(mesh.name) ?? null;
  }

  private onDown = (e: PointerEvent) => {
    this.downX = e.clientX;
    this.downY = e.clientY;
  };

  private onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 5) return;
    const m = this.hit(e);
    const id = m && this.idOf(m);
    if (id) this.handlers.onSelect(id);
  };

  private onMove = (e: PointerEvent) => {
    if (e.buttons) {
      this.handlers.onHover(null, 0, 0);
      return;
    }
    const m = this.hit(e);
    this.renderer.domElement.style.cursor = m ? "pointer" : "grab";
    const rect = this.host.getBoundingClientRect();
    const id = m ? this.idOf(m) : null;
    this.handlers.onHover(id, Math.min(e.clientX - rect.left + 15, rect.width - 200), e.clientY - rect.top - 30);
  };

  private onLeave = () => this.handlers.onHover(null, 0, 0);
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
```

- [x] **Step 6: Write `src/viewer/Viewer.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { AnatomyEngine, type CameraPose, type ViewPreset } from "./engine";
import type { PartStyle } from "./appearance";
import { catalog, nodeToId, partById } from "../data/catalog";

/** A camera instruction from the store. `nonce` changes whenever the app wants the camera moved. */
export type CameraCommand =
  | { kind: "preset"; preset: ViewPreset; nonce: number }
  | { kind: "pose"; pose: CameraPose; nonce: number }
  | { kind: "fly"; id: string; preset?: ViewPreset; nonce: number };

export type ViewerHandle = {
  zoom(factor: number): void;
  description(id: string): string | undefined;
};

type Props = {
  styles: Map<string, PartStyle>;
  cameraCommand: CameraCommand;
  onSelect(id: string): void;
  onReady(ids: string[]): void;
  onCameraChange(pose: CameraPose): void;
  onHandle(handle: ViewerHandle | null): void;
};

const LOADING_MESSAGE = "Loading detailed anatomy…";
const WEBGL_MESSAGE =
  "The 3D view needs WebGL. Try a browser with hardware acceleration enabled. The fascial-line lessons and learning guide remain available.";

function supportsWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Viewer(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const engine = useRef<AnatomyEngine | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const [webgl, setWebgl] = useState(supportsWebGL);
  const [status, setStatus] = useState(webgl ? LOADING_MESSAGE : WEBGL_MESSAGE);
  const [error, setError] = useState(!webgl);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const host = mount.current;
    if (!host || !webgl) return;
    let e: AnatomyEngine;
    try {
      e = new AnatomyEngine(host, nodeToId, catalog.meta.modelCenter, {
        onProgress: (f) => setStatus(f === null ? LOADING_MESSAGE : `Loading anatomy · ${Math.round(f * 100)}%`),
        onReady: () => {
          setStatus("");
          setReady(true);
          latest.current.onReady(e.ids());
        },
        onError: (message) => {
          setError(true);
          setStatus(message);
        },
        onHover: (id, x, y) => setHover(id ? { name: partById(id)?.name ?? id, x, y } : null),
        onSelect: (id) => latest.current.onSelect(id),
        onCameraChange: (pose) => latest.current.onCameraChange(pose),
      });
    } catch {
      queueMicrotask(() => {
        setError(true);
        setStatus(WEBGL_MESSAGE);
      });
      return;
    }
    engine.current = e;
    latest.current.onHandle({ zoom: (f) => e.zoom(f), description: (id) => e.description(id) });
    e.load(`${import.meta.env.BASE_URL}body.glb`, `${import.meta.env.BASE_URL}draco/`);
    return () => {
      latest.current.onHandle(null);
      engine.current = null;
      setReady(false);
      e.dispose();
    };
  }, [retry, webgl]);

  useEffect(() => {
    if (ready) engine.current?.applyAppearance(props.styles);
  }, [ready, props.styles]);

  useEffect(() => {
    const e = engine.current;
    if (!ready || !e) return;
    const c = props.cameraCommand;
    if (c.kind === "preset") void e.setView(c.preset, c.nonce > 0);
    else if (c.kind === "pose") void e.setCamera(c.pose, false);
    else void e.flyTo(c.id, { preset: c.preset });
  }, [ready, props.cameraCommand]);

  return (
    <div className="model-wrap" ref={mount}>
      {status && (
        <div className={"model-status " + (error ? "error" : "")} role="status">
          {!error && <div className="loading-orbit" />}
          <p>{status}</p>
          {error && (
            <button
              className="outline-button"
              onClick={() => {
                const ok = supportsWebGL();
                setWebgl(ok);
                setError(!ok);
                setStatus(ok ? LOADING_MESSAGE : WEBGL_MESSAGE);
                setRetry(retry + 1);
              }}
            >
              Retry 3D view
            </button>
          )}
        </div>
      )}
      {hover && !status && (
        <div className="model-tooltip" style={{ left: hover.x, top: hover.y }}>
          {hover.name}
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 7: Bridge the old App to the new Viewer (temporary, replaced in Task 5)**

Rewrite `src/structures.ts` so the existing UI keeps working against catalog ids:

```ts
import type { CatalogPart } from "./data/types";

/** Shape the phase 1 UI expects. Removed in Task 5 when panels read the catalog directly. */
export type Structure = { id: string; name: string; detail: string; type: string; wiki?: string };

export function toStructure(p: CatalogPart): Structure {
  return { id: p.id, name: p.name, detail: p.group ?? "", type: p.type, wiki: p.wiki };
}

/** Keep the first structure for each case-insensitive name (left/right pairs collapse to one). */
export function uniqueByName(list: Structure[]): Structure[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

In `src/App.tsx`:

```tsx
// imports: replace
//   import AnatomyViewer, { type ViewerAPI, type Structure } from "./viewer";
//   import { uniqueByName } from "./structures";
// with
import { useMemo } from "react";
import Viewer, { type CameraCommand, type ViewerHandle } from "./viewer/Viewer";
import { computeStyles } from "./viewer/appearance";
import { parts } from "./data/catalog";
import { toStructure, uniqueByName, type Structure } from "./structures";
```

Replace the `api` ref and add camera command state:

```tsx
  const handle = useRef<ViewerHandle | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({ kind: "preset", preset: "front", nonce: 0 });
  const [cameraNonce, setCameraNonce] = useState(0);
  const goView = (v: string) => {
    const preset = v === "back" ? "back" : v === "side" ? "side" : "front";
    const nonce = cameraNonce + 1;
    setCameraNonce(nonce);
    setCameraCommand({ kind: "preset", preset, nonce });
  };
```

Then, throughout `App.tsx`, replace every `api.current?.view(x)` with `goView(x)` and every `api.current?.zoom(f)` with `handle.current?.zoom(f)`. Replace the `<AnatomyViewer …/>` element with:

```tsx
          <Viewer
            styles={styles}
            cameraCommand={cameraCommand}
            onSelect={(id) => {
              const p = parts.find((x) => x.id === id);
              if (p) choose(toStructure(p));
            }}
            onReady={() => setStructures(parts.map(toStructure).sort((a, b) => a.name.localeCompare(b.name)))}
            onCameraChange={() => {}}
            onHandle={(h) => {
              handle.current = h;
            }}
          />
```

and compute `styles` above the return:

```tsx
  const styles = useMemo(
    () =>
      computeStyles({
        parts,
        mode: mode as "muscles" | "bones" | "fascia",
        selected: selected?.id ?? null,
        hidden: new Set(hidden),
        isolated,
        opacity: opacity / 100,
        lineColor: activeLine.color,
        lineMatches: activeLine.matches,
      }),
    [mode, selected, hidden, isolated, opacity, activeLine],
  );
```

Delete `src/viewer.tsx`.

- [x] **Step 8: Lint, typecheck, test, build, and check in Chrome**

```bash
npm run lint 2>&1 | grep -E "error|✖"; echo "LINT EXIT: ${PIPESTATUS[0]}"; npm run typecheck 2>&1 | grep -i error; npm test 2>&1 | grep -E "Test Files|Tests |FAIL"; npm run build 2>&1 | tail -1
```

Expected: clean. Then `npm run dev -- --port 3131` and in Chrome at `http://localhost:3131/form-anatomy/`: the model renders centered (the catalog's `modelCenter` positions it), clicking the chest selects a pectoralis part, the Posterior button animates the camera around the body (not a jump), fascia mode highlights the superficial back line, and the console shows no "Mesh not in catalog" warnings.

- [x] **Step 9: Commit**

```bash
git add -A && git commit -q -m "Extract the Three.js viewer into an AnatomyEngine class with a pure appearance function

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 4: Store, URL codec, URL sync (pure modules, tested; wired into the UI in Task 5)

**Files:**
- Create: `src/data/lines.ts`, `src/data/lessons.ts`, `src/data/questions.ts`, `src/state/store.tsx`, `src/state/urlCodec.ts`, `src/state/useUrlSync.ts`, `tests/urlCodec.test.ts`, `tests/store.test.ts`
- Modify: `tests/data.test.ts` (import from the new data files, expect line ids)
- Delete: `src/study-data.ts` (after moving its content)

**Interfaces:**
- Produces: `lines` (with `id: LineId`), `lineById`, `LineId`, `FascialLine` from `src/data/lines.ts`; `lessons` from `lessons.ts`; `questions` from `questions.ts`; `AppState`, `Action`, `initialState`, `reducer`, `StoreProvider`, `useStore()` from `store.tsx`; `encodeState(state)`, `decodeSearch(search)` from `urlCodec.ts`; `useUrlSync(state, dispatch)`.

- [x] **Step 1: Split `src/study-data.ts` into three data files**

`src/data/lines.ts`: copy the `lines` array from `src/study-data.ts` verbatim and add an `id` to each entry in order: `"sbl"`, `"sfl"`, `"ll"`, `"bfl"`, `"ffl"`. Prepend/append:

```ts
export type LineId = "sbl" | "sfl" | "ll" | "bfl" | "ffl";

export const lines = [
  {
    id: "sbl" as const,
    name: "Superficial back line",
    // …rest of the entry unchanged…
  },
  // sfl, ll, bfl, ffl likewise
];
export type FascialLine = (typeof lines)[number];
export const LINE_IDS = lines.map((l) => l.id) as LineId[];
export function lineById(id: string): FascialLine | undefined {
  return lines.find((l) => l.id === id);
}
```

`src/data/lessons.ts`: the `lessons` array verbatim, exported. `src/data/questions.ts`: the `questions` array verbatim, exported. Delete `src/study-data.ts`. Update `tests/data.test.ts` imports:

```ts
import { lessons } from "../src/data/lessons";
import { LINE_IDS, lines } from "../src/data/lines";
import { questions } from "../src/data/questions";
```

and add inside the "fascial line data" describe:

```ts
  test("line ids are unique short slugs", () => {
    expect(LINE_IDS).toEqual(["sbl", "sfl", "ll", "bfl", "ffl"]);
  });
```

Also update `src/App.tsx` imports (`./study-data` -> the three files) so it still compiles; `line` state stays an index for now.

- [x] **Step 2: Write the failing store test**

`tests/store.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { initialState, reducer } from "../src/state/store";

describe("store reducer", () => {
  test("selecting a part clears isolation and unhides it", () => {
    let s = reducer(initialState, { type: "hide", id: "femur-l" });
    expect(s.hidden).toEqual(["femur-l"]);
    s = reducer(s, { type: "toggleIsolate" });
    s = reducer(s, { type: "select", id: "femur-l" });
    expect(s.selected).toBe("femur-l");
    expect(s.hidden).toEqual([]);
    expect(s.isolated).toBe(false);
  });

  test("changing mode resets selection and hidden parts; fascia mode adopts the line view", () => {
    let s = reducer(initialState, { type: "select", id: "femur-l" });
    s = reducer(s, { type: "setMode", mode: "fascia" });
    expect(s.selected).toBeNull();
    expect(s.view).toBe("back");
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("setView bumps the camera nonce and clears a custom pose", () => {
    let s = reducer(initialState, { type: "cameraMoved", pose: { position: [1, 2, 3], target: [0, 0, 0] } });
    expect(s.view).toBe("custom");
    expect(s.camera).not.toBeNull();
    s = reducer(s, { type: "setView", view: "side" });
    expect(s.view).toBe("side");
    expect(s.camera).toBeNull();
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("setLine switches line, clears selection and moves to the line view", () => {
    const s = reducer(initialState, { type: "setLine", line: "ffl" });
    expect(s.line).toBe("ffl");
    expect(s.view).toBe("front");
  });

  test("hydrate merges a partial state and bumps the nonce", () => {
    const s = reducer(initialState, { type: "hydrate", state: { mode: "bones", selected: "femur-l", filters: { ...initialState.filters, region: "hip-thigh" } } });
    expect(s.mode).toBe("bones");
    expect(s.selected).toBe("femur-l");
    expect(s.filters.region).toBe("hip-thigh");
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("reset restores view and hidden state but keeps mode and filters", () => {
    let s = reducer(initialState, { type: "setMode", mode: "bones" });
    s = reducer(s, { type: "hide", id: "femur-l" });
    s = reducer(s, { type: "setOpacity", opacity: 40 });
    s = reducer(s, { type: "reset" });
    expect(s.mode).toBe("bones");
    expect(s.hidden).toEqual([]);
    expect(s.opacity).toBe(100);
    expect(s.view).toBe("front");
  });
});
```

- [x] **Step 3: Run to verify it fails**

```bash
npx vitest run tests/store.test.ts 2>&1 | grep -E "FAIL|Cannot find|passed|failed" | head -3
```

Expected: FAIL, cannot find module `../src/state/store`.

- [x] **Step 4: Write `src/state/store.tsx`**

```tsx
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { CameraPose, ViewPreset } from "../viewer/engine";
import type { Region } from "../data/types";
import { lineById, type LineId } from "../data/lines";

export type Mode = "muscles" | "bones" | "fascia";
export type ViewState = ViewPreset | "custom";
export type LayerFilter = "all" | "superficial" | "deep";
export type SideFilter = "both" | "left" | "right";
export type RegionFilter = Region | "all";
export type ModalId = "about" | "guide" | "quiz" | null;

export type Filters = { region: RegionFilter; layer: LayerFilter; side: SideFilter; search: string };

export type AppState = {
  mode: Mode;
  selected: string | null;
  hidden: string[];
  isolated: boolean;
  /** 10..100 */
  opacity: number;
  view: ViewState;
  camera: CameraPose | null;
  /** Increments whenever the app (not the user) wants the camera moved. */
  cameraNonce: number;
  line: LineId;
  filters: Filters;
  modal: ModalId;
};

export const initialState: AppState = {
  mode: "muscles",
  selected: null,
  hidden: [],
  isolated: false,
  opacity: 100,
  view: "front",
  camera: null,
  cameraNonce: 0,
  line: "sbl",
  filters: { region: "all", layer: "all", side: "both", search: "" },
  modal: null,
};

export type Action =
  | { type: "setMode"; mode: Mode }
  | { type: "select"; id: string }
  | { type: "clearSelection" }
  | { type: "hide"; id: string }
  | { type: "restoreAll" }
  | { type: "toggleIsolate" }
  | { type: "setOpacity"; opacity: number }
  | { type: "setView"; view: ViewPreset }
  | { type: "cameraMoved"; pose: CameraPose }
  | { type: "setLine"; line: LineId }
  | { type: "setFilters"; filters: Partial<Filters> }
  | { type: "setModal"; modal: ModalId }
  | { type: "reset" }
  | { type: "hydrate"; state: Partial<AppState> };

function lineView(line: LineId): ViewPreset {
  return (lineById(line)?.view ?? "front") as ViewPreset;
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "setMode": {
      const next = { ...s, mode: a.mode, selected: null, isolated: false, hidden: [] };
      return a.mode === "fascia" ? { ...next, view: lineView(s.line), camera: null, cameraNonce: s.cameraNonce + 1 } : next;
    }
    case "select":
      return { ...s, selected: a.id, isolated: false, hidden: s.hidden.filter((h) => h !== a.id) };
    case "clearSelection":
      return { ...s, selected: null, isolated: false };
    case "hide":
      return { ...s, hidden: s.hidden.includes(a.id) ? s.hidden : [...s.hidden, a.id], selected: null, isolated: false };
    case "restoreAll":
      return { ...s, hidden: [], isolated: false };
    case "toggleIsolate":
      return { ...s, isolated: !s.isolated };
    case "setOpacity":
      return { ...s, opacity: Math.min(100, Math.max(10, Math.round(a.opacity))) };
    case "setView":
      return { ...s, view: a.view, camera: null, cameraNonce: s.cameraNonce + 1 };
    case "cameraMoved":
      return { ...s, view: "custom", camera: a.pose };
    case "setLine":
      return { ...s, line: a.line, selected: null, view: lineView(a.line), camera: null, cameraNonce: s.cameraNonce + 1 };
    case "setFilters":
      return { ...s, filters: { ...s.filters, ...a.filters } };
    case "setModal":
      return { ...s, modal: a.modal };
    case "reset":
      return { ...s, hidden: [], isolated: false, selected: null, opacity: 100, view: "front", camera: null, cameraNonce: s.cameraNonce + 1 };
    case "hydrate":
      return { ...s, ...a.state, cameraNonce: s.cameraNonce + 1 };
  }
}

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children, initial = initialState }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
```

- [x] **Step 5: Run the store test**

```bash
npx vitest run tests/store.test.ts 2>&1 | grep -E "passed|failed|×" | head -8
```

Expected: `Tests  6 passed (6)`.

- [x] **Step 6: Write the failing URL codec test**

`tests/urlCodec.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { decodeSearch, encodeState } from "../src/state/urlCodec";
import { initialState, type AppState } from "../src/state/store";

describe("encodeState", () => {
  test("returns an empty string for the default state", () => {
    expect(encodeState(initialState)).toBe("");
  });

  test("writes only non-default fields in a stable order", () => {
    const s: AppState = {
      ...initialState,
      mode: "fascia",
      selected: "lateral-head-of-gastrocnemius-l",
      view: "back",
      line: "bfl",
      hidden: ["soleus-muscle-l"],
      filters: { region: "leg-foot", layer: "deep", side: "left", search: "" },
    };
    expect(encodeState(s)).toBe("?m=fascia&s=lateral-head-of-gastrocnemius-l&v=back&l=bfl&h=soleus-muscle-l&r=leg-foot&d=deep&side=left");
  });

  test("writes a custom camera pose with two decimals", () => {
    const s: AppState = { ...initialState, view: "custom", camera: { position: [0.123, 0.456, 2.789], target: [0, 0.2, 0.004] } };
    expect(encodeState(s)).toBe("?c=0.12,0.46,2.79,0,0.2,0");
  });
});

describe("decodeSearch", () => {
  test("round-trips an encoded state", () => {
    const s: AppState = {
      ...initialState,
      mode: "bones",
      selected: "femur-r",
      view: "side",
      line: "ll",
      hidden: ["femur-l"],
      filters: { region: "hip-thigh", layer: "all", side: "right", search: "" },
    };
    const decoded = decodeSearch(encodeState(s));
    expect(decoded).toEqual({
      mode: "bones",
      selected: "femur-r",
      view: "side",
      line: "ll",
      hidden: ["femur-l"],
      filters: { region: "hip-thigh", layer: "all", side: "right", search: "" },
    });
  });

  test("restores a camera pose as a custom view", () => {
    expect(decodeSearch("?c=0.12,0.46,2.79,0,0.2,0")).toEqual({
      view: "custom",
      camera: { position: [0.12, 0.46, 2.79], target: [0, 0.2, 0] },
    });
  });

  test("ignores unknown and invalid values individually", () => {
    expect(decodeSearch("?m=organs&s=not-a-part&v=top&l=zzz&h=femur-l,ghost&r=moon&d=middle&side=up&c=1,2,x")).toEqual({
      hidden: ["femur-l"],
    });
    expect(decodeSearch("")).toEqual({});
    expect(decodeSearch("?junk")).toEqual({});
  });

  test("caps hidden ids at 20", () => {
    const ids = Array.from({ length: 30 }, () => "femur-l").join(",");
    expect(decodeSearch(`?h=${ids}`).hidden?.length).toBe(20);
  });
});
```

- [x] **Step 7: Run to verify it fails**

```bash
npx vitest run tests/urlCodec.test.ts 2>&1 | grep -E "FAIL|Cannot find|passed|failed" | head -3
```

Expected: FAIL, cannot find module `../src/state/urlCodec`.

- [x] **Step 8: Write `src/state/urlCodec.ts`**

```ts
import { isPartId } from "../data/catalog";
import { LINE_IDS, type LineId } from "../data/lines";
import { REGION_ORDER } from "../data/regions";
import type { Region } from "../data/types";
import { initialState, type AppState, type LayerFilter, type Mode, type SideFilter } from "./store";
import type { CameraPose, ViewPreset } from "../viewer/engine";

const MODES: Mode[] = ["muscles", "bones", "fascia"];
const PRESETS: ViewPreset[] = ["front", "back", "side"];
const LAYERS: LayerFilter[] = ["all", "superficial", "deep"];
const SIDES: SideFilter[] = ["both", "left", "right"];
const MAX_HIDDEN = 20;

const two = (n: number) => String(Math.round(n * 100) / 100);

/** Query string for the shareable parts of state; "" when everything is default. */
export function encodeState(s: AppState): string {
  const q = new URLSearchParams();
  if (s.mode !== initialState.mode) q.set("m", s.mode);
  if (s.selected && isPartId(s.selected)) q.set("s", s.selected);
  if (s.view === "custom") {
    if (s.camera) q.set("c", [...s.camera.position, ...s.camera.target].map(two).join(","));
  } else if (s.view !== initialState.view) q.set("v", s.view);
  if (s.line !== initialState.line) q.set("l", s.line);
  const hidden = s.hidden.filter(isPartId).slice(0, MAX_HIDDEN);
  if (hidden.length) q.set("h", hidden.join(","));
  if (s.filters.region !== "all") q.set("r", s.filters.region);
  if (s.filters.layer !== "all") q.set("d", s.filters.layer);
  if (s.filters.side !== "both") q.set("side", s.filters.side);
  const str = q.toString();
  return str ? `?${str}` : "";
}

/** Partial state from a query string. Every value is validated on its own; bad ones are dropped. */
export function decodeSearch(search: string): Partial<AppState> {
  const q = new URLSearchParams(search);
  const out: Partial<AppState> = {};
  const m = q.get("m");
  if (m && (MODES as string[]).includes(m)) out.mode = m as Mode;
  const s = q.get("s");
  if (s && isPartId(s)) out.selected = s;
  const c = q.get("c");
  const v = q.get("v");
  if (c) {
    const nums = c.split(",").map(Number);
    if (nums.length === 6 && nums.every(Number.isFinite)) {
      out.view = "custom";
      out.camera = { position: [nums[0], nums[1], nums[2]], target: [nums[3], nums[4], nums[5]] } as CameraPose;
    }
  } else if (v && (PRESETS as string[]).includes(v)) out.view = v as ViewPreset;
  const l = q.get("l");
  if (l && (LINE_IDS as string[]).includes(l)) out.line = l as LineId;
  const h = q.get("h");
  if (h) {
    const ids = h.split(",").filter(isPartId).slice(0, MAX_HIDDEN);
    if (ids.length) out.hidden = ids;
  }
  const r = q.get("r");
  const d = q.get("d");
  const side = q.get("side");
  const region = r && (REGION_ORDER as string[]).includes(r) ? (r as Region) : null;
  const layer = d && (LAYERS as string[]).includes(d) ? (d as LayerFilter) : null;
  const sideF = side && (SIDES as string[]).includes(side) ? (side as SideFilter) : null;
  if (region || layer || sideF)
    out.filters = {
      ...initialState.filters,
      ...(region ? { region } : {}),
      ...(layer ? { layer } : {}),
      ...(sideF ? { side: sideF } : {}),
    };
  return out;
}
```

- [x] **Step 9: Run the codec tests**

```bash
npx vitest run tests/urlCodec.test.ts 2>&1 | grep -E "passed|failed|×|Expected|Received" | head -12
```

Expected: `Tests  7 passed (7)`. The catalog ids used in the test (`lateral-head-of-gastrocnemius-l`, `soleus-muscle-l`, `femur-r`, `femur-l`) must exist; check with `node -e 'const c=require("./src/data/catalog.json");console.log(["lateral-head-of-gastrocnemius-l","soleus-muscle-l","femur-r","femur-l"].map(i=>i+" "+c.parts.some(p=>p.id===i)))'` and adjust the ids in the test to real ones if the slugs differ.

- [x] **Step 10: Write `src/state/useUrlSync.ts`**

```ts
import { useEffect, useRef, type Dispatch } from "react";
import type { Action, AppState } from "./store";
import { decodeSearch, encodeState } from "./urlCodec";

/** Hydrates the store from the URL once, then mirrors shareable state into the query string (debounced). */
export function useUrlSync(state: AppState, dispatch: Dispatch<Action>) {
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const partial = decodeSearch(window.location.search);
    if (Object.keys(partial).length) dispatch({ type: "hydrate", state: partial });
  }, [dispatch]);

  const encoded = encodeState(state);
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = window.setTimeout(() => {
      const next = window.location.pathname + encoded + window.location.hash;
      if (next !== window.location.pathname + window.location.search + window.location.hash)
        window.history.replaceState(null, "", next);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [encoded]);
}
```

- [x] **Step 11: Full check and commit**

```bash
npm run lint 2>&1 | grep -E "error|✖"; echo "LINT EXIT: ${PIPESTATUS[0]}"; npm run typecheck 2>&1 | grep -i error; npm test 2>&1 | grep -E "Test Files|Tests |FAIL"; npm run build 2>&1 | tail -1
git add -A && git commit -q -m "Add the app store, URL codec and URL sync hook

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected: all green (the store and codec are not wired into the UI yet; App still compiles against the split data files).

---
### Task 5: Feature panels on the store: grouped library with filters, facts-rich detail, deep links

**Files:**
- Create: `src/data/groups.ts`, `tests/groups.test.ts`, `src/features/library/LibraryPanel.tsx`, `src/features/detail/DetailPanel.tsx`, `src/features/detail/StartPanel.tsx`, `src/features/fascia/FasciaPanel.tsx`, `src/features/guide/Modals.tsx`, `src/features/shared/CopyLink.tsx`, `src/features/shared/Toast.tsx`
- Modify: `src/App.tsx` (rewritten as a shell), `src/main.tsx`, `src/viewer/Viewer.tsx` (nonce guard), `src/styles/globals.css` (moved + additions)
- Delete: `src/structures.ts`, `tests/structures.test.ts`

**Interfaces:**
- Consumes: store (`useStore`, `Action`), `useUrlSync`, `computeStyles`, `Viewer`, catalog helpers, `facts`, `lines`, `lessons`, `questions`.
- Produces: `groupParts(list)`, `filterParts(all, mode, filters)`, `PartGroup` from `groups.ts`; the panels as default exports.

- [x] **Step 1: Write the failing groups test**

`tests/groups.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { filterParts, groupParts } from "../src/data/groups";
import { parts } from "../src/data/catalog";
import { initialState } from "../src/state/store";

describe("groupParts", () => {
  test("collapses left and right copies into one group sorted by name", () => {
    const groups = groupParts(parts.filter((p) => p.type === "muscle"));
    const gastro = groups.find((g) => g.key === "lateral-head-of-gastrocnemius");
    expect(gastro?.bilateral).toBe(true);
    expect(gastro?.parts.map((p) => p.side)).toEqual(["left", "right"]);
    expect(groups.length).toBeLessThan(parts.filter((p) => p.type === "muscle").length);
    const names = groups.map((g) => g.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("filterParts", () => {
  const f = initialState.filters;
  test("mode selects the part type", () => {
    expect(filterParts(parts, "muscles", f).every((p) => p.type === "muscle")).toBe(true);
    expect(filterParts(parts, "bones", f).every((p) => p.type === "bone")).toBe(true);
    expect(filterParts(parts, "fascia", f).every((p) => p.type === "muscle")).toBe(true);
  });
  test("region, layer and side filters narrow the list; midline parts survive a side filter", () => {
    const hip = filterParts(parts, "muscles", { ...f, region: "hip-thigh" });
    expect(hip.length).toBeGreaterThan(10);
    expect(hip.every((p) => p.region === "hip-thigh")).toBe(true);
    const deep = filterParts(parts, "muscles", { ...f, layer: "deep" });
    expect(deep.every((p) => p.layer === "deep")).toBe(true);
    const left = filterParts(parts, "bones", { ...f, side: "left" });
    expect(left.some((p) => p.side === "midline")).toBe(true);
    expect(left.some((p) => p.side === "right")).toBe(false);
  });
  test("search matches name or group text case-insensitively", () => {
    const hits = filterParts(parts, "muscles", { ...f, search: "GASTROC" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((p) => /gastrocnemius/i.test(`${p.name} ${p.group ?? ""}`))).toBe(true);
  });
  test("layer filter is ignored in bones mode", () => {
    const bones = filterParts(parts, "bones", { ...f, layer: "deep" });
    expect(bones.length).toBeGreaterThan(100);
  });
});
```

- [x] **Step 2: Run to verify it fails, then write `src/data/groups.ts`**

```bash
npx vitest run tests/groups.test.ts 2>&1 | grep -E "FAIL|Cannot find" | head -2
```

```ts
import { partMatches } from "./catalog";
import type { CatalogPart, Layer, PartType, Region } from "./types";
import type { Filters, Mode } from "../state/store";

export type PartGroup = {
  key: string;
  name: string;
  type: PartType;
  region: Region;
  layer: Layer;
  /** Ordered left, right, midline. */
  parts: CatalogPart[];
  bilateral: boolean;
};

const SIDE_ORDER = { left: 0, right: 1, midline: 2 } as const;

/** One entry per side-agnostic key, sorted by display name. */
export function groupParts(list: CatalogPart[]): PartGroup[] {
  const byKey = new Map<string, PartGroup>();
  for (const p of list) {
    const g = byKey.get(p.key);
    if (g) g.parts.push(p);
    else byKey.set(p.key, { key: p.key, name: p.name, type: p.type, region: p.region, layer: p.layer, parts: [p], bilateral: false });
  }
  const groups = [...byKey.values()];
  for (const g of groups) {
    g.parts.sort((a, b) => SIDE_ORDER[a.side] - SIDE_ORDER[b.side]);
    g.bilateral = g.parts.some((p) => p.side === "left") && g.parts.some((p) => p.side === "right");
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

/** Parts visible in the library for a mode and filter set. */
export function filterParts(all: CatalogPart[], mode: Mode, filters: Filters): CatalogPart[] {
  const type: PartType = mode === "bones" ? "bone" : "muscle";
  const needle = filters.search.trim();
  return all.filter(
    (p) =>
      p.type === type &&
      (filters.region === "all" || p.region === filters.region) &&
      (mode === "bones" || filters.layer === "all" || p.layer === filters.layer) &&
      (filters.side === "both" || p.side === "midline" || p.side === filters.side) &&
      (!needle || partMatches(p, needle)),
  );
}
```

```bash
npx vitest run tests/groups.test.ts 2>&1 | grep -E "passed|failed|×" | head -6
```

Expected: `Tests  5 passed (5)`.

- [x] **Step 3: Shared pieces: `CopyLink.tsx` and `Toast.tsx`**

`src/features/shared/CopyLink.tsx`:

```tsx
import { Link2 } from "lucide-react";

type Props = { onCopied: (message: string) => void; label?: string };

/** Copies the current URL (which mirrors app state) so a teacher can link to this exact view. */
export default function CopyLink({ onCopied, label = "Copy link" }: Props) {
  return (
    <button
      className="text-button copy-link"
      onClick={async () => {
        const url = window.location.href;
        try {
          await navigator.clipboard.writeText(url);
          onCopied("Link copied. It opens this exact view.");
        } catch {
          onCopied(url);
        }
      }}
    >
      <Link2 size={15} /> {label}
    </button>
  );
}
```

`src/features/shared/Toast.tsx`:

```tsx
type Props = { message: string | null };

export default function Toast({ message }: Props) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
```

- [x] **Step 4: `src/features/library/LibraryPanel.tsx`**

```tsx
import { Activity, Bone, ChevronRight, CircleHelp, ArrowRight, Eye, Layers, Network, Search, X } from "lucide-react";
import { useMemo } from "react";
import { parts, partForSide, partById } from "../../data/catalog";
import { filterParts, groupParts } from "../../data/groups";
import { lines } from "../../data/lines";
import { REGION_LABELS, REGION_ORDER } from "../../data/regions";
import { useStore, type LayerFilter, type SideFilter } from "../../state/store";

type Props = { mobileOpen: boolean; onCloseMobile: () => void };

export default function LibraryPanel({ mobileOpen, onCloseMobile }: Props) {
  const { state, dispatch } = useStore();
  const { mode, filters, selected, hidden, isolated, opacity, line } = state;
  const selectedPart = selected ? partById(selected) : undefined;
  const groups = useMemo(() => groupParts(filterParts(parts, mode, filters)), [mode, filters]);
  const showLines = mode === "fascia" && !filters.search;

  return (
    <aside className={`left-panel ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="panel-heading">
        <Layers size={17} />
        <h2>Explore the body</h2>
        <button className="mobile-close icon-button" onClick={onCloseMobile} aria-label="Close layers">
          <X size={18} />
        </button>
      </div>
      <div className="system-switch" role="group" aria-label="Anatomy system">
        {[
          { id: "muscles", label: "Muscles", icon: Activity },
          { id: "bones", label: "Bones", icon: Bone },
          { id: "fascia", label: "Fascia", icon: Network },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={mode === id}
            className={mode === id ? "active" : ""}
            onClick={() => dispatch({ type: "setMode", mode: id as typeof mode })}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </div>
      <label className="search-box">
        <Search size={16} />
        <input
          aria-label="Search anatomical structures"
          placeholder="Find a structure…"
          value={filters.search}
          onChange={(e) => dispatch({ type: "setFilters", filters: { search: e.target.value } })}
        />
        {filters.search && (
          <button onClick={() => dispatch({ type: "setFilters", filters: { search: "" } })} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </label>

      {showLines ? (
        <>
          <div className="section-label">
            MYOFASCIAL LINES <span>{lines.length}</span>
          </div>
          <div className="line-list">
            {lines.map((l) => (
              <button
                className={`line-item ${line === l.id ? "selected" : ""}`}
                key={l.id}
                onClick={() => dispatch({ type: "setLine", line: l.id })}
              >
                <span className="line-dot" style={{ background: l.color }} />
                <span>
                  {l.name}
                  <small>{l.subtitle}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
          <div className="context-note">
            <Network size={18} />
            <p>
              A connected perspective
              <span>Follow anatomical relationships across regions of the body.</span>
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="filter-chips" role="group" aria-label="Body region">
            <button className={filters.region === "all" ? "active" : ""} onClick={() => dispatch({ type: "setFilters", filters: { region: "all" } })}>
              All regions
            </button>
            {REGION_ORDER.map((r) => (
              <button key={r} className={filters.region === r ? "active" : ""} onClick={() => dispatch({ type: "setFilters", filters: { region: r } })}>
                {REGION_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="filter-rows">
            {mode !== "bones" && (
              <div className="segmented" role="group" aria-label="Layer (approximate)">
                {(["all", "superficial", "deep"] as LayerFilter[]).map((l) => (
                  <button key={l} aria-pressed={filters.layer === l} className={filters.layer === l ? "active" : ""} onClick={() => dispatch({ type: "setFilters", filters: { layer: l } })}>
                    {l === "all" ? "All layers" : l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <div className="segmented" role="group" aria-label="Body side">
              {(["both", "left", "right"] as SideFilter[]).map((s) => (
                <button key={s} aria-pressed={filters.side === s} className={filters.side === s ? "active" : ""} onClick={() => dispatch({ type: "setFilters", filters: { side: s } })}>
                  {s === "both" ? "Both sides" : s === "left" ? "Left" : "Right"}
                </button>
              ))}
            </div>
          </div>
          <div className="section-label">
            {filters.search ? "SEARCH RESULTS" : "STRUCTURE LIBRARY"} <span>{groups.length}</span>
          </div>
          <div className="structure-list">
            {!groups.length ? (
              <p className="subtle">No matches. Try femur, deltoid, or gastrocnemius.</p>
            ) : (
              groups.map((g) => {
                const isSelected = selectedPart?.key === g.key;
                return (
                  <div className={`group-row ${isSelected ? "selected" : ""}`} key={g.key}>
                    <button
                      className="group-name"
                      onClick={() => {
                        const p = partForSide(g.key, filters.side);
                        if (p) dispatch({ type: "select", id: p.id });
                      }}
                    >
                      <span>{g.name}</span>
                      {!g.bilateral && <ChevronRight size={13} />}
                    </button>
                    {g.bilateral && (
                      <span className="side-toggle" aria-label={`${g.name} side`}>
                        {g.parts
                          .filter((p) => p.side !== "midline")
                          .map((p) => (
                            <button
                              key={p.id}
                              aria-pressed={selected === p.id}
                              className={selected === p.id ? "active" : ""}
                              onClick={() => dispatch({ type: "select", id: p.id })}
                              title={p.side === "left" ? "Left side" : "Right side"}
                            >
                              {p.side === "left" ? "L" : "R"}
                            </button>
                          ))}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <div className="layer-settings">
        <div className="section-label">LAYER CONTROLS</div>
        <label className="opacity-label">
          {mode === "bones" ? "Bone" : "Muscle"} opacity <span>{opacity}%</span>
          <input type="range" min="10" max="100" value={opacity} onChange={(e) => dispatch({ type: "setOpacity", opacity: +e.target.value })} />
        </label>
        <button className="text-button" disabled={!hidden.length && !isolated} onClick={() => dispatch({ type: "restoreAll" })}>
          <Eye size={15} /> Restore hidden structures {hidden.length > 0 && `(${hidden.length})`}
        </button>
      </div>
      <button className="help-link" onClick={() => dispatch({ type: "setModal", modal: "guide" })}>
        <CircleHelp size={16} /> A little help exploring <ArrowRight size={14} />
      </button>
    </aside>
  );
}
```

- [x] **Step 5: `src/features/detail/DetailPanel.tsx` and `StartPanel.tsx`**

`DetailPanel.tsx`:

```tsx
import { ArrowRight, ChevronDown, EyeOff, Focus, X } from "lucide-react";
import { useState } from "react";
import { partById } from "../../data/catalog";
import { factsForWiki } from "../../data/facts";
import { lessons } from "../../data/lessons";
import { lines } from "../../data/lines";
import { REGION_LABELS } from "../../data/regions";
import { useStore } from "../../state/store";
import CopyLink from "../shared/CopyLink";

type Props = { describe: (id: string) => string | undefined; onToast: (m: string) => void };

const OPENSTAX = "https://openstax.org/books/anatomy-and-physiology-2e/pages/11-introduction";

export default function DetailPanel({ describe, onToast }: Props) {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<"overview" | "connections">("overview");
  const part = state.selected ? partById(state.selected) : undefined;
  if (!part) return null;
  const text = `${part.name} ${part.group ?? ""}`.toLowerCase();
  const lesson = lessons.find((l) => text.includes(l.match));
  const facts = factsForWiki(part.wiki);
  const description = describe(part.id)?.replace(/\s*https?:\/\/\S+\s*$/, "").trim();
  const related = lines.filter((l) => l.matches.some((m) => text.includes(m)));
  const sideLabel = part.side === "left" ? "Left" : part.side === "right" ? "Right" : "Midline";

  const factRows: [string, string | undefined][] = [
    ["ORIGIN", facts?.origin],
    ["INSERTION", facts?.insertion],
    ["ACTION", facts?.action],
    ["INNERVATION", facts?.nerve],
    ["ANTAGONIST", facts?.antagonist],
    ["ARTICULATIONS", facts?.articulations],
  ];
  const hasFacts = factRows.some(([, v]) => v);

  return (
    <>
      <div className="detail-kicker">
        <span className="tiny-tag">
          {part.type} · {sideLabel} · {REGION_LABELS[part.region]}
        </span>
        <button className="icon-button" aria-label="Clear selection" onClick={() => dispatch({ type: "clearSelection" })}>
          <X size={16} />
        </button>
      </div>
      <h2 className="detail-title">{part.name}</h2>
      <p className="latin">{part.group ?? (part.type === "muscle" ? `${part.layer} layer (approximate)` : "")}</p>
      <div className="detail-actions">
        <button className="outline-button" onClick={() => dispatch({ type: "toggleIsolate" })}>
          <Focus size={15} />
          {state.isolated ? "Show all" : "Isolate"}
        </button>
        <button className="outline-button" onClick={() => dispatch({ type: "hide", id: part.id })}>
          <EyeOff size={15} /> Hide
        </button>
      </div>
      <CopyLink onCopied={onToast} />
      <div className="detail-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button className={tab === "connections" ? "active" : ""} onClick={() => setTab("connections")}>
          Connections
        </button>
      </div>
      {tab === "overview" ? (
        <>
          <p className="detail-copy">
            {lesson?.description ||
              `Explore the ${part.name.toLowerCase()} in its anatomical position. Isolate this structure to inspect its shape, or hide it to reveal the structures beneath it.`}
          </p>
          {lesson && (
            <div className="facts">
              <div>
                <span>ATTACHMENTS</span>
                <p>{lesson.attachments}</p>
              </div>
              <div>
                <span>PRIMARY ACTION</span>
                <p>{lesson.action}</p>
              </div>
              <div>
                <span>TRY OBSERVING</span>
                <p>{lesson.observe}</p>
              </div>
            </div>
          )}
          {hasFacts && (
            <div className="facts wiki-facts">
              {factRows.map(([label, value]) => value && (
                <div key={label}>
                  <span>{label}</span>
                  <p>{value}</p>
                </div>
              ))}
            </div>
          )}
          {description && (
            <details className="description-expander">
              <summary>
                About this structure <ChevronDown size={14} />
              </summary>
              <p>{description.length > 1200 ? description.slice(0, 1200) + "…" : description}</p>
            </details>
          )}
          {(hasFacts || description) && facts?.url && (
            <p className="attribution">
              Text adapted from{" "}
              <a href={facts?.url ?? part.wiki} target="_blank" rel="noreferrer">
                Wikipedia
              </a>
              , CC BY-SA 4.0.
            </p>
          )}
          {!facts?.url && description && part.wiki && (
            <p className="attribution">
              Text adapted from{" "}
              <a href={part.wiki} target="_blank" rel="noreferrer">
                Wikipedia
              </a>
              , CC BY-SA 4.0.
            </p>
          )}
          <a className="source-link" href={part.wiki || OPENSTAX} target="_blank" rel="noreferrer">
            Read anatomy reference <ArrowRight size={14} />
          </a>
        </>
      ) : (
        <>
          <p className="detail-copy">
            {lesson?.connection ||
              "Muscles transmit force through tendons and connective tissue. Bones provide attachment sites and act as levers around joints. Explore the fascial-line models to study relationships across regions."}
          </p>
          {related.map((l) => (
            <button
              className="related-line"
              key={l.id}
              onClick={() => {
                dispatch({ type: "setMode", mode: "fascia" });
                dispatch({ type: "setLine", line: l.id });
              }}
            >
              <span className="line-dot" style={{ background: l.color }} />
              {l.name}
              <ArrowRight size={15} />
            </button>
          ))}
        </>
      )}
    </>
  );
}
```

`StartPanel.tsx` (the "Every structure. Part of a whole." block, verbatim from the old App, with `changeMode("fascia")` replaced by `dispatch({ type: "setMode", mode: "fascia" })` and `mode` read from the store).

- [x] **Step 6: `src/features/fascia/FasciaPanel.tsx`**

Port the old right-panel fascia block. Differences: read `line` from the store via `lineById(state.line)`, index label from `lines.indexOf`, path buttons pick the first catalog part whose `name group` text includes `p.match` (via `parts.find`) and dispatch `select`; add `<CopyLink onCopied={onToast} />` under the description.

```tsx
import { Activity, ChevronDown, ChevronRight } from "lucide-react";
import { parts } from "../../data/catalog";
import { lineById, lines } from "../../data/lines";
import { useStore } from "../../state/store";
import CopyLink from "../shared/CopyLink";

const matchPart = (needle: string) => parts.find((p) => `${p.name} ${p.group ?? ""}`.toLowerCase().includes(needle));

export default function FasciaPanel({ onToast }: { onToast: (m: string) => void }) {
  const { state, dispatch } = useStore();
  const line = lineById(state.line) ?? lines[0];
  const index = lines.indexOf(line);
  return (
    <>
      <div className="detail-kicker">
        <span className="tiny-tag">MYOFASCIAL LINE</span>
        <span className="chapter">
          0{index + 1} / 0{lines.length}
        </span>
      </div>
      <h2 className="detail-title">{line.name}</h2>
      <p className="latin">{line.subtitle}</p>
      <p className="detail-copy">{line.description}</p>
      <CopyLink onCopied={onToast} label="Copy link to this line" />
      <div className="section-label">FOLLOW THE CONNECTION</div>
      <ol className="connection-path">
        {line.path.map((p, i) => {
          const part = matchPart(p.match);
          return (
            <li key={p.name}>
              <button onClick={() => part && dispatch({ type: "select", id: part.id })} disabled={!part}>
                <span className="path-point">{i + 1}</span>
                <span>
                  {p.name}
                  <small>
                    {p.note}
                    {!part ? " · not separately modeled" : ""}
                  </small>
                </span>
                {part && <ChevronRight size={13} />}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="movement-card">
        <Activity size={18} />
        <h3>Think in movement</h3>
        <p>{line.movement}</p>
      </div>
      <details className="evidence-note">
        <summary>
          What does the evidence say? <ChevronDown size={14} />
        </summary>
        <p>{line.evidence} Highlights show selected components, not a segmented fascia layer or a simulation of force.</p>
        <a href="https://pubmed.ncbi.nlm.nih.gov/26281953/" target="_blank" rel="noreferrer">
          Anatomical evidence review ↗
        </a>
        <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5341578/" target="_blank" rel="noreferrer">
          Force transmission review ↗
        </a>
      </details>
    </>
  );
}
```

- [x] **Step 7: `src/features/guide/Modals.tsx`**

Port the whole `{modal && (<div className="modal-backdrop" …>` block from the old App into a component that reads `state.modal` and dispatches `setModal`. The quiz `q`/`answers` state lives inside this component with `useState`, reset whenever the modal opens as `"quiz"` (use a `key={state.modal}` on the inner section so state resets). Keep the focus-trap `useEffect` (Escape closes, Tab cycles) exactly as before, keyed on `state.modal`. Keep the `role="presentation"` backdrop with the `e.target === e.currentTarget` guard. Replace `href="/body.glb"` with `` `${import.meta.env.BASE_URL}body.glb` `` (already done in phase 1; keep it).

- [x] **Step 8: Nonce guard in `src/viewer/Viewer.tsx`**

Replace the camera-command effect with:

```tsx
  const appliedNonce = useRef(-1);
  useEffect(() => {
    const e = engine.current;
    if (!ready || !e) return;
    const c = props.cameraCommand;
    if (c.nonce === appliedNonce.current) return;
    appliedNonce.current = c.nonce;
    if (c.kind === "preset") void e.setView(c.preset, c.nonce > 0);
    else if (c.kind === "pose") void e.setCamera(c.pose, false);
    else void e.flyTo(c.id, { preset: c.preset });
  }, [ready, props.cameraCommand]);
```

and reset `appliedNonce.current = -1` inside the mount effect's cleanup so a retry re-applies the current command.

- [x] **Step 9: Rewrite `src/App.tsx` as the shell**

```tsx
import { Activity, ArrowRight, BookOpen, Layers, Maximize2, Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { parts } from "./data/catalog";
import { lineById, lines } from "./data/lines";
import { StoreProvider, useStore } from "./state/store";
import { useUrlSync } from "./state/useUrlSync";
import { computeStyles } from "./viewer/appearance";
import Viewer, { type CameraCommand, type ViewerHandle } from "./viewer/Viewer";
import LibraryPanel from "./features/library/LibraryPanel";
import DetailPanel from "./features/detail/DetailPanel";
import StartPanel from "./features/detail/StartPanel";
import FasciaPanel from "./features/fascia/FasciaPanel";
import Modals from "./features/guide/Modals";
import Toast from "./features/shared/Toast";

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { state, dispatch } = useStore();
  useUrlSync(state, dispatch);
  const stage = useRef<HTMLElement>(null);
  const handle = useRef<ViewerHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);
  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const activeLine = lineById(state.line) ?? lines[0];
  const styles = useMemo(
    () =>
      computeStyles({
        parts,
        mode: state.mode,
        selected: state.selected,
        hidden: new Set(state.hidden),
        isolated: state.isolated,
        opacity: state.opacity / 100,
        lineColor: activeLine.color,
        lineMatches: activeLine.matches,
      }),
    [state.mode, state.selected, state.hidden, state.isolated, state.opacity, activeLine],
  );
  const cameraCommand = useMemo<CameraCommand>(
    () =>
      state.view === "custom" && state.camera
        ? { kind: "pose", pose: state.camera, nonce: state.cameraNonce }
        : { kind: "preset", preset: state.view === "custom" ? "front" : state.view, nonce: state.cameraNonce },
    [state.view, state.camera, state.cameraNonce],
  );
  const orientation = state.view === "back" ? "P" : state.view === "side" ? "L" : state.view === "custom" ? "·" : "A";

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Form home">
          <span className="brand-mark">
            <Activity size={24} />
          </span>
          <span>
            form<span className="brand-period">.</span>
          </span>
          <span className="brand-description">ANATOMY, CONNECTED</span>
        </a>
        <nav aria-label="Main navigation">
          <button className={state.mode !== "fascia" ? "nav-active" : ""} onClick={() => { dispatch({ type: "setModal", modal: null }); if (state.mode === "fascia") dispatch({ type: "setMode", mode: "muscles" }); }}>
            Explore anatomy
          </button>
          <button className={state.mode === "fascia" ? "nav-active" : ""} onClick={() => { dispatch({ type: "setMode", mode: "fascia" }); dispatch({ type: "setModal", modal: null }); }}>
            Fascial lines
          </button>
          <button onClick={() => dispatch({ type: "setModal", modal: "guide" })}>
            Learning guide <ArrowRight size={14} />
          </button>
        </nav>
        <span className="free-badge">
          <span /> Free for every curious mind
        </span>
      </header>
      <div className="intro">
        <div>
          <div className="eyebrow">THE INTERACTIVE HUMAN ATLAS</div>
          <h1>
            Understand the body.<em> See the connections.</em>
          </h1>
          <p>Explore beneath the surface. Discover how anatomy works together.</p>
        </div>
        <button className="outline-button" onClick={() => dispatch({ type: "setModal", modal: "quiz" })}>
          <BookOpen size={16} /> Test your knowledge <ArrowRight size={15} />
        </button>
      </div>
      <main className="workspace">
        <LibraryPanel mobileOpen={mobilePanel} onCloseMobile={() => setMobilePanel(false)} />
        <section className="stage" ref={stage} aria-label="Interactive 3D anatomy explorer">
          <div className="stage-top">
            <div className="stage-title">
              <span className="live-dot" />{" "}
              {state.mode === "fascia" ? "MYOFASCIAL CONNECTIONS" : state.mode === "bones" ? "SKELETAL SYSTEM" : "MUSCULAR SYSTEM"}
              <small>Full body · Adult anatomical model</small>
            </div>
            <button
              className="icon-button"
              aria-label="Expand anatomy viewer"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else stage.current?.requestFullscreen?.();
              }}
            >
              <Maximize2 size={17} />
            </button>
          </div>
          <button className="mobile-layers outline-button" onClick={() => setMobilePanel(true)}>
            <Layers size={15} /> Layers & search
          </button>
          <Viewer
            styles={styles}
            cameraCommand={cameraCommand}
            onSelect={(id) => dispatch({ type: "select", id })}
            onReady={() => setReady(true)}
            onCameraChange={(pose) => dispatch({ type: "cameraMoved", pose })}
            onHandle={(h) => {
              handle.current = h;
              if (!h) setReady(false);
            }}
          />
          <div className="orientation">
            <span>S</span>
            <div>
              <span>R</span>
              <span className="orientation-center">{orientation}</span>
              <span>L</span>
            </div>
            <span>I</span>
          </div>
          <div className="view-tools">
            <button className="icon-button" onClick={() => handle.current?.zoom(0.8)} aria-label="Zoom in">
              <ZoomIn size={19} />
            </button>
            <button className="icon-button" onClick={() => handle.current?.zoom(1.25)} aria-label="Zoom out">
              <ZoomOut size={19} />
            </button>
            <span />
            <button className="icon-button" onClick={() => dispatch({ type: "reset" })} aria-label="Reset anatomy view">
              <RotateCcw size={18} />
            </button>
          </div>
          {state.mode === "fascia" && (
            <div className="line-legend">
              <span className="line-dot" style={{ background: activeLine.color }} />
              {activeLine.name}
              <small>Highlighted model components</small>
            </div>
          )}
          <div className="stage-bottom">
            <div className="view-selector" role="group" aria-label="Camera view">
              {(["front", "back", "side"] as const).map((v) => (
                <button className={state.view === v ? "active" : ""} aria-pressed={state.view === v} onClick={() => dispatch({ type: "setView", view: v })} key={v}>
                  {v === "front" ? "Anterior" : v === "back" ? "Posterior" : "Lateral"}
                </button>
              ))}
            </div>
            <span className="interaction-hint">
              <Move size={13} /> Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Click to explore
            </span>
          </div>
        </section>
        <aside className="right-panel">
          {state.selected ? (
            <DetailPanel describe={(id) => (ready ? handle.current?.description(id) : undefined)} onToast={showToast} />
          ) : state.mode === "fascia" ? (
            <FasciaPanel onToast={showToast} />
          ) : (
            <StartPanel />
          )}
        </aside>
      </main>
      <footer>
        <span>
          <span className="footer-mark">form.</span> A little more understanding. A lot more connection.
        </span>
        <div>
          <span>Open anatomy. Open access.</span>
          <button onClick={() => dispatch({ type: "setModal", modal: "about" })}>
            Sources & credits <ArrowRight size={12} />
          </button>
        </div>
      </footer>
      <Modals />
      <Toast message={toast} />
    </div>
  );
}
```

Delete `src/structures.ts` and `tests/structures.test.ts`.

- [x] **Step 10: Move the stylesheet and add the new styles**

```bash
mkdir -p src/styles && git mv src/globals.css src/styles/globals.css
```

Update `src/main.tsx` to `import "./styles/globals.css";`. Append to the end of `src/styles/globals.css` (before the reduced-motion block is fine too):

```css
/* Phase 2: filters, grouped library, facts, copy link, toast */
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 14px 0 10px;
}
.filter-chips button,
.segmented button {
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fffefb;
  color: var(--muted);
}
.filter-chips button.active,
.segmented button.active {
  background: var(--green);
  border-color: var(--green);
  color: #fffefb;
}
.filter-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
}
.segmented {
  display: flex;
  gap: 4px;
}
.segmented button {
  flex: 1;
  border-radius: 8px;
  padding: 5px 6px;
}
.group-row {
  display: flex;
  align-items: stretch;
  gap: 4px;
  border-radius: 10px;
}
.group-row.selected .group-name {
  background: #eef1e9;
  color: var(--green);
  font-weight: 600;
}
.group-row .group-name {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.35;
}
.group-row .group-name:hover {
  background: #f1f3ec;
}
.side-toggle {
  display: flex;
  gap: 2px;
  align-items: center;
}
.side-toggle button {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 1px solid var(--border);
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  background: #fffefb;
}
.side-toggle button.active {
  background: var(--green);
  border-color: var(--green);
  color: #fffefb;
}
.wiki-facts {
  margin-top: 14px;
}
.description-expander {
  margin-top: 14px;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}
.description-expander summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--green);
  list-style: none;
}
.description-expander summary::-webkit-details-marker {
  display: none;
}
.description-expander p {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
  white-space: pre-line;
}
.attribution {
  margin-top: 10px;
  font-size: 10.5px;
  color: var(--muted);
}
.attribution a {
  text-decoration: underline;
}
.copy-link {
  margin: 10px 0 4px;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  background: var(--ink);
  color: #fffefb;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 12px;
  max-width: min(92vw, 560px);
  word-break: break-all;
  box-shadow: 0 10px 30px rgba(39, 58, 49, 0.25);
  z-index: 50;
}
```

- [x] **Step 11: Lint, typecheck, test, build**

```bash
npm run lint 2>&1 | grep -E "error|✖"; echo "LINT EXIT: ${PIPESTATUS[0]}"; npm run typecheck 2>&1 | grep -i error; npm test 2>&1 | grep -E "Test Files|Tests |FAIL"; npm run build 2>&1 | tail -1
```

Expected: clean. Fix any unused-import lint errors from the port.

- [x] **Step 12: Browser verification in Chrome (dev server on 3131)**

1. Load `http://localhost:3131/form-anatomy/`. Library shows region chips, layer and side controls, and grouped rows with L/R toggles; count is about 221.
2. Click "Hip & thigh": list shrinks to hip and thigh muscles; click "Deep": shows piriformis, obturators, vastus intermedius and similar.
3. Click "Gluteus Maximus Muscle": right side selects (green on the model, R toggle active). Click its L toggle: left side selects. Detail panel shows type · Right/Left · Hip & thigh, the curated lesson block, then ORIGIN / INSERTION / ACTION / INNERVATION rows from Wikipedia, an "About this structure" expander, and the CC BY-SA attribution line.
4. Click "Copy link": toast appears; the address bar reads `?s=gluteus-maximus-muscle-l&r=hip-thigh&d=deep` (or the real ids). Open that URL in a new tab: same selection, filters and highlight restore.
5. Drag the model, wait a second: the URL gains `c=…` and the orientation badge shows `·`. Reload: the camera pose restores.
6. Click Fascia, choose "Back functional line", click "Copy link to this line": URL is `?m=fascia&v=back&l=bfl`. Open it fresh: fascia mode with that line highlighted from the posterior view.
7. Bones mode hides the layer control; side filter "Left" keeps midline bones (sternum, vertebrae) in the list.
8. Console shows no errors or "Mesh not in catalog" warnings.

- [x] **Step 13: Commit**

```bash
git add -A && git commit -q -m "Restructure the UI into feature panels with region, layer and side browsing, Wikipedia facts and deep links

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Docs, deploy, live verification

**Files:**
- Modify: `README.md`, `docs/superpowers/plans/2026-09-06-phase-2-foundation.md` (tick boxes)

- [x] **Step 1: Update the README "What is included" and add a "Data" section**

Replace the "What is included" bullets with:

```markdown
- Locally bundled Z-Anatomy GLB with 826 individually selectable mesh parts
  (439 muscle, 269 bone, 118 connective). Left and right copies are grouped,
  so the library lists each structure once with a side toggle.
- Browse by body region, approximate layer (superficial or deep) and side, or
  search by name.
- Origin, insertion, action, innervation and antagonist for most muscles, and
  articulations for bones, sourced from Wikipedia infoboxes at build time
  (CC BY-SA 4.0, attributed in the panel), plus the model's own descriptions
  and curated lessons for selected structures.
- Rotate, zoom, pan, camera presets, hide, restore, isolate and opacity
  controls. Every view has a shareable link that restores mode, selection,
  filters, fascial line and camera.
- Five fascial-line teaching models with evidence notes and linked references.
- A short study check, responsive layout and keyboard-accessible controls.
```

Add after "Validate":

```markdown
## Data files

`src/data/catalog.json` is generated from the model header by
`npm run catalog` (part names, sides, regions, layers, bounds). Region and
layer rules live in `src/data/regions.ts`; fix a misclassified part there and
regenerate. `src/data/facts.json` is generated by `npm run facts`, which
fetches Wikipedia infoboxes for the 227 linked articles (about a minute,
polite rate limiting). Both files are committed so builds are offline and
deterministic.
```

- [x] **Step 2: Tick every step in this plan, commit, push, watch CI**

```bash
sed -i 's/^- \[ \] \*\*Step/- [x] **Step/' docs/superpowers/plans/2026-09-06-phase-2-foundation.md
git add -A && git commit -q -m "Document the data pipeline and mark the phase 2 plan complete

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main 2>&1 | tail -2
sleep 20; gh run watch --exit-status $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') 2>&1 | tail -6
```

Expected: `✓ build` and `✓ deploy`.

- [x] **Step 3: Verify the live deep links**

```bash
U=https://hyperionproj25.github.io/form-anatomy/
curl -s -o /dev/null -w "%{http_code}\n" "$U"
curl -s "$U" | grep -o 'src="/form-anatomy/assets/[^"]*"'
```

In Chrome open `https://hyperionproj25.github.io/form-anatomy/?m=fascia&v=back&l=bfl` (fascia mode, back functional line, posterior view) and `https://hyperionproj25.github.io/form-anatomy/?s=<a real muscle id>&r=hip-thigh` (that muscle selected with its facts). Both must restore correctly with no console errors.

---

## Self-review

Spec coverage for phase 2 (spec section 4, "Foundation"):

- Section 3.2 layout: Task 3 (`viewer/`), Task 4 (`state/`, `data/lines|lessons|questions`), Task 5 (`features/*`, `styles/`). `research.ts`, `quiz-pool.ts`, `paths.ts` are phase 3 and 4.
- `AnatomyEngine` API (3.3): Task 3 implements `load`, `ids`, `applyAppearance`, `setView`, `setCamera`, `getCamera`, `flyTo`, `zoom`, `dispose`, camera-change callback, 900 ms eased animation cancelable by input. `drawPath`/`clearPaths` are phase 3.
- App state and URL (3.4): Task 4 implements `m s v c l h r d side`; `t p q` arrive with tours, compare and quiz in later phases. Copy-link buttons: Task 5 in the detail and fascia panels.
- Catalog (3.5): Task 1, header-only (the spec's Draco decode is unnecessary because accessor bounds exist; noted in the script header). Side threshold, id scheme, region rules with overrides, layer list, tests: Task 1.
- Facts (3.6): Task 2, including redirects, rate limit, User-Agent, attribution. Display precedence lesson -> facts -> description: Task 5 DetailPanel.
- Region/layer/side browsing and grouped library (3.9): Task 5.
- Error handling (3.10): URL decode never throws (Task 4 tests), missing facts omit rows (Task 5), clipboard failure shows the URL in the toast (Task 5), WebGL fallback retained (Task 3).
- Testing (3.11): catalog, regions, urlCodec, appearance, groups, facts, store, wikitext tests; GLB and data tests kept.

Type consistency: `CameraPose`/`ViewPreset` defined in `engine.ts` and imported by the store and codec; `Filters`/`Mode` from the store used by `groups.ts`; `PartStyle` from `appearance.ts` used by the engine; `nodeToId` and `catalog.meta.modelCenter` from `catalog.ts` used by `Viewer.tsx`; `LineId` from `lines.ts` used by the store and codec.
