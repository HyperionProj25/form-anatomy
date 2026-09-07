import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("offline configuration", () => {
  test("the service worker precaches the shell but caches the model at runtime", async () => {
    const config = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
    expect(config).toContain("VitePWA(");
    expect(config).toContain('cacheName: "form-model"');
    expect(config).toMatch(/globIgnores: \[[^\]]*body\.glb/);
    expect(config).toContain('handler: "CacheFirst"');
    expect(config).toContain('start_url: "/form-anatomy/"');
  });

  test("index.html links the touch icon and main registers the worker", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    expect(html).toContain("apple-touch-icon");
    const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
    expect(main).toContain("registerSW(");
  });
});
