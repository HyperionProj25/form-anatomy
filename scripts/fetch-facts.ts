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

const titleOf = (url: string) =>
  decodeURIComponent(url.replace("https://en.wikipedia.org/wiki/", "")).replaceAll("_", " ");
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
  const json = (await res.json()) as {
    parse?: { title: string; revid: number; wikitext: string };
    error?: { info: string };
  };
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
const values = Object.values(out);
console.log(
  `muscle boxes: ${values.filter((e) => e.template === "muscle").length}, bone boxes: ${values.filter((e) => e.template === "bone").length}, with origin: ${values.filter((e) => e.origin).length}, with action: ${values.filter((e) => e.action).length}`,
);
if (missing.length) console.log(`No facts for ${missing.length}:\n  ${missing.join("\n  ")}`);
