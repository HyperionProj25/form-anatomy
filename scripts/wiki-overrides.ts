/**
 * Wikipedia articles chosen by hand for parts whose model link is missing or points at a group
 * article when the structure has its own. Keyed by catalog key (no side suffix); values are
 * article titles. Every title was checked to exist with an anatomy infobox on 2026-09-07.
 * `npm run catalog` applies these; `npm run facts` then fetches them.
 */
export const WIKI_OVERRIDES: Record<string, string> = {
  // The model links all four quadriceps parts to the group article; each has its own.
  "rectus-femoris-muscle": "Rectus femoris muscle",
  "vastus-lateralis-muscle": "Vastus lateralis muscle",
  "vastus-medialis-muscle": "Vastus medialis",
  "vastus-intermedius-muscle": "Vastus intermedius muscle",

  // Heads and parts the model left unlinked; they share their muscle's article, like the
  // heads of biceps brachii and gastrocnemius already do.
  "humeral-head-of-flexor-carpi-ulnaris": "Flexor carpi ulnaris muscle",
  "ulnar-head-of-flexor-carpi-ulnaris": "Flexor carpi ulnaris muscle",
  "humeral-head-of-extensor-carpi-ulnaris": "Extensor carpi ulnaris muscle",
  "ulnar-head-of-extensor-carpi-ulnaris": "Extensor carpi ulnaris muscle",
  "humero-ulnar-head-of-flexor-digitorum-superficialis": "Flexor digitorum superficialis muscle",
  "deep-head-of-pronator-teres": "Pronator teres muscle",
  "superficial-head-of-pronator-teres": "Pronator teres muscle",
  "short-head-of-biceps-brachii": "Biceps",
  "short-head-of-biceps-femoris": "Biceps femoris muscle",
  "lateral-head-of-flexor-hallucis-brevis": "Flexor hallucis brevis muscle",
  "medial-head-of-flexor-hallucis-brevis": "Flexor hallucis brevis muscle",
  "oblique-head-of-adductor-hallucis": "Adductor hallucis muscle",
  "transverse-head-of-adductor-hallucis": "Adductor hallucis muscle",
  "multifidus-lumborum-muscle": "Multifidus muscle",
  "multifidus-thoracis-muscle": "Multifidus muscle",
  "oblique-part-of-cricothyroid-muscle": "Cricothyroid muscle",
  "straight-part-of-cricothyroid-muscle": "Cricothyroid muscle",
  "external-part-of-thyro-arytenoid-muscle": "Thyroarytenoid muscle",
  "thyro-epiglottic-part-of-thyro-arytenoid-muscle": "Thyroarytenoid muscle",
  "ary-epiglottic-part-of-oblique-arytenoid-muscle": "Aryepiglottic muscle",
  "dorsal-parts-of-lateral-intertransversarii-lumborum-muscles": "Intertransversarii",
  "ventral-parts-of-lateral-intertransversarii-lumborum-muscles": "Intertransversarii",

  // Whole muscles the model left unlinked.
  "levator-anguli-oris": "Levator anguli oris",
  "levatores-longi-costarum": "Levatores costarum muscles",
  "rectus-anterior-capitis-muscle": "Rectus capitis anterior muscle",
  "rectus-lateralis-capitis-muscle": "Rectus capitis lateralis muscle",
  "lateral-crico-arytenoid-muscle": "Lateral cricoarytenoid muscle",
  "posterior-crico-arytenoid-muscle": "Posterior cricoarytenoid muscle",
  "transverse-arytenoid-muscle": "Arytenoid muscle",

  // Bones and cartilages the model left unlinked.
  "body-of-sternum": "Sternum",
  "manubrium-of-sternum": "Sternum",
  "xiphoid-process": "Xiphoid process",
  "second-rib": "Rib cage",
  "eleventh-rib": "Rib cage",
  "twelfth-rib": "Rib cage",
  "major-alar-cartilage": "Major alar cartilage",
  "trochlea-of-superior-oblique-muscle": "Trochlea of superior oblique",
  ...Object.fromEntries(
    ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"].map(
      (o) => [`costal-cartilage-of-${o}-rib`, "Costal cartilage"],
    ),
  ),
};

export function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}
