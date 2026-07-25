import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";
import { create3mfArchive } from "../app/three-mf.ts";

const square = (x, y, size) => [
  { X: x * 100, Y: y * 100 },
  { X: (x + size) * 100, Y: y * 100 },
  { X: (x + size) * 100, Y: (y + size) * 100 },
  { X: x * 100, Y: (y + size) * 100 },
];
const parts = [
  {
    name: "Base",
    colorIndex: 0,
    paths: [square(0, 0, 20)],
    z0: 0,
    z1: 2,
  },
  {
    name: "Face",
    colorIndex: 2,
    paths: [square(4, 4, 12)],
    z0: 2,
    z1: 3,
  },
];
const palette = {
  base: "#F45A4F",
  shadow: "#176B87",
  face: "#FFF4DB",
  accent: "#FFB000",
};

function modelXml(mode) {
  const archive = unzipSync(
    create3mfArchive("测试", parts, palette, 20, mode),
  );
  assert.deepEqual(
    Object.keys(archive).sort(),
    ["3D/3dmodel.model", "[Content_Types].xml", "_rels/.rels"].sort(),
  );
  return strFromU8(archive["3D/3dmodel.model"]);
}

test("clean 3MF keeps parts but contains no material or filament metadata", () => {
  const xml = modelXml("clean");
  assert.match(xml, /TextBloom:ExportMode">clean-parts/);
  assert.match(xml, /Base \[slot 1 #F45A4F\]/);
  assert.match(xml, /Face \[slot 3 #FFF4DB\]/);
  assert.doesNotMatch(xml, /colorgroup|xmlns:m=|requiredextensions=|filament/i);
  assert.doesNotMatch(xml, /\b(?:pid|pindex|p1|p2|p3)="[^"]*"/);
  assert.equal([...xml.matchAll(/<mesh>/g)].length, 2);
});

test("standard color-hint 3MF is explicit and still embeds no slicer presets", () => {
  const xml = modelXml("standard");
  assert.match(xml, /TextBloom:ExportMode">standard-color-hints/);
  assert.match(xml, /xmlns:m=/);
  assert.match(xml, /requiredextensions="m"/);
  assert.equal([...xml.matchAll(/<m:color\b/g)].length, 4);
  assert.match(xml, /\bpid="1"/);
  assert.match(xml, /\bp1="0"/);
  assert.doesNotMatch(xml, /project_settings|filament_settings|machine_settings/);
});
