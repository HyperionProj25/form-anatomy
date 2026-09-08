/**
 * Colour-contrast check in a real browser: serves the built site, drives headless Chrome over
 * the DevTools protocol, injects axe-core and asserts zero colour-contrast violations on a few
 * representative pages at a laptop and a phone viewport. jsdom cannot compute rendered colours,
 * so the unit tests skip this rule and CI runs this after the build instead.
 *
 *   npm run build && npm run check:contrast
 *
 * Set CHROME_PATH to point at a Chrome or Chromium binary if none of the usual paths exist.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";

const DIST = resolve("dist");
const BASE = "/form-anatomy/";
const PAGES = ["", "?s=lateral-head-of-gastrocnemius-r", "?m=fascia", "?d=deep&v=back"];
const VIEWPORTS = [
  { name: "laptop", width: 1440, height: 900, mobile: false },
  { name: "phone", width: 375, height: 812, mobile: true },
];
const SETTLE_MS = 1500;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
};

function chromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((p): p is string => !!p);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome found; set CHROME_PATH");
  return found;
}

/** Static file server for dist under the site's base path. */
function serve(): Promise<{ port: number; close: () => void }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname.slice(1);
    if (!path || path.endsWith("/")) path += "index.html";
    const file = join(DIST, path);
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((ok) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      ok({ port: typeof address === "object" && address ? address.port : 0, close: () => server.close() });
    }),
  );
}

/** Launch headless Chrome and return its DevTools endpoint. */
function launch(): Promise<{ proc: ChildProcess; port: number; profile: string }> {
  const profile = mkdtempSync(join(tmpdir(), "form-contrast-"));
  const proc = spawn(
    chromePath(),
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-first-run",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  return new Promise((ok, fail) => {
    let err = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      err += chunk.toString();
      const m = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(err);
      if (m) ok({ proc, port: Number(m[1]), profile });
    });
    proc.on("exit", (code) => fail(new Error(`Chrome exited (${code}): ${err.slice(-400)}`)));
    setTimeout(() => fail(new Error(`Chrome did not start: ${err.slice(-400)}`)), 20000);
  });
}

type CdpMessage = { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message: string } };

/** Minimal DevTools client bound to one page. */
class Page {
  private ws: WebSocket;
  private next = 1;
  private waiting = new Map<number, { ok: (v: unknown) => void; fail: (e: Error) => void }>();
  private listeners = new Map<string, () => void>();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(String(e.data)) as CdpMessage;
      if (msg.id && this.waiting.has(msg.id)) {
        const w = this.waiting.get(msg.id)!;
        this.waiting.delete(msg.id);
        if (msg.error) w.fail(new Error(msg.error.message));
        else w.ok(msg.result);
      } else if (msg.method) this.listeners.get(msg.method)?.();
    });
  }

  static async connect(port: number): Promise<Page> {
    const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
      type: string;
      webSocketDebuggerUrl: string;
    }[];
    const target = list.find((t) => t.type === "page");
    if (!target) throw new Error("No page target");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((ok, fail) => {
      ws.addEventListener("open", () => ok());
      ws.addEventListener("error", () => fail(new Error("DevTools socket failed")));
    });
    return new Page(ws);
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.next++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, fail) => this.waiting.set(id, { ok: ok as (v: unknown) => void, fail }));
  }

  once(method: string): Promise<void> {
    return new Promise((ok) => this.listeners.set(method, () => ok()));
  }

  async evaluate<T>(expression: string): Promise<T> {
    const r = await this.send<{ result: { value: T }; exceptionDetails?: { text: string } }>(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
    );
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  }

  close(): void {
    this.ws.close();
  }
}

type AxeNode = { html: string; target: string[]; any: { data?: { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string } }[] };
type AxeResult = { violations: { id: string; nodes: AxeNode[] }[]; incomplete: { id: string; nodes: AxeNode[] }[] };

async function main() {
  const axeSource = readFileSync(resolve("node_modules/axe-core/axe.min.js"), "utf8");
  const site = await serve();
  const chrome = await launch();
  let failures = 0;
  try {
    const page = await Page.connect(chrome.port);
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    for (const vp of VIEWPORTS) {
      await page.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      for (const query of PAGES) {
        const url = `http://127.0.0.1:${site.port}${BASE}${query}`;
        const loaded = page.once("Page.loadEventFired");
        await page.send("Page.navigate", { url });
        await loaded;
        await page.evaluate("document.fonts.ready.then(() => true)");
        await new Promise((r) => setTimeout(r, SETTLE_MS));
        await page.evaluate(axeSource + "; true");
        const result = await page.evaluate<AxeResult>(
          "axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['violations', 'incomplete'] })",
        );
        const nodes = result.violations.flatMap((v) => v.nodes);
        const unresolved = result.incomplete.reduce((n, i) => n + i.nodes.length, 0);
        const label = `${vp.name} ${vp.width}x${vp.height}  ${BASE}${query || "(home)"}`;
        console.log(`${nodes.length ? "FAIL" : "ok  "} ${label}: ${nodes.length} violations, ${unresolved} needing review`);
        for (const n of nodes) {
          failures++;
          const d = n.any[0]?.data ?? {};
          console.log(`     ${n.target.join(" ")}\n       ${d.fgColor} on ${d.bgColor}: ${d.contrastRatio} (needs ${d.expectedContrastRatio})\n       ${n.html.slice(0, 120)}`);
        }
      }
    }
    page.close();
  } finally {
    const exited = new Promise((r) => chrome.proc.once("exit", r));
    chrome.proc.kill();
    site.close();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    try {
      rmSync(chrome.profile, { recursive: true, force: true });
    } catch {
      // Windows can keep crashpad files locked briefly; a stale temp profile is harmless.
    }
  }
  if (failures) {
    console.error(`\n${failures} colour-contrast violation(s).`);
    process.exit(1);
  }
  console.log("\nNo colour-contrast violations.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
