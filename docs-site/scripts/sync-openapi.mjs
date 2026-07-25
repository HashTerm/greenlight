#!/usr/bin/env node
/**
 * Sync OpenAPI document from greenlight-core into docs-site/public/openapi.json.
 * Uses Node's native TypeScript strip-types when available; otherwise builds
 * core and imports dist.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsSiteRoot = join(__dirname, "..");
const publicDir = join(docsSiteRoot, "public");
const outPath = join(publicDir, "openapi.json");
const coreRoot = join(docsSiteRoot, "..", "core");
const srcTs = join(coreRoot, "src", "api", "openapi.ts");
const distJs = join(coreRoot, "dist", "api", "openapi.js");

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadFromDist() {
  if (!(await exists(distJs))) return null;
  const mod = await import(pathToFileURL(distJs).href);
  return mod.getOpenApiDocument();
}

async function loadViaNodeStripTypes() {
  // Node 22+: --experimental-strip-types can execute .ts directly.
  const runner = `
    import { getOpenApiDocument } from ${JSON.stringify(pathToFileURL(srcTs).href)};
    process.stdout.write(JSON.stringify(getOpenApiDocument()));
  `;
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", runner],
    {
      cwd: coreRoot,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    return null;
  }
  return JSON.parse(result.stdout);
}

async function buildCoreAndLoad() {
  const build = spawnSync("npm", ["run", "build", "-w", "core"], {
    cwd: join(coreRoot, ".."),
    encoding: "utf8",
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (build.status !== 0) {
    throw new Error("Failed to build core for OpenAPI sync");
  }
  const doc = await loadFromDist();
  if (!doc) throw new Error(`Built core but missing ${distJs}`);
  return doc;
}

await mkdir(publicDir, { recursive: true });

let doc = await loadFromDist();
if (!doc) {
  doc = await loadViaNodeStripTypes();
}
if (!doc) {
  doc = await buildCoreAndLoad();
}

await writeFile(outPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath}`);
