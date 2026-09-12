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
  /** Catalog keys that belong to the active line. */
  lineKeys: Set<string>;
  /** Ids to emphasise during a tour step; other line parts dim. */
  focusIds?: Set<string>;
  /** Compare-mode pins, in pin order; each takes a fixed color and stays visible. */
  pinned?: string[];
  /** Origin and insertion bone ids of the selected muscle; they light up and everything else dims. */
  attachments?: { origin: Set<string>; insertion: Set<string> };
  /** Deep peels the superficial layer to a ghost on the model; the other values change nothing here. */
  layer?: "all" | "superficial" | "deep";
  /** Muscles taking part in a joint motion; every other muscle fades so the moving parts read. */
  spotlight?: Set<string>;
  /** Per-part colour override: colour by length change during a whole-body swing. */
  tint?: Map<string, string>;
};

/** Compare pins: violet, magenta, yellow, deep purple, none near the origin blue or insertion amber. */
export const PIN_COLORS = ["#5b3fa6", "#a86ee0", "#e0569f", "#e8c547"] as const;
/** Origin blue and insertion amber differ in lightness as well as hue, so they survive colour-blindness. */
export const ATTACH_COLORS = { origin: "#3d8bff", insertion: "#f2a531" } as const;
/** Opacity of superficial muscles while the Deep layer is shown. */
export const PEELED_OPACITY = 0.12;

export const COLORS = {
  // Cyan-teal reads against muscle red for protanopes and deuteranopes (ΔE 33 and 49); green did not.
  // Kept dark enough that the lit, tone-mapped result is a mid cyan rather than near-white.
  selected: "#12a6c4",
  selectedEmissive: "#0b6d80",
  bone: "#e0d3b7",
  connective: "#dbd4bb",
  muscle: "#a35b4c",
  none: "#000000",
} as const;

/** Pure mapping from app state to a style for every catalog part. */
export function computeStyles(input: StyleInput): Map<string, PartStyle> {
  const out = new Map<string, PartStyle>();
  const focusing = !!input.focusIds?.size;
  const attaching = !!(input.attachments?.origin.size || input.attachments?.insertion.size);
  for (const p of input.parts) {
    const selected = p.id === input.selected;
    const pinIndex = input.pinned?.indexOf(p.id) ?? -1;
    if (pinIndex >= 0 && !selected) {
      const c = PIN_COLORS[pinIndex % PIN_COLORS.length];
      out.set(p.id, { visible: true, color: c, emissive: c, emissiveIntensity: 0.22, opacity: 1 });
      continue;
    }
    const attachOrigin = !!input.attachments?.origin.has(p.id);
    const attachInsertion = !attachOrigin && !!input.attachments?.insertion.has(p.id);
    if ((attachOrigin || attachInsertion) && !selected) {
      const c = attachOrigin ? ATTACH_COLORS.origin : ATTACH_COLORS.insertion;
      out.set(p.id, {
        visible: !input.hidden.has(p.id),
        color: c,
        emissive: c,
        emissiveIntensity: 0.3,
        opacity: 1,
      });
      continue;
    }
    const bone = p.type === "bone";
    const connective = p.type === "connective";
    const chain = input.mode === "fascia" && p.type === "muscle" && input.lineKeys.has(p.key);
    const focused = !!input.focusIds?.has(p.id);
    const dimmedChain = chain && focusing && !focused;
    // Outside fascia mode a focus (quiz target, "show me") or lit attachments fade everything else
    // so deep parts and bones show through.
    const revealed = (focusing || attaching) && input.mode !== "fascia" && !focused && !selected;
    const visible =
      !input.hidden.has(p.id) &&
      (!input.isolated || selected) &&
      (input.mode !== "bones" || bone || selected);
    const tinted = !selected && !focused ? input.tint?.get(p.id) : undefined;
    const color = selected
      ? COLORS.selected
      : (tinted ??
        (chain
          ? input.lineColor
          : bone
            ? COLORS.bone
            : connective
              ? COLORS.connective
              : COLORS.muscle));
    const emissive = selected ? COLORS.selectedEmissive : chain ? input.lineColor : COLORS.none;
    const emissiveIntensity = selected ? 0.32 : focused ? 0.45 : chain ? 0.16 : 0;
    const emissiveColor = focused && !chain && !selected ? input.lineColor : emissive;
    const baseOpacity =
      selected || focused
        ? 1
        : chain
          ? dimmedChain
            ? 0.55
            : 1
          : bone
            ? input.mode === "bones"
              ? input.opacity
              : 1
            : input.mode === "fascia"
              ? 0.16
              : input.opacity;
    const peeled =
      input.layer === "deep" &&
      input.mode === "muscles" &&
      p.type === "muscle" &&
      p.layer === "superficial" &&
      !selected &&
      !focused;
    const outside =
      !!input.spotlight && p.type === "muscle" && !input.spotlight.has(p.id) && !selected && !focused;
    const opacity = peeled
      ? Math.min(baseOpacity, PEELED_OPACITY)
      : revealed
        ? Math.min(baseOpacity, 0.28)
        : outside
          ? Math.min(baseOpacity, 0.3)
          : baseOpacity;
    out.set(p.id, { visible, color, emissive: emissiveColor, emissiveIntensity, opacity });
  }
  return out;
}
