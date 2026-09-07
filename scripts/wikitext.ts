/** Minimal wikitext helpers for infobox extraction. Pure functions, unit tested. */

const KEPT_FIELDS = new Set(["origin", "insertion", "action", "nerve", "antagonist", "articulations", "blood", "artery"]);

/** Turn a wikitext fragment into plain text. */
export function cleanWikitext(input: string): string {
  let s = input;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<ref[^>]*\/>/gi, "");
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  s = stripTemplates(s);
  s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1");
  s = s.replace(/\[https?:\/\/[^\s\]]+\s*([^\]]*)\]/g, "$1");
  s = s.replace(/<br\s*\/?>/gi, ", ");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/'''''|'''|''/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—");
  s = s.replace(/^\s*[*#]\s*/gm, ", ");
  s = s.replace(/\s*\n\s*/g, " ");
  s = s.replace(/\s*,\s*,+/g, ",").replace(/^\s*,\s*/, "").replace(/\s+,/g, ",");
  s = s.replace(/\s{2,}/g, " ").trim();
  s = s.replace(/[,;\s]+$/, "");
  return s;
}

/** Remove {{...}} templates, keeping the positional arguments of layout templates like nowrap/plainlist. */
function stripTemplates(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s.startsWith("{{", i)) {
      let depth = 0;
      let j = i;
      while (j < s.length) {
        if (s.startsWith("{{", j)) {
          depth++;
          j += 2;
        } else if (s.startsWith("}}", j)) {
          depth--;
          j += 2;
          if (depth === 0) break;
        } else j++;
      }
      const inner = s.slice(i + 2, j - 2);
      const name = inner.split("|")[0].trim().toLowerCase();
      if (/^(nowrap|plainlist|unbulleted list|ubl|hlist|flatlist|small|abbr)$/.test(name)) {
        const args = inner
          .split("|")
          .slice(1)
          .filter((a) => !/^\s*\w+\s*=/.test(a));
        out += stripTemplates(args.join(", "));
      }
      i = j;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

export type Infobox = { template: string; fields: Record<string, string> };

/** Find the first {{Infobox ...}} block and return its kept fields, cleaned. */
export function extractInfobox(wikitext: string): Infobox | null {
  const start = wikitext.search(/\{\{\s*Infobox\b/i);
  if (start < 0) return null;
  let depth = 0;
  let end = start;
  while (end < wikitext.length) {
    if (wikitext.startsWith("{{", end)) {
      depth++;
      end += 2;
    } else if (wikitext.startsWith("}}", end)) {
      depth--;
      end += 2;
      if (depth === 0) break;
    } else end++;
  }
  const body = wikitext.slice(start + 2, end - 2);
  const headerEnd = body.indexOf("|");
  const template = body
    .slice("Infobox".length, headerEnd < 0 ? undefined : headerEnd)
    .trim()
    .toLowerCase();
  const fields: Record<string, string> = {};
  // Split on "|" only at template/link depth zero so nested templates and piped links keep their pipes.
  const segments: string[] = [];
  let depth2 = 0;
  let current = "";
  for (let i = headerEnd < 0 ? body.length : headerEnd + 1; i < body.length; i++) {
    if (body.startsWith("{{", i) || body.startsWith("[[", i)) {
      depth2++;
      current += body.slice(i, i + 2);
      i++;
    } else if (body.startsWith("}}", i) || body.startsWith("]]", i)) {
      depth2--;
      current += body.slice(i, i + 2);
      i++;
    } else if (body[i] === "|" && depth2 === 0) {
      segments.push(current);
      current = "";
    } else current += body[i];
  }
  segments.push(current);
  for (const seg of segments) {
    const eq = seg.indexOf("=");
    if (eq < 0) continue;
    const key = seg.slice(0, eq).trim().toLowerCase();
    if (!KEPT_FIELDS.has(key)) continue;
    const value = cleanWikitext(seg.slice(eq + 1));
    if (value) fields[key] = value;
  }
  return { template, fields };
}
