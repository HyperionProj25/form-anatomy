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
  const json = (await res.json()) as {
    result: Record<string, { title?: string; pubdate?: string; error?: string }>;
  };
  for (const c of withPmid) {
    const r = json.result[c.pmid!];
    if (!r || r.error || !r.title) {
      failures.push(`${c.id}: PMID ${c.pmid} not found (${r?.error ?? "no record"})`);
      continue;
    }
    const overlap = titleOverlap(c.title, r.title);
    if (overlap < 0.7) {
      failures.push(
        `${c.id}: PMID ${c.pmid} title mismatch (${Math.round(overlap * 100)}%): "${r.title}"`,
      );
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
