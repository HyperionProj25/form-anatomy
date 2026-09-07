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
  /** Lowercase substrings; a muscle whose name or group contains one is a line component. */
  lineMatches: string[];
};

export const COLORS = {
  selected: "#477965",
  selectedEmissive: "#204d3a",
  bone: "#e0d3b7",
  connective: "#dbd4bb",
  muscle: "#a35b4c",
  none: "#000000",
} as const;

/** Pure mapping from app state to a style for every catalog part. Ported from the Codex viewer's refresh(). */
export function computeStyles(input: StyleInput): Map<string, PartStyle> {
  const out = new Map<string, PartStyle>();
  for (const p of input.parts) {
    const selected = p.id === input.selected;
    const bone = p.type === "bone";
    const connective = p.type === "connective";
    const text = `${p.name} ${p.group ?? ""}`.toLowerCase();
    const chain =
      input.mode === "fascia" && p.type === "muscle" && input.lineMatches.some((m) => text.includes(m));
    const visible =
      !input.hidden.has(p.id) &&
      (!input.isolated || selected) &&
      (input.mode !== "bones" || bone || selected);
    const color = selected
      ? COLORS.selected
      : chain
        ? input.lineColor
        : bone
          ? COLORS.bone
          : connective
            ? COLORS.connective
            : COLORS.muscle;
    const emissive = selected ? COLORS.selectedEmissive : chain ? input.lineColor : COLORS.none;
    const emissiveIntensity = selected ? 0.26 : chain ? 0.08 : 0;
    const opacity =
      selected || chain
        ? 1
        : bone
          ? input.mode === "bones"
            ? input.opacity
            : 1
          : input.mode === "fascia"
            ? 0.1
            : input.opacity;
    out.set(p.id, { visible, color, emissive, emissiveIntensity, opacity });
  }
  return out;
}
