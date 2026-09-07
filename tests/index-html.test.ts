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
