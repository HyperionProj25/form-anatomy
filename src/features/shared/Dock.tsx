import { ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

/** Cards that share the bottom-left dock over the stage. */
export type DockCardId = "quiz" | "motion" | "playlist";

/** The card that appeared since the last render, if any. */
export function newestCard(
  previous: readonly DockCardId[],
  current: readonly DockCardId[],
): DockCardId | undefined {
  return current.find((id) => !previous.includes(id));
}

/**
 * Which cards are folded after the active set changes: a newly opened card shows in full and
 * the others fold to strips; otherwise the user's folds persist for the cards still present.
 */
export function foldedAfter(
  previous: readonly DockCardId[],
  current: readonly DockCardId[],
  folded: readonly DockCardId[],
): DockCardId[] {
  const newest = newestCard(previous, current);
  if (newest) return current.filter((id) => id !== newest);
  return folded.filter((id) => current.includes(id));
}

type StripProps = { icon: ReactNode; label: string; onExpand: () => void };

/** One-line strip standing in for a folded dock card. */
export function DockStrip({ icon, label, onExpand }: StripProps) {
  return (
    <button className="dock-strip" onClick={onExpand} aria-expanded={false} title="Expand">
      {icon}
      <span>{label}</span>
      <ChevronUp size={14} />
    </button>
  );
}
