/**
 * Functional muscle groups for the swing report (spec section 17). Keys are catalog keys; each
 * side of the body is reported separately. A muscle may sit in more than one group when it does
 * more than one job (rectus femoris flexes the hip and extends the knee).
 */
export type MuscleGroup = {
  id: string;
  label: string;
  /** Where on the body, for ordering the report from the ground up. */
  region: "leg" | "hip" | "trunk" | "shoulder" | "arm";
  keys: string[];
};

export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: "calf",
    label: "Calf (plantar flexors)",
    region: "leg",
    keys: [
      "lateral-head-of-gastrocnemius",
      "medial-head-of-gastrocnemius",
      "soleus-muscle",
      "plantaris-muscle",
      "tibialis-posterior-muscle",
      "fibularis-longus-muscle",
      "fibularis-brevis-muscle",
      "flexor-hallucis-longus",
      "flexor-digitorum-longus",
    ],
  },
  {
    id: "shin",
    label: "Shin (dorsiflexors)",
    region: "leg",
    keys: ["tibialis-anterior-muscle", "extensor-digitorum-longus", "extensor-hallucis-longus", "fibularis-tertius-muscle"],
  },
  {
    id: "knee-extensors",
    label: "Knee extensors (quadriceps)",
    region: "leg",
    keys: ["rectus-femoris-muscle", "vastus-lateralis-muscle", "vastus-medialis-muscle", "vastus-intermedius-muscle"],
  },
  {
    id: "knee-flexors",
    label: "Knee flexors (hamstrings and helpers)",
    region: "leg",
    keys: [
      "long-head-of-biceps-femoris",
      "short-head-of-biceps-femoris",
      "semitendinosus-muscle",
      "semimembranosus-muscle",
      "popliteus-muscle",
      "gracilis-muscle",
      "sartorius-muscle",
    ],
  },
  {
    id: "hip-extensors",
    label: "Hip extensors (gluteus maximus, hamstrings)",
    region: "hip",
    keys: ["gluteus-maximus-muscle", "long-head-of-biceps-femoris", "semitendinosus-muscle", "semimembranosus-muscle", "adductor-magnus"],
  },
  {
    id: "hip-flexors",
    label: "Hip flexors",
    region: "hip",
    keys: ["iliacus-muscle", "psoas-major", "rectus-femoris-muscle", "sartorius-muscle", "pectineus-muscle"],
  },
  {
    id: "hip-adductors",
    label: "Hip adductors",
    region: "hip",
    keys: ["adductor-longus", "adductor-brevis", "adductor-magnus", "gracilis-muscle", "pectineus-muscle"],
  },
  {
    id: "hip-abductors-rotators",
    label: "Hip abductors and rotators",
    region: "hip",
    keys: [
      "gluteus-medius-muscle",
      "gluteus-minimus-muscle",
      "piriformis-muscle",
      "obturator-internus",
      "obturator-externus",
      "superior-gemellus-muscle",
      "inferior-gemellus-muscle",
      "quadratus-femoris-muscle",
    ],
  },
  {
    id: "trunk-rotators",
    label: "Trunk rotators (obliques)",
    region: "trunk",
    keys: ["external-abdominal-oblique-muscle", "internal-abdominal-oblique-muscle", "transversus-abdominis-muscle"],
  },
  { id: "trunk-flexors", label: "Trunk flexors", region: "trunk", keys: ["rectus-abdominis-muscle"] },
  {
    id: "back-extensors",
    label: "Back extensors",
    region: "trunk",
    keys: [
      "iliocostalis-lumborum-muscle",
      "iliocostalis-thoracis-muscle",
      "longissimus-thoracis-muscle",
      "spinalis-thoracis-muscle",
      "multifidus-lumborum-muscle",
      "multifidus-thoracis-muscle",
      "semispinalis-thoracis-muscle",
      "quadratus-lumborum-muscle",
    ],
  },
  {
    id: "shoulder-front",
    label: "Shoulder, front (pectorals, front deltoid)",
    region: "shoulder",
    keys: [
      "clavicular-head-of-pectoralis-major-muscle",
      "sternocostal-head-of-pectoralis-major-muscle",
      "abdominal-part-of-pectoralis-major-muscle",
      "clavicular-part-of-deltoid-muscle",
      "coracobrachialis-muscle",
    ],
  },
  {
    id: "shoulder-back",
    label: "Shoulder, back (latissimus, rear deltoid, cuff)",
    region: "shoulder",
    keys: [
      "latissimus-dorsi-muscle",
      "teres-major-muscle",
      "scapular-spinal-part-of-deltoid-muscle",
      "infraspinatus-muscle",
      "teres-minor-muscle",
    ],
  },
  {
    id: "shoulder-top",
    label: "Shoulder, top (middle deltoid, cuff)",
    region: "shoulder",
    keys: ["acromial-part-of-deltoid-muscle", "supraspinatus-muscle", "subscapularis-muscle"],
  },
  {
    id: "scapula",
    label: "Scapula movers",
    region: "shoulder",
    keys: [
      "descending-part-of-trapezius-muscle",
      "transverse-part-of-trapezius-muscle",
      "ascending-part-of-trapezius-muscle",
      "rhomboid-major-muscle",
      "rhomboid-minor-muscle",
      "serratus-anterior-muscle",
      "pectoralis-minor-muscle",
      "levator-scapulae",
    ],
  },
  {
    id: "elbow-flexors",
    label: "Elbow flexors",
    region: "arm",
    keys: ["long-head-of-biceps-brachii", "short-head-of-biceps-brachii", "brachialis-muscle", "brachioradialis-muscle"],
  },
  {
    id: "elbow-extensors",
    label: "Elbow extensors",
    region: "arm",
    keys: ["long-head-of-triceps-brachii", "lateral-head-of-triceps-brachii", "medial-head-of-triceps-brachii", "anconeus-muscle"],
  },
  {
    id: "forearm",
    label: "Forearm and wrist",
    region: "arm",
    keys: [
      "superficial-head-of-pronator-teres",
      "deep-head-of-pronator-teres",
      "supinator",
      "pronator-quadratus",
      "flexor-carpi-radialis",
      "humeral-head-of-flexor-carpi-ulnaris",
      "ulnar-head-of-flexor-carpi-ulnaris",
      "palmaris-longus-muscle",
      "extensor-carpi-radialis-longus",
      "extensor-carpi-radialis-brevis",
      "humeral-head-of-extensor-carpi-ulnaris",
      "ulnar-head-of-extensor-carpi-ulnaris",
      "humero-ulnar-head-of-flexor-digitorum-superficialis",
      "radial-head-of-flexor-digitorum-superficialis",
      "flexor-digitorum-profundus",
      "extensor-digitorum",
    ],
  },
];

export const REGION_ORDER: MuscleGroup["region"][] = ["leg", "hip", "trunk", "shoulder", "arm"];
