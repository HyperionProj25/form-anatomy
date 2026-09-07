import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("atlas is server-rendered with no authentication gate", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Understand the body/);
  assert.match(html, /Interactive 3D anatomy explorer/);
  assert.match(html, /Search anatomical structures/);
  assert.match(html, /Form — Anatomy, connected/);
  assert.match(html, /http:\/\/localhost\/og.png/);
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton/,
  );
});

test("anatomy asset is complete and includes named muscle and bone meshes", async () => {
  const b = await readFile(new URL("../public/body.glb", import.meta.url));
  assert.equal(b.toString("utf8", 0, 4), "glTF");
  assert.equal(b.readUInt32LE(4), 2);
  assert.equal(b.readUInt32LE(8), b.length);
  const length = b.readUInt32LE(12),
    j = JSON.parse(b.toString("utf8", 20, 20 + length));
  const parts = j.nodes.filter((n) => n.mesh !== undefined);
  assert.equal(parts.length, 826);
  assert.ok(parts.filter((n) => n.extras?.type === "bone").length > 200);
  assert.ok(parts.filter((n) => n.extras?.type === "muscle").length > 400);
  const names = parts.map((n) =>
    (n.extras?.nameDetail || n.extras?.name || n.name).toLowerCase(),
  );
  for (const name of [
    "gastrocnemius",
    "rectus femoris",
    "femur",
    "pectoralis major",
    "latissimus dorsi",
    "vastus lateralis",
    "fibularis longus",
  ]) {
    assert.ok(
      names.some((n) => n.includes(name)),
      "Missing anatomy: " + name,
    );
  }
  for (const mesh of j.meshes)
    for (const p of mesh.primitives) {
      const compressed = p.extensions?.KHR_draco_mesh_compression;
      assert.ok(compressed, "Expected compressed anatomy geometry");
      const view = j.bufferViews[compressed.bufferView];
      assert.ok(view.byteLength > 0);
      assert.ok(
        (view.byteOffset || 0) + view.byteLength <= j.buffers[0].byteLength,
      );
    }
  const wasm = await readFile(
    new URL("../public/draco/draco_decoder.wasm", import.meta.url),
  );
  assert.equal(wasm.subarray(0, 4).toString("hex"), "0061736d");
});
