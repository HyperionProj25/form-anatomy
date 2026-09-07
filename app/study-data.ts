export const lines = [
  {
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
export const lessons = [
  {
    match: "gastrocnemius",
    description:
      "The gastrocnemius forms much of the visible calf. Its two heads cross both the knee and ankle.",
    attachments:
      "Femoral condyles → calcaneus through the calcaneal (Achilles) tendon.",
    action: "Plantarflexes the ankle and assists knee flexion.",
    observe: "Hide one gastrocnemius head to inspect the deeper soleus.",
    connection:
      "Together with soleus, it loads the calcaneal tendon. It is a component of the superficial back-line model.",
  },
  {
    match: "soleus",
    description:
      "A broad calf muscle deep to gastrocnemius. It crosses the ankle but does not cross the knee.",
    attachments:
      "Posterior tibia and proximal fibula → calcaneus through the calcaneal tendon.",
    action: "Plantarflexes the ankle and contributes to postural control.",
    observe: "Hide gastrocnemius to see how soleus lies beneath it.",
    connection:
      "Soleus and gastrocnemius share a distal tendon complex while having different proximal attachments.",
  },
  {
    match: "biceps femoris",
    description:
      "A hamstring with long and short heads on the lateral side of the posterior thigh.",
    attachments:
      "Long head: ischial tuberosity; short head: femur → primarily the fibular head.",
    action:
      "Flexes the knee and laterally rotates the flexed leg. The long head also extends the hip.",
    observe:
      "Compare the long head, which crosses the hip, with the short head, which does not.",
    connection:
      "The long head relates to posterior pelvic connective tissues. Hamstrings are components of the superficial back-line model.",
  },
  {
    match: "rectus femoris",
    description: "The quadriceps muscle that crosses both the hip and knee.",
    attachments:
      "Anterior inferior iliac spine and region above the acetabulum → patella and tibial tuberosity through the extensor mechanism.",
    action: "Extends the knee and flexes the hip.",
    observe: "Compare its course with the vasti, which arise on the femur.",
    connection:
      "The quadriceps share an extensor mechanism at the knee. Rectus femoris appears in the superficial front-line model.",
  },
  {
    match: "rectus abdominis",
    description:
      "Paired longitudinal muscles within the rectus sheath, separated by the linea alba.",
    attachments:
      "Pubic crest and symphysis → xiphoid process and costal cartilages 5–7.",
    action: "Flexes the trunk and compresses abdominal contents.",
    observe: "Inspect the tendinous intersections and central separation.",
    connection:
      "Aponeuroses of the lateral abdominal muscles form the rectus sheath. These relationships matter in anterior trunk force transmission.",
  },
  {
    match: "latissimus dorsi",
    description:
      "A broad superficial back muscle connecting the trunk to the humerus.",
    attachments:
      "Lower thoracic region, thoracolumbar fascia, iliac crest and lower ribs → intertubercular sulcus of the humerus.",
    action: "Extends, adducts and medially rotates the humerus.",
    observe: "Follow the broad muscle toward its narrower upper-arm insertion.",
    connection:
      "Its thoracolumbar fascia attachment is relevant to the back functional-line model and the opposite gluteus maximus.",
  },
  {
    match: "gluteus maximus",
    description: "A large superficial muscle of the posterior hip.",
    attachments:
      "Posterior ilium, sacrum, coccyx and associated ligaments → iliotibial tract and gluteal tuberosity.",
    action: "Extends and laterally rotates the hip.",
    observe: "Hide it to compare the deeper gluteal region.",
    connection:
      "Its insertions connect the hip to the femur and iliotibial tract. It is included in the back functional-line model.",
  },
  {
    match: "pectoralis major",
    description:
      "A fan-shaped anterior chest muscle with clavicular and sternocostal portions.",
    attachments:
      "Medial clavicle, sternum and upper costal cartilages → lateral lip of the intertubercular sulcus.",
    action:
      "Adducts and medially rotates the humerus; clavicular fibers assist flexion.",
    observe: "Compare the clavicular and sternocostal portions.",
    connection:
      "The front functional-line model considers relationships between pectoral, abdominal and opposite adductor tissues.",
  },
  {
    match: "deltoid",
    description:
      "The superficial shoulder cap, divided into anterior, middle and posterior portions.",
    attachments:
      "Lateral clavicle, acromion and scapular spine → deltoid tuberosity of the humerus.",
    action:
      "Middle fibers abduct the arm; anterior and posterior portions contribute to flexion and extension.",
    observe: "Hide the deltoid to reveal deeper shoulder structures.",
    connection:
      "The deltoid works with the rotator cuff and scapular muscles during arm elevation.",
  },
  {
    match: "tibialis anterior",
    description: "A superficial muscle in the anterior compartment of the leg.",
    attachments:
      "Lateral tibia and interosseous membrane → medial cuneiform and base of the first metatarsal.",
    action: "Dorsiflexes and inverts the foot.",
    observe:
      "Trace its tendon across the front of the ankle toward the medial foot.",
    connection:
      "Extensor retinacula guide its tendon. It appears in the superficial front-line model.",
  },
  {
    match: "femur",
    description:
      "The thigh bone connects the hip and knee. Its head articulates with the acetabulum.",
    attachments:
      "Trochanters, linea aspera and other surfaces provide muscle attachment sites.",
    action:
      "Transmits loads between hip and knee and provides leverage for surrounding muscles.",
    observe: "Compare the head, neck, shaft and distal condyles.",
    connection:
      "Tendons transfer muscle forces to the femur. Hip and knee movement distributes motion across adjacent segments.",
  },
  {
    match: "scapula",
    description:
      "A triangular bone on the posterior thoracic wall. Its glenoid cavity articulates with the humeral head.",
    attachments:
      "The spine, acromion, coracoid process and borders support muscle and ligament attachments.",
    action: "Provides a mobile base for shoulder movement.",
    observe: "Rotate to the posterior view and examine the scapular spine.",
    connection:
      "Trapezius, serratus anterior and other scapular muscles coordinate its position during arm movement.",
  },
];
export const questions = [
  {
    prompt: "Which muscle crosses both the knee and the ankle?",
    options: ["Soleus", "Gastrocnemius", "Tibialis anterior"],
    correct: 1,
    explanation:
      "Gastrocnemius originates on the femur and inserts at the calcaneus, crossing both joints. Soleus does not cross the knee.",
  },
  {
    prompt: "What does anatomical continuity between tissues establish?",
    options: [
      "A guaranteed treatment effect",
      "The same force travels through the entire body",
      "A structural connection that may transmit force",
    ],
    correct: 2,
    explanation:
      "Continuity supports a structural relationship. The amount of transmitted force and its functional significance require separate evidence.",
  },
  {
    prompt: "Which pair belongs to the back functional-line model?",
    options: [
      "Latissimus dorsi and opposite gluteus maximus",
      "Tibialis anterior and deltoid",
      "Pectoralis major and soleus",
    ],
    correct: 0,
    explanation:
      "The model links latissimus dorsi with contralateral gluteus maximus across the thoracolumbar region.",
  },
  {
    prompt: "How can you inspect a deeper muscle in this atlas?",
    options: [
      "Increase the zoom only",
      "Select and hide the covering structure",
      "Always switch to anterior view",
    ],
    correct: 1,
    explanation:
      "Hiding a superficial structure reveals underlying anatomy. Restore hidden structures to recover the complete view.",
  },
];
