import {
  ArrowRight,
  Bone,
  ChevronDown,
  EyeOff,
  Focus,
  ListMinus,
  ListPlus,
  Pin,
  PinOff,
  X,
} from "lucide-react";
import { useState } from "react";
import { partById, partForSide, partsByKey } from "../../data/catalog";
import { attachmentsFor } from "../../data/attachments";
import { factsForWiki } from "../../data/facts";
import { lessons } from "../../data/lessons";
import { lineKeys, lines } from "../../data/lines";
import { displayName, secondaryName } from "../../data/names";
import { REGION_LABELS } from "../../data/regions";
import { useStore } from "../../state/store";
import { ATTACH_COLORS } from "../../viewer/appearance";
import CopyLink from "../shared/CopyLink";

type Props = { describe: (id: string) => string | undefined; onToast: (m: string) => void };

const OPENSTAX = "https://openstax.org/books/anatomy-and-physiology-2e/pages/11-introduction";
const DESCRIPTION_LIMIT = 1200;

export default function DetailPanel({ describe, onToast }: Props) {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<"overview" | "connections">("overview");
  const part = state.selected ? partById(state.selected) : undefined;
  if (!part) return null;
  const text = `${part.name} ${part.group ?? ""}`.toLowerCase();
  const lesson = lessons.find((l) => text.includes(l.match));
  const facts = factsForWiki(part.wiki);
  const description = describe(part.id)
    ?.replace(/\s*https?:\/\/\S+\s*$/, "")
    .trim();
  const related = lines.filter((l) => lineKeys(l).has(part.key));
  const sideLabel = part.side === "left" ? "Left" : part.side === "right" ? "Right" : "Midline";
  const factRows: [string, string | undefined][] = [
    ["ORIGIN", facts?.origin],
    ["INSERTION", facts?.insertion],
    ["ACTION", facts?.action],
    ["INNERVATION", facts?.nerve],
    ["ANTAGONIST", facts?.antagonist],
    ["ARTICULATIONS", facts?.articulations],
  ];
  const hasFacts = factRows.some(([, v]) => v);
  const inPlaylist = state.playlist?.ids.includes(part.id) ?? false;
  const attachments = attachmentsFor(part);
  const boneFor = (key: string) =>
    partForSide(key, part.side === "left" ? "left" : "right") ?? partsByKey(key)[0];
  const attributionUrl = facts?.url ?? part.wiki;

  return (
    <>
      <div className="detail-kicker">
        <span className="tiny-tag">
          {part.type} · {sideLabel} · {REGION_LABELS[part.region]}
        </span>
        <button
          className="icon-button"
          aria-label="Clear selection"
          onClick={() => dispatch({ type: "clearSelection" })}
        >
          <X size={16} />
        </button>
      </div>
      <h2 className="detail-title">{displayName(part, state.names)}</h2>
      <p className="latin">
        {secondaryName(part, state.names) ??
          part.group ??
          (part.type === "muscle" ? `${part.layer} layer (approximate)` : "")}
      </p>
      <div className="detail-actions">
        <button className="outline-button" onClick={() => dispatch({ type: "toggleIsolate" })}>
          <Focus size={15} />
          {state.isolated ? "Show all" : "Isolate"}
        </button>
        <button className="outline-button" onClick={() => dispatch({ type: "hide", id: part.id })}>
          <EyeOff size={15} /> Hide
        </button>
        <button
          className="outline-button"
          onClick={() => dispatch({ type: "togglePin", id: part.id })}
          title="Pin up to four structures in contrasting colors to compare them"
        >
          {state.pinned.includes(part.id) ? <PinOff size={15} /> : <Pin size={15} />}
          {state.pinned.includes(part.id) ? "Unpin" : "Pin"}
        </button>
        <button
          className="outline-button"
          onClick={() =>
            dispatch(
              inPlaylist
                ? { type: "playlistRemove", id: part.id }
                : { type: "playlistAdd", id: part.id },
            )
          }
          title="Build an ordered list of structures for a lesson and share it as one link"
        >
          {inPlaylist ? <ListMinus size={15} /> : <ListPlus size={15} />}
          {inPlaylist ? "Remove from playlist" : "Add to playlist"}
        </button>
      </div>
      <CopyLink onCopied={onToast} />
      <div className="detail-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button
          className={tab === "connections" ? "active" : ""}
          onClick={() => setTab("connections")}
        >
          Connections
        </button>
      </div>
      {tab === "overview" ? (
        <>
          <p className="detail-copy">
            {lesson?.description ||
              `Explore the ${part.name.toLowerCase()} in its anatomical position. Isolate this structure to inspect its shape, or hide it to reveal the structures beneath it.`}
          </p>
          {lesson && (
            <div className="facts">
              <div>
                <span>ATTACHMENTS</span>
                <p>{lesson.attachments}</p>
              </div>
              <div>
                <span>PRIMARY ACTION</span>
                <p>{lesson.action}</p>
              </div>
              <div>
                <span>TRY OBSERVING</span>
                <p>{lesson.observe}</p>
              </div>
            </div>
          )}
          {hasFacts && (
            <div className="facts wiki-facts">
              {factRows.map(
                ([label, value]) =>
                  value && (
                    <div key={label}>
                      <span>{label}</span>
                      <p>{value}</p>
                    </div>
                  ),
              )}
            </div>
          )}
          {attachments && (
            <div className="attachments">
              <div className="section-label">ATTACHMENTS ON THE SKELETON</div>
              {(["origin", "insertion"] as const).map(
                (end) =>
                  attachments[end].length > 0 && (
                    <div className="attachment-row" key={end}>
                      <span className="line-dot" style={{ background: ATTACH_COLORS[end] }} />
                      <span className="attachment-label">{end === "origin" ? "Origin" : "Insertion"}</span>
                      {attachments[end].map((key) => {
                        const bone = boneFor(key);
                        return (
                          bone && (
                            <button
                              key={key}
                              className="attachment-chip"
                              title={`Select the ${bone.name}`}
                              onClick={() => dispatch({ type: "select", id: bone.id })}
                            >
                              {bone.name}
                            </button>
                          )
                        );
                      })}
                    </div>
                  ),
              )}
              <button
                className="outline-button"
                aria-pressed={state.attach}
                onClick={() => dispatch({ type: "toggleAttach" })}
              >
                <Bone size={15} /> {state.attach ? "Hide on model" : "Show on model"}
              </button>
              <p className="subtle">Matched from the attachment text by bone name. Approximate.</p>
            </div>
          )}
          {description && (
            <details className="description-expander">
              <summary>
                About this structure <ChevronDown size={14} />
              </summary>
              <p>
                {description.length > DESCRIPTION_LIMIT
                  ? description.slice(0, DESCRIPTION_LIMIT) + "…"
                  : description}
              </p>
            </details>
          )}
          {(hasFacts || description) && attributionUrl && (
            <p className="attribution">
              Text adapted from{" "}
              <a href={attributionUrl} target="_blank" rel="noreferrer">
                Wikipedia
              </a>
              , CC BY-SA 4.0.
            </p>
          )}
          <a className="source-link" href={part.wiki || OPENSTAX} target="_blank" rel="noreferrer">
            Read anatomy reference <ArrowRight size={14} />
          </a>
        </>
      ) : (
        <>
          <p className="detail-copy">
            {lesson?.connection ||
              "Muscles transmit force through tendons and connective tissue. Bones provide attachment sites and act as levers around joints. Explore the fascial-line models to study relationships across regions."}
          </p>
          {related.map((l) => (
            <button
              className="related-line"
              key={l.id}
              onClick={() => {
                dispatch({ type: "setMode", mode: "fascia" });
                dispatch({ type: "setLine", line: l.id });
              }}
            >
              <span className="line-dot" style={{ background: l.color }} />
              {l.name}
              <ArrowRight size={15} />
            </button>
          ))}
        </>
      )}
    </>
  );
}
