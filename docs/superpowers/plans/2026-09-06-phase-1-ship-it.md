# Phase 1: Ship It Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Codex-built Form anatomy atlas into a clean static Vite + React site, remove all ChatGPT/Cloudflare template scaffolding, fix the known loose ends, and publish it live on GitHub Pages at `https://hyperionproj25.github.io/form-anatomy/`.

**Architecture:** The app is already 100 percent client-rendered React + Three.js. We replace the vinext/Cloudflare Worker wrapper with plain Vite, move `app/*` to `src/*` with minimal edits, and add a GitHub Actions workflow that tests, builds, and deploys `dist/` to Pages. No feature restructuring happens here; that is phase 2.

**Tech Stack:** Vite 8, @vitejs/plugin-react 6, React 19, TypeScript 5.9, Three.js 0.185, Tailwind 4 via @tailwindcss/vite (preflight only), vitest 5, ESLint 9 flat config, GitHub Actions + GitHub Pages.

## Global Constraints

- Node `>=22.13.0` (package.json `engines`); CI uses Node 22.
- Vite `base` is exactly `/form-anatomy/`; every runtime asset URL goes through `import.meta.env.BASE_URL`.
- `public/body.glb` is never modified. `public/ATTRIBUTION.md` and `public/draco/*` stay.
- Title string everywhere: `Form — Anatomy, connected` (em dash). Description string: `A free interactive 3D anatomy atlas. Explore muscles, bones and the evidence behind myofascial connections. No account required.`
- Open Graph image absolute URL: `https://hyperionproj25.github.io/form-anatomy/og.png` (1536 x 1024).
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Run commands from the repo root `C:\Users\User\Desktop\codexanatomyapp` in Git Bash.
- Dev server for manual checks: `npm run dev -- --port 3131` (port 3000 is taken on this machine).

## File map

Create:
- `index.html` (static shell with meta tags)
- `vite.config.ts` (rewritten)
- `src/main.tsx`
- `src/App.tsx` (moved from `app/page.tsx`)
- `src/viewer.tsx` (moved from `app/viewer.tsx`, lint fixes)
- `src/study-data.ts` (moved from `app/study-data.ts`, unchanged)
- `src/globals.css` (moved from `app/globals.css`, unchanged)
- `src/structures.ts` (dedupe helper)
- `tests/glb.test.ts` (converted from `tests/rendered-html.test.mjs`)
- `tests/data.test.ts`
- `tests/index-html.test.ts`
- `tests/structures.test.ts`
- `public/favicon.svg` (replaced with a Form mark)
- `.github/workflows/deploy.yml`

Modify:
- `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `README.md`

Delete:
- `app/` (after moves), `app/chatgpt-auth.ts`, `app/layout.tsx`
- `db/`, `drizzle/`, `drizzle.config.ts`, `examples/`, `build/`, `worker/`
- `worker-configuration.d.ts`, `.openai/`, `next.config.ts`, `next-env.d.ts`, `env.d.ts`, `postcss.config.mjs`
- `public/file.svg`, `public/globe.svg`, `public/window.svg`
- `tests/rendered-html.test.mjs`
- Local ignored dirs: `.next/`, `.vinext/`, `.wrangler/`, `outputs/`, `dist/`, `tsconfig.tsbuildinfo`

---

### Task 1: Static Vite scaffold

**Files:**
- Create: `index.html`, `src/main.tsx`, `vite.config.ts`
- Move: `app/page.tsx` -> `src/App.tsx`, `app/viewer.tsx` -> `src/viewer.tsx`, `app/study-data.ts` -> `src/study-data.ts`, `app/globals.css` -> `src/globals.css`
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Delete: everything in the "Delete" list above except `tests/rendered-html.test.mjs` (Task 2 handles tests) and `public/*.svg` (Task 5)

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck` scripts; `import.meta.env.BASE_URL` available to source files; `src/App.tsx` default-exports `App`.

- [ ] **Step 1: Move source files with git so history follows them**

```bash
mkdir -p src
git mv app/page.tsx src/App.tsx
git mv app/viewer.tsx src/viewer.tsx
git mv app/study-data.ts src/study-data.ts
git mv app/globals.css src/globals.css
```

- [ ] **Step 2: Delete template scaffolding**

```bash
git rm -q app/chatgpt-auth.ts app/layout.tsx
git rm -rq db drizzle examples build worker
git rm -q drizzle.config.ts worker-configuration.d.ts .openai/hosting.json next.config.ts next-env.d.ts env.d.ts postcss.config.mjs
rm -rf .next .vinext .wrangler outputs dist tsconfig.tsbuildinfo app
git status --short | head -30
```

Expected: `R` lines for the four moves, `D` lines for deletions, no `app/` directory left on disk.

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Form — Anatomy, connected</title>
    <meta
      name="description"
      content="A free interactive 3D anatomy atlas. Explore muscles, bones and the evidence behind myofascial connections. No account required."
    />
    <meta name="theme-color" content="#365646" />
    <link rel="icon" href="%BASE_URL%favicon.svg" type="image/svg+xml" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://hyperionproj25.github.io/form-anatomy/" />
    <meta property="og:title" content="Form — Anatomy, connected" />
    <meta
      property="og:description"
      content="A free interactive 3D anatomy atlas. Explore muscles, bones and the evidence behind myofascial connections. No account required."
    />
    <meta property="og:image" content="https://hyperionproj25.github.io/form-anatomy/og.png" />
    <meta property="og:image:width" content="1536" />
    <meta property="og:image:height" content="1024" />
    <meta property="og:image:alt" content="Form. Understand the body. See the connections." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Form — Anatomy, connected" />
    <meta
      name="twitter:description"
      content="A free interactive 3D anatomy atlas. Explore muscles, bones and the evidence behind myofascial connections. No account required."
    />
    <meta name="twitter:image" content="https://hyperionproj25.github.io/form-anatomy/og.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Rewrite `vite.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/form-anatomy/",
  plugins: [react(), tailwindcss()],
  build: {
    // three.js alone is ~700 kB minified; splitting it is a phase 2 concern.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: Rewrite `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 7: Rewrite `package.json`**

```json
{
  "name": "form-anatomy",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.13.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "lucide-react": "^1.41.0",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "three": "^0.185.1"
  },
  "devDependencies": {
    "@eslint/js": "9.39.4",
    "@tailwindcss/vite": "4.3.3",
    "@types/node": "22.19.19",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "@types/three": "^0.185.4",
    "@vitejs/plugin-react": "6.1.1",
    "eslint": "9.39.4",
    "eslint-plugin-jsx-a11y": "6.10.2",
    "eslint-plugin-react": "7.37.5",
    "eslint-plugin-react-hooks": "7.1.1",
    "globals": "16.4.0",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.3",
    "typescript-eslint": "8.59.3",
    "vite": "8.2.2",
    "vitest": "5.0.0"
  }
}
```

- [ ] **Step 8: Reinstall to regenerate the lockfile**

```bash
rm -rf node_modules package-lock.json
npm install 2>&1 | tail -5
```

Expected: ends with `added N packages` and no `ERESOLVE` error. If npm reports a peer conflict on `vitest`, change its version to `4.0.0` in package.json and rerun.

- [ ] **Step 9: Strip Next-only code from `src/App.tsx`**

Remove the first line `"use client";`. Rename the component and fix the two absolute hrefs:

```tsx
// line 29 (was: export default function Home() {)
export default function App() {
```

```tsx
// brand link (was: <a className="brand" href="/" aria-label="Form home">)
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Form home">
```

```tsx
// model download link in the About modal (was: <a href="/body.glb" download>)
                <a href={`${import.meta.env.BASE_URL}body.glb`} download>
```

- [ ] **Step 10: Strip Next-only code from `src/viewer.tsx` and fix asset paths**

Remove the first line `"use client";`. Change the two asset paths:

```ts
// was: draco.setDecoderPath("/draco/");
    draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
```

```ts
// was: loader.load("/body.glb",
    loader.load(
      `${import.meta.env.BASE_URL}body.glb`,
```

- [ ] **Step 11: Rewrite `.gitignore`**

```gitignore
/node_modules
/dist
/coverage
.env*
.DS_Store
*.tsbuildinfo
/.claude/
```

- [ ] **Step 12: Type-check and build**

```bash
npm run typecheck && npm run build 2>&1 | tail -15
```

Expected: typecheck prints nothing; build ends with `✓ built in` and lists `dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css`. No `error` lines.

- [ ] **Step 13: Confirm the built HTML has the base path and meta**

```bash
grep -o 'src="/form-anatomy/assets/[^"]*"' dist/index.html
grep -o 'href="/form-anatomy/favicon.svg"' dist/index.html
grep -o 'og:image" content="[^"]*"' dist/index.html
ls dist/body.glb dist/draco/draco_decoder.wasm dist/og.png dist/ATTRIBUTION.md
```

Expected: one script src, the favicon href, `og:image" content="https://hyperionproj25.github.io/form-anatomy/og.png"`, and all four files listed.

- [ ] **Step 14: Manual check in the browser**

```bash
npm run dev -- --port 3131
```

Open `http://localhost:3131/form-anatomy/` in Chrome. Expected: the model loads and renders, clicking the chest selects "Sternocostal Head Of Pectoralis Major Muscle", the Fascia button highlights the superficial back line, and the browser tab title is `Form — Anatomy, connected`. Stop the server afterwards.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Convert to a static Vite site and remove hosting template scaffolding

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Test suite on vitest

**Files:**
- Create: `tests/glb.test.ts`, `tests/data.test.ts`, `tests/index-html.test.ts`
- Delete: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `src/study-data.ts` exports `lines`, `lessons`, `questions` (unchanged from Codex).
- Produces: `npm test` exits 0 with three passing files; CI in Task 6 relies on it.

- [ ] **Step 1: Write the GLB integrity test (ported from the old node:test file)**

`tests/glb.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

type GltfNode = { name: string; mesh?: number; extras?: Record<string, unknown> };
type Gltf = {
  nodes: GltfNode[];
  meshes: { primitives: { extensions?: { KHR_draco_mesh_compression?: { bufferView: number } } }[] }[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
  buffers: { byteLength: number }[];
};

async function loadGltfJson(): Promise<{ bytes: Buffer; json: Gltf }> {
  const bytes = await readFile(new URL("../public/body.glb", import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)) as Gltf;
  return { bytes, json };
}

describe("anatomy model asset", () => {
  test("is a valid glTF 2 binary with matching declared length", async () => {
    const { bytes } = await loadGltfJson();
    expect(bytes.toString("utf8", 0, 4)).toBe("glTF");
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  });

  test("has 826 mesh parts with named muscles and bones", async () => {
    const { json } = await loadGltfJson();
    const parts = json.nodes.filter((n) => n.mesh !== undefined);
    expect(parts.length).toBe(826);
    expect(parts.filter((n) => n.extras?.type === "bone").length).toBeGreaterThan(200);
    expect(parts.filter((n) => n.extras?.type === "muscle").length).toBeGreaterThan(400);
    const names = parts.map((n) =>
      String(n.extras?.nameDetail || n.extras?.name || n.name).toLowerCase(),
    );
    for (const expected of [
      "gastrocnemius",
      "rectus femoris",
      "femur",
      "pectoralis major",
      "latissimus dorsi",
      "vastus lateralis",
      "fibularis longus",
    ]) {
      expect(names.some((n) => n.includes(expected)), `missing ${expected}`).toBe(true);
    }
  });

  test("every primitive is Draco compressed within the buffer", async () => {
    const { json } = await loadGltfJson();
    for (const mesh of json.meshes) {
      for (const p of mesh.primitives) {
        const compressed = p.extensions?.KHR_draco_mesh_compression;
        expect(compressed).toBeDefined();
        const view = json.bufferViews[compressed!.bufferView];
        expect(view.byteLength).toBeGreaterThan(0);
        expect((view.byteOffset || 0) + view.byteLength).toBeLessThanOrEqual(
          json.buffers[0].byteLength,
        );
      }
    }
  });

  test("ships the Draco WASM decoder", async () => {
    const wasm = await readFile(new URL("../public/draco/draco_decoder.wasm", import.meta.url));
    expect(wasm.subarray(0, 4).toString("hex")).toBe("0061736d");
  });
});
```

- [ ] **Step 2: Write the study data shape test**

`tests/data.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { lessons, lines, questions } from "../src/study-data";

describe("fascial line data", () => {
  test("has five lines with hex colors, a camera view, and at least three stops", () => {
    expect(lines.length).toBe(5);
    for (const line of lines) {
      expect(line.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(["front", "back", "side"]).toContain(line.view);
      expect(line.path.length).toBeGreaterThanOrEqual(3);
      expect(line.matches.length).toBeGreaterThan(0);
      for (const stop of line.path) {
        expect(stop.match.length).toBeGreaterThan(0);
        expect(stop.match).toBe(stop.match.toLowerCase());
      }
    }
  });

  test("line names are unique", () => {
    expect(new Set(lines.map((l) => l.name)).size).toBe(lines.length);
  });
});

describe("lessons", () => {
  test("every lesson has lowercase match text and all five teaching fields", () => {
    for (const lesson of lessons) {
      expect(lesson.match).toBe(lesson.match.toLowerCase());
      for (const field of ["description", "attachments", "action", "observe", "connection"] as const) {
        expect(lesson[field].length, `${lesson.match}.${field}`).toBeGreaterThan(10);
      }
    }
  });
});

describe("quiz questions", () => {
  test("every question has a valid correct index and an explanation", () => {
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(10);
    }
  });
});
```

- [ ] **Step 3: Write the index.html meta test**

`tests/index-html.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const TITLE = "Form — Anatomy, connected";
const OG_IMAGE = "https://hyperionproj25.github.io/form-anatomy/og.png";

describe("index.html", () => {
  test("carries the title, description, favicon and Open Graph tags", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    expect(html).toContain(`<title>${TITLE}</title>`);
    expect(html).toContain('name="description"');
    expect(html).toContain('href="%BASE_URL%favicon.svg"');
    expect(html).toContain(`property="og:image" content="${OG_IMAGE}"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('src="/src/main.tsx"');
  });

  test("has no ChatGPT or Codex hosting references", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    expect(html).not.toMatch(/chatgpt|codex|projecthyperion/i);
  });
});
```

- [ ] **Step 4: Remove the old test and run the suite**

```bash
git rm -q tests/rendered-html.test.mjs
npm test 2>&1 | tail -12
```

Expected: `Test Files  3 passed (3)` and `Tests  9 passed (9)`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Move tests to vitest and add data and HTML shell checks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Lint clean

**Files:**
- Modify: `eslint.config.mjs`, `src/viewer.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `AnatomyViewer` props from `src/viewer.tsx`.
- Produces: `AnatomyViewer` prop `onApi: (api: ViewerAPI | null) => void` replaces `api: MutableRefObject<ViewerAPI | null>`; `npm run lint` exits 0.

- [ ] **Step 1: Rewrite `eslint.config.mjs` without the Next plugin and with `public/` ignored**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "public/**", "node_modules/**"]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: "detect" } },
  },
]);
```

- [ ] **Step 2: Run lint to see the exact remaining errors**

```bash
npm run lint 2>&1 | grep -E "error|warning" | head -20
```

Expected: five messages in `src/viewer.tsx` (`react-hooks/refs` at the `current.current = props` line, `react-hooks/immutability` twice, `react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps`) and four `jsx-a11y` messages in `src/App.tsx` on the modal backdrop and dialog. Nothing from `public/`.

- [ ] **Step 3: Fix `src/viewer.tsx` props mirroring, WebGL detection, and API handoff**

Replace the import line and the top of the component:

```ts
// was: import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
```

```ts
// was:
//   api: MutableRefObject<ViewerAPI | null>;
// in type Props:
  onApi: (api: ViewerAPI | null) => void;
```

Add these module-level helpers directly above `export default function AnatomyViewer`:

```ts
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
```

Replace the component head (the block from `const mount = useRef` through the `hover` state) with:

```tsx
  const mount = useRef<HTMLDivElement>(null),
    current = useRef(props),
    parts = useRef<Part[]>([]),
    refresh = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    current.current = props;
  });
  const [webgl] = useState(supportsWebGL);
  const [status, setStatus] = useState(webgl ? LOADING_MESSAGE : WEBGL_MESSAGE),
    [error, setError] = useState(!webgl),
    [retry, setRetry] = useState(0),
    [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(
      null,
    );
```

- [ ] **Step 4: Fix the effect body: mutable locals in one object, no setState at effect start**

Replace the start of the main `useEffect` (from `const host = mount.current;` through the `catch` block that returns) with:

```ts
    const host = mount.current;
    if (!host || !webgl) return;
    const s = {
      disposed: false,
      frame: 0,
      fitDistance: 3.7,
      model: null as THREE.Group | null,
    };
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => {
        setError(true);
        setStatus(WEBGL_MESSAGE);
      });
      return;
    }
```

Delete the line `let fitDistance = 3.7, model: THREE.Group | null = null;` (it was directly above `const resize = () => {`).

Replace the `props.api.current = { ... };` block with a local const handed to the parent:

```ts
    const api: ViewerAPI = {
      view: (v) => {
        controls.target.set(0, 0, 0);
        camera.position.set(
          v === "side" ? s.fitDistance : 0,
          0,
          v === "back" ? -s.fitDistance : v === "side" ? 0 : s.fitDistance,
        );
        controls.update();
      },
      zoom: (factor) => {
        const offset = camera.position.clone().sub(controls.target);
        offset.multiplyScalar(factor);
        offset.clampLength(controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      },
    };
    current.current.onApi(api);
```

In the GLTF load success callback, apply these substitutions:

```ts
        if (s.disposed) {            // was: if (disposed) {
          disposeModel(gltf.scene);
          return;
        }
        s.model = gltf.scene;        // was: model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(s.model),   // was: model
```

```ts
        s.model.position.sub(center);   // was: model.position.sub(center);
        scene.add(s.model);             // was: scene.add(model);
        s.fitDistance =                 // was: fitDistance =
```

```ts
        s.model.traverse((o) => {       // was: model.traverse((o) => {
```

```ts
        api.view(                        // was: current.current.api.current?.view(
          current.current.mode === "fascia"
            ? current.current.line.view
            : "front",
        );
```

In the progress and error callbacks replace `if (!disposed)` with `if (!s.disposed)` (two places).

In the render loop and cleanup:

```ts
    const render = () => {
      s.frame = requestAnimationFrame(render);   // was: frame = ...
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    return () => {
      s.disposed = true;                          // was: disposed = true;
      cancelAnimationFrame(s.frame);              // was: frame
      observer.disconnect();
      controls.dispose();
      draco.dispose();
      if (s.model) disposeModel(s.model);         // was: model
      renderer.dispose();
      renderer.domElement.remove();
      parts.current = [];
      current.current.onApi(null);                // was: current.current.api.current = null;
    };
  }, [retry, webgl]);                              // was: [retry]
```

Update the retry button so error state resets from the click handler, not the effect:

```tsx
            <button
              className="outline-button"
              onClick={() => {
                setError(false);
                setStatus(LOADING_MESSAGE);
                setRetry(retry + 1);
              }}
            >
              Retry 3D view
            </button>
```

- [ ] **Step 5: Update `src/App.tsx` to the callback API and fix the modal a11y errors**

```tsx
// was: <AnatomyViewer api={api} ...
          <AnatomyViewer
            onApi={(a) => {
              api.current = a;
            }}
```

Replace the modal backdrop and dialog opening tags:

```tsx
// was:
//        <div className="modal-backdrop" onClick={() => setModal(null)}>
//          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
```

- [ ] **Step 6: Lint, type-check, test, build**

```bash
npm run lint && npm run typecheck && npm test 2>&1 | tail -4 && npm run build 2>&1 | tail -3
```

Expected: lint prints nothing and exits 0; typecheck prints nothing; `Tests  9 passed`; build ends with `✓ built in`.

- [ ] **Step 7: Manual check that the viewer still works after the refactor**

```bash
npm run dev -- --port 3131
```

Open `http://localhost:3131/form-anatomy/` in Chrome. Expected: model renders; Anterior/Posterior/Lateral buttons move the camera (this exercises the new `onApi` handoff); zoom buttons work; Reset works; Escape closes the Learning guide modal and clicking the dimmed backdrop closes it too. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Fix React hooks and accessibility lint errors in the viewer and modal

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Library lists each structure once

**Files:**
- Create: `src/structures.ts`, `tests/structures.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Structure` type from `src/viewer.tsx` (`{ id, name, detail, type, wiki? }`).
- Produces: `uniqueByName(list: Structure[]): Structure[]` keeping the first occurrence of each case-insensitive name.

- [ ] **Step 1: Write the failing test**

`tests/structures.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { uniqueByName } from "../src/structures";

const part = (id: string, name: string) => ({ id, name, detail: "", type: "muscle" });

describe("uniqueByName", () => {
  test("keeps the first of each name and preserves order", () => {
    const list = [
      part("a", "Gastrocnemius"),
      part("b", "Gastrocnemius"),
      part("c", "Soleus"),
      part("d", "soleus"),
      part("e", "Femur"),
    ];
    expect(uniqueByName(list).map((s) => s.id)).toEqual(["a", "c", "e"]);
  });

  test("returns an empty list unchanged", () => {
    expect(uniqueByName([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/structures.test.ts 2>&1 | tail -6
```

Expected: FAIL with `Failed to resolve import "../src/structures"`.

- [ ] **Step 3: Write `src/structures.ts`**

```ts
import type { Structure } from "./viewer";

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

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/structures.test.ts 2>&1 | tail -6
```

Expected: `Tests  2 passed (2)`.

- [ ] **Step 5: Use it in `src/App.tsx`**

Add the import after the `study-data` import:

```ts
import { uniqueByName } from "./structures";
```

Replace the stub:

```ts
// was: const unique = results;
  const unique = uniqueByName(results);
```

Make the list highlight by name so a right-side click on the model still lights the single list entry:

```tsx
// was: className={selected?.id === s.id ? "selected" : ""}
                      className={
                        selected?.name.toLowerCase() === s.name.toLowerCase()
                          ? "selected"
                          : ""
                      }
```

- [ ] **Step 6: Lint, test, and check in the browser**

```bash
npm run lint && npm test 2>&1 | tail -4
```

Expected: lint silent; `Tests  11 passed (11)`.

```bash
npm run dev -- --port 3131
```

Open `http://localhost:3131/form-anatomy/`. Expected: the STRUCTURE LIBRARY count reads 220 or close to it (not 439), "Adductor Brevis" appears once, and clicking the model's right pectoral highlights the single "Sternocostal Head Of Pectoralis Major Muscle" entry in the list. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
List each structure once in the library

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Brand favicon, asset cleanup, README

**Files:**
- Modify: `public/favicon.svg`, `README.md`
- Delete: `public/file.svg`, `public/globe.svg`, `public/window.svg`

**Interfaces:**
- Produces: nothing programmatic; the README's "Run locally" and "Validate" sections are what a contributor follows.

- [ ] **Step 1: Replace the template favicon with a Form mark**

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="8" fill="#365646"/>
  <path d="M6 16h4.5l3-7 5 14 3-7H26" fill="none" stroke="#fafbf7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 2: Delete the Next.js template icons**

```bash
git rm -q public/file.svg public/globe.svg public/window.svg
grep -rn "file.svg\|globe.svg\|window.svg" src index.html || echo "no references"
```

Expected: `no references`.

- [ ] **Step 3: Rewrite `README.md`**

```markdown
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
```

- [ ] **Step 4: Build and confirm the icon is served**

```bash
npm run build 2>&1 | tail -2 && grep -c "rx=\"8\"" dist/favicon.svg
```

Expected: build succeeds and the grep prints `1`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add Form favicon, drop template icons, rewrite README for GitHub Pages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: GitHub repository, Pages workflow, live deploy

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm run lint`, `npm test`, `npm run build` from earlier tasks.
- Produces: the live site at `https://hyperionproj25.github.io/form-anatomy/`; `origin` remote on `main`.

- [ ] **Step 1: Write the workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
        if: github.event_name != 'pull_request'
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        if: github.event_name != 'pull_request'
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit the workflow**

```bash
git add .github/workflows/deploy.yml
git commit -m "$(cat <<'EOF'
Add GitHub Pages deploy workflow

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Create the public repo and push**

```bash
gh repo create HyperionProj25/form-anatomy --public --source=. --remote=origin --push \
  --description "Free interactive 3D anatomy atlas with evidence-graded fascial lines. No account required."
git remote -v
```

Expected: `https://github.com/HyperionProj25/form-anatomy` created, `origin` listed for fetch and push, and `main` pushed.

- [ ] **Step 4: Watch the first workflow run**

```bash
sleep 20 && gh run list --limit 1
gh run watch --exit-status $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: the run named `Deploy` finishes with `✓` for both `build` and `deploy`. If `configure-pages` fails with a 404 about Pages not being enabled, enable it once by hand and re-run:

```bash
gh api -X POST repos/HyperionProj25/form-anatomy/pages -f build_type=workflow
gh run rerun $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
```

- [ ] **Step 5: Verify the live site over HTTP**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://hyperionproj25.github.io/form-anatomy/
curl -s https://hyperionproj25.github.io/form-anatomy/ | grep -o '<title>[^<]*</title>'
curl -s https://hyperionproj25.github.io/form-anatomy/ | grep -o 'og:image" content="[^"]*"'
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" https://hyperionproj25.github.io/form-anatomy/body.glb
curl -s -o /dev/null -w "%{http_code}\n" https://hyperionproj25.github.io/form-anatomy/draco/draco_decoder.wasm
```

Expected: `200`; `<title>Form — Anatomy, connected</title>`; the og:image URL; `200 8249484`; `200`. Pages can take a minute after the run finishes; retry once if the first call returns 404.

- [ ] **Step 6: Verify in Chrome**

Open `https://hyperionproj25.github.io/form-anatomy/` in Chrome. Expected: the model renders, clicking the chest selects a pectoralis part, Fascia mode highlights a line, the tab shows the green Form icon, and the browser console has no errors. Also open it at a 375 px wide viewport: the "Layers & search" button appears and opens the side panel.

- [ ] **Step 7: Record the outcome**

Append the live URL and first successful run id to the bottom of `README.md` only if the URL differs from the one already written there; otherwise no change. Confirm `git status` is clean.

---

## Self-review

Spec coverage for phase 1 (section 4 of the spec):

- Static Vite + React, move `app/*` to `src/`, static `index.html` with meta, base path, `BASE_URL` asset paths: Task 1.
- Delete template leftovers, prune dependencies, add vitest: Task 1 (files, deps) and Task 2 (vitest).
- Fix viewer lint errors via callback API and lazy WebGL detection; lint-ignore `public/`: Task 3.
- Library shows unique names, first match on click: Task 4.
- Keep GLB integrity test, drop SSR test, add smoke tests: Task 2.
- README rewritten with credits intact: Task 5.
- Repo, workflow, Pages enablement, live URL confirmed: Task 6.
- Spec section 2 also lists the template favicon-era SVGs and the chatgpt.site default host; Task 5 and Task 1 remove them.

Type consistency: `ViewerAPI` keeps `{ view, zoom }`; `onApi` is used identically in Task 3 (viewer) and Task 3 step 5 (App). `uniqueByName` name matches between Task 4 test and implementation. Test count grows 9 -> 11 after Task 4.

Out of phase 1 by design: side toggle, regions, catalog, deep links, research digest, quiz engine, compare, offline. Those are phases 2 to 4.
