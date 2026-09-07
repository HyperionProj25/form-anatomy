import type { CitationId } from "./research";
import type { LineId } from "./lines";

/** Muscles at undergraduate anatomy scope. Catalog keys; every one exists (tests enforce it). */
export const QUIZ_MUSCLES: string[] = [
  "frontalis-muscle",
  "occipitalis-muscle",
  "orbicularis-oris-muscle",
  "superficial-part-of-masseter",
  "temporalis-muscle",
  "sternocleidomastoid-muscle",
  "platysma",
  "scalenus-anterior-muscle",
  "splenius-capitis-muscle",
  "descending-part-of-trapezius-muscle",
  "transverse-part-of-trapezius-muscle",
  "ascending-part-of-trapezius-muscle",
  "latissimus-dorsi-muscle",
  "rhomboid-major-muscle",
  "levator-scapulae",
  "acromial-part-of-deltoid-muscle",
  "supraspinatus-muscle",
  "infraspinatus-muscle",
  "teres-minor-muscle",
  "teres-major-muscle",
  "subscapularis-muscle",
  "sternocostal-head-of-pectoralis-major-muscle",
  "pectoralis-minor-muscle",
  "serratus-anterior-muscle",
  "long-head-of-biceps-brachii",
  "brachialis-muscle",
  "long-head-of-triceps-brachii",
  "coracobrachialis-muscle",
  "brachioradialis-muscle",
  "superficial-head-of-pronator-teres",
  "flexor-carpi-radialis",
  "palmaris-longus-muscle",
  "humeral-head-of-flexor-carpi-ulnaris",
  "flexor-digitorum-profundus",
  "extensor-carpi-radialis-longus",
  "extensor-digitorum",
  "humeral-head-of-extensor-carpi-ulnaris",
  "supinator",
  "rectus-abdominis-muscle",
  "external-abdominal-oblique-muscle",
  "internal-abdominal-oblique-muscle",
  "transversus-abdominis-muscle",
  "external-intercostal-muscles",
  "internal-intercostal-muscles",
  "diaphragm",
  "iliocostalis-lumborum-muscle",
  "longissimus-thoracis-muscle",
  "spinalis-thoracis-muscle",
  "multifidus-lumborum-muscle",
  "quadratus-lumborum-muscle",
  "psoas-major",
  "iliacus-muscle",
  "gluteus-maximus-muscle",
  "gluteus-medius-muscle",
  "gluteus-minimus-muscle",
  "piriformis-muscle",
  "obturator-internus",
  "sartorius-muscle",
  "rectus-femoris-muscle",
  "vastus-lateralis-muscle",
  "vastus-medialis-muscle",
  "vastus-intermedius-muscle",
  "adductor-longus",
  "adductor-magnus",
  "gracilis-muscle",
  "pectineus-muscle",
  "long-head-of-biceps-femoris",
  "semitendinosus-muscle",
  "semimembranosus-muscle",
  "tibialis-anterior-muscle",
  "extensor-digitorum-longus",
  "extensor-hallucis-longus",
  "fibularis-longus-muscle",
  "fibularis-brevis-muscle",
  "lateral-head-of-gastrocnemius",
  "medial-head-of-gastrocnemius",
  "soleus-muscle",
  "plantaris-muscle",
  "tibialis-posterior-muscle",
  "flexor-digitorum-longus",
  "flexor-hallucis-longus",
  "popliteus-muscle",
];

export const QUIZ_BONES: string[] = [
  "frontal-bone",
  "parietal-bone",
  "occipital-bone",
  "temporal-bone",
  "sphenoid-bone",
  "ethmoid-bone",
  "zygomatic-bone",
  "maxilla",
  "mandible",
  "nasal-bone",
  "hyoid-bone",
  "atlas-c1",
  "axis-c2",
  "vertebra-c5",
  "vertebra-t6",
  "vertebra-l3",
  "sacrum",
  "coccyx",
  "manubrium-of-sternum",
  "body-of-sternum",
  "xiphoid-process",
  "first-rib",
  "seventh-rib",
  "clavicle",
  "scapula",
  "humerus",
  "radius",
  "ulna",
  "scaphoid-bone",
  "lunate-bone",
  "capitate-bone",
  "hamate-bone",
  "first-metacarpal-bone",
  "hip-bone",
  "femur",
  "patella",
  "tibia",
  "fibula",
  "talus",
  "calcaneus",
  "navicular-bone",
  "cuboid-bone",
  "medial-cuneiform-bone",
  "first-metatarsal-bone",
];

export type EvidenceQuestion = {
  id: string;
  /** When set, the question belongs to that line's set as well as the mixed set. */
  line?: LineId;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  source: CitationId;
};

/** Hand-written questions on what the fascial-line evidence does and does not show. */
export const EVIDENCE_BANK: EvidenceQuestion[] = [
  {
    id: "continuity-means",
    prompt: "A hop on a line is marked “Verified”. What does that establish?",
    options: [
      "That force is transmitted along the whole line",
      "That at least one human dissection study reported tissue continuity between the two structures",
      "That treating one structure will change the other",
    ],
    correct: 1,
    explanation:
      "Verified means anatomical continuity was reported in cadaver dissection. How much force crosses the link, and whether it matters clinically, are separate questions with separate evidence.",
    source: "wilke2016",
  },
  {
    id: "sfl-none",
    line: "sfl",
    prompt: "Which line had no transition verified in the 2016 dissection review?",
    options: ["Superficial back line", "Superficial front line", "Back functional line"],
    correct: 1,
    explanation:
      "No study confirmed any hop of the superficial front line. The rectus femoris to rectus abdominis hop is a mechanical description, not a tissue link, and the sternalis is absent in most people.",
    source: "wilke2016",
  },
  {
    id: "rf-ra-mechanical",
    line: "sfl",
    prompt: "Why is the rectus femoris to rectus abdominis hop marked “Mechanical only”?",
    options: [
      "The two muscles fuse at the pubis in every specimen",
      "Myers describes it as a lever across the pelvis rather than tissue continuity, so no continuity search was made",
      "The review found conflicting dissection results",
    ],
    correct: 1,
    explanation:
      "The 2016 review notes there is no structural connection between the two muscles; the model treats the hop as purely mechanical.",
    source: "wilke2016",
  },
  {
    id: "sl-count",
    line: "sl",
    prompt: "How many of the spiral line's nine hops did the 2016 review verify?",
    options: ["Two", "Five", "Nine"],
    correct: 1,
    explanation:
      "Five of nine, based on 21 studies: the trunk spiral and the posterior leg are supported; the neck, hip and lower-leg hops are not.",
    source: "wilke2016",
  },
  {
    id: "sbl-force",
    line: "sbl",
    prompt:
      "According to Krause et al. 2016, which line showed moderate evidence of force transfer at all of its tested transitions?",
    options: ["Superficial back line", "Front functional line", "Lateral line"],
    correct: 0,
    explanation:
      "Six studies gave moderate evidence for force transfer at all three superficial back line transitions. The front functional line had one study showing a slight, non-significant transfer.",
    source: "krause2016",
  },
  {
    id: "quads-null",
    prompt:
      "Two in vivo studies of the human quadriceps (Freitas 2019, Héroux 2021) found that passive stretching of one muscle…",
    options: [
      "stiffened its neighbours strongly",
      "produced little or no measurable force transmission to neighbouring muscles",
      "changed knee range of motion by more than 20 degrees",
    ],
    correct: 1,
    explanation:
      "Both found negligible passive epimuscular force transmission between rectus femoris and the vasti, with a small variable effect in a minority of people.",
    source: "heroux2021",
  },
  {
    id: "remote-stretch",
    line: "sbl",
    prompt:
      "In the 2017 randomised trial, remote lower-limb stretching compared with local neck stretching…",
    options: [
      "increased cervical range of motion about as much, but the effect was not direction-specific",
      "had no effect on cervical range of motion",
      "worked only in the sagittal plane",
    ],
    correct: 0,
    explanation:
      "Both stretching groups beat the control group in all planes with no difference between them, so the mechanism behind the remote effect remains open.",
    source: "wilke2017",
  },
  {
    id: "meta-2026",
    line: "sbl",
    prompt:
      "The 2026 meta-analysis of remote manual therapy along the superficial back line found…",
    options: [
      "large pain reductions with high certainty",
      "a moderate flexibility improvement and a borderline, non-significant trend in pain",
      "no effect on flexibility",
    ],
    correct: 1,
    explanation:
      "Nine trials pooled to Hedges' g 0.53 for flexibility (moderate certainty); pain showed a trend only (low certainty).",
    source: "lin2026",
  },
  {
    id: "ll-itt",
    line: "ll",
    prompt:
      "On the lateral line, which structure connects gluteus maximus and tensor fasciae latae consistently across five studies?",
    options: ["Iliotibial tract", "Sacrotuberous ligament", "Thoracolumbar fascia"],
    correct: 0,
    explanation:
      "Five studies found a consistent connection of both muscles to the iliotibial tract. The tract itself is not separately modeled in this atlas.",
    source: "wilke2016",
  },
  {
    id: "plantar-age",
    line: "sbl",
    prompt: "What did dissection studies find about the plantar fascia to calcaneal tendon link?",
    options: [
      "Present in every specimen at every age",
      "Present in all specimens in two studies, but diminishing with age in two others",
      "Never present",
    ],
    correct: 1,
    explanation:
      "Kamel and Stecco reported continuity in all cases; Snow and Kim found the link thins with increasing age.",
    source: "wilke2016",
  },
  {
    id: "bfl-crossing",
    line: "bfl",
    prompt: "Where does the back functional line cross the midline?",
    options: ["At the thoracolumbar fascia", "At the sacrotuberous ligament", "At the linea alba"],
    correct: 0,
    explanation:
      "Latissimus dorsi fuses into the posterior layer of the lumbar fascia, and the opposite gluteus maximus fuses into the same layer.",
    source: "wilke2016",
  },
  {
    id: "ffl-pair",
    line: "ffl",
    prompt: "Which pair belongs to the front functional line?",
    options: [
      "Pectoralis major and the opposite rectus abdominis",
      "Tibialis anterior and deltoid",
      "Pectoralis major and soleus",
    ],
    correct: 0,
    explanation:
      "Three studies found the pectoral fascia fusing with the contralateral rectus abdominis in every specimen.",
    source: "wilke2016",
  },
  {
    id: "fascia-contract",
    prompt:
      "Schleip et al. 2019 showed fascia can contract through myofibroblasts. How large is that force?",
    options: [
      "Comparable to skeletal muscle",
      "Below what would stabilise the spine mechanically, but possibly enough to influence motor coordination",
      "Zero in human tissue",
    ],
    correct: 1,
    explanation:
      "The predicted forces in human lumbar tissue fall below the threshold for mechanical spinal stability but might alter motoneuronal coordination.",
    source: "schleip2019",
  },
  {
    id: "innervation",
    prompt: "The 2022 systematic review of fascial innervation concluded that deep fasciae are…",
    options: [
      "essentially free of nerve endings",
      "well innervated, mainly by proprioceptors and nociceptors, with more nociceptors in pathological fascia",
      "innervated only in animals",
    ],
    correct: 1,
    explanation:
      "Twenty-three studies, ten in humans, found precise, well-distributed innervation ranging from free nerve endings to Pacini and Ruffini corpuscles.",
    source: "suarez2022",
  },
  {
    id: "gastroc-joints",
    line: "sbl",
    prompt: "Which calf muscle crosses both the knee and the ankle?",
    options: ["Soleus", "Gastrocnemius", "Tibialis anterior"],
    correct: 1,
    explanation:
      "Gastrocnemius arises from the femoral condyles and inserts through the calcaneal tendon, crossing both joints. Soleus arises below the knee.",
    source: "openstax",
  },
];
