import type { Transition } from "../../data/lines";
import { citationById, citationUrl } from "../../data/research";

const STATUS_LABEL: Record<Transition["status"], string> = {
  verified: "Verified",
  "not-verified": "Not verified",
  mechanical: "Mechanical only",
  "not-assessed": "Not assessed",
};

function detailText(t: Transition): string {
  if (t.status === "verified") {
    const studies = `${t.studies} ${t.studies === 1 ? "study" : "studies"}`;
    if (t.consistency) return `${studies} · continuity in ${t.consistency} specimens`;
    if (t.specimens) return `${studies} · ${t.specimens} specimens`;
    return studies;
  }
  if (t.status === "not-verified")
    return t.generalAnatomyStudies
      ? `0 continuity studies · ${t.generalAnatomyStudies} general-anatomy studies checked`
      : "0 continuity studies";
  if (t.status === "mechanical") return "not searched";
  return "outside the review";
}

export function EvidenceBadge({ transition }: { transition: Transition }) {
  const cite = citationById(transition.source);
  return (
    <div className={`evidence evidence-${transition.status}`}>
      <span className="evidence-pill">{STATUS_LABEL[transition.status]}</span>
      <span className="evidence-detail">{detailText(transition)}</span>
      <p>{transition.note}</p>
      {transition.via && (
        <p className="evidence-via">via {transition.via.name} (not separately modeled)</p>
      )}
      {cite && (
        <a href={citationUrl(cite)} target="_blank" rel="noreferrer">
          {cite.authors.split(",")[0]} {cite.year} ↗
        </a>
      )}
    </div>
  );
}

export function GradeBadge({ grade }: { grade: "strong" | "moderate" | "none" }) {
  const label =
    grade === "strong"
      ? "Strong evidence"
      : grade === "moderate"
        ? "Moderate evidence for parts"
        : "No evidence";
  return <span className={`grade-pill grade-${grade}`}>{label}</span>;
}
