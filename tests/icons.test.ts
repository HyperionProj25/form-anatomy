import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("PWA icons", () => {
  test.each([192, 512])("icon-%i.png is a PNG of the right size", async (size) => {
    const png = await readFile(new URL(`../public/icons/icon-${size}.png`, import.meta.url));
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
    expect(png.length).toBeGreaterThan(500);
  });
});
