import type { Layer, PartType, Region, Vec3 } from "./types";

export const REGION_LABELS: Record<Region, string> = {
  "head-neck": "Head & neck",
  back: "Back",
  thorax: "Thorax",
  "abdomen-pelvis": "Abdomen & pelvis",
  "shoulder-arm": "Shoulder & arm",
  "forearm-hand": "Forearm & hand",
  "hip-thigh": "Hip & thigh",
  "leg-foot": "Leg & foot",
};

export const REGION_ORDER: Region[] = [
  "head-neck",
  "back",
  "thorax",
  "abdomen-pelvis",
  "shoulder-arm",
  "forearm-hand",
  "hip-thigh",
  "leg-foot",
];

/** Manual overrides by side-agnostic key. Wins over every other rule. */
export const REGION_OVERRIDES: Record<string, Region> = {};

/** Ordered keyword rules; the first regex that matches the lowercased "name | group" string wins. */
const REGION_RULES: [RegExp, Region][] = [
  // Head and neck: face, jaw, eye, tongue, pharynx, larynx, neck, skull, cervical spine.
  [
    /\b(capitis|colli|cervic\w*|scalen\w*|sternocleidomastoid|hyoid|digastric|mylohyoid|geniohyoid|stylohyoid|omohyoid|thyro\S*|crico\S*|arytenoid|epiglott\w*|pharyng\w*|palat\w*|glossus|masseter|pterygoid|temporalis|bucinator|buccinator|orbicularis|zygomatic\w*|levator (labii|anguli|palpebrae|veli)|depressor|mentalis|risorius|nasalis|procerus|frontalis|occipitalis|epicranial|corrugator|platysma|temporoparietalis|rectus (superior|inferior|medial|lateral)|(superior|inferior) oblique muscle|tarsus|trochlea|tendinous ring|splenius|longus (colli|capitis)|obliquus|skull|cranium|parietal bone|frontal bone|occipital bone|temporal bone|sphenoid|ethmoid|nasal|lacrimal|maxilla|mandible|palatine|vomer|concha|incisor|canine|premolar|molar|tooth|teeth|malleus|incus|stapes|atlas|axis|cartilage of|septal|alar|cricoid|thyroid|corniculate|larynx|tympani)\b/,
    "head-neck",
  ],
  // Thorax: breathing muscles and the rib cage.
  [/\b(intercostal\w*|transversus thoracis|subcostal\w*|diaphragm|rib|ribs|costal cartilage|sternum|manubrium|xiphoid|levatores)\b/, "thorax"],
  // Back: intrinsic back muscles, scapular retractors, the vertebral column below the neck.
  [
    /\b(erector|iliocostalis|longissimus|spinalis|multifidus|rotatores|semispinalis|interspinales|intertransversarii|trapezius|latissimus|rhomboid|levator scapulae|serratus posterior|quadratus lumborum|vertebra\w*|thoracic|lumbar|sacrum|sacral|coccyx)\b/,
    "back",
  ],
  // Shoulder and arm: shoulder girdle, rotator cuff, upper arm.
  [
    /\b(deltoid|pectoralis|serratus anterior|subclavius|supraspinatus|infraspinatus|teres|subscapularis|coracobrachialis|biceps brachii|triceps|brachialis|anconeus|humerus|scapula\w*|clavicle|clavicular|acromial|subacromial|subdeltoid|coracobrachial|bicipitoradial|intertubercular)\b/,
    "shoulder-arm",
  ],
  // Forearm and hand.
  [
    /\b(brachioradialis|pronator|supinator|flexor carpi|extensor carpi|flexor digitorum (superficialis|profundus)|extensor digitorum$|extensor digiti minimi|extensor indicis|pollicis|palmaris|palmar|opponens|of hand|hand$|digits? of hand|manus|radius|ulna|carpal|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|metacarpal|finger of hand|flexor digiti minimi of hand|abductor digiti minimi of hand)\b/,
    "forearm-hand",
  ],
  // Abdomen and pelvis: abdominal wall, pelvic floor, pelvic bones.
  [/\b(rectus abdominis|abdominal oblique|transversus abdominis|pyramidalis|linea alba|cremaster|levator ani|coccygeus|pelvic|hip bone|ilium|ischium|pubis|pubic|inguinal)\b/, "abdomen-pelvis"],
  // Hip and thigh.
  [
    /\b(gluteus|gluteal|tensor fascia\w*|piriformis|obturator|gemellus|quadratus femoris|iliacus|psoas|iliopectineal|sartorius|rectus femoris|vastus|quadriceps|adductor (longus|brevis|magnus|minimus)|gracilis|pectineus|biceps femoris|semitendinosus|semimembranosus|hamstring|femur|patella|patellar|iliotibial|trochanteric|anserine|sciatic)\b/,
    "hip-thigh",
  ],
  // Leg and foot.
  [
    /\b(gastrocnemius|soleus|plantaris|popliteus|tibialis|fibularis|peroneus|(extensor|flexor) (digitorum|hallucis) (longus|brevis)|hallucis|of foot|foot$|quadratus plantae|plantar|tibia|fibula|calcaneus|calcaneal|talus|navicular|cuboid|cuneiform|metatarsal|finger of foot|malleolus|sesamoid|tuberosity of tibia|infrapatellar|prepatellar|suprapatellar)\b/,
    "leg-foot",
  ],
];

export type Extents = { minY: number; maxY: number };

/**
 * Region by manual override, then keyword rules on "name | group", then geometry.
 * Geometry bands are fractions of model height measured from the soles:
 * crown 1.0, shoulders ~0.83, elbows ~0.62, pubis ~0.50, knees ~0.28.
 */
export function classifyRegion(
  name: string,
  group: string | undefined,
  centroid: Vec3,
  extents: Extents,
): Region {
  const key = slugify(name);
  if (REGION_OVERRIDES[key]) return REGION_OVERRIDES[key];
  const text = `${name} | ${group ?? ""}`.toLowerCase();
  for (const [re, region] of REGION_RULES) if (re.test(text)) return region;

  const [x, y, z] = centroid;
  const height = extents.maxY - extents.minY;
  const u = (y - extents.minY) / height;
  const lateral = Math.abs(x);
  if (u > 0.83) return "head-neck";
  if (lateral > 0.16 && u >= 0.4) return u > 0.615 ? "shoulder-arm" : "forearm-hand";
  if (u > 0.5) {
    if (z < -0.04) return "back";
    return u > 0.68 ? "thorax" : "abdomen-pelvis";
  }
  if (u > 0.275) return "hip-thigh";
  return "leg-foot";
}

const DEEP_RULES =
  /\b(supraspinatus|infraspinatus|teres minor|subscapularis|multifidus|rotatores|semispinalis|interspinales|intertransversarii|levatores|rectus (anterior|lateralis|posterior) (major |minor )?capitis|obliquus|scalen\w*|longus (colli|capitis)|internal intercostal|innermost intercostal|transversus thoracis|subcostal\w*|diaphragm|transversus abdominis|quadratus lumborum|internal abdominal oblique|iliacus|psoas|piriformis|obturator|gemellus|quadratus femoris|vastus intermedius|adductor (brevis|magnus)|popliteus|soleus|tibialis posterior|flexor (digitorum|hallucis) longus|flexor digitorum profundus|flexor pollicis longus|pronator quadratus|supinator|abductor pollicis longus|extensor pollicis (brevis|longus)|extensor indicis|interossei|lumbrical\w*|quadratus plantae|deep head|deep part|pterygoid|genioglossus|hyoglossus|geniohyoid|mylohyoid|constrictor|arytenoid|crico\S*|thyro-arytenoid|levator palpebrae|rectus (superior|inferior|medial|lateral)|(superior|inferior) oblique muscle|gluteus minimus|brachialis|pectoralis minor|subclavius|serratus anterior|levator scapulae|rhomboid)\b/;

/** Approximate depth: curated deep muscles are deep; everything else (including bones) is superficial. */
export function classifyLayer(name: string, type: PartType): Layer {
  if (type !== "muscle") return "superficial";
  return DEEP_RULES.test(name.toLowerCase()) ? "deep" : "superficial";
}

/** "Lateral Head Of Gastrocnemius" -> "lateral-head-of-gastrocnemius". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
