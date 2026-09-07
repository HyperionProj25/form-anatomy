import { useEffect, useRef, type Dispatch } from "react";
import type { Action, AppState } from "./store";
import { decodeSearch, encodeState } from "./urlCodec";

/** Hydrates the store from the URL once, then mirrors shareable state into the query string (debounced). */
export function useUrlSync(state: AppState, dispatch: Dispatch<Action>) {
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const partial = decodeSearch(window.location.search);
    if (Object.keys(partial).length) dispatch({ type: "hydrate", state: partial });
  }, [dispatch]);

  const encoded = encodeState(state);
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = window.setTimeout(() => {
      const next = window.location.pathname + encoded + window.location.hash;
      if (next !== window.location.pathname + window.location.search + window.location.hash)
        window.history.replaceState(null, "", next);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [encoded]);
}
