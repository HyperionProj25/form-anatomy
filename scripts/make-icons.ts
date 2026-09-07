/**
 * Renders the Form mark (sage rounded square, ivory pulse line) to PNG app icons
 * without any image library: pixels are computed directly and PNG-encoded with node:zlib.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const BG = [0x36, 0x56, 0x46];
const FG = [0xfa, 0xfb, 0xf7];
// The favicon path in a 32-unit box: M6 16 h4.5 l3 -7 l5 14 l3 -7 H26
const LINE: [number, number][] = [
  [6, 16],
  [10.5, 16],
  [13.5, 9],
  [18.5, 23],
  [21.5, 16],
  [26, 16],
];

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, data.length);
  const body = new Uint8Array(type.length + data.length);
  body.set(new TextEncoder().encode(type));
  body.set(data, type.length);
  const crc = new Uint8Array(4);
  new DataView(crc.buffer).setUint32(0, crc32(body));
  return new Uint8Array([...len, ...body, ...crc]);
}

function segDist(px: number, py: number, [ax, ay]: [number, number], [bx, by]: [number, number]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function render(size: number): Uint8Array {
  const scale = size / 32;
  const radius = 8 * scale;
  const stroke = 1.2 * scale;
  const rows: Uint8Array[] = [];
  for (let y = 0; y < size; y++) {
    const row = new Uint8Array(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const cx = Math.min(Math.max(px, radius), size - radius);
      const cy = Math.min(Math.max(py, radius), size - radius);
      const inside = Math.hypot(px - cx, py - cy) <= radius;
      let r = BG[0];
      let g = BG[1];
      let b = BG[2];
      const a = inside ? 255 : 0;
      if (inside) {
        let d = Infinity;
        for (let i = 0; i < LINE.length - 1; i++)
          d = Math.min(d, segDist(px / scale, py / scale, LINE[i], LINE[i + 1]));
        const cover = Math.max(0, Math.min(1, stroke / scale - d + 0.5));
        r = Math.round(r + (FG[0] - r) * cover);
        g = Math.round(g + (FG[1] - g) * cover);
        b = Math.round(b + (FG[2] - b) * cover);
      }
      row.set([r, g, b, a], 1 + x * 4);
    }
    rows.push(row);
  }
  const raw = new Uint8Array(rows.reduce((n, r) => n + r.length, 0));
  rows.reduce((off, r) => (raw.set(r, off), off + r.length), 0);
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, size);
  v.setUint32(4, size);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return new Uint8Array([
    ...[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ...chunk("IHDR", ihdr),
    ...chunk("IDAT", new Uint8Array(deflateSync(raw))),
    ...chunk("IEND", new Uint8Array()),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(resolve(outDir, `icon-${size}.png`), render(size));
  console.log(`wrote icon-${size}.png`);
}
