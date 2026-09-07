import { X } from "lucide-react";
import { partById } from "../../data/catalog";
import { useStore } from "../../state/store";
import { PIN_COLORS } from "../../viewer/appearance";

/** Chips for pinned (compare) structures, drawn over the stage. */
export default function PinLegend() {
  const { state, dispatch } = useStore();
  if (!state.pinned.length) return null;
  return (
    <div className="pin-legend" aria-label="Pinned structures">
      {state.pinned.map((id, i) => {
        const color = PIN_COLORS[i % PIN_COLORS.length];
        const name = partById(id)?.name ?? id;
        return (
          <span className="pin-chip" key={id} style={{ borderColor: color }}>
            <span className="line-dot" style={{ background: color }} />
            {name}
            <button aria-label={`Unpin ${name}`} onClick={() => dispatch({ type: "unpin", id })}>
              <X size={12} />
            </button>
          </span>
        );
      })}
      <button className="text-button" onClick={() => dispatch({ type: "clearPins" })}>
        Clear pins
      </button>
    </div>
  );
}
