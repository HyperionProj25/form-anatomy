export type LineId = "sbl" | "sfl" | "ll" | "bfl" | "ffl";

export const lines = [
  {
    id: "sbl" as const,
    name: "Superficial back line",
    subtitle: "From sole to scalp",
    color: "#bd914b",
    view: "back",
    matches: [
      "gastrocnemius",
      "biceps femoris",
      "semitendinosus",
      "semimembranosus",
      "erector",
      "iliocostalis",
      "longissimus",
      "spinalis",
    ],
    description:
      "Explore a proposed chain along the back of the body, linking plantar tissues, calf, posterior thigh and spinal extensors.",
    path: [
      {
        name: "Plantar fascia",
        match: "plantar aponeurosis",
        note: "Connective tissue beneath the foot",
      },
      {
        name: "Gastrocnemius",
        match: "gastrocnemius",
        note: "Superficial calf muscle",
      },
      { name: "Hamstrings", match: "biceps femoris", note: "Posterior thigh" },
      {
        name: "Spinal extensors",
        match: "longissimus",
        note: "Along the vertebral column",
      },
    ],
    movement:
      "During a forward bend with straight knees, hip flexion and ankle position change the length and loading of posterior tissues. Joint positions and the nervous system also influence available range.",
    evidence:
      "A 2016 systematic review supported the studied connections of this chain. This does not establish one continuous cable from sole to scalp or uniform force transmission.",
  },
  {
    id: "sfl" as const,
    name: "Superficial front line",
    subtitle: "The anterior perspective",
    color: "#ca735b",
    view: "front",
    matches: [
      "tibialis anterior",
      "rectus femoris",
      "rectus abdominis",
      "sternocleidomastoid",
    ],
    description:
      "A teaching model bringing the front of the lower leg, thigh, trunk and neck into a shared anatomical view.",
    path: [
      {
        name: "Tibialis anterior",
        match: "tibialis anterior",
        note: "Anterior lower leg",
      },
      {
        name: "Rectus femoris",
        match: "rectus femoris",
        note: "Anterior thigh",
      },
      {
        name: "Rectus abdominis",
        match: "rectus abdominis",
        note: "Anterior abdominal wall",
      },
      {
        name: "Sternocleidomastoid",
        match: "sternocleidomastoid",
        note: "Anterolateral neck",
      },
    ],
    movement:
      "Compare their actions: tibialis anterior dorsiflexes the ankle; rectus femoris extends the knee and flexes the hip; rectus abdominis flexes the trunk. A line does not mean every muscle shares one action.",
    evidence:
      "The 2016 review did not verify this proposed line as a complete anatomical chain. Use it as an organizational model, considering individual muscle anatomy separately.",
  },
  {
    id: "ll" as const,
    name: "Lateral line",
    subtitle: "Along the sides of the body",
    color: "#7097a4",
    view: "side",
    matches: [
      "fibularis longus",
      "fibularis brevis",
      "peroneus longus",
      "peroneus brevis",
      "tensor fascia",
      "gluteus medius",
      "external oblique",
      "intercostal",
    ],
    description:
      "A proposed lateral relationship between the outer lower leg, hip and side of the trunk, useful for comparing structures involved in frontal-plane control.",
    path: [
      {
        name: "Fibularis longus",
        match: "fibularis longus",
        note: "Lateral lower leg",
      },
      {
        name: "Tensor fasciae latae",
        match: "tensor fascia",
        note: "Anterolateral hip",
      },
      {
        name: "External oblique",
        match: "external oblique",
        note: "Lateral abdominal wall",
      },
      { name: "Intercostals", match: "intercostal", note: "Between the ribs" },
    ],
    movement:
      "In single-leg stance, hip abductors help control pelvic position. Lateral trunk and ankle muscles also contribute to balance, coordinated by the nervous system.",
    evidence:
      "Support was incomplete for the whole lateral line in the 2016 review. Functional cooperation and tissue continuity are different claims.",
  },
  {
    id: "bfl" as const,
    name: "Back functional line",
    subtitle: "Across the back and pelvis",
    color: "#809571",
    view: "back",
    matches: ["latissimus dorsi", "gluteus maximus", "vastus lateralis"],
    description:
      "This model links latissimus dorsi across the thoracolumbar fascia with the opposite gluteus maximus and lateral thigh.",
    path: [
      {
        name: "Latissimus dorsi",
        match: "latissimus dorsi",
        note: "Broad muscle of the back",
      },
      {
        name: "Thoracolumbar fascia",
        match: "thoracolumbar fascia",
        note: "Lower-back connective tissue",
      },
      {
        name: "Opposite gluteus maximus",
        match: "gluteus maximus",
        note: "Contralateral posterior hip",
      },
      {
        name: "Vastus lateralis",
        match: "vastus lateralis",
        note: "Lateral quadriceps",
      },
    ],
    movement:
      "Walking coordinates opposite arms and legs. Consider how trunk control, shoulder movement and hip extension cooperate. Both sides are highlighted to compare the crossing relationship.",
    evidence:
      "The 2016 review supported this anatomical chain. Highlights show participants on both sides, not a measured diagonal force path.",
  },
  {
    id: "ffl" as const,
    name: "Front functional line",
    subtitle: "Across the chest and pelvis",
    color: "#9e7c9b",
    view: "front",
    matches: ["pectoralis major", "rectus abdominis", "adductor longus"],
    description:
      "A proposed diagonal relationship linking chest, abdominal and opposite inner-thigh tissues across the front of the body.",
    path: [
      {
        name: "Pectoralis major",
        match: "pectoralis major",
        note: "Anterior chest",
      },
      {
        name: "Rectus abdominis",
        match: "rectus abdominis",
        note: "Anterior trunk",
      },
      {
        name: "Opposite adductor longus",
        match: "adductor longus",
        note: "Medial thigh",
      },
    ],
    movement:
      "Throwing combines shoulder motion, trunk rotation and lower-limb support. These structures contribute different actions; coordination does not imply an isolated mechanical chain.",
    evidence:
      "The 2016 review supported this anatomical chain. Continuity does not prove predictable treatment or performance effects.",
  },
];
export type FascialLine = (typeof lines)[number];
export const LINE_IDS = lines.map((l) => l.id) as LineId[];
export function lineById(id: string): FascialLine | undefined {
  return lines.find((l) => l.id === id);
}
