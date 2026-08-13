import fs from "node:fs/promises";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const zipPath = path.resolve("artifacts/rock-n-bands-scorm-2004-4th-edition.zip");
const archive = unzipSync(new Uint8Array(await fs.readFile(zipPath)));
const names = Object.keys(archive);
for (const required of ["imsmanifest.xml", "index.html"]) {
  if (!names.includes(required)) throw new Error(`${required} is missing from the ZIP root.`);
}
const manifest = strFromU8(archive["imsmanifest.xml"]);
const checks = [
  ["SCORM 2004 edition", /<schemaversion>2004 4th Edition<\/schemaversion>/],
  ["SCO resource", /adlcp:scormType="sco"/],
  ["launch href", /href="index\.html"/],
  ["default organization", /<organizations default="ORG-ROCK-N-BANDS">/],
];
for (const [label, pattern] of checks) if (!pattern.test(manifest)) throw new Error(`Manifest check failed: ${label}`);
const hrefs = [...manifest.matchAll(/<file href="([^"]+)"/g)].map((match) => match[1]);
for (const href of hrefs) if (!names.includes(href)) throw new Error(`Manifest lists a missing package file: ${href}`);
if (names.some((name) => name.startsWith("dist/"))) throw new Error("The ZIP contains an unwanted dist/ wrapper directory.");
console.log(`Validated SCORM 2004 4th Edition package: ${names.length} files, manifest at ZIP root, all listed assets present.`);
