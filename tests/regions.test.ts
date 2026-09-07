import { describe, expect, test } from "vitest";
import { classifyLayer, classifyRegion, REGION_ORDER } from "../src/data/regions";

// Model space: y from -0.85 (soles) to +0.85 (crown). x>0 is the subject's left.
const extents = { minY: -0.85, maxY: 0.85 };
const at = (x: number, y: number, z = 0): [number, number, number] => [x, y, z];

describe("classifyRegion keyword rules", () => {
  test("named muscles land in their textbook region regardless of position", () => {
    expect(classifyRegion("Gluteus Maximus Muscle", undefined, at(0.1, 0), extents)).toBe("hip-thigh");
    expect(classifyRegion("Latissimus Dorsi Muscle", undefined, at(0.1, 0.2, -0.05), extents)).toBe("back");
    expect(classifyRegion("External Intercostal Muscles", undefined, at(0.1, 0.3), extents)).toBe("thorax");
    expect(classifyRegion("Sternocleidomastoid Muscle", undefined, at(0.03, 0.6), extents)).toBe("head-neck");
    expect(classifyRegion("Extensor Digitorum", undefined, at(0.25, 0.1), extents)).toBe("forearm-hand");
    expect(classifyRegion("Extensor Digitorum Longus", undefined, at(0.1, -0.5), extents)).toBe("leg-foot");
    expect(classifyRegion("Pectoralis Major Muscle", undefined, at(0.1, 0.4), extents)).toBe("shoulder-arm");
    expect(classifyRegion("Rectus Abdominis Muscle", undefined, at(0.03, 0.1), extents)).toBe("abdomen-pelvis");
  });

  test("bones use the group name when the part name is generic", () => {
    expect(classifyRegion("Vertebra T4", "Thoracic Vertebrae", at(0, 0.3), extents)).toBe("back");
    expect(classifyRegion("Vertebra C5", "Cervical Vertebrae", at(0, 0.6), extents)).toBe("head-neck");
    expect(classifyRegion("Distal Phalanx Of Third Finger Of Hand", undefined, at(0.3, -0.1), extents)).toBe("forearm-hand");
    expect(classifyRegion("Distal Phalanx Of Third Finger Of Foot", undefined, at(0.1, -0.8), extents)).toBe("leg-foot");
  });
});

describe("classifyRegion geometry fallback", () => {
  test("uses height bands and arm offset when no keyword matches", () => {
    expect(classifyRegion("Mystery Part", undefined, at(0, 0.7), extents)).toBe("head-neck");
    expect(classifyRegion("Mystery Part", undefined, at(0.25, 0.3), extents)).toBe("shoulder-arm");
    expect(classifyRegion("Mystery Part", undefined, at(0.28, -0.05), extents)).toBe("forearm-hand");
    expect(classifyRegion("Mystery Part", undefined, at(0.05, 0.35, -0.06), extents)).toBe("back");
    expect(classifyRegion("Mystery Part", undefined, at(0.05, 0.35, 0.02), extents)).toBe("thorax");
    expect(classifyRegion("Mystery Part", undefined, at(0.05, 0.05, 0.02), extents)).toBe("abdomen-pelvis");
    expect(classifyRegion("Mystery Part", undefined, at(0.1, -0.2), extents)).toBe("hip-thigh");
    expect(classifyRegion("Mystery Part", undefined, at(0.1, -0.6), extents)).toBe("leg-foot");
  });
});

describe("classifyLayer", () => {
  test("marks curated deep muscles deep and everything else superficial", () => {
    expect(classifyLayer("Soleus Muscle", "muscle")).toBe("deep");
    expect(classifyLayer("Subscapularis Muscle", "muscle")).toBe("deep");
    expect(classifyLayer("Vastus Intermedius Muscle", "muscle")).toBe("deep");
    expect(classifyLayer("Deep Head Of Pronator Teres", "muscle")).toBe("deep");
    expect(classifyLayer("Gluteus Maximus Muscle", "muscle")).toBe("superficial");
    expect(classifyLayer("Femur", "bone")).toBe("superficial");
  });
});

test("REGION_ORDER lists all eight regions once", () => {
  expect(REGION_ORDER.length).toBe(8);
  expect(new Set(REGION_ORDER).size).toBe(8);
});
