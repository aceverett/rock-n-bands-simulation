import fs from "node:fs/promises";
import path from "node:path";
import { strToU8, zipSync } from "fflate";

const root = process.cwd();
const dist = path.join(root, "dist");
const artifacts = path.join(root, "artifacts");
const output = path.join(artifacts, "rock-n-bands-scorm-2004-4th-edition.zip");

async function filesUnder(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

await fs.access(path.join(dist, "index.html"));
const assetFiles = await filesUnder(dist);
const template = await fs.readFile(path.join(root, "scorm", "imsmanifest.xml"), "utf8");
const fileElements = assetFiles.map((file) => `      <file href="${file.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" />`).join("\n");
const manifest = template.replace("      <!-- ASSET_FILES -->", fileElements);
if (manifest.includes("ASSET_FILES")) throw new Error("Manifest asset placeholder was not replaced.");

const entries = { "imsmanifest.xml": strToU8(manifest) };
for (const relative of assetFiles) entries[relative] = new Uint8Array(await fs.readFile(path.join(dist, ...relative.split("/"))));
await fs.mkdir(artifacts, { recursive: true });
await fs.writeFile(output, zipSync(entries, { level: 9 }));
console.log(`Created ${output} with ${assetFiles.length + 1} root-relative package files.`);
