import { partsByKey } from "./catalog";
import type { CitationId } from "./research";
import type { CatalogPart } from "./types";

/**
 * Applied case-study notes attached to structures. Text stays within the cited abstracts; the
 * digest carries the full entries. Keys are catalog keys (tests enforce that they resolve).
 */
export type AppliedNote = {
  id: string;
  title: string;
  keys: string[];
  text: string;
  citations: CitationId[];
};

export const APPLIED_NOTES: AppliedNote[] = [
  {
    id: "throwing-posterior-shoulder",
    title: "After throwing: the posterior shoulder",
    keys: [
      "infraspinatus-muscle",
      "teres-minor-muscle",
      "ascending-part-of-trapezius-muscle",
      "latissimus-dorsi-muscle",
      "supraspinatus-muscle",
      "subscapularis-muscle",
      "pectoralis-minor-muscle",
    ],
    text: "Shear-wave elastography in college baseball players found teres minor and latissimus dorsi stiffer after twenty throws in pitchers, and teres minor stiffer in position players, with no change in strength. In high-school pitchers, infraspinatus stiffness on the throwing side rose with the number of pitches thrown that day. Posterior shoulder stiffness has also been associated with shoulder pain during throwing in college players.",
    citations: ["tsurukami2024", "shitara2025", "itoigawa2023"],
  },
  {
    id: "throwing-flexor-pronator",
    title: "After throwing: the flexor-pronator group",
    keys: [
      "humero-ulnar-head-of-flexor-digitorum-superficialis",
      "radial-head-of-flexor-digitorum-superficialis",
      "flexor-digitorum-profundus",
      "superficial-head-of-pronator-teres",
      "deep-head-of-pronator-teres",
      "flexor-carpi-radialis",
      "humeral-head-of-flexor-carpi-ulnaris",
      "ulnar-head-of-flexor-carpi-ulnaris",
      "palmaris-longus-muscle",
    ],
    text: "These muscles help the ulnar collateral ligament resist valgus stress at the elbow during throwing. In fourteen amateur players, flexor digitorum superficialis and profundus were both markedly stiffer immediately after 100 pitches; the superficialis was still stiffer 24 hours later while the profundus had returned to baseline. Across a college season, the throwing-arm ulnar collateral ligament itself measured softer at midseason than before the season.",
    citations: ["mukohara2024", "gupta2023"],
  },
  {
    id: "upper-trapezius-tendinopathy",
    title: "Upper trapezius in rotator cuff tendinopathy",
    keys: ["descending-part-of-trapezius-muscle"],
    text: "In forty-three male volleyball players, upper trapezius shear modulus was higher in those with rotator cuff tendinopathy while actively holding the arm at 30 and 60 degrees of abduction, and at rest with the arm down. The authors propose monitoring it in prevention and rehabilitation, with cut-off values that separated the groups moderately well.",
    citations: ["leong2016"],
  },
];

export function appliedNotesFor(part: CatalogPart): AppliedNote[] {
  return APPLIED_NOTES.filter((n) => n.keys.includes(part.key));
}

/** Keys that fail to resolve; empty in a healthy build (tests check this). */
export function unresolvedAppliedKeys(): string[] {
  return APPLIED_NOTES.flatMap((n) => n.keys).filter((k) => partsByKey(k).length === 0);
}
