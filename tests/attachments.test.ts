import { describe, expect, test } from "vitest";
import { attachmentIds, attachmentsFor, boneKeysIn } from "../src/data/attachments";
import { partById, partsByKey } from "../src/data/catalog";
import { factsForWiki } from "../src/data/facts";
import { QUIZ_MUSCLES } from "../src/data/quiz-pool";

const first = (key: string) => partsByKey(key)[0];

describe("boneKeysIn", () => {
  test("expands vertebral ranges across regions and resolves sacral levels to the sacrum", () => {
    const keys = boneKeysIn("Spinous processes of vertebrae T7-S5, thoracolumbar fascia, iliac crest");
    expect(keys).toContain("vertebra-t7");
    expect(keys).toContain("vertebra-t12");
    expect(keys).toContain("vertebra-l1");
    expect(keys).toContain("vertebra-l5");
    expect(keys).toContain("sacrum");
    expect(keys).toContain("hip-bone");
    expect(keys).not.toContain("vertebra-t6");
    expect(boneKeysIn("transverse processes of C1-C4")).toEqual([
      "atlas-c1",
      "axis-c2",
      "vertebra-c3",
      "vertebra-c4",
    ]);
    expect(boneKeysIn("spinous processes of the lumbar vertebrae")).toEqual([
      "vertebra-l1",
      "vertebra-l2",
      "vertebra-l3",
      "vertebra-l4",
      "vertebra-l5",
    ]);
  });

  test("resolves numbered ribs, costal cartilages, metacarpals and phalanges", () => {
    expect(boneKeysIn("ribs 5-7 and the twelfth rib")).toEqual(["fifth-rib", "sixth-rib", "seventh-rib", "twelfth-rib"]);
    expect(boneKeysIn("costal cartilages of ribs 5–7")).toEqual([
      "costal-cartilage-of-fifth-rib",
      "costal-cartilage-of-sixth-rib",
      "costal-cartilage-of-seventh-rib",
    ]);
    expect(boneKeysIn("base of the second and third metacarpals")).toEqual([
      "second-metacarpal-bone",
      "third-metacarpal-bone",
    ]);
    expect(boneKeysIn("distal phalanx of the thumb")).toEqual(["distal-phalanx-of-first-finger-of-hand"]);
    expect(boneKeysIn("distal phalanges of digits 2–5 of the hand")).toEqual([
      "distal-phalanx-of-second-finger-of-hand",
      "distal-phalanx-of-third-finger-of-hand",
      "distal-phalanx-of-fourth-finger-of-hand",
      "distal-phalanx-of-fifth-finger-of-hand",
    ]);
    expect(boneKeysIn("distal phalanx of the great toe")).toEqual(["distal-phalanx-of-first-finger-of-foot"]);
  });

  test("ignores nerve names, fascia and unnumbered ribs", () => {
    expect(boneKeysIn("radial nerve, ulnar nerve")).toEqual([]);
    expect(boneKeysIn("iliotibial tract and the sacrotuberous ligament")).toEqual([]);
    expect(boneKeysIn("inferior 4 ribs")).toEqual([]);
  });
});

describe("attachmentsFor", () => {
  test("gastrocnemius runs from the femur to the calcaneus", () => {
    const a = attachmentsFor(first("lateral-head-of-gastrocnemius"))!;
    expect(a.origin).toEqual(["femur"]);
    expect(a.insertion).toEqual(["calcaneus"]);
  });

  test("trapezius: occiput and C7 to T12 onto the clavicle and scapula", () => {
    const a = attachmentsFor(first("descending-part-of-trapezius-muscle"))!;
    expect(a.origin).toEqual(expect.arrayContaining(["occipital-bone", "vertebra-c7", "vertebra-t1", "vertebra-t12"]));
    expect(a.origin).not.toContain("vertebra-c6");
    expect(a.insertion).toEqual(expect.arrayContaining(["clavicle", "scapula"]));
  });

  test("deltoid parts start on their own bone and insert on the humerus", () => {
    const acromial = attachmentsFor(first("acromial-part-of-deltoid-muscle"))!;
    expect(acromial.origin).toEqual(["scapula"]);
    expect(acromial.insertion).toEqual(["humerus"]);
    const clavicular = attachmentsFor(first("clavicular-part-of-deltoid-muscle"))!;
    expect(clavicular.origin).toEqual(["clavicle"]);
    expect(clavicular.insertion).toEqual(["humerus"]);
  });

  test("bones and muscles without facts have no attachments", () => {
    expect(attachmentsFor(first("femur"))).toBeUndefined();
    const noWiki = partsByKey("common-tendinous-ring")[0];
    if (noWiki) expect(attachmentsFor(noWiki)).toBeUndefined();
  });

  test("ids follow the muscle's side", () => {
    const left = partById("lateral-head-of-gastrocnemius-l")!;
    const ids = attachmentIds(left)!;
    expect(ids.origin).toEqual(["femur-l"]);
    expect(ids.insertion).toEqual(["calcaneus-l"]);
    const trap = attachmentIds(partById("descending-part-of-trapezius-muscle-r")!)!;
    expect(trap.insertion).toEqual(expect.arrayContaining(["clavicle-r", "scapula-r"]));
    expect(trap.origin).toContain("vertebra-t1");
    expect(trap.insertion.every((id) => !id.endsWith("-l"))).toBe(true);
  });

  test("most quiz muscles with facts match both an origin and an insertion bone", () => {
    const withFacts = QUIZ_MUSCLES.map(first).filter((p) => {
      const f = factsForWiki(p.wiki);
      return f?.origin && f?.insertion;
    });
    const both = withFacts.filter((p) => {
      const a = attachmentsFor(p);
      return a && a.origin.length > 0 && a.insertion.length > 0;
    });
    expect(withFacts.length).toBeGreaterThan(50);
    expect(both.length / withFacts.length).toBeGreaterThan(0.8);
  });
});
