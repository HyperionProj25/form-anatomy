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
