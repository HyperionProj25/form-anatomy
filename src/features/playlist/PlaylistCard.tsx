import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Play,
  Printer,
  Square,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { partById } from "../../data/catalog";
import { displayName } from "../../data/names";
import { MAX_PLAYLIST, MAX_PLAYLIST_TITLE, useStore } from "../../state/store";
import CopyLink from "../shared/CopyLink";

type Props = { onToast: (message: string) => void; onCollapse?: () => void };

/** A teacher's ordered list of structures, in the stage dock. The URL carries the whole list. */
export default function PlaylistCard({ onToast, onCollapse }: Props) {
  const { state, dispatch } = useStore();
  const playlist = state.playlist;
  const step = playlist?.step ?? null;

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "ArrowRight") dispatch({ type: "playlistNext" });
      else if (e.key === "ArrowLeft") dispatch({ type: "playlistPrev" });
      else if (e.key === "Escape") dispatch({ type: "playlistStop" });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, dispatch]);

  if (!playlist) return null;
  const count = playlist.ids.length;
  const nameFor = (id: string) => {
    const part = partById(id);
    return part ? displayName(part, state.names) : id;
  };

  return (
    <div className="playlist-card" aria-label="Playlist">
      <div className="playlist-head">
        <ListMusic size={14} />
        <input
          aria-label="Playlist title"
          placeholder="Name this playlist…"
          value={playlist.title}
          maxLength={MAX_PLAYLIST_TITLE}
          onChange={(e) => dispatch({ type: "playlistTitle", title: e.target.value })}
        />
        <span className="card-buttons">
          {onCollapse && (
            <button className="icon-button" aria-label="Fold the playlist card" onClick={onCollapse}>
              <ChevronDown size={14} />
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Clear playlist"
            title="Remove every structure from the playlist"
            onClick={() => dispatch({ type: "playlistClear" })}
          >
            <X size={14} />
          </button>
        </span>
      </div>
      <ol className="playlist-items">
        {playlist.ids.map((id, i) => {
          const name = nameFor(id);
          return (
            <li key={id} className={i === step ? "active" : ""}>
              <button
                className="playlist-item"
                title={name}
                aria-current={i === step ? "step" : undefined}
                onClick={() => dispatch({ type: "playlistPlay", step: i })}
              >
                <span className="playlist-index">{i + 1}</span>
                {name}
              </button>
              <button
                aria-label={`Remove ${name} from playlist`}
                onClick={() => dispatch({ type: "playlistRemove", id })}
              >
                <X size={12} />
              </button>
            </li>
          );
        })}
      </ol>
      <div className="playlist-controls">
        {step === null ? (
          <button className="primary-button" onClick={() => dispatch({ type: "playlistPlay", step: 0 })}>
            <Play size={13} /> Play
          </button>
        ) : (
          <>
            <button
              className="outline-button"
              aria-label="Previous structure"
              disabled={step === 0}
              onClick={() => dispatch({ type: "playlistPrev" })}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="playlist-status" aria-live="polite">
              {step + 1} / {count}
            </span>
            <button
              className="outline-button"
              aria-label="Next structure"
              disabled={step >= count - 1}
              onClick={() => dispatch({ type: "playlistNext" })}
            >
              <ChevronRight size={14} />
            </button>
            <button className="outline-button" onClick={() => dispatch({ type: "playlistStop" })}>
              <Square size={12} /> Stop
            </button>
          </>
        )}
        <CopyLink onCopied={onToast} label="Copy playlist link" />
        <button
          className="text-button"
          title="A printable study sheet with the facts for every structure in this list"
          onClick={() => dispatch({ type: "setModal", modal: "handout" })}
        >
          <Printer size={14} /> Handout
        </button>
      </div>
      <p className="subtle">
        {count >= MAX_PLAYLIST
          ? `Full: ${MAX_PLAYLIST} structures is the limit for one link.`
          : step === null
            ? "Add structures from their detail panel. The link carries the whole list."
            : "Arrow keys step through the list. Esc stops."}
      </p>
    </div>
  );
}
