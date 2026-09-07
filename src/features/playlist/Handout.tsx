import { Printer } from "lucide-react";
import { partById } from "../../data/catalog";
import { factsForWiki } from "../../data/facts";
import { latinName } from "../../data/names";
import { REGION_LABELS } from "../../data/regions";
import { useStore } from "../../state/store";
import type { CatalogPart } from "../../data/types";

/** The current playlist as a study sheet: one block per structure with its reference facts. Prints cleanly. */
export default function Handout() {
  const { state } = useStore();
  const playlist = state.playlist;
  const items = (playlist?.ids ?? [])
    .map((id) => partById(id))
    .filter((p): p is CatalogPart => !!p);
  const title = playlist?.title.trim() || "Study sheet";
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (!items.length)
    return (
      <>
        <div className="eyebrow">HANDOUT</div>
        <h2 id="modal-title">Nothing to print yet</h2>
        <p>
          Add structures to a playlist from their detail panel, or open a study set from the start
          panel, then come back here for a printable sheet.
        </p>
      </>
    );

  return (
    <div className="handout">
      <div className="handout-head">
        <div>
          <div className="eyebrow">STUDY SHEET · FORM ANATOMY ATLAS</div>
          <h2 id="modal-title">{title}</h2>
          <p className="subtle">
            {items.length} structures · {date} · hyperionproj25.github.io/form-anatomy
          </p>
        </div>
        <button className="primary-button no-print" onClick={() => window.print()}>
          <Printer size={15} /> Print
        </button>
      </div>
      <ol className="handout-list">
        {items.map((part, i) => {
          const f = factsForWiki(part.wiki);
          const latin = state.names === "latin" ? latinName(part) : undefined;
          const rows: [string, string | undefined][] =
            part.type === "bone"
              ? [["Articulations", f?.articulations]]
              : [
                  ["Origin", f?.origin],
                  ["Insertion", f?.insertion],
                  ["Action", f?.action],
                  ["Innervation", f?.nerve],
                ];
          const hasRows = rows.some(([, v]) => v);
          return (
            <li key={part.id} className="handout-item">
              <h3>
                {i + 1}. {part.name}
                {latin && latin !== part.name && <small> · {latin}</small>}
              </h3>
              <p className="handout-meta">
                {part.type} · {REGION_LABELS[part.region]}
                {part.group ? ` · ${part.group}` : ""}
              </p>
              {hasRows ? (
                <dl>
                  {rows.map(
                    ([label, value]) =>
                      value && (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ),
                  )}
                </dl>
              ) : (
                <p className="subtle">No reference facts for this structure. Study it on the model.</p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="attribution">
        Facts adapted from Wikipedia infoboxes, CC BY-SA 4.0. Model by Z-Anatomy, CC BY-SA 4.0.
        Fascial-line evidence and citations are in the research digest inside the app.
      </p>
    </div>
  );
}
