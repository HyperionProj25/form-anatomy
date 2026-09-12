import { Info } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  /** The chip's label: what kind of caveat this is. */
  label: "Teaching model" | "Approximate" | "Measured swing";
  /** The caveat itself, shown when the chip is opened. */
  children: ReactNode;
  /** Dark chips sit on the stage; light chips sit in the panels and cards. */
  tone?: "light" | "dark";
};

/** A labelled caveat that expands on click and stays visible while its overlay is on. */
export default function CaveatChip({ label, children, tone = "light" }: Props) {
  return (
    <details className={`caveat caveat-${tone}`}>
      <summary>
        <Info size={12} /> {label}
      </summary>
      <p>{children}</p>
    </details>
  );
}
