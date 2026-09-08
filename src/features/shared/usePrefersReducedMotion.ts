import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function mediaList(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY)
    : null;
}

/** Whether the system asks for reduced motion right now. */
export function prefersReducedMotion(): boolean {
  return mediaList()?.matches ?? false;
}

function subscribe(onChange: () => void): () => void {
  const list = mediaList();
  if (!list) return () => {};
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** Tracks the reduced-motion preference so cards can say what it turns off. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
