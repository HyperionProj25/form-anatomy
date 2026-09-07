import { Activity, ChevronDown, ChevronRight } from "lucide-react";
import { parts } from "../../data/catalog";
import { lineById, lines } from "../../data/lines";
import { useStore } from "../../state/store";
import CopyLink from "../shared/CopyLink";

const matchPart = (needle: string) =>
  parts.find((p) => `${p.name} ${p.group ?? ""}`.toLowerCase().includes(needle));

export default function FasciaPanel({ onToast }: { onToast: (m: string) => void }) {
  const { state, dispatch } = useStore();
  const line = lineById(state.line) ?? lines[0];
  const index = lines.indexOf(line);
  return (
    <>
      <div className="detail-kicker">
        <span className="tiny-tag">MYOFASCIAL LINE</span>
        <span className="chapter">
          0{index + 1} / 0{lines.length}
        </span>
      </div>
      <h2 className="detail-title">{line.name}</h2>
      <p className="latin">{line.subtitle}</p>
      <p className="detail-copy">{line.description}</p>
      <CopyLink onCopied={onToast} label="Copy link to this line" />
      <div className="section-label">FOLLOW THE CONNECTION</div>
      <ol className="connection-path">
        {line.path.map((p, i) => {
          const part = matchPart(p.match);
          return (
            <li key={p.name}>
              <button onClick={() => part && dispatch({ type: "select", id: part.id })} disabled={!part}>
                <span className="path-point">{i + 1}</span>
                <span>
                  {p.name}
                  <small>
                    {p.note}
                    {!part ? " · not separately modeled" : ""}
                  </small>
                </span>
                {part && <ChevronRight size={13} />}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="movement-card">
        <Activity size={18} />
        <h3>Think in movement</h3>
        <p>{line.movement}</p>
      </div>
      <details className="evidence-note">
        <summary>
          What does the evidence say? <ChevronDown size={14} />
        </summary>
        <p>
          {line.evidence} Highlights show selected components, not a segmented fascia layer or a
          simulation of force.
        </p>
        <a href="https://pubmed.ncbi.nlm.nih.gov/26281953/" target="_blank" rel="noreferrer">
          Anatomical evidence review ↗
        </a>
        <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5341578/" target="_blank" rel="noreferrer">
          Force transmission review ↗
        </a>
      </details>
    </>
  );
}
