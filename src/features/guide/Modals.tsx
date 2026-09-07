import { ArrowRight, Check, Layers, Move, Network, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { questions } from "../../data/questions";
import { useStore } from "../../state/store";
import ResearchDigest from "../research/ResearchDigest";

const GUIDE_STEPS = [
  {
    icon: Move,
    title: "Change your perspective",
    text: "Drag to rotate, scroll or pinch to zoom, and right-drag or use two fingers to pan. The Anterior, Posterior and Lateral buttons give you standard views.",
  },
  {
    icon: Layers,
    title: "Explore one layer at a time",
    text: "Switch between muscles and bones. Filter by body region, approximate layer and side. Select a structure, then isolate it or hide it to study deeper anatomy.",
  },
  {
    icon: Network,
    title: "Study the relationships",
    text: "Choose Fascia, start a guided tour, and read the evidence badge on every hop. Colored muscles show components of a proposed chain; the cable is a teaching path, not fascia.",
  },
  {
    icon: Search,
    title: "Share what you see",
    text: "Every view has a link. Copy it from the detail or fascia panel and it will reopen the same structure, filters, line and camera for anyone.",
  },
];

/** About, learning guide and quiz dialogs. Which one shows comes from the store. */
export default function Modals() {
  const { state, dispatch } = useStore();
  const modal = state.modal;
  const close = () => dispatch({ type: "setModal", modal: null });

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "setModal", modal: null });
      if (e.key === "Tab") {
        const els = [...document.querySelectorAll<HTMLElement>(".modal button, .modal a")].filter(
          (el) => !el.hasAttribute("disabled"),
        );
        const first = els[0];
        const last = els[els.length - 1];
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
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal, dispatch]);

  if (!modal) return null;
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close icon-button" aria-label="Close dialog" onClick={close}>
          <X size={21} />
        </button>
        {modal === "about" ? (
          <About onResearch={() => dispatch({ type: "setModal", modal: "research" })} />
        ) : modal === "guide" ? (
          <Guide onClose={close} />
        ) : modal === "research" ? (
          <ResearchDigest />
        ) : (
          <Quiz />
        )}
      </section>
    </div>
  );
}

function About({ onResearch }: { onResearch: () => void }) {
  return (
    <>
      <div className="eyebrow">BUILT ON OPEN KNOWLEDGE</div>
      <h2 id="modal-title">Anatomy for everyone.</h2>
      <p>
        Form is a free student learning tool with no account required. The model represents one
        adult anatomy; individual anatomy varies.
      </p>
      <h3>3D anatomy & licensing</h3>
      <p>
        Model by Z-Anatomy and its contributors, including Gauthier Kervyn; underlying BodyParts3D
        data © DBCLS. Browser adaptation by hpfrei. The downloaded model is provided unchanged under
        CC BY-SA 4.0.
      </p>
      <a href="https://github.com/hpfrei/body-anatomy-3d-viewer" target="_blank" rel="noreferrer">
        Model source and attribution ↗
      </a>
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
        Creative Commons BY-SA 4.0 ↗
      </a>
      <a href={`${import.meta.env.BASE_URL}body.glb`} download>
        Download the anatomy model
      </a>
      <h3>Structure facts</h3>
      <p>
        Origins, insertions, actions, innervation and articulations are adapted from Wikipedia
        infoboxes (CC BY-SA 4.0) at build time, alongside the descriptions bundled with the model.
        Each panel links to its source article.
      </p>
      <h3>Learning references</h3>
      <a
        href="https://openstax.org/books/anatomy-and-physiology-2e/pages/11-introduction"
        target="_blank"
        rel="noreferrer"
      >
        OpenStax · Anatomy & Physiology 2e ↗
      </a>
      <a href="https://pubmed.ncbi.nlm.nih.gov/26281953/" target="_blank" rel="noreferrer">
        Wilke et al. · Anatomical evidence for myofascial chains ↗
      </a>
      <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5341578/" target="_blank" rel="noreferrer">
        Krause et al. · Intermuscular force transmission ↗
      </a>
      <button className="text-button" onClick={onResearch}>
        Open the full research digest →
      </button>
      <p className="subtle">
        Fascial lines are teaching models with varying anatomical support. Tissue continuity alone
        does not establish a predictable whole-body effect or treatment benefit. This atlas does not
        simulate movement or diagnose conditions.
      </p>
    </>
  );
}

function Guide({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="eyebrow">GET TO KNOW YOUR ATLAS</div>
      <h2 id="modal-title">Follow your curiosity.</h2>
      {GUIDE_STEPS.map(({ icon: Icon, title, text }) => (
        <div className="guide-step" key={title}>
          <Icon />
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </div>
      ))}
      <button className="primary-button" onClick={onClose}>
        Start exploring <ArrowRight size={16} />
      </button>
    </>
  );
}

/** Quiz state lives here so it resets every time the dialog opens. */
function Quiz() {
  const [q, setQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const done = q >= questions.length;
  return (
    <>
      <div className="eyebrow">A MOMENT TO CONNECT THE DOTS</div>
      <h2 id="modal-title">{done ? "Your study check-in" : "Test your knowledge"}</h2>
      {done ? (
        <>
          <div className="quiz-score">
            {answers.filter((a, i) => a === questions[i].correct).length}
            <span> / {questions.length}</span>
          </div>
          <p>
            Keep exploring the structures and their relationships. You can revisit this check-in any
            time.
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
            <div style={{ width: `${((q + 1) / questions.length) * 100}%` }} />
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
                {answers[q] !== undefined && i === questions[q].correct && <Check size={16} />}
              </button>
            ))}
          </div>
          {answers[q] !== undefined && (
            <>
              <p className="answer-explanation">{questions[q].explanation}</p>
              <button className="primary-button" onClick={() => setQ(q + 1)}>
                {q === questions.length - 1 ? "See results" : "Next question"} <ArrowRight size={16} />
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}
