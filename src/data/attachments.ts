import { partsByKey } from "./catalog";
import { factsForWiki } from "./facts";
import type { CatalogPart } from "./types";

/** Bone group keys a muscle's attachment text names, by end. */
export type Attachments = { origin: string[]; insertion: string[] };

/**
 * Bone group aliases. Each pattern is tested against origin/insertion text; a match adds the key.
 * Nerve names are excluded where the adjective is shared (radial, ulnar).
 */
const ALIASES: [string, RegExp][] = [
  [
    "femur",
    /\bfem(?:ur|oral)\b|\blinea aspera\b|\b(?:greater|lesser) trochanter\b|\bintertrochanteric\b|\bgluteal tuberosity\b|\badductor tubercle\b/,
  ],
  ["tibia", /\btibia[l]?\b|\bpes anserinus\b|\bgerdy\b|\bmedial malleolus\b|\bsoleal line\b/],
  ["fibula", /\bfibula[r]?\b|\blateral malleolus\b/],
  ["patella", /\bpatella[r]?\b/],
  ["calcaneus", /\bcalcane(?:us|al)\b|\bachilles\b|\btendo calcaneus\b/],
  ["talus", /\btalus\b|\btalar\b/],
  ["navicular-bone", /\bnavicular\b/],
  ["cuboid-bone", /\bcuboid\b/],
  ["medial-cuneiform-bone", /\b(?:medial|first) cuneiform\b/],
  ["intermediate-cuneiform-bone", /\b(?:intermediate|middle|second) cuneiform\b/],
  ["lateral-cuneiform-bone", /\b(?:lateral|third) cuneiform\b/],
  [
    "hip-bone",
    /\bhip bone\b|\bili(?:um|ac)\b|\bischi(?:um|al)\b|\bpub(?:is|ic)\b|\bacetabul(?:um|ar)\b|\binnominate\b|\bpelvi[sc]\b|\bobturator (?:foramen|membrane)\b|\bASIS\b|\bAIIS\b/,
  ],
  ["sacrum", /\bsacr(?:um|al)\b/],
  ["coccyx", /\bcoccy(?:x|geal)\b/],
  [
    "humerus",
    /\bhumer(?:us|al)\b|\bepicondyle\b|\bdeltoid tuberosity\b|\bintertubercular\b|\bbicipital groove\b|\b(?:greater|lesser) tubercle\b|\bsupracondylar ridge\b|\bsupracondylar line\b/,
  ],
  ["radius", /\bradius\b|\bradial(?! nerve)\b|\bradial tuberosity\b|\bstyloid process of (?:the )?radius\b/],
  ["ulna", /\bulna\b|\bulnar(?! nerve)\b|\bolecranon\b/],
  [
    "scapula",
    /\bscapula[r]?\b|\bacromi(?:on|al)\b|\bcoracoid\b|\bglenoid\b|\b(?:supra|infra)glenoid\b|\b(?:supra|infra)spinous fossa\b|\bsubscapular fossa\b/,
  ],
  ["clavicle", /\bclavic(?:le|ular)\b/],
  ["manubrium-of-sternum", /\bmanubrium\b/],
  ["body-of-sternum", /\bsternum\b|\bsternal(?! (?:end|extremity|head of))\b/],
  ["xiphoid-process", /\bxiphoid\b/],
  [
    "mandible",
    /\bmandib(?:le|ular)\b|\bmental (?:protuberance|tubercle|symphysis)\b|\bmylohyoid line\b|\bcondylar process\b|\bcoronoid process of (?:the )?mandible\b/,
  ],
  ["maxilla", /\bmaxill(?:a|ary)\b|\bcanine fossa\b|\bincisive fossa\b/],
  ["zygomatic-bone", /\bzygomatic (?:bone|arch|process)\b|\bzygoma\b/],
  ["temporal-bone", /\btemporal bone\b|\bmastoid\b|\btemporal fossa\b|\bstyloid process of (?:the )?temporal\b/],
  ["occipital-bone", /\boccipital\b|\bnuchal line\b|\bocciput\b/],
  ["frontal-bone", /\bfrontal bone\b|\bsupraorbital\b/],
  ["parietal-bone", /\bparietal bone\b/],
  ["sphenoid-bone", /\bsphenoid\b|\bpterygoid (?:plate|process|fossa|hamulus)\b/],
  ["hyoid-bone", /\bhyoid\b/],
  ["thyroid-cartilage", /\bthyroid cartilage\b|\bthyroid lamina\b/],
  ["cricoid-cartilage", /\bcricoid\b/],
  ["arytenoid-cartilage", /\barytenoid\b/],
  ["scaphoid-bone", /\bscaphoid\b/],
  ["lunate-bone", /\blunate\b/],
  ["triquetrum-bone", /\btriquetr(?:um|al)\b/],
  ["pisiform-bone", /\bpisiform\b/],
  ["trapezium-bone", /\btrapezium\b/],
  ["trapezoid-bone", /\btrapezoid(?! line)\b/],
  ["capitate-bone", /\bcapitate\b/],
  ["hamate-bone", /\bhamate\b/],
  ["atlas-c1", /\batlas\b/],
  ["axis-c2", /\bdens\b|\bodontoid\b/],
];

const ORDINALS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
];
const NUM = String.raw`(?:${ORDINALS.join("|")}|\d{1,2}(?:st|nd|rd|th)?)`;
const SEP = String.raw`\s*(?:,|and|&|-|–|—|to|through)\s*`;
const LIST = String.raw`(${NUM}(?:${SEP}${NUM})*)`;
// "inferior 4 ribs" or "lower six ribs" is a count, not a rib number; skip those.
const RIB_BEFORE = new RegExp(
  String.raw`(?<!\b(?:inferior|lower|lowest|upper|superior|last|top|bottom|middle)\s)\b${LIST}\s+(costal cartilages?|ribs?)\b`,
  "gi",
);
const RIB_AFTER = new RegExp(
  String.raw`\b(costal cartilages?|ribs?)\s+(?:of\s+(?:the\s+)?(?:ribs?\s+)?)?${LIST}`,
  "gi",
);
const META = new RegExp(String.raw`\b${LIST}\s+(metacarpal|metatarsal)s?\b`, "gi");
const META_NAMED = /\b(metacarpal|metatarsal)s?\s+(?:bones?\s+)?(?:of\s+(?:the\s+)?)?(thumb|great toe|big toe|hallux)\b/gi;
const PHALANX =
  /\b((?:proximal|middle|distal)(?:\s*(?:,|and|or)\s*(?:proximal|middle|distal))*)\s+phalan(?:x|ges)\b(?:\s+bones?)?(?:\s+of\s+(?:the\s+)?)?([^.;()]*)/gi;
const VERT = /\b([CTLS])\s?(\d{1,2})(?:\s*(?:-|–|—|to|through)\s*([CTLS])?\s?(\d{1,2}))?\b/g;

function ordinalNumber(token: string): number | null {
  const t = token.trim().toLowerCase();
  const i = ORDINALS.indexOf(t);
  if (i >= 0) return i + 1;
  const m = /^(\d{1,2})(?:st|nd|rd|th)?$/.exec(t);
  return m ? Number(m[1]) : null;
}

/** "5-7", "second and third", "2, 3 and 4" as numbers within 1..max. */
function numberList(s: string, max: number): number[] {
  const out = new Set<number>();
  for (const tok of s.split(/\s*(?:,|and|&)\s*/)) {
    const range = /^(\w+)\s*(?:-|–|—|to|through)\s*(\w+)$/.exec(tok.trim());
    if (range) {
      const a = ordinalNumber(range[1]);
      const b = ordinalNumber(range[2]);
      if (a && b) for (let n = Math.min(a, b); n <= Math.max(a, b) && n <= max; n++) out.add(n);
      continue;
    }
    const n = ordinalNumber(tok);
    if (n && n <= max) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** Vertebral column in order; S levels resolve to the sacrum. */
const COLUMN: { level: string; key: string }[] = [
  { level: "C1", key: "atlas-c1" },
  { level: "C2", key: "axis-c2" },
  ...[3, 4, 5, 6, 7].map((n) => ({ level: `C${n}`, key: `vertebra-c${n}` })),
  ...Array.from({ length: 12 }, (_, i) => ({ level: `T${i + 1}`, key: `vertebra-t${i + 1}` })),
  ...[1, 2, 3, 4, 5].map((n) => ({ level: `L${n}`, key: `vertebra-l${n}` })),
  ...[1, 2, 3, 4, 5].map((n) => ({ level: `S${n}`, key: "sacrum" })),
];
const levelIndex = (region: string, n: number) =>
  COLUMN.findIndex((c) => c.level === `${region.toUpperCase()}${n}`);

function vertebraKeys(text: string): string[] {
  const keys: string[] = [];
  const span = (from: number, to: number) => {
    if (from < 0 || to < 0) return;
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) keys.push(COLUMN[i].key);
  };
  for (const m of text.matchAll(VERT)) {
    const from = levelIndex(m[1], Number(m[2]));
    if (from < 0) continue;
    if (m[4]) span(from, levelIndex(m[3] ?? m[1], Number(m[4])));
    else keys.push(COLUMN[from].key);
  }
  if (/\bcervical vertebra/i.test(text)) span(levelIndex("C", 1), levelIndex("C", 7));
  if (/\bthoracic vertebra/i.test(text)) span(levelIndex("T", 1), levelIndex("T", 12));
  if (/\blumbar vertebra/i.test(text)) span(levelIndex("L", 1), levelIndex("L", 5));
  return keys;
}

function ribKeys(text: string): string[] {
  const hits: { at: number; keys: string[] }[] = [];
  const add = (at: number, kind: string, list: string) => {
    const cartilage = /costal/i.test(kind);
    const keys = numberList(list, 12).map((n) => {
      const ord = ORDINALS[n - 1];
      return cartilage ? `costal-cartilage-of-${ord}-rib` : `${ord}-rib`;
    });
    hits.push({ at, keys });
  };
  for (const m of text.matchAll(RIB_BEFORE)) add(m.index ?? 0, m[2], m[1]);
  for (const m of text.matchAll(RIB_AFTER)) add(m.index ?? 0, m[1], m[2]);
  // Text order, so "ribs 5-7 and the twelfth rib" lists the fifth rib first.
  return hits.sort((a, b) => a.at - b.at).flatMap((h) => h.keys);
}

function metaKeys(text: string): string[] {
  const keys: string[] = [];
  for (const m of text.matchAll(META))
    for (const n of numberList(m[1], 5)) keys.push(`${ORDINALS[n - 1]}-${m[2].toLowerCase()}-bone`);
  for (const m of text.matchAll(META_NAMED)) keys.push(`first-${m[1].toLowerCase()}-bone`);
  return keys;
}

const DIGIT_WORDS: [RegExp, number][] = [
  [/\bthumb\b|\bgreat toe\b|\bbig toe\b|\bhallux\b/i, 1],
  [/\bindex\b|\bsecond\b|\b2nd\b/i, 2],
  [/\bmiddle finger\b|\bthird\b|\b3rd\b/i, 3],
  [/\bring\b|\bfourth\b|\b4th\b/i, 4],
  [/\blittle\b|\bsmall\b|\bfifth\b|\b5th\b/i, 5],
];

function phalanxKeys(text: string): string[] {
  const keys: string[] = [];
  for (const m of text.matchAll(PHALANX)) {
    const levels = m[1].toLowerCase().match(/proximal|middle|distal/g) ?? [];
    const clause = m[2] ?? "";
    const foot = /\btoe|\bhallux\b|\bfoot\b/i.test(clause) || (!/\bfinger|\bthumb\b|\bhand\b/i.test(clause) && /\btoe|\bfoot\b/i.test(text));
    const limb = foot ? "foot" : "hand";
    let digits = numberList(clause.replace(/\b(?:four|lateral|medial)\b/gi, ""), 5);
    if (!digits.length) digits = DIGIT_WORDS.filter(([re]) => re.test(clause)).map(([, n]) => n);
    if (!digits.length && /\b(?:fingers|digits|toes)\b/i.test(clause)) digits = [2, 3, 4, 5];
    for (const level of levels)
      for (const n of digits) keys.push(`${level}-phalanx-of-${ORDINALS[n - 1]}-finger-of-${limb}`);
  }
  return keys;
}

/** Ordered, unique bone group keys named in a piece of attachment text; only keys in the catalog. */
export function boneKeysIn(text: string): string[] {
  const found: string[] = [];
  for (const [key, re] of ALIASES) if (re.test(text)) found.push(key);
  found.push(...vertebraKeys(text), ...ribKeys(text), ...metaKeys(text), ...phalanxKeys(text));
  return [...new Set(found)].filter((k) => partsByKey(k).length > 0);
}

/** Origin and insertion bone keys for a muscle, from its reference facts; undefined when nothing matched. */
export function attachmentsFor(part: CatalogPart): Attachments | undefined {
  if (part.type !== "muscle") return undefined;
  const f = factsForWiki(part.wiki);
  if (!f) return undefined;
  const origin = f.origin ? boneKeysIn(f.origin) : [];
  const insertion = f.insertion ? boneKeysIn(f.insertion) : [];
  return origin.length || insertion.length ? { origin, insertion } : undefined;
}

/** Part ids on the muscle's side (both sides for a midline muscle; midline bones as they are). */
export function attachmentIds(part: CatalogPart): Attachments | undefined {
  const a = attachmentsFor(part);
  if (!a) return undefined;
  const toIds = (keys: string[]) =>
    keys.flatMap((k) =>
      partsByKey(k)
        .filter((p) => p.side === "midline" || part.side === "midline" || p.side === part.side)
        .map((p) => p.id),
    );
  return { origin: toIds(a.origin), insertion: toIds(a.insertion) };
}
