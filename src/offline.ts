const MODEL_CACHE = "form-model";
const TOAST_KEY = "form.offline.v1";

/** True when the model is in the runtime cache (fetching it through the service worker if needed). */
export async function ensureModelCached(url: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("caches" in window)) return false;
  try {
    await navigator.serviceWorker.ready;
    const cache = await caches.open(MODEL_CACHE);
    if (await cache.match(url)) return true;
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return false;
    if (!(await cache.match(url))) await cache.put(url, res.clone());
    return true;
  } catch {
    return false;
  }
}

/** Show the "available offline" notice only once per browser. */
export function shouldAnnounceOffline(): boolean {
  try {
    if (localStorage.getItem(TOAST_KEY)) return false;
    localStorage.setItem(TOAST_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
