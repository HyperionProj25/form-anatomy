import { describe, expect, test } from "vitest";
import { cleanWikitext, extractInfobox } from "../scripts/wikitext";

describe("cleanWikitext", () => {
  test("resolves links, strips refs, templates, markup and tags", () => {
    expect(cleanWikitext("[[achilles tendon|Tendo calcaneus]] (Achilles tendon) into mid-posterior [[calcaneus]]")).toBe(
      "Tendo calcaneus (Achilles tendon) into mid-posterior calcaneus",
    );
    expect(cleanWikitext("[[Tibial nerve]] from the [[sciatic nerve|sciatic]]<ref>Gray</ref>, roots S1–S2")).toBe(
      "Tibial nerve from the sciatic, roots S1–S2",
    );
    expect(cleanWikitext("'''Bold''' and ''italic'' {{nowrap|text}} <br /> next<ref name=\"a\"/>")).toBe("Bold and italic text, next");
    expect(cleanWikitext("Flexes {{IPAc-en|x|y}} the [[knee]] &nbsp; joint")).toBe("Flexes the knee joint");
  });
});

describe("extractInfobox", () => {
  const text = `Lead text
{{Infobox muscle
| Name        = Gastrocnemius muscle
| Image       = x.png
| Origin      = Proximal to [[lateral condyle of femur]]
| Insertion   = [[calcaneus]]
| Nerve       = [[Tibial nerve]]
| Action      = Plantar flexes [[foot]],
  flexes [[knee]]
| Antagonist  = [[Tibialis anterior muscle]]
}}
The '''gastrocnemius''' is...`;
  test("returns the template name and cleaned fields", () => {
    const box = extractInfobox(text);
    expect(box?.template).toBe("muscle");
    expect(box?.fields.origin).toBe("Proximal to lateral condyle of femur");
    expect(box?.fields.insertion).toBe("calcaneus");
    expect(box?.fields.nerve).toBe("Tibial nerve");
    expect(box?.fields.action).toBe("Plantar flexes foot, flexes knee");
    expect(box?.fields.antagonist).toBe("Tibialis anterior muscle");
    expect(box?.fields.image).toBeUndefined();
  });
  test("returns null when there is no infobox", () => {
    expect(extractInfobox("No box here")).toBeNull();
  });
  test("handles nested templates inside the box", () => {
    const t = "{{Infobox bone\n| Name = Femur\n| Articulations = {{plainlist|\n* [[hip]]\n* [[knee]]}}\n}}";
    expect(extractInfobox(t)?.fields.articulations).toBe("hip, knee");
  });
});
