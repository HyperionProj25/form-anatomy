"use client";
import { useState, useRef, useEffect } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bone,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Focus,
  Layers,
  Maximize2,
  MousePointer2,
  Move,
  Network,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import AnatomyViewer, { type ViewerAPI, type Structure } from "./viewer";
import { lines, lessons, questions } from "./study-data";

export default function Home() {
  const api = useRef<ViewerAPI | null>(null),
    stage = useRef<HTMLElement>(null);
  const [mode, setMode] = useState("muscles"),
    [line, setLine] = useState(0),
    [structures, setStructures] = useState<Structure[]>([]),
    [selected, setSelected] = useState<Structure | null>(null),
    [search, setSearch] = useState(""),
    [opacity, setOpacity] = useState(100),
    [view, setView] = useState("front"),
    [hidden, setHidden] = useState<string[]>([]),
    [isolated, setIsolated] = useState(false),
    [modal, setModal] = useState<"about" | "quiz" | "guide" | null>(null),
    [q, setQ] = useState(0),
    [answers, setAnswers] = useState<number[]>([]),
    [infoTab, setInfoTab] = useState("overview"),
    [mobilePanel, setMobilePanel] = useState(false);
  const activeLine = lines[line],
    detail = selected
      ? lessons.find((l) => selected.name.toLowerCase().includes(l.match))
      : null;
  const results = structures.filter(
    (s) =>
      (mode !== "bones" || s.type === "bone") &&
      (mode !== "muscles" || s.type === "muscle") &&
      `${s.name} ${s.detail}`.toLowerCase().includes(search.toLowerCase()),
  );
  const unique = results;
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const els = [
          ...document.querySelectorAll<HTMLElement>(".modal button, .modal a"),
        ].filter((e) => !e.hasAttribute("disabled"));
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.querySelector<HTMLElement>(".modal button")?.focus();
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      previous?.focus();
    };
  }, [modal]);
  function choose(s: Structure) {
    setSelected(s);
    setIsolated(false);
    setHidden((h) => h.filter((id) => id !== s.id));
    setInfoTab("overview");
  }
  function changeMode(m: string) {
    setMode(m);
    setSelected(null);
    setIsolated(false);
    setHidden([]);
    if (m === "fascia") {
      setView(lines[line].view);
      api.current?.view(lines[line].view);
    }
  }
  function chooseLine(i: number) {
    setLine(i);
    setSelected(null);
    setView(lines[i].view);
    api.current?.view(lines[i].view);
  }
  function reset() {
    setHidden([]);
    setIsolated(false);
    setSelected(null);
    setOpacity(100);
    setView("front");
    api.current?.view("front");
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Form home">
          <span className="brand-mark">
            <Activity size={24} />
          </span>
          <span>
            form<span className="brand-period">.</span>
          </span>
          <span className="brand-description">ANATOMY, CONNECTED</span>
        </a>
        <nav aria-label="Main navigation">
          <button className="nav-active" onClick={() => setModal(null)}>
            Explore anatomy
          </button>
          <button
            onClick={() => {
              changeMode("fascia");
              setModal(null);
            }}
          >
            Fascial lines
          </button>
          <button onClick={() => setModal("guide")}>
            Learning guide <ArrowRight size={14} />
          </button>
        </nav>
        <span className="free-badge">
          <span /> Free for every curious mind
        </span>
      </header>
      <div className="intro">
        <div>
          <div className="eyebrow">THE INTERACTIVE HUMAN ATLAS</div>
          <h1>
            Understand the body.<em> See the connections.</em>
          </h1>
          <p>
            Explore beneath the surface. Discover how anatomy works together.
          </p>
        </div>
        <button
          className="outline-button"
          onClick={() => {
            setModal("quiz");
            setQ(0);
            setAnswers([]);
          }}
        >
          <BookOpen size={16} /> Test your knowledge <ArrowRight size={15} />
        </button>
      </div>
      <main className="workspace">
        <aside className={`left-panel ${mobilePanel ? "mobile-open" : ""}`}>
          <div className="panel-heading">
            <Layers size={17} />
            <h2>Explore the body</h2>
            <button
              className="mobile-close icon-button"
              onClick={() => setMobilePanel(false)}
              aria-label="Close layers"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="system-switch"
            role="group"
            aria-label="Anatomy system"
          >
            {[
              { id: "muscles", label: "Muscles", icon: Activity },
              { id: "bones", label: "Bones", icon: Bone },
              { id: "fascia", label: "Fascia", icon: Network },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-pressed={mode === id}
                className={mode === id ? "active" : ""}
                onClick={() => changeMode(id)}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Search anatomical structures"
              placeholder="Find a structure…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </label>
          {mode === "fascia" && !search ? (
            <>
              <div className="section-label">
                MYOFASCIAL LINES <span>{lines.length}</span>
              </div>
              <div className="line-list">
                {lines.map((l, i) => (
                  <button
                    className={`line-item ${line === i ? "selected" : ""}`}
                    key={l.name}
                    onClick={() => chooseLine(i)}
                  >
                    <span
                      className="line-dot"
                      style={{ background: l.color }}
                    />
                    <span>
                      {l.name}
                      <small>{l.subtitle}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <div className="context-note">
                <Network size={18} />
                <p>
                  A connected perspective
                  <span>
                    Follow anatomical relationships across regions of the body.
                  </span>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="section-label">
                {search ? "SEARCH RESULTS" : "STRUCTURE LIBRARY"}{" "}
                <span>{unique.length}</span>
              </div>
              <div className="structure-list">
                {!structures.length ? (
                  <p className="subtle">Preparing your anatomy library…</p>
                ) : !unique.length ? (
                  <p className="subtle">
                    No matches. Try femur, deltoid, or gastrocnemius.
                  </p>
                ) : (
                  unique.map((s) => (
                    <button
                      key={s.id}
                      className={selected?.id === s.id ? "selected" : ""}
                      onClick={() => choose(s)}
                    >
                      <span>{s.name}</span>
                      <ChevronRight size={13} />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
          <div className="layer-settings">
            <div className="section-label">LAYER CONTROLS</div>
            <label className="opacity-label">
              {mode === "bones" ? "Bone" : "Muscle"} opacity{" "}
              <span>{opacity}%</span>
              <input
                type="range"
                min="10"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(+e.target.value)}
              />
            </label>
            <button
              className="text-button"
              disabled={!hidden.length && !isolated}
              onClick={() => {
                setHidden([]);
                setIsolated(false);
              }}
            >
              <Eye size={15} /> Restore hidden structures{" "}
              {hidden.length > 0 && `(${hidden.length})`}
            </button>
          </div>
          <button className="help-link" onClick={() => setModal("guide")}>
            <CircleHelp size={16} /> A little help exploring{" "}
            <ArrowRight size={14} />
          </button>
        </aside>
        <section
          className="stage"
          ref={stage}
          aria-label="Interactive 3D anatomy explorer"
        >
          <div className="stage-top">
            <div className="stage-title">
              <span className="live-dot" />{" "}
              {mode === "fascia"
                ? "MYOFASCIAL CONNECTIONS"
                : mode === "bones"
                  ? "SKELETAL SYSTEM"
                  : "MUSCULAR SYSTEM"}
              <small>Full body · Adult anatomical model</small>
            </div>
            <button
              className="icon-button"
              aria-label="Expand anatomy viewer"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else stage.current?.requestFullscreen?.();
              }}
            >
              <Maximize2 size={17} />
            </button>
          </div>
          <button
            className="mobile-layers outline-button"
            onClick={() => setMobilePanel(true)}
          >
            <Layers size={15} /> Layers & search
          </button>
          <AnatomyViewer
            api={api}
            mode={mode}
            line={activeLine}
            opacity={opacity / 100}
            selected={selected?.id ?? null}
            hidden={hidden}
            isolated={isolated}
            onSelect={choose}
            onReady={setStructures}
          />
          <div className="orientation">
            <span>S</span>
            <div>
              <span>R</span>
              <span className="orientation-center">
                {view === "back" ? "P" : view === "side" ? "L" : "A"}
              </span>
              <span>L</span>
            </div>
            <span>I</span>
          </div>
          <div className="view-tools">
            <button
              className="icon-button"
              onClick={() => api.current?.zoom(0.8)}
              aria-label="Zoom in"
            >
              <ZoomIn size={19} />
            </button>
            <button
              className="icon-button"
              onClick={() => api.current?.zoom(1.25)}
              aria-label="Zoom out"
            >
              <ZoomOut size={19} />
            </button>
            <span />
            <button
              className="icon-button"
              onClick={reset}
              aria-label="Reset anatomy view"
            >
              <RotateCcw size={18} />
            </button>
          </div>
          {mode === "fascia" && (
            <div className="line-legend">
              <span
                className="line-dot"
                style={{ background: activeLine.color }}
              />
              {activeLine.name}
              <small>Highlighted model components</small>
            </div>
          )}
          <div className="stage-bottom">
            <div
              className="view-selector"
              role="group"
              aria-label="Camera view"
            >
              {["front", "back", "side"].map((v) => (
                <button
                  className={view === v ? "active" : ""}
                  aria-pressed={view === v}
                  onClick={() => {
                    setView(v);
                    api.current?.view(v);
                  }}
                  key={v}
                >
                  {v === "front"
                    ? "Anterior"
                    : v === "back"
                      ? "Posterior"
                      : "Lateral"}
                </button>
              ))}
            </div>
            <span className="interaction-hint">
              <Move size={13} /> Drag to rotate <span>·</span> Scroll to zoom{" "}
              <span>·</span> Click to explore
            </span>
          </div>
        </section>
        <aside className="right-panel">
          {selected ? (
            <>
              <div className="detail-kicker">
                <span className="tiny-tag">{selected.type}</span>
                <button
                  className="icon-button"
                  aria-label="Clear selection"
                  onClick={() => {
                    setSelected(null);
                    setIsolated(false);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <h2 className="detail-title">{selected.name}</h2>
              <p className="latin">{selected.detail}</p>
              <div className="detail-actions">
                <button
                  className="outline-button"
                  onClick={() => setIsolated(!isolated)}
                >
                  <Focus size={15} />
                  {isolated ? "Show all" : "Isolate"}
                </button>
                <button
                  className="outline-button"
                  onClick={() => {
                    setHidden([...hidden, selected.id]);
                    setSelected(null);
                    setIsolated(false);
                  }}
                >
                  <EyeOff size={15} /> Hide
                </button>
              </div>
              <div className="detail-tabs">
                <button
                  className={infoTab === "overview" ? "active" : ""}
                  onClick={() => setInfoTab("overview")}
                >
                  Overview
                </button>
                <button
                  className={infoTab === "connections" ? "active" : ""}
                  onClick={() => setInfoTab("connections")}
                >
                  Connections
                </button>
              </div>
              {infoTab === "overview" ? (
                <>
                  <p className="detail-copy">
                    {detail?.description ||
                      `Explore the ${selected.name.toLowerCase()} in its anatomical position. Isolate this structure to inspect its shape, or hide it to reveal the structures beneath it.`}
                  </p>
                  {detail && (
                    <div className="facts">
                      <div>
                        <span>ATTACHMENTS</span>
                        <p>{detail.attachments}</p>
                      </div>
                      <div>
                        <span>PRIMARY ACTION</span>
                        <p>{detail.action}</p>
                      </div>
                      <div>
                        <span>TRY OBSERVING</span>
                        <p>{detail.observe}</p>
                      </div>
                    </div>
                  )}
                  <a
                    className="source-link"
                    href={
                      selected.wiki ||
                      "https://openstax.org/books/anatomy-and-physiology-2e/pages/11-introduction"
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read anatomy reference <ArrowRight size={14} />
                  </a>
                </>
              ) : (
                <>
                  <p className="detail-copy">
                    {detail?.connection ||
                      "Muscles transmit force through tendons and connective tissue. Bones provide attachment sites and act as levers around joints. Explore the fascial-line models to study relationships across regions."}
                  </p>
                  {lines
                    .filter((l) =>
                      l.matches.some((m) =>
                        selected.name.toLowerCase().includes(m),
                      ),
                    )
                    .map((l) => (
                      <button
                        className="related-line"
                        key={l.name}
                        onClick={() => {
                          const i = lines.indexOf(l);
                          setLine(i);
                          changeMode("fascia");
                          chooseLine(i);
                        }}
                      >
                        <span
                          className="line-dot"
                          style={{ background: l.color }}
                        />
                        {l.name}
                        <ArrowRight size={15} />
                      </button>
                    ))}
                </>
              )}
            </>
          ) : mode === "fascia" ? (
            <>
              <div className="detail-kicker">
                <span className="tiny-tag">MYOFASCIAL LINE</span>
                <span className="chapter">
                  0{line + 1} / 0{lines.length}
                </span>
              </div>
              <h2 className="detail-title">{activeLine.name}</h2>
              <p className="latin">{activeLine.subtitle}</p>
              <p className="detail-copy">{activeLine.description}</p>
              <div className="section-label">FOLLOW THE CONNECTION</div>
              <ol className="connection-path">
                {activeLine.path.map((p, i) => (
                  <li key={p.name}>
                    <button
                      onClick={() => {
                        const s = structures.find((s) =>
                          s.name.toLowerCase().includes(p.match),
                        );
                        if (s) choose(s);
                      }}
                      disabled={
                        !structures.some((s) =>
                          s.name.toLowerCase().includes(p.match),
                        )
                      }
                    >
                      <span className="path-point">{i + 1}</span>
                      <span>
                        {p.name}
                        <small>
                          {p.note}
                          {!structures.some((s) =>
                            s.name.toLowerCase().includes(p.match),
                          )
                            ? " · not separately modeled"
                            : ""}
                        </small>
                      </span>
                      {structures.some((s) =>
                        s.name.toLowerCase().includes(p.match),
                      ) && <ChevronRight size={13} />}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="movement-card">
                <Activity size={18} />
                <h3>Think in movement</h3>
                <p>{activeLine.movement}</p>
              </div>
              <details className="evidence-note">
                <summary>
                  What does the evidence say? <ChevronDown size={14} />
                </summary>
                <p>
                  {activeLine.evidence} Highlights show selected components, not
                  a segmented fascia layer or a simulation of force.
                </p>
                <a
                  href="https://pubmed.ncbi.nlm.nih.gov/26281953/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Anatomical evidence review ↗
                </a>
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5341578/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Force transmission review ↗
                </a>
              </details>
            </>
          ) : (
            <>
              <div className="detail-kicker">
                <span className="tiny-tag">YOUR EXPLORATION STARTS HERE</span>
                <MousePointer2 size={18} />
              </div>
              <h2 className="detail-title">
                Every structure.
                <br />
                Part of a whole.
              </h2>
              <p className="detail-copy">
                Select a {mode === "bones" ? "bone" : "muscle"} on the model to
                explore its anatomy and connections. Rotate the body to discover
                a different perspective.
              </p>
              <div className="start-tips">
                <div>
                  <span>01</span>
                  <p>
                    Find your focus
                    <small>Click the model or search by name.</small>
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <p>
                    Look a little deeper
                    <small>Hide a structure to reveal what lies beneath.</small>
                  </p>
                </div>
                <div>
                  <span>03</span>
                  <p>
                    Make the connection
                    <small>Explore how tissues relate across the body.</small>
                  </p>
                </div>
              </div>
              <button
                className="feature-card"
                onClick={() => changeMode("fascia")}
              >
                <Network size={26} />
                <span className="eyebrow">GO BEYOND INDIVIDUAL MUSCLES</span>
                <h3>
                  The body is
                  <br />
                  connected.
                </h3>
                <p>Trace the myofascial lines, from head to toe.</p>
                <span className="feature-link">
                  Explore fascial lines <ArrowRight size={17} />
                </span>
              </button>
            </>
          )}
        </aside>
      </main>
      <footer>
        <span>
          <span className="footer-mark">form.</span> A little more
          understanding. A lot more connection.
        </span>
        <div>
          <span>Open anatomy. Open access.</span>
          <button onClick={() => setModal("about")}>
            Sources & credits <ArrowRight size={12} />
          </button>
        </div>
      </footer>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={21} />
            </button>
            {modal === "about" ? (
              <>
                <div className="eyebrow">BUILT ON OPEN KNOWLEDGE</div>
                <h2 id="modal-title">Anatomy for everyone.</h2>
                <p>
                  Form is a free student learning tool with no account required.
                  The model represents one adult anatomy; individual anatomy
                  varies.
                </p>
                <h3>3D anatomy & licensing</h3>
                <p>
                  Model by Z-Anatomy and its contributors, including Gauthier
                  Kervyn; underlying BodyParts3D data © DBCLS. Browser
                  adaptation by hpfrei. The downloaded model is provided
                  unchanged under CC BY-SA 4.0.
                </p>
                <a
                  href="https://github.com/hpfrei/body-anatomy-3d-viewer"
                  target="_blank"
                  rel="noreferrer"
                >
                  Model source and attribution ↗
                </a>
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Creative Commons BY-SA 4.0 ↗
                </a>
                <a href="/body.glb" download>
                  Download the anatomy model
                </a>
                <h3>Learning references</h3>
                <a
                  href="https://openstax.org/books/anatomy-and-physiology-2e/pages/11-introduction"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStax · Anatomy & Physiology 2e ↗
                </a>
                <a
                  href="https://pubmed.ncbi.nlm.nih.gov/26281953/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Wilke et al. · Anatomical evidence for myofascial chains ↗
                </a>
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5341578/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Krause et al. · Intermuscular force transmission ↗
                </a>
                <p className="subtle">
                  Fascial lines are teaching models with varying anatomical
                  support. Tissue continuity alone does not establish a
                  predictable whole-body effect or treatment benefit. This atlas
                  does not simulate movement or diagnose conditions.
                </p>
              </>
            ) : modal === "guide" ? (
              <>
                <div className="eyebrow">GET TO KNOW YOUR ATLAS</div>
                <h2 id="modal-title">Follow your curiosity.</h2>
                {[
                  {
                    icon: Move,
                    title: "Change your perspective",
                    text: "Drag to rotate, scroll or pinch to zoom, and right-drag or use two fingers to pan. The Anterior, Posterior and Lateral buttons give you standard views.",
                  },
                  {
                    icon: Layers,
                    title: "Explore one layer at a time",
                    text: "Switch between muscles and bones. Select a structure, then isolate it or hide it to study deeper anatomy. Restore hidden structures whenever you need.",
                  },
                  {
                    icon: Network,
                    title: "Study the relationships",
                    text: "Choose Fascia and follow a line’s sequence. Colored muscles show components of a proposed chain. Read the evidence note alongside each line.",
                  },
                  {
                    icon: Search,
                    title: "Prefer the keyboard?",
                    text: "Search any structure and use Tab and Enter to select results and controls. All model selections are also available in the structure library.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div className="guide-step" key={title}>
                    <Icon />
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
                <button
                  className="primary-button"
                  onClick={() => setModal(null)}
                >
                  Start exploring <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="eyebrow">A MOMENT TO CONNECT THE DOTS</div>
                <h2 id="modal-title">
                  {q >= questions.length
                    ? "Your study check-in"
                    : "Test your knowledge"}
                </h2>
                {q >= questions.length ? (
                  <>
                    <div className="quiz-score">
                      {
                        answers.filter((a, i) => a === questions[i].correct)
                          .length
                      }
                      <span> / {questions.length}</span>
                    </div>
                    <p>
                      Keep exploring the structures and their relationships. You
                      can revisit this check-in any time.
                    </p>
                    <button
                      className="primary-button"
                      onClick={() => {
                        setQ(0);
                        setAnswers([]);
                      }}
                    >
                      Try again <RotateCcw size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="quiz-progress">
                      Question {q + 1} of {questions.length}
                      <div
                        style={{
                          width: `${((q + 1) / questions.length) * 100}%`,
                        }}
                      />
                    </div>
                    <h3 className="question">{questions[q].prompt}</h3>
                    <div className="quiz-options">
                      {questions[q].options.map((o, i) => (
                        <button
                          disabled={answers[q] !== undefined}
                          className={
                            answers[q] !== undefined
                              ? i === questions[q].correct
                                ? "correct"
                                : i === answers[q]
                                  ? "incorrect"
                                  : ""
                              : ""
                          }
                          key={o}
                          onClick={() => setAnswers([...answers, i])}
                        >
                          <span>{String.fromCharCode(65 + i)}</span>
                          {o}
                          {answers[q] !== undefined &&
                            i === questions[q].correct && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                    {answers[q] !== undefined && (
                      <>
                        <p className="answer-explanation">
                          {questions[q].explanation}
                        </p>
                        <button
                          className="primary-button"
                          onClick={() => setQ(q + 1)}
                        >
                          {q === questions.length - 1
                            ? "See results"
                            : "Next question"}{" "}
                          <ArrowRight size={16} />
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
