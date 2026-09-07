export type CitationId =
  | "wilke2016"
  | "krause2016"
  | "kalichman2025"
  | "wilkeKrause2019"
  | "bordoni2024"
  | "stecco2025"
  | "adstrum2017"
  | "statpearlsFascia"
  | "openstax"
  | "huijing2009"
  | "ajimsha2022"
  | "freitas2019"
  | "heroux2021"
  | "colonna2026"
  | "suarez2022"
  | "schleip2019"
  | "wilke2017"
  | "lin2026"
  | "huang2026"
  | "caldeira2024"
  | "procopio2025"
  | "kawabuchi2024"
  | "pirri2024junction"
  | "pirri2024tlf"
  | "tomita2025"
  | "fede2025"
  | "tereshenko2026"
  | "kretschmerWilke2026"
  | "warneke2024"
  | "isaji2025"
  | "neumann2026"
  | "dellaPosta2025"
  | "ficarra2024";

export type CitationKind =
  | "systematic-review"
  | "scoping-review"
  | "meta-analysis"
  | "rct"
  | "cadaveric"
  | "in-vivo"
  | "narrative-review"
  | "consensus"
  | "modelling"
  | "reference";

export type CitationGroup =
  | "what-fascia-is"
  | "continuity"
  | "force-transmission"
  | "sensory"
  | "clinical"
  | "recent";

export type Citation = {
  id: CitationId;
  authors: string;
  year: number;
  title: string;
  journal: string;
  pmid?: string;
  doi?: string;
  url?: string;
  kind: CitationKind;
  group: CitationGroup;
  /** Two to four plain-language sentences supportable from the abstract. */
  summary: string;
  /** What this means for the model on screen. */
  modelNote: string;
};

export const GROUP_LABELS: Record<CitationGroup, string> = {
  recent: "Recent findings, 2023 to 2026",
  "what-fascia-is": "What fascia is",
  continuity: "Anatomical continuity",
  "force-transmission": "Force transmission",
  sensory: "Fascia as a sensory organ",
  clinical: "Remote and clinical effects",
};

export const KIND_LABELS: Record<CitationKind, string> = {
  modelling: "Computational model",
  "systematic-review": "Systematic review",
  "scoping-review": "Scoping review",
  "meta-analysis": "Meta-analysis",
  rct: "Randomised trial",
  cadaveric: "Cadaveric / histology",
  "in-vivo": "In vivo study",
  "narrative-review": "Narrative review",
  consensus: "Consensus / definition",
  reference: "Reference text",
};

export const citations: Citation[] = [
  {
    id: "adstrum2017",
    authors: "Adstrum S, Hedley G, Schleip R, Stecco C, Yucesoy CA",
    year: 2017,
    title: "Defining the fascial system",
    journal: "Journal of Bodywork and Movement Therapies",
    pmid: "28167173",
    doi: "10.1016/j.jbmt.2016.11.003",
    kind: "consensus",
    group: "what-fascia-is",
    summary:
      "The word fascia was being used for three different things: soft collagenous connective tissue in general, specific membranes, and a body-wide system. The Fascia Research Society's Nomenclature Committee wrote this paper to settle the vocabulary. It proposes the term \"fascial system\" for the whole continuum, distinct from \"a fascia\" as a single dissectible sheet.",
    modelNote:
      "The model shows muscles, bones and a few bursae and sheaths. The fascial system as defined here is mostly not modelled, which is why the lines are drawn through muscle centres rather than through fascia.",
  },
  {
    id: "bordoni2024",
    authors: "Bordoni B, Escher AR, Castellini F, et al.",
    year: 2024,
    title: "Fascial Nomenclature: Update 2024",
    journal: "Cureus",
    pmid: "38343702",
    doi: "10.7759/cureus.53995",
    kind: "consensus",
    group: "what-fascia-is",
    summary:
      "An update on what tissues should count as fascia, argued from anatomy textbooks and embryology. The authors treat the nomenclature as a starting point rather than a finished answer, with the aim of understanding the fascial continuum in the living body.",
    modelNote:
      "Naming is still contested. When a panel here says \"fascia\", it means connective tissue in the broad, systemic sense used by this literature.",
  },
  {
    id: "stecco2025",
    authors: "Stecco C, Pratt R, Nemetz LD, Schleip R, Stecco A, Theise ND",
    year: 2025,
    title: "Towards a comprehensive definition of the human fascial system",
    journal: "Journal of Anatomy",
    pmid: "39814456",
    doi: "10.1111/joa.14212",
    kind: "consensus",
    group: "what-fascia-is",
    summary:
      "Proposes that fasciae and the interstitia within them form an anatomical system: a layered, body-wide, multiscale network of connective tissue that allows tensional loading and shearing along its interfaces. It names four fascial organs (superficial, musculoskeletal or deep, visceral and neural fascia) and explains function through two layer types, one stiff and collagenous, one viscous and rich in hyaluronic acid.",
    modelNote:
      "The distinction between stiff tension-bearing layers and slippery gliding layers matters for the lines: a chain can be anatomically continuous yet still glide rather than pull.",
  },
  {
    id: "statpearlsFascia",
    authors: "Bordoni B, Mahabadi N, Jozsa F",
    year: 2025,
    title: "Anatomy, Fascia",
    journal: "StatPearls (NCBI Bookshelf)",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK493232/",
    kind: "reference",
    group: "what-fascia-is",
    summary:
      "A free, peer-reviewed reference chapter covering the layers of fascia, their structure and blood supply, and their clinical relevance. Good for definitions at the level of an anatomy course.",
    modelNote:
      "Use it to check terminology such as superficial versus deep fascia while reading the panels here.",
  },
  {
    id: "openstax",
    authors: "Betts JG, Young KA, Wise JA, et al.",
    year: 2022,
    title: "Anatomy and Physiology 2e",
    journal: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction",
    kind: "reference",
    group: "what-fascia-is",
    summary:
      "The open undergraduate anatomy and physiology textbook. Chapter 10 covers muscle tissue and chapter 11 the muscular system, including how connective tissue sheaths (epimysium, perimysium, endomysium) organise a muscle.",
    modelNote:
      "The muscle names, origins and actions used across this atlas follow standard undergraduate usage as in this text.",
  },
  {
    id: "wilke2016",
    authors: "Wilke J, Krause F, Vogt L, Banzer W",
    year: 2016,
    title: "What Is Evidence-Based About Myofascial Chains: A Systematic Review",
    journal: "Archives of Physical Medicine and Rehabilitation",
    pmid: "26281953",
    doi: "10.1016/j.apmr.2015.07.023",
    kind: "systematic-review",
    group: "continuity",
    summary:
      "Searched 6589 papers and included 62 human dissection studies to test whether the muscles in six of Myers' lines are physically continuous. Strong evidence for the superficial back line (all 3 transitions, 14 studies), back functional line (3 of 3, 8 studies) and front functional line (2 of 2, 6 studies). Moderate-to-strong evidence for parts of the spiral line (5 of 9 transitions, 21 studies) and lateral line (2 of 5, 10 studies). No evidence for the superficial front line. The authors conclude that most skeletal muscles are directly linked by connective tissue, and that functional relevance is the urgent open question.",
    modelNote:
      "This is the source of every \"verified\" or \"not verified\" badge on the line paths here, including the study counts and how many specimens showed the link.",
  },
  {
    id: "wilkeKrause2019",
    authors: "Wilke J, Krause F",
    year: 2019,
    title: "Myofascial chains of the upper limb: A systematic review of anatomical studies",
    journal: "Clinical Anatomy",
    pmid: "31226229",
    doi: "10.1002/ca.23424",
    kind: "systematic-review",
    group: "continuity",
    summary:
      "Thirteen dissection studies support three serial chains in the arm: a ventral chain (pectoralis major, brachial fascia and biceps, forearm flexors), a lateral chain (trapezius, deltoid, brachialis, brachioradialis) and a dorsal chain (latissimus, teres minor and infraspinatus, triceps, anconeus, extensor carpi ulnaris). Mechanical relevance was not established.",
    modelNote:
      "The arm lines are not yet drawn in this atlas. Their components are all selectable in the shoulder and forearm regions.",
  },
  {
    id: "kalichman2025",
    authors: "Kalichman L",
    year: 2025,
    title: "Myofascial continuity: Review of anatomical and functional evidence",
    journal: "Journal of Bodywork and Movement Therapies",
    pmid: "41316622",
    doi: "10.1016/j.jbmt.2025.09.020",
    kind: "narrative-review",
    group: "continuity",
    summary:
      "A 2025 synthesis of the dissection reviews and in vivo work. It restates strong anatomical support for the superficial back, back functional and front functional lines, moderate support for the spiral and lateral lines, and no validation for the superficial front line. In vivo studies only partially confirm force transmission between muscles; in vitro data suggest fascia can carry up to about 30 percent of mechanical force, but human evidence is limited.",
    modelNote:
      "The line grades here match this most recent summary of the field. Treat the numbers on force transmission as provisional.",
  },
  {
    id: "huijing2009",
    authors: "Huijing PA",
    year: 2009,
    title: "Epimuscular myofascial force transmission: a historical review and implications for new research",
    journal: "Journal of Biomechanics",
    pmid: "19041975",
    doi: "10.1016/j.jbiomech.2008.09.027",
    kind: "narrative-review",
    group: "force-transmission",
    summary:
      "The award lecture that framed the modern question. Huijing argues there is little doubt that force can be transmitted between a muscle and its surroundings through connective tissue, but that the conditions under which this matters quantitatively are still unknown. Even small forces would change how muscle function is understood.",
    modelNote:
      "Epimuscular force transmission is about neighbouring muscles and fascia, not only the long lines drawn here. It is the mechanism a line would need in order to act as a unit.",
  },
  {
    id: "krause2016",
    authors: "Krause F, Wilke J, Vogt L, Banzer W",
    year: 2016,
    title: "Intermuscular force transmission along myofascial chains: a systematic review",
    journal: "Journal of Anatomy",
    pmid: "27001027",
    doi: "10.1111/joa.12464",
    kind: "systematic-review",
    group: "force-transmission",
    summary:
      "Nine studies of moderate to excellent quality tested whether tension actually passes between the muscles of three lines. For the superficial back line there is moderate evidence of force transfer at all three transitions (six studies); for the back functional line at one of two transitions (three studies); for the front functional line one study found a slight, non-significant transfer at one transition. Methods differed too much to pool results.",
    modelNote:
      "This is the source of the \"force transfer\" notes on the superficial back, back functional and front functional lines. Continuity and force transfer are separate claims.",
  },
  {
    id: "ajimsha2022",
    authors: "Ajimsha MS, Shenoy PD, Surendran PJ, Jacob P, Bilal MJ",
    year: 2022,
    title: "Evidence of in-vivo myofascial force transfer in humans: a systematic scoping review",
    journal: "Journal of Bodywork and Movement Therapies",
    pmid: "36180147",
    doi: "10.1016/j.jbmt.2022.05.006",
    kind: "scoping-review",
    group: "force-transmission",
    summary:
      "Twenty in vivo human studies covering 405 participants, from randomised trials to case studies. Most pointed towards force transmission existing, two pointed against it, and the studies were heterogeneous and of lower quality. The authors support in vivo force transmission in humans, but prudently.",
    modelNote:
      "When a stretch in one region seems to change another, this is the kind of evidence behind it. It does not tell you how much force moves along any particular line.",
  },
  {
    id: "freitas2019",
    authors: "Freitas SR, Antunes A, Salmon P, et al.",
    year: 2019,
    title: "Does epimuscular myofascial force transmission occur between the human quadriceps muscles in vivo during passive stretching?",
    journal: "Journal of Biomechanics",
    pmid: "30477875",
    doi: "10.1016/j.jbiomech.2018.11.026",
    kind: "in-vivo",
    group: "force-transmission",
    summary:
      "Twelve healthy adults had the stiffness of vastus medialis, vastus lateralis and rectus femoris measured with shear-wave elastography during passive knee flexion with the hip flexed or neutral. Changing hip position changed rectus femoris but not the vasti, suggesting no force transmission between these muscle bellies up to 90 degrees of knee flexion.",
    modelNote:
      "Counter-evidence. The quadriceps sit side by side, yet stretching one did not stiffen its neighbours here. Continuity on the model does not guarantee mechanical coupling.",
  },
  {
    id: "heroux2021",
    authors: "Héroux ME, Whitaker RM, Maas H, Herbert RD",
    year: 2021,
    title: "Negligible epimuscular myofascial force transmission between the human rectus femoris and vastus lateralis muscles in passive conditions",
    journal: "European Journal of Applied Physiology",
    pmid: "34468860",
    doi: "10.1007/s00421-021-04801-6",
    kind: "in-vivo",
    group: "force-transmission",
    summary:
      "In 19 young adults, ultrasound tracked the knee angle at which vastus lateralis fascicles began to lengthen, with the hip flexed or neutral. Because hip angle cannot change vastus lateralis length directly, any shift would come from neighbouring structures. The effect was negligible overall, with a small variable effect in 3 of 19 people.",
    modelNote:
      "A second careful null result in the thigh. Passive force transmission between adjacent muscles in healthy people appears small and variable.",
  },
  {
    id: "colonna2026",
    authors: "Colonna S, Maietti G, Cuoghi F",
    year: 2026,
    title:
      "In Vivo Evidence of Myofascial Force Transmission Along the Posterior Spiral Chain: Functional Connectivity Linking the Contralateral Latissimus Dorsi, Thoracolumbar Fascia, and Gluteal Region",
    journal: "Cureus",
    pmid: "41640919",
    doi: "10.7759/cureus.100760",
    kind: "in-vivo",
    group: "force-transmission",
    summary:
      "Seventy-three healthy people had trunk rotation measured before and after an isometric activation of the right hip abductors and external rotators, and after stretching one side of the chain. Activation shifted rotation towards one side with little change in total range; stretching partly rebalanced it. The authors read this as functional relevance of the latissimus to contralateral gluteal chain, acting by redistributing motion rather than adding range.",
    modelNote:
      "This is the back functional line on the model. It is a single-group study without a control group, so treat it as supportive, not decisive.",
  },
  {
    id: "suarez2022",
    authors: "Suarez-Rodriguez V, Fede C, Pirri C, et al.",
    year: 2022,
    title: "Fascial Innervation: A Systematic Review of the Literature",
    journal: "International Journal of Molecular Sciences",
    pmid: "35628484",
    doi: "10.3390/ijms23105674",
    kind: "systematic-review",
    group: "sensory",
    summary:
      "Twenty-three histological and immunohistochemical studies (ten in humans) show that deep fasciae are well innervated, with a precise distribution ranging from free nerve endings to Pacini and Ruffini corpuscles. The thoracolumbar fascia is the most studied site. Innervation is richer in pathological fascia, supporting fascia as a possible source of pain.",
    modelNote:
      "The thoracolumbar fascia is a via point on the back functional and superficial back lines here. Its sensory role is a separate story from force transfer.",
  },
  {
    id: "schleip2019",
    authors: "Schleip R, Gabbiani G, Wilke J, et al.",
    year: 2019,
    title:
      "Fascia Is Able to Actively Contract and May Thereby Influence Musculoskeletal Dynamics: A Histochemical and Mechanographic Investigation",
    journal: "Frontiers in Physiology",
    pmid: "31001134",
    doi: "10.3389/fphys.2019.00336",
    kind: "cadaveric",
    group: "sensory",
    summary:
      "Fascia from 31 human donors and 20 rats was stained for myofibroblasts, and isolated rat fascia was tested for contraction. Human lumbar fascia had more myofibroblasts than fascia lata or plantar fascia, and rat fascia contracted in response to several stimulants. The predicted force in human lumbar tissue is below what would stabilise the spine mechanically but might alter motor coordination.",
    modelNote:
      "Fascia is not inert. Any slow, low-level tension it generates is far smaller than muscle force, so it should not be read as fascia \"pulling\" a line.",
  },
  {
    id: "wilke2017",
    authors: "Wilke J, Vogt L, Niederer D, Banzer W",
    year: 2017,
    title:
      "Is remote stretching based on myofascial chains as effective as local exercise? A randomised-controlled trial",
    journal: "Journal of Sports Sciences",
    pmid: "27819537",
    doi: "10.1080/02640414.2016.1251606",
    kind: "rct",
    group: "clinical",
    summary:
      "Sixty-three healthy adults were randomised to lower-limb stretching, neck stretching or no exercise. Both stretching groups increased cervical range of motion compared with control, immediately and five minutes later, with no difference between remote and local stretching. The effect was not direction-specific, so the mechanism remains open.",
    modelNote:
      "The stretch targeted the superficial back line. A remote effect is real in this trial, but it does not prove tension travelled along the drawn path.",
  },
  {
    id: "lin2026",
    authors: "Lin LH, Lien NTM, Fatria I, Huang YC",
    year: 2026,
    title:
      "Effect of remote myofascial manual therapy along the superficial back line on lumbo-pelvic-hip and neck flexibility and pain intensity: A systematic review and meta-analysis",
    journal: "Journal of Back and Musculoskeletal Rehabilitation",
    pmid: "41773603",
    doi: "10.1177/10538127261428186",
    kind: "meta-analysis",
    group: "clinical",
    summary:
      "Nine randomised trials of manual therapy applied at a distance along the superficial back line showed a moderate improvement in flexibility (Hedges' g 0.53) and a borderline, non-significant trend towards less pain. Evidence certainty was moderate for flexibility and low for pain, supporting a conditional recommendation as an adjunct.",
    modelNote:
      "This is the most recent pooled estimate for remote effects along the superficial back line. Flexibility gains are modest and pain effects are unproven.",
  },
  {
    id: "huang2026",
    authors: "Huang H, Chen L, Lai Y, Li W, Li J",
    year: 2026,
    title:
      "Fascia as a Functional System in Health and Disease: From Fundamental Biology to Assessment and Targeted Interventions",
    journal: "International Journal of Molecular Sciences",
    pmid: "42450141",
    doi: "10.3390/ijms27135871",
    kind: "narrative-review",
    group: "clinical",
    summary:
      "A broad 2026 review that treats fascia as a system that senses, transmits and regulates mechanical, sensory and metabolic signals. It compiles assessment methods (palpation, ultrasound, elastography, tissue mechanics, omics, modelling) and lists interventions from manual therapy to injections, proposing an assessment-guided decision framework.",
    modelNote:
      "Useful as a map of the field and its measurement tools. It is a synthesis, not new evidence for any specific line.",
  },

  // Recent findings, 2023 to 2026. Added 2026-09-07; summaries stay within each abstract.
  {
    id: "caldeira2024",
    authors: "Caldeira PF, Resende RA, Murta BJ, et al.",
    year: 2024,
    title:
      "Myofascial force transmission between latissimus dorsi and contralateral gluteus maximus in runners: a cross-sectional study",
    journal: "Journal of Biomechanics",
    pmid: "39556920",
    doi: "10.1016/j.jbiomech.2024.112431",
    kind: "in-vivo",
    group: "recent",
    summary:
      "Fifty-four adults, runners and sedentary, had lumbar stiffness and the passive properties of the opposite hip measured with the latissimus dorsi relaxed and then contracted. Contracting the latissimus increased lumbar stiffness, rotated the resting hip outward and raised passive hip torque and stiffness in both groups. Runners showed higher lumbar stiffness during the contraction, but the shoulder-to-hip transmission itself was similar in both groups.",
    modelNote:
      "Direct in-vivo support for the back functional line drawn here: latissimus dorsi, thoracolumbar fascia, opposite gluteus maximus. The fascia is not a mesh in this model, so the cable crosses the midline through the lumbar region.",
  },
  {
    id: "procopio2025",
    authors: "Procópio PRS, Pinto RZ, Murta BAJ, et al.",
    year: 2025,
    title:
      "Individuals with chronic low back pain have reduced myofascial force transmission between latissimus dorsi and contralateral gluteus maximus muscles",
    journal: "Journal of Biomechanics",
    pmid: "40616971",
    doi: "10.1016/j.jbiomech.2025.112850",
    kind: "in-vivo",
    group: "recent",
    summary:
      "Forty-eight people, half with chronic low back pain, were tested with the latissimus dorsi relaxed and contracted while lumbar stiffness, the passive properties of the opposite hip and muscle activity were recorded. Contraction stiffened the lumbar region in both groups, but only the pain-free group showed the hip change: a shift toward lateral rotation and higher passive torque. The authors conclude transmission along this path is reduced in chronic low back pain, reaching adjacent tissue but not the distant hip.",
    modelNote:
      "A clinical counterpart to the runners study on the same back functional line. The pathway behaves differently between people, which is why this atlas grades hops rather than treating lines as fixed.",
  },
  {
    id: "kawabuchi2024",
    authors: "Kawabuchi K, Yamane K, Maniwa S, et al.",
    year: 2024,
    title:
      "Epimuscular myofascial force transmission between the levator scapulae muscle and the upper fiber of the serratus anterior or rhomboid minor muscles",
    journal: "Clinical Biomechanics",
    pmid: "38335837",
    doi: "10.1016/j.clinbiomech.2024.106194",
    kind: "in-vivo",
    group: "recent",
    summary:
      "In twenty shoulders of ten healthy men, shear-wave elastography measured muscle stiffness at rest and with the levator scapulae stretched. Stretching the levator raised its own shear modulus and that of the upper serratus anterior, and the two changes correlated, while the rhomboid minor did not change. The authors read this as force transmission between neighbouring muscles with different insertions.",
    modelNote:
      "Levator scapulae, serratus anterior and rhomboid minor are all in the shoulder girdle study set. No chain drawn here includes this pairing, a reminder that the lines are teaching selections, not the only connections.",
  },
  {
    id: "pirri2024junction",
    authors: "Pirri C, Petrelli L, Guidolin D, et al.",
    year: 2024,
    title:
      "Myofascial junction: Emerging insights into the connection between deep/muscular fascia and muscle",
    journal: "Clinical Anatomy",
    pmid: "38476005",
    doi: "10.1002/ca.24148",
    kind: "cadaveric",
    group: "recent",
    summary:
      "Human cadaver regions and mouse tissue were examined for the physical link between muscle and its deep fascia. The authors describe discrete collagen-rich myofascial junctions at the muscle-fascia interface, containing collagen III, hyaluronan and elastic fibres, at a measured density and inclination. The junction can be visualised, giving a structural basis for muscle-to-fascia connection.",
    modelNote:
      "This is the tissue-level link the fascial-line concept relies on. The model shows muscles as separate meshes; the junctions described here are far below its resolution.",
  },
  {
    id: "pirri2024tlf",
    authors: "Pirri C, Pirri N, Macchi V, et al.",
    year: 2024,
    title: "Ultrasound Imaging of Thoracolumbar Fascia: A Systematic Review",
    journal: "Medicina (Kaunas)",
    pmid: "39064519",
    doi: "10.3390/medicina60071090",
    kind: "systematic-review",
    group: "recent",
    summary:
      "A systematic search to April 2024 collected studies using ultrasound to examine the thoracolumbar fascia in health and disease. Studies measured thickness, echogenicity, stiffness, deformation, shear strain and displacement, for diagnosis, treatment monitoring and movement analysis. The review concludes ultrasound is promising as a reliable tool while noting the literature is still sparse.",
    modelNote:
      "The thoracolumbar fascia is not a mesh in this model, yet it sits on the back functional line, the spiral line and the superficial back line. These imaging measures are how researchers study it in living people.",
  },
  {
    id: "tomita2025",
    authors: "Tomita N, Roy-Cardinal MH, Chayer B, et al.",
    year: 2025,
    title:
      "Thoracolumbar fascia ultrasound shear strain differs between low back pain and asymptomatic individuals: expanding the evidence",
    journal: "Insights into Imaging",
    pmid: "39812963",
    doi: "10.1186/s13244-024-01895-2",
    kind: "in-vivo",
    group: "recent",
    summary:
      "Thirty-two people with nonspecific low back pain and thirty-two controls had thoracolumbar fascia shear strain measured by ultrasound elastography, before and after a standardised massage. Shear strain was higher in the pain group while fascia thickness was similar, and shear strain correlated with pain and disability scores. The brief massage did not change the elastography measures.",
    modelNote:
      "Supports the idea that the thoracolumbar fascia's mechanical behaviour, not just its thickness, matters in back pain. Registered trial NCT04716101.",
  },
  {
    id: "fede2025",
    authors: "Fede C, Clair C, Pirri C, et al.",
    year: 2025,
    title: "The Human Superficial Fascia: A Narrative Review",
    journal: "International Journal of Molecular Sciences",
    pmid: "39941057",
    doi: "10.3390/ijms26031289",
    kind: "narrative-review",
    group: "recent",
    summary:
      "A review cataloguing what is known about the human superficial fascia: its thickness, cells and extracellular matrix, innervation and blood supply. The authors argue that superficial, deep, visceral and neural fasciae differ anatomically and in the pathways they take part in, so they need separate description and agreed terminology.",
    modelNote:
      "Everything drawn as a line in this atlas runs through deep (muscular) fascia. The superficial fascia under the skin is a different layer and is not represented.",
  },
  {
    id: "tereshenko2026",
    authors: "Tereshenko V, Hazewinkel MHJ, Hussey MR, et al.",
    year: 2026,
    title:
      "Trapezius fascia reveals mechanosensory capacity and predominance of nociceptive axons in occipital neuralgia",
    journal: "Scientific Reports",
    pmid: "41807486",
    doi: "10.1038/s41598-026-42746-y",
    kind: "in-vivo",
    group: "recent",
    summary:
      "Trapezius fascia from eighteen patients with occipital neuralgia and ten controls was stained for nerve and mechanosensory markers. The fascia held myelinated and unmyelinated axons and Pacinian- and Ruffini-like corpuscles; the neuralgia group showed 71 percent more nociceptive axons plus sympathetic fibres absent in controls, with raised CGRP. The authors conclude the fascia is mechanosensitive and can take part in pain sensitisation.",
    modelNote:
      "Fascia is innervated tissue, not inert wrapping. The trapezius is the first stop of the lateral arm chain drawn here; its fascia is not a mesh in this model.",
  },
  {
    id: "kretschmerWilke2026",
    authors: "Kretschmer L, Wilke J.",
    year: 2026,
    title:
      "Remote Changes of Mechanical Stiffness Following Local Stretching or Contraction: A Systematic Review with Meta-Analysis",
    journal: "Sports Medicine - Open",
    pmid: "42228239",
    doi: "10.1186/s40798-026-01030-z",
    kind: "meta-analysis",
    group: "recent",
    summary:
      "Fifteen controlled trials of mostly high quality tested whether stretching or contracting one muscle changes stiffness in a distant structure of the same myofascial chain. Pooled results showed a moderate remote stiffness change after local lengthening (very low certainty, twelve studies) and a large remote increase after local contraction (moderate certainty, seven studies). Heterogeneity was high and reporting bias possible, and the authors call for more research, especially on lengthening.",
    modelNote:
      "The strongest pooled evidence so far that tension travels along the connections these lines depict. Certainty is moderate for contraction and very low for stretching, so the caveat on every hop stays.",
  },
  {
    id: "warneke2024",
    authors: "Warneke K, Rabitsch T, Dobert P, et al.",
    year: 2024,
    title:
      "The effects of static and dynamic stretching on deep fascia stiffness: a randomized, controlled cross-over study",
    journal: "European Journal of Applied Physiology",
    pmid: "38689040",
    doi: "10.1007/s00421-024-05495-2",
    kind: "rct",
    group: "recent",
    summary:
      "Forty recreationally active adults performed five minutes of static or dynamic plantar-flexor stretching or a control condition in random order, with muscle and fascia stiffness measured by ultrasound strain elastography. Static stretching reduced both muscle and deep fascia stiffness, dynamic stretching did not, and both improved the knee-to-wall test. Falls in fascia stiffness, not muscle stiffness, correlated weakly with range-of-motion gains.",
    modelNote:
      "The stretched tissue is the calf: gastrocnemius and soleus, the lower stops of the superficial back line. The deep fascia measured is the crural fascia around them, not a mesh in this model.",
  },
  {
    id: "isaji2025",
    authors: "Isaji Y, Sasaki D, Okuyama K, et al.",
    year: 2025,
    title: "Therapeutic mechanisms of fascia manipulation: A scoping review",
    journal: "Journal of Back and Musculoskeletal Rehabilitation",
    pmid: "40368128",
    doi: "10.1177/10538127251341828",
    kind: "scoping-review",
    group: "recent",
    summary:
      "A scoping review of eleven studies, eight in humans and three in animals, on how manual fascia manipulation works. Human studies reported a transient local inflammatory response with raised temperature, less unbound water in the deep fascia, pain relief from densification and better proprioception; animal work showed anti-inflammatory cytokine changes and adenosine-receptor involvement. The authors propose combined anti-inflammatory, mechanoreceptor and gliding mechanisms and ask for standardised protocols.",
    modelNote:
      "Belongs with the clinical section rather than any drawn line. Eleven studies is a small base, and the animal findings do not transfer directly.",
  },
  {
    id: "neumann2026",
    authors: "Neumann PE, Labib H, Lhuaire M, et al.",
    year: 2026,
    title: "Fascia, Eh. What Is It? What Is It Good for?",
    journal: "Clinical Anatomy",
    pmid: "41277747",
    doi: "10.1002/ca.70047",
    kind: "narrative-review",
    group: "recent",
    summary:
      "Anatomists review how the meaning of fascia has diverged since 1998, when official nomenclature dropped fascia superficialis while fascia researchers broadened the term into a whole fascial system. The authors endorse the traditional view: fasciae are fibrous membranes of dense irregular connective tissue that compartmentalise and connect parts of the body and are not parts of well-defined organs. Whether skeletal and nervous-system membranes count as fascia is left for further discussion.",
    modelNote:
      "Read alongside the 2025 comprehensive-definition paper in the first section: two expert groups still disagree on what the word covers. This atlas uses fascial line in the teaching sense and labels every hop's evidence.",
  },
  {
    id: "dellaPosta2025",
    authors: "Della Posta D, Belviso I, Branca JJV, et al.",
    year: 2025,
    title:
      "From Myofascial Chains to the Polyconnective Network: A Novel Approach to Biomechanics and Rehabilitation Based on Graph Theory",
    journal: "Life (Basel)",
    pmid: "40868851",
    doi: "10.3390/life15081200",
    kind: "modelling",
    group: "recent",
    summary:
      "The authors model the osteo-myofascial system as a network of 2,208 anatomical nodes and 7,377 biomechanical relationships drawn from the aNETomy model and the BIOMECH 3.4 database, then rank nodes by graph centrality. The sacrum and thoracolumbar fascia come out as highly connected hubs. They propose a polyconnective skeleton of such hubs as a framework for treatment planning, while noting the results are theoretical.",
    modelNote:
      "A network view rather than a line view: every connection counts and some structures are hubs. The sacrum is selectable here; the thoracolumbar fascia is not a mesh.",
  },
  {
    id: "ficarra2024",
    authors: "Ficarra S, Scardina A, Nakamura M, et al.",
    year: 2024,
    title:
      "Acute effects of static stretching and proprioceptive neuromuscular facilitation on non-local range of movement",
    journal: "Research in Sports Medicine",
    pmid: "38459925",
    doi: "10.1080/15438627.2024.2326520",
    kind: "rct",
    group: "recent",
    summary:
      "Twenty-nine participants completed a control week and then static stretching and PNF of the hamstrings in random order, with local hamstring extensibility and remote shoulder extension measured before, immediately after and fifteen minutes later. Both methods increased local range of motion. Remote shoulder range showed no interaction with treatment, with only a small immediate rise in the dominant arm after static stretching in post-hoc tests, so the authors report no clear non-local effect.",
    modelNote:
      "A negative finding to weigh against the remote-effects meta-analysis above. The hamstrings are a stop on the superficial back line; the shoulder is not, which makes this a fair but indirect test of the chain idea.",
  },
];

export function citationById(id: string): Citation | undefined {
  return citations.find((c) => c.id === id);
}

/** Preferred outbound link: PubMed when there is a PMID, else the DOI resolver, else the URL. */
export function citationUrl(c: Citation): string {
  if (c.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`;
  if (c.doi) return `https://doi.org/${c.doi}`;
  return c.url ?? "";
}
