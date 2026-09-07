import { factsForWiki } from "../../data/facts";
import { displayName, secondaryName, type NameLang } from "../../data/names";
import type { CatalogPart } from "../../data/types";

export const ATLAS_URL = "https://hyperionproj25.github.io/form-anatomy/";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\t\r\n]+/g, " ");
}

/**
 * An Anki import file: header lines Anki reads, then one tab-separated card per structure.
 * Front is the name; back is the reference facts as HTML plus a link back to the atlas.
 */
export function ankiTsv(parts: CatalogPart[], lang: NameLang, baseUrl = ATLAS_URL): string {
  const lines = ["#separator:tab", "#html:true", "#tags:form-anatomy"];
  for (const part of parts) {
    const f = factsForWiki(part.wiki);
    const rows: [string, string | undefined][] =
      part.type === "bone"
        ? [["Articulations", f?.articulations]]
        : [
            ["Origin", f?.origin],
            ["Insertion", f?.insertion],
            ["Action", f?.action],
            ["Innervation", f?.nerve],
          ];
    const secondary = lang === "latin" ? secondaryName(part, lang) : undefined;
    const front = esc(displayName(part, lang)) + (secondary ? `<br><i>${esc(secondary)}</i>` : "");
    const back =
      rows
        .filter((r): r is [string, string] => !!r[1])
        .map(([k, v]) => `<b>${k}</b> ${esc(v)}`)
        .join("<br>") +
      (rows.some(([, v]) => v) ? "<br>" : "") +
      `<a href="${baseUrl}?s=${encodeURIComponent(part.id)}">Open in Form</a>`;
    lines.push(`${front}\t${back}`);
  }
  return lines.join("\n") + "\n";
}
