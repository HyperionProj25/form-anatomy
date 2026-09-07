import { ArrowRight, Check, Eye, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { partById, partsByKey } from "../../data/catalog";
import { citationById, citationUrl } from "../../data/research";
import { useStore } from "../../state/store";
import { setLabel, type QuizSetId } from "./generators";
import { loadProgress, recordAnswer, saveProgress, weakSpots } from "./progress";

type Props = { onStart: (setId: QuizSetId) => void };

/** Floating question card over the stage. The model stays visible and clickable for find questions. */
export default function QuizOverlay({ onStart }: Props) {
  const { state, dispatch } = useStore();
  const quiz = state.quiz;
  const recorded = useRef(new Set<string>());

  // Persist each answer once, and count the set once it is finished.
  useEffect(() => {
    if (!quiz) return;
    const key = `${quiz.setId}#${quiz.index}`;
    const answer = quiz.answers[quiz.index];
    const q = quiz.questions[quiz.index];
    if (q && answer && !recorded.current.has(key)) {
      recorded.current.add(key);
      saveProgress(recordAnswer(loadProgress(), q.key, answer.correct));
    }
    if (quiz.index >= quiz.questions.length && !recorded.current.has(`${quiz.setId}#done`)) {
      recorded.current.add(`${quiz.setId}#done`);
      const p = loadProgress();
      saveProgress({ ...p, sets: p.sets + 1 });
    }
  }, [quiz]);

  if (!quiz) return null;
  const total = quiz.questions.length;
  const done = quiz.index >= total;
  const q = quiz.questions[quiz.index];
  const answer = quiz.answers[quiz.index];
  const exit = () => dispatch({ type: "endQuiz" });

  if (done) {
    const score = quiz.answers.filter((a) => a?.correct).length;
    const weak = weakSpots(loadProgress());
    return (
      <div className="quiz-card" role="dialog" aria-label="Quiz results">
        <div className="quiz-head">
          <span className="tiny-tag">{setLabel(quiz.setId).toUpperCase()} · RESULTS</span>
          <button className="icon-button" aria-label="Close quiz" onClick={exit}>
            <X size={16} />
          </button>
        </div>
        <div className="quiz-score">
          {score}
          <span> / {total}</span>
        </div>
        <p className="subtle">
          {score === total
            ? "Every answer right. Try another set to keep it that way."
            : "Missed structures are saved as weak spots so you can drill them."}
        </p>
        <div className="quiz-actions">
          {weak.length > 0 && (
            <button className="primary-button" onClick={() => onStart("weak")}>
              Practice weak spots ({weak.length})
            </button>
          )}
          <button
            className="outline-button"
            onClick={() => {
              exit();
              dispatch({ type: "setModal", modal: "quiz" });
            }}
          >
            Another set
          </button>
        </div>
      </div>
    );
  }

  const name = q.kind === "evidence" ? null : (partsByKey(q.key)[0]?.name ?? q.key);
  const cite = q.kind === "evidence" ? citationById(q.source) : undefined;

  if (quiz.showing)
    return (
      <div className="quiz-card quiz-banner" role="status">
        <span>
          <Eye size={15} /> Showing the {name}.
        </span>
        <button className="primary-button" onClick={() => dispatch({ type: "quizResume" })}>
          Continue <ArrowRight size={14} />
        </button>
      </div>
    );

  if (q.kind === "find" && !answer)
    return (
      <div className="quiz-card quiz-banner" role="status" aria-live="polite">
        <span>
          <strong>
            {quiz.index + 1}/{total}
          </strong>{" "}
          {q.prompt}
        </span>
        <button
          className="outline-button"
          onClick={() => dispatch({ type: "answerQuiz", answer: { correct: false } })}
        >
          Skip
        </button>
        <button className="icon-button" aria-label="Exit quiz" onClick={exit}>
          <X size={16} />
        </button>
      </div>
    );

  const canShow = q.kind === "find" || q.kind === "fact";
  const pickedName = answer?.pickedId ? partById(answer.pickedId)?.name : undefined;
  return (
    <div className="quiz-card" role="dialog" aria-label="Quiz question">
      <div className="quiz-head">
        <span className="tiny-tag">
          QUESTION {quiz.index + 1} OF {total} · {setLabel(quiz.setId).toUpperCase()}
        </span>
        <button className="icon-button" aria-label="Exit quiz" onClick={exit}>
          <X size={16} />
        </button>
      </div>
      <div className="quiz-progress">
        <div style={{ width: `${((quiz.index + 1) / total) * 100}%` }} />
      </div>
      <h3 className="question">{q.prompt}</h3>
      {q.kind === "identify" && !answer && (
        <p className="subtle">The structure is glowing on the model.</p>
      )}
      {q.kind !== "find" && (
        <div className="quiz-options">
          {q.options.map((o, i) => (
            <button
              key={o}
              disabled={!!answer}
              className={
                answer ? (i === q.correct ? "correct" : i === answer.picked ? "incorrect" : "") : ""
              }
              onClick={() =>
                dispatch({ type: "answerQuiz", answer: { correct: i === q.correct, picked: i } })
              }
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {o}
              {answer && i === q.correct && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
      {answer && (
        <>
          <p className={`answer-explanation ${answer.correct ? "right" : "wrong"}`}>
            {q.kind === "find" &&
              (answer.correct
                ? "Correct. "
                : pickedName
                  ? `That was the ${pickedName}. `
                  : "Skipped. ")}
            {q.explanation}
            {cite && (
              <>
                {" "}
                <a href={citationUrl(cite)} target="_blank" rel="noreferrer">
                  {cite.authors.split(",")[0]} {cite.year} ↗
                </a>
              </>
            )}
          </p>
          <div className="quiz-actions">
            {canShow && (
              <button className="outline-button" onClick={() => dispatch({ type: "quizShow" })}>
                <Eye size={15} /> Show me
              </button>
            )}
            <button className="primary-button" onClick={() => dispatch({ type: "quizNext" })}>
              {quiz.index === total - 1 ? "See results" : "Next"} <ArrowRight size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
