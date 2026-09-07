import {
  citations,
  citationUrl,
  GROUP_LABELS,
  KIND_LABELS,
  type CitationGroup,
} from "../../data/research";

const ORDER: CitationGroup[] = [
  "what-fascia-is",
  "continuity",
  "force-transmission",
  "sensory",
  "clinical",
  "recent",
];

const GROUP_INTRO: Partial<Record<CitationGroup, string>> = {
  recent:
    "Papers published since the lines above were built, added September 2026. They extend, qualify or contradict the older evidence; none changes a hop's grade on its own.",
};

export default function ResearchDigest() {
  return (
    <>
      <div className="eyebrow">RESEARCH DIGEST</div>
      <h2 id="modal-title">What the evidence says about fascia.</h2>
      <p>
        Every entry links to its PubMed record or publisher page, and the build checks those links.
        Summaries stay within what each paper’s abstract reports.
      </p>
      {ORDER.map((group) => (
        <section className="digest-group" key={group}>
          <h3>{GROUP_LABELS[group]}</h3>
          {GROUP_INTRO[group] && <p className="subtle">{GROUP_INTRO[group]}</p>}
          {citations
            .filter((c) => c.group === group)
            .sort((a, b) => a.year - b.year)
            .map((c) => (
              <article className="digest-entry" key={c.id}>
                <div className="digest-head">
                  <span className={`kind-pill kind-${c.kind}`}>{KIND_LABELS[c.kind]}</span>
                  <span className="digest-year">{c.year}</span>
                </div>
                <h4>{c.title}</h4>
                <p className="digest-authors">
                  {c.authors}. <em>{c.journal}</em>.
                </p>
                <p>{c.summary}</p>
                <p className="digest-model">
                  <strong>On this model:</strong> {c.modelNote}
                </p>
                <a href={citationUrl(c)} target="_blank" rel="noreferrer">
                  {c.pmid ? `PubMed ${c.pmid}` : c.doi ? `doi:${c.doi}` : "Open source"} ↗
                </a>
              </article>
            ))}
        </section>
      ))}
    </>
  );
}
