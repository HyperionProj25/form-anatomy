# Phase 3: Fascia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the fascial-line teaching content research-grade: six lines keyed to catalog parts, every hop labelled with the dissection evidence behind it, a verified research digest with a citation checker in CI, a drawn teaching cable through each line, and a guided tour player.

**Architecture:** Line data moves from name substrings to catalog keys, with per-transition evidence transcribed from Wilke et al. 2016 (Table 3) and per-line force-transfer notes from Krause et al. 2016. A `research.ts` citation table drives both the digest modal and a verify script that resolves every PMID, DOI and URL. The engine gains `drawPath`/`clearPaths`; a pure `paths.ts` turns a line into ordered centroid polylines per body side. Tours live in the store (`tour`, `focus`) and drive the existing camera-command channel with a new `fly` kind.

**Tech Stack:** unchanged (Vite 8, React 19, Three.js 0.185, vitest 5, tsx 4). Network only in `scripts/verify-citations.ts`.

## Global Constraints

- Everything from phases 1 and 2 still applies (base path, `BASE_URL`, commit trailer, port 3131, real Chrome for 3D checks, strip `\r` in edit scripts).
- Evidence wording follows the source. "Verified" and "not verified" are Wilke et al. 2016's own terms; numbers are copied from its Table 3. Do not upgrade or soften a grade.
- Every citation in `research.ts` must pass `npm run verify:citations`. A citation that fails is removed, never patched by guessing.
- Text shown to students about what a paper found must be supportable from that paper's abstract as fetched from PubMed on 2026-09-07 (saved in the scratchpad `abstracts.txt` during planning).
- Cable and tour visuals carry the caption "Teaching path drawn through structure centers. Not a fascial sheet." wherever the cable is visible.
- Structures the model lacks (plantar fascia, sacrotuberous ligament, thoracolumbar fascia, tensor fasciae latae, iliotibial tract, sternalis) are shown as stops or vias marked "not separately modeled", anchored to nearby modeled parts for the cable.

## Facts established during planning

- Catalog keys exist for every muscle stop below; none exist for tensor fasciae latae, iliotibial tract, sternalis, thoracolumbar fascia, sacrotuberous ligament, or plantar fascia.
- PubMed records (esummary, 2026-09-07): 26281953 Wilke 2016 Arch Phys Med Rehabil; 27001027 Krause 2016 J Anat (PMC5341578); 41316622 Kalichman 2025 J Bodyw Mov Ther; 38343702 Bordoni 2024 Cureus; 39814456 Stecco 2025 J Anat; 28167173 Adstrum 2017 J Bodyw Mov Ther; 35628484 Suarez-Rodriguez 2022 Int J Mol Sci; 36180147 Ajimsha 2022 J Bodyw Mov Ther; 41640919 Colonna 2026 Cureus; 27819537 Wilke 2017 J Sports Sci; 41773603 Lin 2026 J Back Musculoskelet Rehabil; 19041975 Huijing 2009 J Biomech; 30477875 Freitas 2019 J Biomech; 34468860 Héroux 2021 Eur J Appl Physiol; 31001134 Schleip 2019 Front Physiol; 42450141 Huang 2026 Int J Mol Sci; 31226229 Wilke & Krause 2019 Clin Anat.
- Wilke 2016 grading (Methods): strong = consistent findings among multiple high-quality studies; moderate = consistent findings among multiple low-quality studies and/or one high-quality study; limited = one low-quality study; conflicting = inconsistent findings; none = no studies. Abstract: strong evidence for SBL (3/3 transitions, 14 studies), BFL (3/3, 8), FFL (2/2, 6); moderate-to-strong for parts of SL (5/9, 21) and LL (2/5, 10); no evidence for SFL (0 verified, 7 general-anatomy studies).

## File map

Create: `src/data/research.ts`, `scripts/verify-citations.ts`, `src/viewer/paths.ts`, `src/features/research/ResearchDigest.tsx`, `src/features/fascia/EvidenceBadge.tsx`, `src/features/fascia/TourPlayer.tsx`, `tests/lines.test.ts`, `tests/research.test.ts`, `tests/paths.test.ts`
Modify: `src/data/lines.ts` (rewritten), `src/viewer/appearance.ts`, `src/viewer/engine.ts`, `src/viewer/Viewer.tsx`, `src/state/store.tsx`, `src/state/urlCodec.ts`, `src/features/fascia/FasciaPanel.tsx`, `src/features/detail/DetailPanel.tsx`, `src/features/guide/Modals.tsx`, `src/features/library/LibraryPanel.tsx`, `src/App.tsx`, `src/styles/globals.css`, `tests/data.test.ts`, `tests/appearance.test.ts`, `tests/store.test.ts`, `tests/urlCodec.test.ts`, `package.json`, `.github/workflows/deploy.yml`, `README.md`

---

### Task 1: Six lines keyed to the catalog with transcribed evidence, plus the citation table

**Files:**
- Rewrite: `src/data/lines.ts`
- Create: `src/data/research.ts`, `tests/lines.test.ts`, `tests/research.test.ts`
- Modify: `src/viewer/appearance.ts` (+ `tests/appearance.test.ts`), `src/App.tsx`, `src/features/detail/DetailPanel.tsx`, `src/features/fascia/FasciaPanel.tsx`, `tests/data.test.ts`

**Interfaces:**
- Produces from `lines.ts`: `LineId` (adds `"sl"`), `Line`, `Stop`, `Transition`, `Anchor`, `EvidenceStatus`, `lines`, `LINE_IDS`, `lineById(id)`, `lineKeys(line): Set<string>`, `stopSides(line): Side[]` (which body side each stop sits on, starting right and flipping at `crosses`).
- Produces from `research.ts`: `CitationId`, `Citation`, `citations`, `citationById(id)`, `citationUrl(c)`.
- `computeStyles` input field `lineMatches: string[]` becomes `lineKeys: Set<string>`; adds optional `focusIds?: Set<string>`.

- [x] **Step 1: Write the failing lines test**

`tests/lines.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { partsByKey } from "../src/data/catalog";
import { LINE_IDS, lineById, lineKeys, lines, stopSides } from "../src/data/lines";
import { citationById } from "../src/data/research";

describe("fascial lines", () => {
  test("there are six lines in review order with unique ids and colors", () => {
    expect(LINE_IDS).toEqual(["sbl", "sfl", "ll", "sl", "bfl", "ffl"]);
    expect(new Set(lines.map((l) => l.color)).size).toBe(6);
  });

  test("every stop key and extra key exists in the catalog; keyless stops have an anchor", () => {
    for (const line of lines)
      for (const stop of line.path) {
        if (stop.key) expect(partsByKey(stop.key).length, `${line.id}:${stop.name}`).toBeGreaterThan(0);
        else expect(stop.anchor, `${line.id}:${stop.name} needs an anchor`).toBeDefined();
        for (const k of stop.keys ?? []) expect(partsByKey(k).length, `${line.id}:${k}`).toBeGreaterThan(0);
        if (stop.anchor) expect(partsByKey(stop.anchor.key).length, `${line.id}:${stop.anchor.key}`).toBeGreaterThan(0);
        if (stop.transition?.via) expect(partsByKey(stop.transition.via.anchor.key).length).toBeGreaterThan(0);
      }
  });

  test("every stop except the last carries a transition with a real citation", () => {
    for (const line of lines) {
      line.path.forEach((stop, i) => {
        if (i < line.path.length - 1) {
          expect(stop.transition, `${line.id}:${stop.name}`).toBeDefined();
          expect(citationById(stop.transition!.source)).toBeDefined();
          if (stop.transition!.status === "verified") expect(stop.transition!.studies).toBeGreaterThan(0);
          if (stop.transition!.status === "not-verified") expect(stop.transition!.studies).toBe(0);
        } else expect(stop.transition).toBeUndefined();
      });
      expect(citationById(line.evidence.source)).toBeDefined();
    }
  });

  test("transition counts match the 2016 review", () => {
    const count = (id: string, status: string) =>
      lineById(id)!.path.filter((s) => s.transition?.status === status).length;
    expect(count("sbl", "verified")).toBe(3);
    expect(count("bfl", "verified")).toBe(3);
    expect(count("ffl", "verified")).toBe(2);
    expect(count("sl", "verified")).toBe(5);
    expect(count("sl", "not-verified")).toBe(4);
    expect(count("ll", "verified")).toBe(2);
    expect(count("ll", "not-verified")).toBe(3);
    expect(count("sfl", "verified")).toBe(0);
    expect(lineById("sbl")!.evidence.grade).toBe("strong");
    expect(lineById("sfl")!.evidence.grade).toBe("none");
    expect(lineById("sl")!.evidence.grade).toBe("moderate");
  });

  test("lineKeys collects stop keys and extras", () => {
    const keys = lineKeys(lineById("sbl")!);
    expect(keys.has("lateral-head-of-gastrocnemius")).toBe(true);
    expect(keys.has("medial-head-of-gastrocnemius")).toBe(true);
    expect(keys.has("semitendinosus-muscle")).toBe(true);
    expect(keys.has("rectus-femoris-muscle")).toBe(false);
  });

  test("stopSides starts right and flips at crossings", () => {
    expect(stopSides(lineById("sbl")!).every((s) => s === "right")).toBe(true);
    expect(stopSides(lineById("bfl")!)).toEqual(["right", "right", "left", "left"]);
    expect(stopSides(lineById("ffl")!)).toEqual(["right", "left", "right"]);
    const sl = stopSides(lineById("sl")!);
    expect(sl.slice(0, 3)).toEqual(["right", "left", "left"]);
    expect(sl[4]).toBe("right");
  });
});
```

- [x] **Step 2: Write the failing research test**

`tests/research.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { citationById, citationUrl, citations } from "../src/data/research";

describe("research citations", () => {
  test("ids are unique and every entry has a resolvable locator", () => {
    expect(new Set(citations.map((c) => c.id)).size).toBe(citations.length);
    expect(citations.length).toBeGreaterThanOrEqual(17);
    for (const c of citations) {
      expect(c.pmid || c.doi || c.url, c.id).toBeTruthy();
      expect(c.title.length).toBeGreaterThan(10);
      expect(c.year).toBeGreaterThanOrEqual(2009);
      expect(c.summary.split(/[.!?]\s/).length).toBeGreaterThanOrEqual(2);
      expect(c.modelNote.length).toBeGreaterThan(20);
      expect(citationUrl(c)).toMatch(/^https:\/\//);
    }
  });

  test("core reviews are present with the right PMIDs", () => {
    expect(citationById("wilke2016")?.pmid).toBe("26281953");
    expect(citationById("krause2016")?.pmid).toBe("27001027");
    expect(citationById("kalichman2025")?.pmid).toBe("41316622");
  });

  test("every group has at least two entries", () => {
    const groups = new Map<string, number>();
    for (const c of citations) groups.set(c.group, (groups.get(c.group) ?? 0) + 1);
    for (const [g, n] of groups) expect(n, g).toBeGreaterThanOrEqual(2);
    expect(groups.size).toBe(5);
  });
});
```

- [x] **Step 3: Run both to verify they fail**

```bash
npx vitest run tests/lines.test.ts tests/research.test.ts 2>&1 | grep -E "FAIL|Cannot find|does not provide|passed|failed" | head -4
```

Expected: failures (missing `research.ts`, missing exports from `lines.ts`).

- [x] **Step 4: Write `src/data/research.ts`**

```ts
export type CitationId =
  | "wilke2016" | "krause2016" | "kalichman2025" | "wilkeKrause2019"
  | "bordoni2024" | "stecco2025" | "adstrum2017" | "statpearlsFascia" | "openstax"
  | "huijing2009" | "ajimsha2022" | "freitas2019" | "heroux2021" | "colonna2026"
  | "suarez2022" | "schleip2019"
  | "wilke2017" | "lin2026" | "huang2026";

export type CitationKind =
  | "systematic-review" | "scoping-review" | "meta-analysis" | "rct" | "cadaveric"
  | "in-vivo" | "narrative-review" | "consensus" | "reference";

export type CitationGroup = "what-fascia-is" | "continuity" | "force-transmission" | "sensory" | "clinical";

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
  "what-fascia-is": "What fascia is",
  continuity: "Anatomical continuity",
  "force-transmission": "Force transmission",
  sensory: "Fascia as a sensory organ",
  clinical: "Remote and clinical effects",
};

export const KIND_LABELS: Record<CitationKind, string> = {
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
      "An annual update on what tissues should count as fascia, argued from anatomy textbooks and embryology. The authors treat the nomenclature as a starting point rather than a finished answer, with the aim of understanding the fascial continuum in the living body.",
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
    authors: "Gatt A, Agarwal S, Zito PM",
    year: 2023,
    title: "Anatomy, Fascia",
    journal: "StatPearls (NCBI Bookshelf)",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK493232/",
    kind: "reference",
    group: "what-fascia-is",
    summary:
      "A free, peer-reviewed reference chapter covering the layers of fascia, their structure and blood supply, and their clinical relevance. Good for definitions at the level of an anatomy course.",
    modelNote: "Use it to check terminology such as superficial versus deep fascia while reading the panels here.",
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
    modelNote: "The muscle names, origins and actions used across this atlas follow standard undergraduate usage as in this text.",
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
    modelNote: "The arm lines are not yet drawn in this atlas. Their components are all selectable in the shoulder and forearm regions.",
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
    modelNote: "The line grades here match this most recent summary of the field. Treat the numbers on force transmission as provisional.",
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
    modelNote: "Epimuscular force transmission is about neighbouring muscles and fascia, not only the long lines drawn here. It is the mechanism a line would need in order to act as a unit.",
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
    modelNote: "This is the source of the \"force transfer\" notes on the superficial back, back functional and front functional lines. Continuity and force transfer are separate claims.",
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
    modelNote: "When a stretch in one region seems to change another, this is the kind of evidence behind it. It does not tell you how much force moves along any particular line.",
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
    modelNote: "Counter-evidence. The quadriceps sit side by side, yet stretching one did not stiffen its neighbours here. Continuity on the model does not guarantee mechanical coupling.",
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
    modelNote: "A second careful null result in the thigh. Passive force transmission between adjacent muscles in healthy people appears small and variable.",
  },
  {
    id: "colonna2026",
    authors: "Colonna S, Maietti G, Cuoghi F",
    year: 2026,
    title: "In Vivo Evidence of Myofascial Force Transmission Along the Posterior Spiral Chain: Functional Connectivity Linking the Contralateral Latissimus Dorsi, Thoracolumbar Fascia, and Gluteal Region",
    journal: "Cureus",
    pmid: "41640919",
    doi: "10.7759/cureus.100760",
    kind: "in-vivo",
    group: "force-transmission",
    summary:
      "Seventy-three healthy people had trunk rotation measured before and after an isometric activation of the right hip abductors and external rotators, and after stretching one side of the chain. Activation shifted rotation towards one side with little change in total range; stretching partly rebalanced it. The authors read this as functional relevance of the latissimus to contralateral gluteal chain, acting by redistributing motion rather than adding range.",
    modelNote: "This is the back functional line on the model. It is a single-group study without a control group, so treat it as supportive, not decisive.",
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
    modelNote: "The thoracolumbar fascia is a via point on the back functional and superficial back lines here. Its sensory role is a separate story from force transfer.",
  },
  {
    id: "schleip2019",
    authors: "Schleip R, Gabbiani G, Wilke J, et al.",
    year: 2019,
    title: "Fascia Is Able to Actively Contract and May Thereby Influence Musculoskeletal Dynamics: A Histochemical and Mechanographic Investigation",
    journal: "Frontiers in Physiology",
    pmid: "31001134",
    doi: "10.3389/fphys.2019.00336",
    kind: "cadaveric",
    group: "sensory",
    summary:
      "Fascia from 31 human donors and 20 rats was stained for myofibroblasts, and isolated rat fascia was tested for contraction. Human lumbar fascia had more myofibroblasts than fascia lata or plantar fascia, and rat fascia contracted in response to several stimulants. The predicted force in human lumbar tissue is below what would stabilise the spine mechanically but might alter motor coordination.",
    modelNote: "Fascia is not inert. Any slow, low-level tension it generates is far smaller than muscle force, so it should not be read as fascia \"pulling\" a line.",
  },
  {
    id: "wilke2017",
    authors: "Wilke J, Vogt L, Niederer D, Banzer W",
    year: 2017,
    title: "Is remote stretching based on myofascial chains as effective as local exercise? A randomised-controlled trial",
    journal: "Journal of Sports Sciences",
    pmid: "27819537",
    doi: "10.1080/02640414.2016.1251606",
    kind: "rct",
    group: "clinical",
    summary:
      "Sixty-three healthy adults were randomised to lower-limb stretching, neck stretching or no exercise. Both stretching groups increased cervical range of motion compared with control, immediately and five minutes later, with no difference between remote and local stretching. The effect was not direction-specific, so the mechanism remains open.",
    modelNote: "The stretch targeted the superficial back line. A remote effect is real in this trial, but it does not prove tension travelled along the drawn path.",
  },
  {
    id: "lin2026",
    authors: "Lin LH, Lien NTM, Fatria I, Huang YC",
    year: 2026,
    title: "Effect of remote myofascial manual therapy along the superficial back line on lumbo-pelvic-hip and neck flexibility and pain intensity: A systematic review and meta-analysis",
    journal: "Journal of Back and Musculoskeletal Rehabilitation",
    pmid: "41773603",
    doi: "10.1177/10538127261428186",
    kind: "meta-analysis",
    group: "clinical",
    summary:
      "Nine randomised trials of manual therapy applied at a distance along the superficial back line showed a moderate improvement in flexibility (Hedges' g 0.53) and a borderline, non-significant trend towards less pain. Evidence certainty was moderate for flexibility and low for pain, supporting a conditional recommendation as an adjunct.",
    modelNote: "This is the most recent pooled estimate for remote effects along the superficial back line. Flexibility gains are modest and pain effects are unproven.",
  },
  {
    id: "huang2026",
    authors: "Huang H, Chen L, Lai Y, Li W, Li J",
    year: 2026,
    title: "Fascia as a Functional System in Health and Disease: From Fundamental Biology to Assessment and Targeted Interventions",
    journal: "International Journal of Molecular Sciences",
    pmid: "42450141",
    doi: "10.3390/ijms27135871",
    kind: "narrative-review",
    group: "clinical",
    summary:
      "A broad 2026 review that treats fascia as a system that senses, transmits and regulates mechanical, sensory and metabolic signals. It compiles assessment methods (palpation, ultrasound, elastography, tissue mechanics, omics, modelling) and lists interventions from manual therapy to injections, proposing an assessment-guided decision framework.",
    modelNote: "Useful as a map of the field and its measurement tools. It is a synthesis, not new evidence for any specific line.",
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
```

Note the StatPearls author line: check the chapter's author list on the page when writing the file; if it differs, use the page's names. The OpenStax author line follows the book's title page.

- [x] **Step 5: Rewrite `src/data/lines.ts`**

```ts
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

const SACROTUBEROUS: Transition["via"] = {
  name: "Sacrotuberous ligament",
  anchor: { key: "hip-bone", offset: [0, -0.05, -0.03] },
};
const ERECTOR_KEYS = ["iliocostalis-lumborum-muscle", "iliocostalis-thoracis-muscle", "spinalis-thoracis-muscle"];

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
        summary: "Moderate evidence that tension transfers at all three transitions, based on six studies.",
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
        summary: "Moderate evidence of force transfer at one of the two transitions tested, based on three studies.",
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
        keys: ["abdominal-part-of-pectoralis-major-muscle", "clavicular-head-of-pectoralis-major-muscle"],
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

/** Body side of each stop for a path that starts on the right and flips at every `crosses`. */
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
```

- [x] **Step 6: Switch styling from name substrings to catalog keys**

In `src/viewer/appearance.ts`, replace `lineMatches: string[]` with `lineKeys: Set<string>` and add `focusIds?: Set<string>`:

```ts
export type StyleInput = {
  parts: CatalogPart[];
  mode: "muscles" | "bones" | "fascia";
  selected: string | null;
  hidden: Set<string>;
  isolated: boolean;
  opacity: number;
  lineColor: string;
  /** Catalog keys that belong to the active line. */
  lineKeys: Set<string>;
  /** Ids to emphasise during a tour step; other line parts dim. */
  focusIds?: Set<string>;
};
```

and in the loop:

```ts
    const chain = input.mode === "fascia" && p.type === "muscle" && input.lineKeys.has(p.key);
    const focused = !!input.focusIds?.has(p.id);
    const dimmedChain = chain && !!input.focusIds?.size && !focused;
    const emissiveIntensity = selected ? 0.26 : focused ? 0.45 : chain ? 0.08 : 0;
    const opacity =
      selected || focused
        ? 1
        : chain
          ? dimmedChain ? 0.55 : 1
          : bone
            ? input.mode === "bones" ? input.opacity : 1
            : input.mode === "fascia"
              ? 0.1
              : input.opacity;
```

(color and emissive stay as before; a focused part uses the line color like any chain part.) Update `tests/appearance.test.ts`: `lineMatches: ["gastrocnemius"]` becomes `lineKeys: new Set(["gastro"])` (the fixture's key is its id) and the "other" case uses `lineKeys: new Set(["soleus"])`; add:

```ts
  test("a focused tour part glows and the rest of the chain dims", () => {
    const s = computeStyles({ ...base, mode: "fascia", lineKeys: new Set(["gastro", "femur"]), focusIds: new Set(["femur"]) });
    expect(s.get("femur")).toMatchObject({ emissiveIntensity: 0.45, opacity: 1 });
    expect(s.get("gastro")?.opacity).toBe(0.55);
  });
```

Note `femur` is a bone in the fixture; the chain rule requires `type === "muscle"`, so make the focus fixture a muscle: add `const soleus = part("soleus", "muscle", "Soleus Muscle")` to `parts` and use `soleus` in place of `femur` in this test.

Callers: `src/App.tsx` passes `lineKeys: lineKeys(activeLine)` (import from `./data/lines`) and `focusIds` (Task 5; pass `undefined` for now). `src/features/detail/DetailPanel.tsx` computes related lines as `lines.filter((l) => lineKeys(l).has(part.key))`. `src/features/fascia/FasciaPanel.tsx` path buttons use `stopPartId(stop, "right")` instead of `matchPart(p.match)` (full rewrite of the panel comes in Task 3; here only make it compile). `tests/data.test.ts`: the line test now expects six lines, `line.path.length >= 3`, and no `matches` field; drop the `stop.match` assertions.

- [x] **Step 7: Run everything**

```bash
npm test 2>&1 | grep -E "Test Files|Tests |FAIL|×|AssertionError" | head; npm run lint 2>&1 | grep -E "error|✖"; echo "LINT EXIT: ${PIPESTATUS[0]}"; npm run typecheck 2>&1 | grep -i error; npm run build 2>&1 | tail -1
```

Expected: all green. Then in Chrome at `http://localhost:3131/form-anatomy/?m=fascia&l=sl`: the Spiral line appears in the list and highlights splenius, rhomboids, serratus anterior, obliques, tibialis anterior, fibularis longus, biceps femoris and erector spinae on both sides.

- [x] **Step 8: Commit**

```bash
git add -A && git commit -q -m "Key the six fascial lines to the catalog with transcribed dissection evidence and add the citation table

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Citation verifier in CI

**Files:**
- Create: `scripts/verify-citations.ts`
- Modify: `package.json` (`verify:citations` script), `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `citations` from `src/data/research.ts`.
- Produces: exit code 0 only when every PMID resolves on PubMed with a matching title, every DOI resolves at doi.org, and every URL answers 200.

- [x] **Step 1: Write `scripts/verify-citations.ts`**

```ts
/**
 * Resolves every citation in src/data/research.ts against PubMed, doi.org and the web.
 * Exit 1 on any failure so CI blocks a build that would ship an unverifiable reference.
 */
import { citations } from "../src/data/research";

const UA = "FormAnatomyAtlas/0.2 (https://github.com/HyperionProj25/form-anatomy; educational)";
const failures: string[] = [];
const ok: string[] = [];

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

/** Share of the recorded title's meaningful words that appear in the PubMed title. */
function titleOverlap(recorded: string, remote: string): number {
  const r = words(recorded);
  const remoteSet = new Set(words(remote));
  return r.length ? r.filter((w) => remoteSet.has(w)).length / r.length : 0;
}

async function checkPubMed() {
  const withPmid = citations.filter((c) => c.pmid);
  if (!withPmid.length) return;
  const ids = withPmid.map((c) => c.pmid).join(",");
  const res = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`,
    { headers: { "User-Agent": UA } },
  );
  if (!res.ok) {
    failures.push(`PubMed esummary HTTP ${res.status}`);
    return;
  }
  const json = (await res.json()) as { result: Record<string, { title?: string; pubdate?: string; error?: string }> };
  for (const c of withPmid) {
    const r = json.result[c.pmid!];
    if (!r || r.error || !r.title) {
      failures.push(`${c.id}: PMID ${c.pmid} not found (${r?.error ?? "no record"})`);
      continue;
    }
    const overlap = titleOverlap(c.title, r.title);
    if (overlap < 0.7) {
      failures.push(`${c.id}: PMID ${c.pmid} title mismatch (${Math.round(overlap * 100)}%): "${r.title}"`);
      continue;
    }
    const year = Number((r.pubdate ?? "").slice(0, 4));
    if (year && Math.abs(year - c.year) > 1) {
      failures.push(`${c.id}: PMID ${c.pmid} year ${year} vs recorded ${c.year}`);
      continue;
    }
    ok.push(`${c.id}: PMID ${c.pmid} ✓ ${Math.round(overlap * 100)}% title match`);
  }
}

async function head(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual", headers: { "User-Agent": UA } });
    if (res.status === 405 || res.status === 403) {
      const get = await fetch(url, { method: "GET", redirect: "manual", headers: { "User-Agent": UA } });
      return get.status;
    }
    return res.status;
  } catch {
    return 0;
  }
}

async function checkDois() {
  for (const c of citations.filter((c) => c.doi)) {
    const status = await head(`https://doi.org/${c.doi}`);
    if (status >= 200 && status < 400) ok.push(`${c.id}: DOI ${c.doi} ✓ ${status}`);
    else failures.push(`${c.id}: DOI ${c.doi} returned ${status}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function checkUrls() {
  for (const c of citations.filter((c) => c.url)) {
    const status = await head(c.url!);
    if (status >= 200 && status < 400) ok.push(`${c.id}: URL ✓ ${status}`);
    else failures.push(`${c.id}: URL ${c.url} returned ${status}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

await checkPubMed();
await checkDois();
await checkUrls();
for (const line of ok) console.log(line);
if (failures.length) {
  console.error(`\n${failures.length} citation check(s) failed:`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log(`\nAll ${citations.length} citations verified.`);
```

Add to `package.json` scripts: `"verify:citations": "tsx scripts/verify-citations.ts"`.

- [x] **Step 2: Run it**

```bash
npm run verify:citations 2>&1 | tail -25
```

Expected: one ✓ line per PMID, DOI and URL and `All 19 citations verified.` If a title overlap is below 70 percent, compare the recorded title with PubMed's and fix the recorded title; if a PMID is wrong, remove the citation.

- [x] **Step 3: Add the CI step**

In `.github/workflows/deploy.yml`, after `- run: npm run typecheck` add `- run: npm run verify:citations`.

- [x] **Step 4: Commit**

```bash
git add -A && git commit -q -m "Verify every research citation against PubMed and doi.org in CI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 3: Evidence badges in the fascia panel and the research digest modal

**Files:**
- Create: `src/features/fascia/EvidenceBadge.tsx`, `src/features/research/ResearchDigest.tsx`
- Modify: `src/features/fascia/FasciaPanel.tsx` (rewrite), `src/features/guide/Modals.tsx`, `src/state/store.tsx` (`ModalId` adds `"research"`), `src/App.tsx` (nav + footer entry points), `src/styles/globals.css`

**Interfaces:**
- `<EvidenceBadge transition={t} />` renders the status pill with study counts; `<GradeBadge grade={line.evidence.grade} />` renders the line-level pill.
- `<ResearchDigest />` renders inside the modal shell.

- [x] **Step 1: `EvidenceBadge.tsx`**

```tsx
import type { Transition } from "../../data/lines";
import { citationById, citationUrl } from "../../data/research";

const STATUS_LABEL: Record<Transition["status"], string> = {
  verified: "Verified",
  "not-verified": "Not verified",
  mechanical: "Mechanical only",
  "not-assessed": "Not assessed",
};

export function EvidenceBadge({ transition }: { transition: Transition }) {
  const cite = citationById(transition.source);
  const detail =
    transition.status === "verified"
      ? `${transition.studies} ${transition.studies === 1 ? "study" : "studies"}${transition.consistency ? ` · ${transition.consistency} specimens` : transition.specimens ? ` · ${transition.specimens} specimens` : ""}`
      : transition.status === "not-verified"
        ? `0 studies${transition.generalAnatomyStudies ? ` · ${transition.generalAnatomyStudies} general-anatomy studies checked` : ""}`
        : transition.status === "mechanical"
          ? "not searched"
          : "outside the review";
  return (
    <div className={`evidence evidence-${transition.status}`}>
      <span className="evidence-pill">{STATUS_LABEL[transition.status]}</span>
      <span className="evidence-detail">{detail}</span>
      <p>{transition.note}</p>
      {transition.via && <p className="evidence-via">via {transition.via.name} (not separately modeled)</p>}
      {cite && (
        <a href={citationUrl(cite)} target="_blank" rel="noreferrer">
          {cite.authors.split(",")[0]} {cite.year} ↗
        </a>
      )}
    </div>
  );
}

export function GradeBadge({ grade }: { grade: "strong" | "moderate" | "none" }) {
  const label = grade === "strong" ? "Strong evidence" : grade === "moderate" ? "Moderate evidence for parts" : "No evidence";
  return <span className={`grade-pill grade-${grade}`}>{label}</span>;
}
```

- [x] **Step 2: Rewrite `FasciaPanel.tsx` (tour player is added in Task 5; leave a slot)**

```tsx
import { Activity, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { lineById, lines, stopPartId, stopSides } from "../../data/lines";
import { citationById, citationUrl } from "../../data/research";
import { useStore } from "../../state/store";
import CopyLink from "../shared/CopyLink";
import { EvidenceBadge, GradeBadge } from "./EvidenceBadge";

export default function FasciaPanel({ onToast }: { onToast: (m: string) => void }) {
  const { state, dispatch } = useStore();
  const line = lineById(state.line) ?? lines[0];
  const index = lines.indexOf(line);
  const sides = stopSides(line);
  const evidenceCite = citationById(line.evidence.source);
  const forceCite = line.evidence.forceTransfer && citationById(line.evidence.forceTransfer.source);
  return (
    <>
      <div className="detail-kicker">
        <span className="tiny-tag">MYOFASCIAL LINE</span>
        <span className="chapter">
          0{index + 1} / 0{lines.length}
        </span>
      </div>
      <h2 className="detail-title">{line.name}</h2>
      <p className="latin">{line.subtitle}</p>
      <GradeBadge grade={line.evidence.grade} />
      <p className="detail-copy">{line.description}</p>
      <CopyLink onCopied={onToast} label="Copy link to this line" />
      <div className="section-label">FOLLOW THE CONNECTION</div>
      <ol className="connection-path">
        {line.path.map((stop, i) => {
          const id = stopPartId(stop, sides[i]);
          const modeled = !!stop.key && !!id;
          return (
            <li key={stop.name}>
              <button onClick={() => id && dispatch({ type: "select", id })} disabled={!id}>
                <span className="path-point">{i + 1}</span>
                <span>
                  {stop.name}
                  <small>
                    {stop.note}
                    {!modeled && !stop.note.includes("not separately modeled") ? " · not separately modeled" : ""}
                  </small>
                </span>
                {modeled && <ChevronRight size={13} />}
              </button>
              {stop.transition && <EvidenceBadge transition={stop.transition} />}
            </li>
          );
        })}
      </ol>
      <div className="evidence-summary">
        <h3>What the dissection evidence says</h3>
        <p>{line.evidence.summary}</p>
        {evidenceCite && (
          <a href={citationUrl(evidenceCite)} target="_blank" rel="noreferrer">
            {evidenceCite.authors.split(",")[0]} et al. {evidenceCite.year}, {evidenceCite.journal} ↗
          </a>
        )}
        {line.evidence.forceTransfer && (
          <>
            <h3>Does force actually travel along it?</h3>
            <p>{line.evidence.forceTransfer.summary}</p>
            {forceCite && (
              <a href={citationUrl(forceCite)} target="_blank" rel="noreferrer">
                {forceCite.authors.split(",")[0]} et al. {forceCite.year}, {forceCite.journal} ↗
              </a>
            )}
          </>
        )}
        <p className="subtle">
          Highlights show model components, not a segmented fascia layer or a simulation of force. Continuity between tissues does not by itself establish a whole-body effect or a treatment benefit.
        </p>
        <button className="text-button" onClick={() => dispatch({ type: "setModal", modal: "research" })}>
          <BookOpen size={15} /> Read the research digest
        </button>
      </div>
      <div className="movement-card">
        <Activity size={18} />
        <h3>Think in movement</h3>
        <p>{line.movement}</p>
      </div>
      <details className="evidence-note">
        <summary>
          How to read the badges <ChevronDown size={14} />
        </summary>
        <p>
          "Verified" and "not verified" are the terms used by Wilke et al. (2016), who searched for human dissection studies showing tissue continuity at each hop. Study counts and specimen shares are copied from their Table 3. "Mechanical only" marks a hop the model's author describes as a lever across a joint rather than a tissue link. "Not assessed" marks a hop the review did not examine.
        </p>
      </details>
    </>
  );
}
```

- [x] **Step 3: `ResearchDigest.tsx`**

```tsx
import { citations, citationUrl, GROUP_LABELS, KIND_LABELS, type CitationGroup } from "../../data/research";

const ORDER: CitationGroup[] = ["what-fascia-is", "continuity", "force-transmission", "sensory", "clinical"];

export default function ResearchDigest() {
  return (
    <>
      <div className="eyebrow">RESEARCH DIGEST</div>
      <h2 id="modal-title">What the evidence says about fascia.</h2>
      <p>
        Every entry links to its PubMed record or publisher page, and the build checks those links. Summaries stay within what each paper's abstract reports.
      </p>
      {ORDER.map((group) => (
        <section className="digest-group" key={group}>
          <h3>{GROUP_LABELS[group]}</h3>
          {citations
            .filter((c) => c.group === group)
            .sort((a, b) => a.year - b.year)
            .map((c) => (
              <article className="digest-entry" key={c.id}>
                <div className="digest-head">
                  <span className={`kind-pill kind-${c.kind}`}>{KIND_LABELS[c.kind]}</span>
                  <span className="digest-year">{c.year}</span>
                </div>
                <h4>{c.title}</h4>
                <p className="digest-authors">
                  {c.authors}. <em>{c.journal}</em>.
                </p>
                <p>{c.summary}</p>
                <p className="digest-model">
                  <strong>On this model:</strong> {c.modelNote}
                </p>
                <a href={citationUrl(c)} target="_blank" rel="noreferrer">
                  {c.pmid ? `PubMed ${c.pmid}` : c.doi ? `doi:${c.doi}` : "Open source"} ↗
                </a>
              </article>
            ))}
        </section>
      ))}
    </>
  );
}
```

- [x] **Step 4: Wire it up**

- `store.tsx`: `export type ModalId = "about" | "guide" | "quiz" | "research" | null;`
- `Modals.tsx`: import `ResearchDigest`; render `modal === "research" ? <ResearchDigest /> : …`; in `About`, add under "Learning references" a button `Open the research digest` that dispatches `setModal research` (pass `dispatch` via a prop or use `useStore` inside About).
- `App.tsx`: add a nav button `Research` between "Fascial lines" and "Learning guide" that dispatches `setModal research`; footer keeps "Sources & credits".
- Styles appended to `globals.css`:

```css
/* Phase 3: evidence badges, digest */
.grade-pill, .evidence-pill, .kind-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fffefb;
  color: var(--muted);
}
.grade-pill { margin: 6px 0 10px; }
.grade-strong, .evidence-verified .evidence-pill { background: #dfe9dc; border-color: #b7cbb3; color: #2f5a3f; }
.grade-moderate { background: #f3e7cf; border-color: #e1cc9a; color: #7a5a17; }
.grade-none, .evidence-not-verified .evidence-pill { background: #f4e1dc; border-color: #e3b9ad; color: #8a3f2e; }
.evidence-mechanical .evidence-pill, .evidence-not-assessed .evidence-pill { background: #ecebe5; color: #6b6f66; }
.evidence {
  margin: 6px 0 4px 34px;
  padding: 8px 10px;
  border-left: 2px solid var(--border);
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
}
.evidence-verified { border-left-color: #8fb098; }
.evidence-not-verified { border-left-color: #d9a294; }
.evidence-detail { margin-left: 8px; font-size: 10.5px; }
.evidence p { margin-top: 5px; }
.evidence-via { font-style: italic; }
.evidence a { display: inline-block; margin-top: 4px; text-decoration: underline; font-size: 10.5px; }
.evidence-summary { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); }
.evidence-summary h3 { font-size: 12px; font-weight: 600; margin: 8px 0 4px; }
.evidence-summary p { font-size: 12px; line-height: 1.6; color: var(--muted); }
.evidence-summary a { display: inline-block; font-size: 11px; text-decoration: underline; margin: 4px 0 8px; }
.digest-group { margin-top: 22px; }
.digest-group h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--green); margin-bottom: 8px; }
.digest-entry { padding: 12px 0; border-top: 1px solid var(--border); }
.digest-head { display: flex; gap: 10px; align-items: center; margin-bottom: 4px; }
.digest-year { font-size: 11px; color: var(--muted); }
.digest-entry h4 { font-size: 14px; font-weight: 600; margin: 2px 0 4px; }
.digest-authors { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
.digest-entry p { font-size: 12.5px; line-height: 1.6; }
.digest-model { margin-top: 6px; background: #f3f5ee; padding: 8px 10px; border-radius: 8px; }
.digest-entry a { display: inline-block; margin-top: 6px; font-size: 11px; text-decoration: underline; }
```

- [x] **Step 5: Verify and commit**

```bash
npm run lint 2>&1 | grep -E "error|✖"; echo "LINT EXIT: ${PIPESTATUS[0]}"; npm run typecheck 2>&1 | grep -i error; npm test 2>&1 | grep -E "Test Files|Tests |FAIL"; npm run build 2>&1 | tail -1
```

Chrome at `?m=fascia&l=sbl`: the line title shows a green "Strong evidence" pill; each hop shows a badge such as "Verified · 5 studies · 51/52 specimens" with its note and a "Wilke 2016 ↗" link; the "not assessed" scalp hop is grey; the evidence summary block links to the 2016 review and, for the SBL, the force-transfer note links to Krause 2016. The nav "Research" button opens the digest with five groups and 19 entries, each with a working PubMed or DOI link.

```bash
git add -A && git commit -q -m "Show dissection evidence on every fascial-line hop and add the research digest

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Drawn teaching cable through each line

**Files:**
- Create: `src/viewer/paths.ts`, `tests/paths.test.ts`
- Modify: `src/viewer/engine.ts`, `src/viewer/Viewer.tsx`, `src/state/store.tsx` (`showPath`, `togglePath`), `src/App.tsx` (legend toggle + caption), `src/styles/globals.css`

**Interfaces:**
- `linePaths(line): LinePath[]` where `LinePath = { side: "left" | "right"; points: Vec3[] }`; one path per starting side.
- Engine: `drawPaths(paths: { points: Vec3[]; color: string }[]): void` (replaces any previous paths), `clearPaths(): void`.
- Viewer prop: `paths: { points: Vec3[]; color: string }[]`.

- [x] **Step 1: Failing paths test**

`tests/paths.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { lineById } from "../src/data/lines";
import { linePaths, anchorPoint } from "../src/viewer/paths";
import { partForSide } from "../src/data/catalog";

describe("linePaths", () => {
  test("produces one polyline per starting side with a point per stop plus vias", () => {
    const sbl = lineById("sbl")!;
    const paths = linePaths(sbl);
    expect(paths.map((p) => p.side)).toEqual(["right", "left"]);
    // 5 stops + 1 via (sacrotuberous ligament)
    expect(paths[0].points.length).toBe(6);
    expect(paths[1].points.length).toBe(6);
    // right-side path stays on negative x (subject's right), left on positive x
    expect(paths[0].points.every((p) => p[0] <= 0.02)).toBe(true);
    expect(paths[1].points.every((p) => p[0] >= -0.02)).toBe(true);
    // runs from the foot upward
    expect(paths[0].points[0][1]).toBeLessThan(paths[0].points[5][1]);
  });

  test("crossing lines switch body side at the crossing stop", () => {
    const bfl = lineById("bfl")!;
    const right = linePaths(bfl)[0].points; // lat right, TLF midline, glute left, vastus left
    expect(right[0][0]).toBeLessThan(0);
    expect(Math.abs(right[1][0])).toBeLessThan(0.02);
    expect(right[2][0]).toBeGreaterThan(0);
    expect(right[3][0]).toBeGreaterThan(0);
  });

  test("anchors offset laterally away from the midline for the given side", () => {
    const calcR = partForSide("calcaneus", "right")!;
    const p = anchorPoint({ key: "calcaneus", offset: [0.05, 0, 0] }, "right")!;
    expect(p[0]).toBeCloseTo(calcR.centroid[0] - 0.05, 5);
    const q = anchorPoint({ key: "calcaneus", offset: [0.05, 0, 0] }, "left")!;
    expect(q[0]).toBeGreaterThan(calcR.centroid[0]);
  });
});
```

- [x] **Step 2: `src/viewer/paths.ts`**

```ts
import { partForSide } from "../data/catalog";
import { stopSides, type Anchor, type Line } from "../data/lines";
import type { Side, Vec3 } from "../data/types";

export type LinePath = { side: "left" | "right"; points: Vec3[] };

/** Anchor position for a side: the anchor part's centroid plus a side-relative offset. */
export function anchorPoint(anchor: Anchor, side: Side): Vec3 | null {
  const part = partForSide(anchor.key, side);
  if (!part) return null;
  const sign = side === "left" ? 1 : side === "right" ? -1 : part.centroid[0] >= 0 ? 1 : -1;
  const [lateral, up, forward] = anchor.offset;
  return [part.centroid[0] + sign * lateral, part.centroid[1] + up, part.centroid[2] + forward];
}

function stopPoint(line: Line, index: number, side: Side): Vec3 | null {
  const stop = line.path[index];
  if (stop.key) return partForSide(stop.key, side)?.centroid ?? null;
  return stop.anchor ? anchorPoint(stop.anchor, side) : null;
}

/** Ordered centroid polylines for a line, one starting on each body side. Vias are inserted between stops. */
export function linePaths(line: Line): LinePath[] {
  return (["right", "left"] as const).map((start) => {
    const sides = stopSides(line, start);
    const points: Vec3[] = [];
    line.path.forEach((stop, i) => {
      const p = stopPoint(line, i, sides[i]);
      if (p) points.push(p);
      const via = stop.transition?.via;
      if (via && i < line.path.length - 1) {
        // A via sits between this stop's side and the next stop's side; use the next side for crossings.
        const v = anchorPoint(via.anchor, sides[i + 1]);
        if (v) points.push(v);
      }
    });
    return { side: start, points };
  });
}
```

Run the test: `npx vitest run tests/paths.test.ts` → expected 3 passed. (If `anchorPoint` for a midline part such as `vertebra-l3` is asked for side "left", `partForSide` returns the midline part and the lateral offset sign follows the requested side; with offset 0 the point stays on the midline.)

- [x] **Step 3: Engine `drawPaths` / `clearPaths` with a travelling pulse**

Add to `AnatomyEngine` fields: `private pathGroup = new THREE.Group(); private pulses: { curve: THREE.CatmullRomCurve3; mesh: THREE.Mesh; phase: number }[] = [];` and in the constructor `this.scene.add(this.pathGroup);`.

```ts
  /** Replace the drawn teaching cables. Points are in model space (catalog coordinates). */
  drawPaths(paths: { points: Vec3[]; color: string }[]): void {
    this.clearPaths();
    paths.forEach((path, i) => {
      if (path.points.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(path.points.map((p) => new THREE.Vector3(...p)), false, "centripetal", 0.5);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 240, 0.006, 10, false),
        new THREE.MeshBasicMaterial({ color: path.color, transparent: true, opacity: 0.85, depthTest: false }),
      );
      tube.renderOrder = 10;
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 16, 12),
        new THREE.MeshBasicMaterial({ color: "#fffefb", depthTest: false }),
      );
      pulse.renderOrder = 11;
      this.pathGroup.add(tube, pulse);
      this.pulses.push({ curve, mesh: pulse, phase: (i * 0.5) % 1 });
    });
  }

  clearPaths(): void {
    for (const child of [...this.pathGroup.children]) {
      this.pathGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.pulses = [];
  }
```

In `render()`, before `renderer.render`, advance the pulses: `const t = (performance.now() % 4000) / 4000; for (const p of this.pulses) p.curve.getPointAt((t + p.phase) % 1, p.mesh.position);`. In `dispose()`, call `this.clearPaths()`.

- [x] **Step 4: Viewer prop and store toggle**

`Viewer.tsx`: add `paths: { points: Vec3[]; color: string }[]` to `Props` and an effect: `useEffect(() => { if (ready) engine.current?.drawPaths(props.paths); }, [ready, props.paths]);`.

`store.tsx`: add `showPath: boolean` (initial `true`) and action `{ type: "togglePath" }` → `{ ...s, showPath: !s.showPath }`.

`App.tsx`: compute `const paths = useMemo(() => state.mode === "fascia" && state.showPath ? linePaths(activeLine).map((p) => ({ points: p.points, color: activeLine.color })) : [], [state.mode, state.showPath, activeLine]);` and pass `paths={paths}`. Extend the line legend:

```tsx
          {state.mode === "fascia" && (
            <div className="line-legend">
              <span className="line-dot" style={{ background: activeLine.color }} />
              {activeLine.name}
              <small>Teaching path drawn through structure centers. Not a fascial sheet.</small>
              <button className="text-button" onClick={() => dispatch({ type: "togglePath" })}>
                {state.showPath ? "Hide path" : "Show path"}
              </button>
            </div>
          )}
```

Add CSS: `.line-legend button { margin-left: 8px; font-size: 11px; }` and let `.line-legend small` wrap (`display: block; max-width: 220px;`).

- [x] **Step 5: Verify and commit**

Full check, then Chrome at `?m=fascia&l=bfl`: two cables cross at the lumbar spine from each latissimus to the opposite gluteus maximus and down the lateral thigh, a small pale pulse travels along each, the cable reads through the faded muscles, and "Hide path" removes it. At `?m=fascia&l=sl` the two spirals cross twice. Switching to Muscles removes the cables.

```bash
git add -A && git commit -q -m "Draw a teaching cable with a travelling pulse through each fascial line

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Guided tours

**Files:**
- Create: `src/features/fascia/TourPlayer.tsx`
- Modify: `src/state/store.tsx`, `src/state/urlCodec.ts`, `src/viewer/Viewer.tsx`, `src/viewer/engine.ts` (`flyTo` direction), `src/App.tsx`, `src/features/fascia/FasciaPanel.tsx`, `tests/store.test.ts`, `tests/urlCodec.test.ts`, `src/styles/globals.css`

**Interfaces:**
- Store: `tour: { step: number; playing: boolean } | null`, `focus: { ids: string[]; flyId: string | null; direction: Vec3 } | null`; actions `startTour`, `tourStep(step)`, `tourNext`, `tourPrev`, `tourPlay(playing)`, `endTour`. Every tour action recomputes `focus` and bumps `cameraNonce`. `select`, `setMode`, `setLine`, `reset` end the tour.
- URL: `t=<step>` written when `tour` is set and mode is fascia; decoded into `tour: { step, playing: false }`.
- `CameraCommand` gains `{ kind: "fly"; id: string; direction: Vec3; nonce }`; engine `flyTo(id, { direction })`.

- [x] **Step 1: Failing store and codec tests**

Append to `tests/store.test.ts`:

```ts
describe("tours", () => {
  test("startTour focuses the first stop and bumps the camera nonce", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    const nonce = s.cameraNonce;
    s = reducer(s, { type: "startTour" });
    expect(s.tour).toEqual({ step: 0, playing: false });
    expect(s.focus?.flyId).toBe("calcaneus-r"); // SBL stop 1 is anchored to the calcaneus
    expect(s.focus?.ids.length).toBeGreaterThan(0);
    expect(s.cameraNonce).toBe(nonce + 1);
  });

  test("tourNext advances, stops at the last stop, and tourPrev goes back", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    s = reducer(s, { type: "setLine", line: "ffl" });
    s = reducer(s, { type: "startTour" });
    s = reducer(s, { type: "tourNext" });
    expect(s.tour?.step).toBe(1);
    expect(s.focus?.flyId).toBe("rectus-abdominis-muscle-l"); // crosses to the left
    s = reducer(s, { type: "tourNext" });
    s = reducer(s, { type: "tourPlay", playing: true });
    s = reducer(s, { type: "tourNext" });
    expect(s.tour).toEqual({ step: 2, playing: false });
    s = reducer(s, { type: "tourPrev" });
    expect(s.tour?.step).toBe(1);
  });

  test("selecting a part or leaving fascia mode ends the tour", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    s = reducer(s, { type: "startTour" });
    expect(reducer(s, { type: "select", id: "femur-l" }).tour).toBeNull();
    expect(reducer(s, { type: "setMode", mode: "bones" }).tour).toBeNull();
    expect(reducer(s, { type: "endTour" }).focus).toBeNull();
  });

  test("hydrating with a tour step rebuilds the focus", () => {
    const s = reducer(initialState, { type: "hydrate", state: { mode: "fascia", line: "bfl", tour: { step: 2, playing: false } } });
    expect(s.focus?.flyId).toBe("gluteus-maximus-muscle-l");
  });
});
```

Append to `tests/urlCodec.test.ts`:

```ts
  test("tour step round-trips only in fascia mode", () => {
    const s: AppState = { ...initialState, mode: "fascia", line: "sl", view: "back", tour: { step: 3, playing: true } };
    expect(encodeState(s)).toBe("?m=fascia&v=back&l=sl&t=3");
    expect(decodeSearch("?m=fascia&l=sl&t=3")).toMatchObject({ tour: { step: 3, playing: false } });
    expect(decodeSearch("?t=2")).toEqual({});
    expect(decodeSearch("?m=fascia&t=99")).toEqual({ mode: "fascia" });
  });
```

- [x] **Step 2: Store changes**

Add to `AppState`: `showPath: boolean; tour: { step: number; playing: boolean } | null; focus: { ids: string[]; flyId: string | null; direction: Vec3 } | null;` with initial `showPath: true, tour: null, focus: null`. Add to `Action`: `| { type: "togglePath" } | { type: "startTour" } | { type: "tourStep"; step: number } | { type: "tourNext" } | { type: "tourPrev" } | { type: "tourPlay"; playing: boolean } | { type: "endTour" }`.

Helper (in `store.tsx`, importing `lineById`, `stopPartId`, `stopSides`, `lineKeys` from `../data/lines`, `partForSide`, `partsByKey` from `../data/catalog`):

```ts
const DIRECTIONS: Record<"front" | "back" | "side", Vec3> = { front: [0, 0, 1], back: [0, 0, -1], side: [1, 0, 0] };

/** Focus for a tour step: ids to glow, the part to frame, and the camera direction. */
export function tourFocus(lineId: LineId, step: number): AppState["focus"] {
  const line = lineById(lineId);
  if (!line || step < 0 || step >= line.path.length) return null;
  const stop = line.path[step];
  const side = stopSides(line)[step];
  const flyId = stopPartId(stop, side);
  const ids = [stop.key, ...(stop.keys ?? [])]
    .filter((k): k is string => !!k)
    .flatMap((k) => partsByKey(k).filter((p) => p.side === side || p.side === "midline").map((p) => p.id));
  const view = stop.view ?? line.view;
  const base = DIRECTIONS[view];
  const part = flyId ? partForSide(stop.key ?? stop.anchor!.key, side) : undefined;
  const direction: Vec3 = view === "side" && part ? [part.centroid[0] >= 0 ? 1 : -1, 0.15, 0.25] : base;
  return { ids, flyId, direction };
}

function withTour(s: AppState, step: number, playing: boolean): AppState {
  const line = lineById(s.line);
  if (!line) return s;
  const clamped = Math.max(0, Math.min(step, line.path.length - 1));
  return { ...s, tour: { step: clamped, playing }, focus: tourFocus(s.line, clamped), selected: null, cameraNonce: s.cameraNonce + 1 };
}
```

Reducer cases:

```ts
    case "togglePath":
      return { ...s, showPath: !s.showPath };
    case "startTour":
      return withTour(s, 0, false);
    case "tourStep":
      return withTour(s, a.step, s.tour?.playing ?? false);
    case "tourNext": {
      const last = (lineById(s.line)?.path.length ?? 1) - 1;
      const step = (s.tour?.step ?? -1) + 1;
      return step > last ? { ...s, tour: s.tour && { ...s.tour, playing: false } } : withTour(s, step, s.tour?.playing ?? false);
    }
    case "tourPrev":
      return withTour(s, (s.tour?.step ?? 0) - 1, false);
    case "tourPlay":
      return s.tour ? { ...s, tour: { ...s.tour, playing: a.playing } } : s;
    case "endTour":
      return { ...s, tour: null, focus: null };
```

and end the tour (`tour: null, focus: null`) inside `select`, `setMode`, `setLine` and `reset`. In `hydrate`: `const merged = { ...s, ...a.state }; return { ...merged, focus: merged.tour ? tourFocus(merged.line, merged.tour.step) : null, cameraNonce: s.cameraNonce + 1 };`.

`urlCodec.ts`: encode `if (s.mode === "fascia" && s.tour) q.set("t", String(s.tour.step));` after `l`; decode `const t = q.get("t"); const lineForT = out.line ?? initialState.line; if (out.mode === "fascia" && t !== null) { const n = Number(t); const len = lineById(lineForT)?.path.length ?? 0; if (Number.isInteger(n) && n >= 0 && n < len) out.tour = { step: n, playing: false }; }`.

- [x] **Step 3: Camera fly command with a direction**

`engine.ts` `flyTo(id, opts: { padding?: number; preset?: ViewPreset; direction?: Vec3 })`: when `opts.direction` is given use `new THREE.Vector3(...opts.direction).normalize()` as `dir`. `Viewer.tsx` `CameraCommand` fly variant becomes `{ kind: "fly"; id: string; direction: Vec3; nonce: number }` and the effect calls `e.flyTo(c.id, { direction: c.direction, padding: 2.6 })`. `App.tsx` derives the command:

```tsx
  const cameraCommand = useMemo<CameraCommand>(() => {
    if (state.focus?.flyId) return { kind: "fly", id: state.focus.flyId, direction: state.focus.direction, nonce: state.cameraNonce };
    if (state.view === "custom" && state.camera) return { kind: "pose", pose: state.camera, nonce: state.cameraNonce };
    return { kind: "preset", preset: state.view === "custom" ? "front" : state.view, nonce: state.cameraNonce };
  }, [state.focus, state.view, state.camera, state.cameraNonce]);
```

and passes `focusIds: state.focus ? new Set(state.focus.ids) : undefined` into `computeStyles` (add `state.focus` to its deps).

- [x] **Step 4: `TourPlayer.tsx` and its slot in the fascia panel**

```tsx
import { ChevronLeft, ChevronRight, Pause, Play, Route, X } from "lucide-react";
import { useEffect } from "react";
import type { Line } from "../../data/lines";
import { useStore } from "../../state/store";
import { EvidenceBadge } from "./EvidenceBadge";

const AUTOPLAY_MS = 6000;

export default function TourPlayer({ line }: { line: Line }) {
  const { state, dispatch } = useStore();
  const tour = state.tour;

  useEffect(() => {
    if (!tour?.playing) return;
    const timer = window.setTimeout(() => dispatch({ type: "tourNext" }), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [tour, dispatch]);

  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") dispatch({ type: "tourNext" });
      if (e.key === "ArrowLeft") dispatch({ type: "tourPrev" });
      if (e.key === "Escape") dispatch({ type: "endTour" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, dispatch]);

  if (!tour)
    return (
      <button className="primary-button tour-start" onClick={() => dispatch({ type: "startTour" })}>
        <Route size={16} /> Start the guided tour
      </button>
    );

  const stop = line.path[tour.step];
  const last = tour.step === line.path.length - 1;
  return (
    <div className="tour" aria-live="polite">
      <div className="tour-head">
        <span className="tiny-tag">
          STOP {tour.step + 1} OF {line.path.length}
        </span>
        <button className="icon-button" aria-label="End tour" onClick={() => dispatch({ type: "endTour" })}>
          <X size={16} />
        </button>
      </div>
      <h3>{stop.name}</h3>
      <p>{stop.note}</p>
      {stop.transition ? (
        <>
          <div className="section-label">NEXT HOP · {line.path[tour.step + 1].name}</div>
          <EvidenceBadge transition={stop.transition} />
        </>
      ) : (
        <p className="subtle">End of the line. Use the arrows to revisit any stop.</p>
      )}
      <div className="tour-controls">
        <button className="outline-button" disabled={tour.step === 0} onClick={() => dispatch({ type: "tourPrev" })}>
          <ChevronLeft size={15} /> Previous
        </button>
        <button className="outline-button" onClick={() => dispatch({ type: "tourPlay", playing: !tour.playing })} disabled={last}>
          {tour.playing ? <Pause size={15} /> : <Play size={15} />}
          {tour.playing ? "Pause" : "Play"}
        </button>
        <button className="outline-button" disabled={last} onClick={() => dispatch({ type: "tourNext" })}>
          Next <ChevronRight size={15} />
        </button>
      </div>
      <p className="subtle">Arrow keys move between stops. Esc ends the tour.</p>
    </div>
  );
}
```

In `FasciaPanel.tsx`, render `<TourPlayer line={line} />` directly under the `CopyLink`; when `state.tour` is set, hide the full path list and evidence summary (render only the kicker, title, grade pill, tour player, and the "How to read the badges" details) so the panel stays focused.

CSS:

```css
.tour { margin: 12px 0 8px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: #fffefb; }
.tour-head { display: flex; justify-content: space-between; align-items: center; }
.tour h3 { font-size: 16px; margin: 6px 0 4px; }
.tour > p { font-size: 12px; color: var(--muted); }
.tour .evidence { margin-left: 0; }
.tour-controls { display: flex; gap: 6px; margin-top: 10px; }
.tour-controls button { flex: 1; justify-content: center; }
.tour-start { width: 100%; justify-content: center; margin: 10px 0; }
```

- [x] **Step 5: Verify and commit**

```bash
npm test 2>&1 | grep -E "Test Files|Tests |FAIL|×"; npm run lint 2>&1 | grep -E "error|✖"; echo "LINT EXIT: ${PIPESTATUS[0]}"; npm run typecheck 2>&1 | grep -i error; npm run build 2>&1 | tail -1
```

Chrome at `?m=fascia&l=bfl`: "Start the guided tour" flies the camera to the right latissimus, which glows while the rest of the line dims; Next flies to the lumbar spine (thoracolumbar fascia anchor), then across to the left gluteus maximus, then the left vastus lateralis; the URL carries `t=`; reloading `?m=fascia&l=bfl&t=2` lands on the gluteus stop; Play advances every 6 s and stops at the end; Esc ends the tour and restores the full panel. On the spiral line, the camera swings between back, side and front views as the stops dictate.

```bash
git add -A && git commit -q -m "Add guided fascial-line tours with camera fly-to, focus highlighting and URL steps

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Docs, deploy, live verification

- [x] **Step 1: README and guide copy**

README "What is included": replace "Five fascial-line teaching models with evidence notes and linked references." with "Six fascial-line teaching models (including the spiral line). Every hop shows whether human dissection studies verified the tissue link, with study counts from Wilke et al. 2016, plus force-transfer notes from Krause et al. 2016. Guided tours fly the camera stop by stop, and a drawn teaching cable traces each line." Add a bullet: "A research digest of 19 verified papers and references, grouped by question, with a build-time citation check." Under "Validate", add `npm run verify:citations` with a note that it needs network access.

`Modals.tsx` guide step 3 text: "Choose Fascia, start a guided tour, and read the evidence badge on every hop. Colored muscles show components of a proposed chain; the cable is a teaching path, not fascia."

- [x] **Step 2: Tick, commit, push, watch**

```bash
sed -i 's/^- \[ \] \*\*Step/- [x] **Step/' docs/superpowers/plans/2026-09-07-phase-3-fascia.md
git add -A && git commit -q -m "Document the evidence layer and mark the phase 3 plan complete

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main 2>&1 | tail -2
sleep 25; gh run watch --exit-status $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') 2>&1 | tail -8
```

Expected: the `verify:citations` step passes in CI and the deploy succeeds.

- [x] **Step 3: Live checks**

Chrome: `https://hyperionproj25.github.io/form-anatomy/?m=fascia&l=sl&t=1` lands on the spiral line tour at the rhomboids with cables drawn; the Research nav opens the digest; a PubMed link opens the right record. Embedded pane at 375 px: the fascia panel with badges has no horizontal overflow.

---

## Self-review

- Spiral line, per-transition grades, overall badges: Task 1 (data) and Task 3 (UI). Grades use the review's own vocabulary and Table 3 numbers; the SBL scalp hop is explicitly "not assessed".
- `research.ts`, digest modal, verify script in CI: Tasks 1, 2, 3. Nineteen entries across five groups; each has a PMID, DOI or URL and a model note.
- Cable and pulse with toggle and caption: Task 4.
- Tour player with URL step, focus highlighting, autoplay, keyboard: Task 5.
- Deviation from spec 3.7: `waypoint` became `anchor` (a part key plus side-relative offset) and transitions may carry a `via`, so unmodelled tissue follows the model rather than hard-coded coordinates. The spec's `Grade` enum became `EvidenceStatus` with the review's terms, plus a line-level grade.
- Types: `Vec3` from `data/types`; `ViewPreset` is declared in `lines.ts` (a string union identical to the engine's) to keep data free of Three.js imports; `Side` from `data/types`; `CitationId` shared by `lines.ts` and `research.ts`.
