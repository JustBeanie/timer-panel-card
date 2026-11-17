import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const manifest = JSON.parse(read("hacs.json"));
assert.equal(manifest.name, "Timer Panel Card");
assert.equal(manifest.filename, "timer-panel-card.js");
assert.deepEqual(readdirSync(new URL("dist/", root)), [manifest.filename],
  "dist must contain only the self-contained card module");

const source = read(`dist/${manifest.filename}`);
const version = source.match(/^const VERSION = "(\d+\.\d+\.\d+)";$/m)?.[1];
assert.ok(version, "The card must declare a stable semantic VERSION");
assert.ok(read("CHANGELOG.md").includes(`## [${version}] - `),
  "The card version must have a changelog entry");

const tag = process.argv[2];
if (tag !== undefined) {
  assert.match(tag, /^v\d+\.\d+\.\d+$/, "Release tags must use vMAJOR.MINOR.PATCH");
  assert.equal(tag, `v${version}`, "Release tag must match the distributed card version");
}

console.log(`HACS package valid: ${manifest.filename}, v${version}`);
