import { partForSide } from "./catalog";
import type { Side } from "./types";
import type { CitationId } from "./research";

export type LineId = "sbl" | "sfl" | "ll" | "sl" | "bfl" | "ffl";
export type ViewPreset = "front" | "back" | "side";
export type EvidenceStatus = "verified" | "not-verified" | "mechanical" | "not-assessed";

/** Offset in side-relative model units: lateral (away from the midline), up, forward. */
export type Anchor = { key: string; offset: [number, number, number] };

export type Transition = {
  status: EvidenceStatus;
  /** Dissection studies reporting the continuity (Wilke 2016, Table 3). */
  studies: number;
  /** Cumulative specimens in those studies, when reported. */
  specimens?: number;
  /** Share of specimens showing the link, as printed, e.g. "51/52". */
  consistency?: string;
  /** General-anatomy studies consulted when no continuity study existed. */
  generalAnatomyStudies?: number;
  note: string;
  source: CitationId;
  /** Unmodelled tissue the hop passes through; used as a cable waypoint. */
  via?: { name: string; anchor: Anchor };
};

export type Stop = {
  name: string;
  /** Catalog key of the part that stands for this stop; null when the model lacks it. */
  key: string | null;
  /** Extra catalog keys highlighted with this stop. */
  keys?: string[];
  /** Required when key is null: where the cable and tour camera should go. */
  anchor?: Anchor;
  note: string;
  /** This stop sits on the opposite body side from the previous one. */
  crosses?: boolean;
  /** Camera direction for the tour; defaults to the line view. */
  view?: ViewPreset;
  /** The hop from this stop to the next one. Absent on the last stop. */
  transition?: Transition;
};

export type Line = {
  id: LineId;
  name: string;
  subtitle: string;
  color: string;
  view: ViewPreset;
  description: string;
  movement: string;
  evidence: {
    grade: "strong" | "moderate" | "none";
    summary: string;
    source: CitationId;
    forceTransfer?: { summary: string; source: CitationId };
  };
  path: Stop[];
};

const W: CitationId = "wilke2016";
const K: CitationId = "krause2016";

const SACROTUBEROUS: NonNullable<Transition["via"]> = {
  name: "Sacrotuberous ligament",
  anchor: { key: "hip-bone", offset: [0, -0.05, -0.03] },
};
const ERECTOR_KEYS = [
  "iliocostalis-lumborum-muscle",
  "iliocostalis-thoracis-muscle",
  "spinalis-thoracis-muscle",
];

export const lines: Line[] = [
  {
    id: "sbl",
    name: "Superficial back line",
    subtitle: "From sole to scalp",
    color: "#bd914b",
    view: "back",
    description:
      "A proposed chain along the back of the body linking the plantar tissues, calf, posterior thigh, sacrotuberous ligament and spinal extensors, continued by Myers over the scalp.",
    movement:
      "During a forward bend with straight knees, hip flexion and ankle position change the length and loading of posterior tissues. Joint positions and the nervous system also influence available range.",
    evidence: {
      grade: "strong",
      summary:
        "All three reviewed transitions were verified in 14 dissection studies. The calf-to-thigh and thigh-to-spine links are consistent; the plantar fascia link was present in every specimen in two studies but thins with age in two others.",
      source: W,
      forceTransfer: {
        summary:
          "Moderate evidence that tension transfers at all three transitions, based on six studies.",
        source: K,
      },
    },
    path: [
      {
        name: "Plantar fascia",
        key: null,
        anchor: { key: "calcaneus", offset: [0, -0.02, 0.08] },
        note: "Connective tissue beneath the foot; not separately modeled",
        view: "side",
        transition: {
          status: "verified",
          studies: 4,
          specimens: 72,
          consistency: "25/72",
          note: "Kamel and Stecco report continuity to the calcaneal tendon in every case; Snow and Kim found the link diminishes with age.",
          source: W,
        },
      },
      {
        name: "Gastrocnemius",
        key: "lateral-head-of-gastrocnemius",
        keys: ["medial-head-of-gastrocnemius"],
        note: "Superficial calf muscle; shares the calcaneal (Achilles) tendon",
        transition: {
          status: "verified",
          studies: 5,
          specimens: 57,
          consistency: "51/52",
          note: "Four studies link semitendinosus to gastrocnemius; one links semimembranosus instead.",
          source: W,
        },
      },
      {
        name: "Hamstrings",
        key: "long-head-of-biceps-femoris",
        keys: ["short-head-of-biceps-femoris", "semitendinosus-muscle", "semimembranosus-muscle"],
        note: "Posterior thigh",
        transition: {
          status: "verified",
          studies: 5,
          specimens: 122,
          consistency: "99/122 (biceps femoris)",
          note: "Biceps femoris blends into the sacrotuberous ligament and on to the erector spinae. Vleeming found the continuity in 41 percent of specimens; three other groups in all cases.",
          source: W,
          via: SACROTUBEROUS,
        },
      },
      {
        name: "Erector spinae",
        key: "longissimus-thoracis-muscle",
        keys: ERECTOR_KEYS,
        note: "Lumbar fascia and spinal extensors",
        transition: {
          status: "not-assessed",
          studies: 0,
          note: "Myers continues the line over the occiput to the scalp. The 2016 review stopped at the erector spinae and did not assess this hop.",
          source: W,
        },
      },
      {
        name: "Epicranial aponeurosis",
        key: "epicranial-aponeurosis",
        keys: ["occipitalis-muscle", "frontalis-muscle"],
        note: "Scalp fascia between occipitalis and frontalis",
      },
    ],
  },
  {
    id: "sfl",
    name: "Superficial front line",
    subtitle: "The anterior perspective",
    color: "#ca735b",
    view: "front",
    description:
      "A teaching model bringing the front of the lower leg, thigh, trunk and neck into one view. Dissection studies have not found the structural links it proposes.",
    movement:
      "Compare their actions: tibialis anterior dorsiflexes the ankle; rectus femoris extends the knee and flexes the hip; rectus abdominis flexes the trunk. A line does not mean every muscle shares one action.",
    evidence: {
      grade: "none",
      summary:
        "No transition was verified. The rectus femoris to rectus abdominis hop is mechanical rather than structural by Myers' own description, and the sternalis muscle that would bridge trunk and neck is present in only a minority of people.",
      source: W,
    },
    path: [
      {
        name: "Tibialis anterior & toe extensors",
        key: "tibialis-anterior-muscle",
        keys: ["extensor-digitorum-longus", "extensor-hallucis-longus"],
        note: "Anterior lower leg",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 2,
          specimens: 27,
          note: "No dissection study reports continuity with rectus femoris; two general-anatomy studies of the knee found no morphologic link.",
          source: W,
        },
      },
      {
        name: "Rectus femoris",
        key: "rectus-femoris-muscle",
        note: "Anterior thigh; the patellar tendon lies below it",
        transition: {
          status: "mechanical",
          studies: 0,
          note: "Described by Myers as a mechanical hop across the pelvis rather than tissue continuity, so the review did not search for it. There is no structural connection between rectus femoris and rectus abdominis.",
          source: W,
        },
      },
      {
        name: "Rectus abdominis",
        key: "rectus-abdominis-muscle",
        note: "Anterior abdominal wall",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 5,
          specimens: 496,
          note: "Five studies of the sternalis muscle found no link to rectus abdominis. The sternalis exists in only a small share of people.",
          source: W,
        },
      },
      {
        name: "Sternalis",
        key: null,
        anchor: { key: "body-of-sternum", offset: [0.02, 0, 0.02] },
        note: "Variable chest muscle over the sternum, absent in most people; not modeled",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 5,
          specimens: 496,
          note: "No study demonstrates continuity between sternalis and sternocleidomastoid.",
          source: W,
        },
      },
      {
        name: "Sternocleidomastoid",
        key: "sternocleidomastoid-muscle",
        note: "Anterolateral neck",
      },
    ],
  },
  {
    id: "ll",
    name: "Lateral line",
    subtitle: "Along the sides of the body",
    color: "#7097a4",
    view: "side",
    description:
      "A proposed lateral relationship between the outer lower leg, hip and side of the trunk, useful for comparing structures involved in frontal-plane control.",
    movement:
      "In single-leg stance, hip abductors help control pelvic position. Lateral trunk and ankle muscles also contribute to balance, coordinated by the nervous system.",
    evidence: {
      grade: "moderate",
      summary:
        "Two of five transitions were verified in 10 studies: the hip muscles connect consistently to the iliotibial tract, and one study links that region to the abdominal obliques. Nothing verified joins the lower leg to the hip, or the trunk to the neck.",
      source: W,
    },
    path: [
      {
        name: "Fibularis longus & brevis",
        key: "fibularis-longus-muscle",
        keys: ["fibularis-brevis-muscle"],
        note: "Lateral lower leg",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 2,
          specimens: 47,
          note: "No study links the peroneals to the iliotibial tract. Vieira reports the tract extending into the crural fascia, but not to these muscles.",
          source: W,
        },
      },
      {
        name: "Iliotibial tract & gluteus medius",
        key: "gluteus-medius-muscle",
        note: "Lateral hip; the tract itself is not separately modeled",
        transition: {
          status: "verified",
          studies: 5,
          specimens: 61,
          note: "Five studies found a consistent connection of gluteus maximus and tensor fasciae latae to the iliotibial tract.",
          source: W,
        },
      },
      {
        name: "Tensor fasciae latae & gluteus maximus",
        key: "gluteus-maximus-muscle",
        note: "Posterolateral hip; tensor fasciae latae is not separately modeled",
        transition: {
          status: "verified",
          studies: 1,
          specimens: 29,
          note: "One study reports the external oblique fusing with the fascia lata, whose downward continuation is tensor fasciae latae. No study links gluteus maximus itself to the lateral abdominals.",
          source: W,
        },
      },
      {
        name: "Abdominal obliques",
        key: "external-abdominal-oblique-muscle",
        keys: ["internal-abdominal-oblique-muscle"],
        note: "Lateral abdominal wall",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 2,
          specimens: 80,
          note: "No study reports continuity from the obliques into the intercostals.",
          source: W,
        },
      },
      {
        name: "Intercostals",
        key: "external-intercostal-muscles",
        keys: ["internal-intercostal-muscles"],
        note: "Between the ribs",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 2,
          specimens: 80,
          note: "No study reports continuity from the intercostals to splenius capitis or sternocleidomastoid.",
          source: W,
        },
      },
      {
        name: "Splenius capitis & sternocleidomastoid",
        key: "splenius-capitis-muscle",
        keys: ["sternocleidomastoid-muscle"],
        note: "Neck",
      },
    ],
  },
  {
    id: "sl",
    name: "Spiral line",
    subtitle: "Wrapping the trunk and leg",
    color: "#4f8a8b",
    view: "back",
    description:
      "A proposed spiral from the neck across the back to the opposite shoulder blade, around the ribs and abdomen, then down the lateral thigh and leg and back up the hamstring to the spine.",
    movement:
      "Trunk rotation and the diagonal patterns of walking are where this model is usually applied. Follow the crossings: the path changes body side twice.",
    evidence: {
      grade: "moderate",
      summary:
        "Five of nine transitions were verified in 21 studies. The trunk spiral (rhomboids to serratus anterior to the obliques) and the posterior leg (fibularis longus to biceps femoris to the spine) are supported; the neck, hip and lower-leg hops are not.",
      source: W,
    },
    path: [
      {
        name: "Splenius capitis & cervicis",
        key: "splenius-capitis-muscle",
        keys: ["splenius-colli-muscle"],
        note: "Posterior neck",
        view: "back",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 2,
          specimens: 19,
          note: "No study reports direct continuity with the rhomboids. Two general-anatomy studies describe a fibre crossing at the spinous processes that could suggest fusion.",
          source: W,
        },
      },
      {
        name: "Rhomboids",
        key: "rhomboid-major-muscle",
        keys: ["rhomboid-minor-muscle"],
        note: "Opposite side, between spine and shoulder blade",
        crosses: true,
        view: "back",
        transition: {
          status: "verified",
          studies: 3,
          specimens: 69,
          consistency: "4/4",
          note: "Rhomboid major fuses with serratus anterior along the medial border of the scapula in three studies.",
          source: W,
        },
      },
      {
        name: "Serratus anterior",
        key: "serratus-anterior-muscle",
        note: "Lateral chest wall",
        view: "side",
        transition: {
          status: "verified",
          studies: 3,
          specimens: 68,
          consistency: "40/40",
          note: "Interdigitations with the external oblique at the lateral arch of ribs 5 to 10.",
          source: W,
        },
      },
      {
        name: "External abdominal oblique",
        key: "external-abdominal-oblique-muscle",
        note: "Lateral abdominal wall",
        view: "front",
        transition: {
          status: "verified",
          studies: 5,
          specimens: 417,
          consistency: "245/245",
          note: "The external oblique sends aponeurotic extensions across the midline to the contralateral internal oblique.",
          source: W,
        },
      },
      {
        name: "Internal abdominal oblique",
        key: "internal-abdominal-oblique-muscle",
        note: "Opposite side, deep abdominal wall",
        crosses: true,
        view: "front",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 2,
          specimens: 40,
          note: "No study links the internal oblique to tensor fasciae latae.",
          source: W,
        },
      },
      {
        name: "Tensor fasciae latae & iliotibial tract",
        key: null,
        anchor: { key: "gluteus-minimus-muscle", offset: [0.02, 0, 0.05] },
        note: "Anterolateral hip; not separately modeled",
        view: "side",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 3,
          specimens: 90,
          note: "No study links the iliotibial tract to tibialis anterior.",
          source: W,
        },
      },
      {
        name: "Tibialis anterior",
        key: "tibialis-anterior-muscle",
        note: "Anterior lower leg",
        view: "front",
        transition: {
          status: "not-verified",
          studies: 0,
          generalAnatomyStudies: 3,
          specimens: 132,
          note: "No study links the tibialis anterior tendon to fibularis longus beneath the foot.",
          source: W,
        },
      },
      {
        name: "Fibularis longus",
        key: "fibularis-longus-muscle",
        note: "Lateral lower leg",
        view: "side",
        transition: {
          status: "verified",
          studies: 3,
          specimens: 44,
          consistency: "23/23",
          note: "Biceps femoris sends aponeurotic fibres to the surface of fibularis longus at the fibular head.",
          source: W,
        },
      },
      {
        name: "Biceps femoris",
        key: "long-head-of-biceps-femoris",
        keys: ["short-head-of-biceps-femoris"],
        note: "Lateral hamstring",
        view: "back",
        transition: {
          status: "verified",
          studies: 5,
          specimens: 73,
          consistency: "50/63",
          note: "Continuity through the sacrotuberous ligament to the erector spinae. Findings conflict: Sato reports it in every case, Vleeming in about half.",
          source: W,
          via: SACROTUBEROUS,
        },
      },
      {
        name: "Erector spinae",
        key: "longissimus-thoracis-muscle",
        keys: ERECTOR_KEYS,
        note: "Lumbar fascia and spinal extensors",
        view: "back",
      },
    ],
  },
  {
    id: "bfl",
    name: "Back functional line",
    subtitle: "Across the back and pelvis",
    color: "#809571",
    view: "back",
    description:
      "This model links latissimus dorsi through the thoracolumbar fascia to the opposite gluteus maximus and on to the lateral thigh.",
    movement:
      "Walking coordinates opposite arms and legs. Consider how trunk control, shoulder movement and hip extension cooperate. Both sides are highlighted to compare the crossing relationship.",
    evidence: {
      grade: "strong",
      summary:
        "All three transitions were verified in 8 studies, with the link present in almost every specimen examined.",
      source: W,
      forceTransfer: {
        summary:
          "Moderate evidence of force transfer at one of the two transitions tested, based on three studies.",
        source: K,
      },
    },
    path: [
      {
        name: "Latissimus dorsi",
        key: "latissimus-dorsi-muscle",
        note: "Broad muscle of the back",
        transition: {
          status: "verified",
          studies: 3,
          specimens: 60,
          consistency: "40/40",
          note: "All three studies report the latissimus fusing with the superficial lamina of the posterior layer of the lumbar fascia.",
          source: W,
        },
      },
      {
        name: "Thoracolumbar fascia",
        key: null,
        anchor: { key: "vertebra-l3", offset: [0, 0, -0.04] },
        note: "Lower-back connective tissue; not separately modeled",
        transition: {
          status: "verified",
          studies: 5,
          specimens: 68,
          consistency: "58/58",
          note: "All five studies report gluteus maximus fusing with the same lamina of the lumbar fascia.",
          source: W,
        },
      },
      {
        name: "Opposite gluteus maximus",
        key: "gluteus-maximus-muscle",
        note: "Contralateral posterior hip",
        crosses: true,
        transition: {
          status: "verified",
          studies: 2,
          specimens: 46,
          consistency: "42/46",
          note: "Stern reports continuity to vastus lateralis in all cases; Stecco observed fusion in 2 of 6 specimens.",
          source: W,
        },
      },
      {
        name: "Vastus lateralis",
        key: "vastus-lateralis-muscle",
        note: "Lateral quadriceps",
      },
    ],
  },
  {
    id: "ffl",
    name: "Front functional line",
    subtitle: "Across the chest and pelvis",
    color: "#9e7c9b",
    view: "front",
    description:
      "A proposed diagonal relationship linking the chest, abdominal wall and opposite inner thigh across the front of the body.",
    movement:
      "Throwing combines shoulder motion, trunk rotation and lower-limb support. These structures contribute different actions; coordination does not imply an isolated mechanical chain.",
    evidence: {
      grade: "strong",
      summary: "Both transitions were verified in 6 studies, each in every specimen examined.",
      source: W,
      forceTransfer: {
        summary: "One study found a slight, non-significant force transfer at one transition.",
        source: K,
      },
    },
    path: [
      {
        name: "Pectoralis major",
        key: "sternocostal-head-of-pectoralis-major-muscle",
        keys: [
          "abdominal-part-of-pectoralis-major-muscle",
          "clavicular-head-of-pectoralis-major-muscle",
        ],
        note: "Anterior chest",
        transition: {
          status: "verified",
          studies: 3,
          specimens: 51,
          consistency: "51/51",
          note: "The pectoral fascia fuses with the contralateral rectus abdominis in every specimen.",
          source: W,
        },
      },
      {
        name: "Opposite rectus abdominis",
        key: "rectus-abdominis-muscle",
        note: "Contralateral anterior trunk",
        crosses: true,
        transition: {
          status: "verified",
          studies: 3,
          specimens: 37,
          consistency: "37/37",
          note: "Adductor longus is continuous with the contralateral rectus sheath in every specimen.",
          source: W,
        },
      },
      {
        name: "Opposite adductor longus",
        key: "adductor-longus",
        note: "Medial thigh, back on the first side",
        crosses: true,
      },
    ],
  },
];

export type FascialLine = Line;
export const LINE_IDS = lines.map((l) => l.id) as LineId[];

export function lineById(id: string): Line | undefined {
  return lines.find((l) => l.id === id);
}

/** All catalog keys a line highlights: stop keys plus extras. */
export function lineKeys(line: Line): Set<string> {
  const keys = new Set<string>();
  for (const s of line.path) {
    if (s.key) keys.add(s.key);
    for (const k of s.keys ?? []) keys.add(k);
  }
  return keys;
}

/** Body side of each stop for a path that starts on `start` and flips at every `crosses`. */
export function stopSides(line: Line, start: Side = "right"): Side[] {
  let side: Side = start;
  return line.path.map((s, i) => {
    if (i > 0 && s.crosses) side = side === "right" ? "left" : "right";
    return side;
  });
}

/** The catalog part id that represents a stop on a given side (anchor part when the stop is unmodelled). */
export function stopPartId(stop: Stop, side: Side): string | null {
  const key = stop.key ?? stop.anchor?.key;
  return key ? (partForSide(key, side)?.id ?? null) : null;
}
