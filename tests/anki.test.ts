import { describe, expect, test } from "vitest";
import { partById } from "../src/data/catalog";
import { ankiTsv } from "../src/features/playlist/anki";

describe("ankiTsv", () => {
  test("writes Anki headers and one tab-separated card per structure with escaped HTML", () => {
    const gastro = partById("lateral-head-of-gastrocnemius-l")!;
    const femur = partById("femur-l")!;
    const text = ankiTsv([gastro, femur], "english");
    const lines = text.trimEnd().split("\n");
    expect(lines.slice(0, 3)).toEqual(["#separator:tab", "#html:true", "#tags:form-anatomy"]);
    expect(lines.length).toBe(5);
    for (const line of lines.slice(3)) expect(line.split("\t").length).toBe(2);
    const [front, back] = lines[3].split("\t");
    expect(front).toBe("Lateral Head Of Gastrocnemius");
    expect(back).toContain("<b>Origin</b>");
    expect(back).toContain("condyle");
    expect(back).toContain("?s=lateral-head-of-gastrocnemius-l");
    expect(back).not.toMatch(/[\r\n]/);
    const [, boneBack] = lines[4].split("\t");
    expect(boneBack).toContain("Open in Form");
  });

  test("Latin mode puts the Latin name first with English beneath", () => {
    const gastro = partById("lateral-head-of-gastrocnemius-l")!;
    const [front] = ankiTsv([gastro], "latin").trimEnd().split("\n")[3].split("\t");
    expect(front).toBe("Musculus gastrocnemius (lateral head)<br><i>Lateral Head Of Gastrocnemius</i>");
  });

  test("escapes angle brackets and ampersands in facts", () => {
    const part = { ...partById("femur-l")!, wiki: undefined, name: "A & B <c>" };
    const text = ankiTsv([part], "english");
    expect(text).toContain("A &amp; B &lt;c&gt;");
  });
});
