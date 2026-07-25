import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(projectRoot, "static-site");
const clientDir = join(projectRoot, "dist", "client");
const basePath = normalizeBasePath(process.env.BASE_PATH ?? "");
const publicOrigin = (process.env.PUBLIC_ORIGIN ?? "http://localhost:3000")
  .trim()
  .replace(/\/+$/, "");

function normalizeBasePath(value) {
  const normalized = value.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}

const worker = (await import(join(projectRoot, "dist", "server", "index.js")))
  .default;
const response = await worker.fetch(new Request(`${publicOrigin}/`));

if (!response.ok) {
  throw new Error(`SSR export failed with HTTP ${response.status}`);
}

let html = await response.text();

// The production server hosts this editor below an existing site's subpath.
// Rewrite every build asset reference, including references embedded in the
// React Server Components bootstrap payload.
html = html
  .replaceAll("/assets/", `${basePath}/assets/`)
  .replaceAll('href="/favicon.svg"', `href="${basePath}/favicon.svg"`)
  .replaceAll('href="/og.png"', `href="${basePath}/og.png"`)
  .replaceAll('content="/og.png"', `content="${basePath}/og.png"`)
  .replaceAll(`${publicOrigin}/og.png`, `${publicOrigin}${basePath}/og.png`)
  .replaceAll(
    "http://localhost:3000/og.png",
    `${publicOrigin}${basePath}/og.png`,
  )
  .replaceAll(
    "http://localhost:3000/favicon.svg",
    `${publicOrigin}${basePath}/favicon.svg`,
  );

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(clientDir, outputDir, { recursive: true });
await writeFile(join(outputDir, "index.html"), html);

const exportedHtml = await readFile(join(outputDir, "index.html"), "utf8");
const checks = [];
if (basePath) {
  checks.push(
    ['src="/assets/', "root-relative script assets"],
    ['href="/assets/', "root-relative style assets"],
    [`${publicOrigin}/og.png`, "unscoped social preview URL"],
  );
}
if (publicOrigin !== "http://localhost:3000") {
  checks.push(["http://localhost:3000", "localhost metadata URL"]);
}

for (const [needle, label] of checks) {
  if (exportedHtml.includes(needle)) {
    throw new Error(`Static export still contains ${label}`);
  }
}

console.log(
  `Exported ${exportedHtml.length.toLocaleString()} bytes of HTML to ${outputDir} for ${publicOrigin}${basePath || "/"}`,
);
