import { Activity, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { lineById, lines, stopPartId, stopSides } from "../../data/lines";
import { citationById, citationUrl } from "../../data/research";
import { useStore } from "../../state/store";
import CopyLink from "../shared/CopyLink";
import { EvidenceBadge, GradeBadge } from "./EvidenceBadge";
import TourPlayer from "./TourPlayer";

export default function FasciaPanel({ onToast }: { onToast: (m: string) => void }) {
  const { state, dispatch } = useStore();
  const line = lineById(state.line) ?? lines[0];
  const index = lines.indexOf(line);
  const sides = stopSides(line);
  const evidenceCite = citationById(line.evidence.source);
  const forceCite = line.evidence.forceTransfer && citationById(line.evidence.forceTransfer.source);
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
      <GradeBadge grade={line.evidence.grade} />
      <p className="detail-copy">{line.description}</p>
      <CopyLink onCopied={onToast} label="Copy link to this line" />
      <TourPlayer line={line} />
      {state.tour ? (
        <details className="evidence-note">
          <summary>
            How to read the badges <ChevronDown size={14} />
          </summary>
          <p>
            “Verified” and “not verified” are the terms used by Wilke et al. (2016), who searched
            for human dissection studies showing tissue continuity at each hop. Study counts and
            specimen shares are copied from their Table 3.
          </p>
        </details>
      ) : (
      <>
      <div className="section-label">FOLLOW THE CONNECTION</div>
      <ol className="connection-path">
        {line.path.map((stop, i) => {
          const id = stop.key ? stopPartId(stop, sides[i]) : null;
          return (
            <li key={stop.name}>
              <button onClick={() => id && dispatch({ type: "select", id })} disabled={!id}>
                <span className="path-point">{i + 1}</span>
                <span>
                  {stop.name}
                  <small>{stop.note}</small>
                </span>
                {id && <ChevronRight size={13} />}
              </button>
              {stop.transition && <EvidenceBadge transition={stop.transition} />}
            </li>
          );
        })}
      </ol>
      <div className="evidence-summary">
        <h3>What the dissection evidence says</h3>
        <p>{line.evidence.summary}</p>
        {evidenceCite && (
          <a href={citationUrl(evidenceCite)} target="_blank" rel="noreferrer">
            {evidenceCite.authors.split(",")[0]} et al. {evidenceCite.year}, {evidenceCite.journal} ↗
          </a>
        )}
        {line.evidence.forceTransfer && (
          <>
            <h3>Does force actually travel along it?</h3>
            <p>{line.evidence.forceTransfer.summary}</p>
            {forceCite && (
              <a href={citationUrl(forceCite)} target="_blank" rel="noreferrer">
                {forceCite.authors.split(",")[0]} et al. {forceCite.year}, {forceCite.journal} ↗
              </a>
            )}
          </>
        )}
        <p className="subtle">
          Highlights show model components, not a segmented fascia layer or a simulation of force.
          Continuity between tissues does not by itself establish a whole-body effect or a
          treatment benefit.
        </p>
        <button
          className="text-button"
          onClick={() => dispatch({ type: "setModal", modal: "research" })}
        >
          <BookOpen size={15} /> Read the research digest
        </button>
      </div>
      <div className="movement-card">
        <Activity size={18} />
        <h3>Think in movement</h3>
        <p>{line.movement}</p>
      </div>
      <details className="evidence-note">
        <summary>
          How to read the badges <ChevronDown size={14} />
        </summary>
        <p>
          “Verified” and “not verified” are the terms used by Wilke et al. (2016), who searched for
          human dissection studies showing tissue continuity at each hop. Study counts and specimen
          shares are copied from their Table 3. “Mechanical only” marks a hop the model’s author
          describes as a lever across a joint rather than a tissue link. “Not assessed” marks a hop
          the review did not examine.
        </p>
      </details>
      </>
      )}
    </>
  );
}
