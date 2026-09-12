import { useEffect, useState } from "react";
import { loadSwing, type SwingFile } from "../../data/swings";

/** The swing file for an id, once fetched; null while loading, after a failure, or with no id. */
export function useSwing(id: string | undefined): SwingFile | null {
  const [swing, setSwing] = useState<SwingFile | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    loadSwing(id)
      .then((s) => {
        if (live) setSwing(s);
      })
      .catch(() => {
        // The card stays away; the toolbar still lists the swing for another try.
      });
    return () => {
      live = false;
    };
  }, [id]);
  return swing && swing.id === id ? swing : null;
}
