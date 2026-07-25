import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";

const samples = [
  {
    path: new URL(
      "../examples/models/zi-yuan-jia-ban-bambu-clean.3mf",
      import.meta.url,
    ),
    title: "自愿加班",
  },
  {
    path: new URL(
      "../examples/models/wo-hen-p-ren-bambu-clean.3mf",
      import.meta.url,
    ),
    title: "我恨P人",
  },
];

function attributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/(\w+)="([^"]*)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

function assertClosedMesh(meshXml) {
  const vertexCount = [...meshXml.matchAll(/<vertex\b/g)].length;
  const triangles = [...meshXml.matchAll(/<triangle\b([^>]*)\/>/g)];
  const edgeCounts = new Map();

  assert.ok(vertexCount > 0, "sample mesh must contain vertices");
  assert.ok(triangles.length > 0, "sample mesh must contain triangles");

  for (const triangle of triangles) {
    const values = attributes(triangle[1]);
    const indices = [values.v1, values.v2, values.v3].map(Number);

    assert.equal(values.pid, undefined);
    assert.equal(values.p1, undefined);
    assert.equal(values.p2, undefined);
    assert.equal(values.p3, undefined);
    assert.ok(indices.every((index) => index >= 0 && index < vertexCount));

    for (const [a, b] of [
      [indices[0], indices[1]],
      [indices[1], indices[2]],
      [indices[2], indices[0]],
    ]) {
      const edge = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(edge, (edgeCounts.get(edge) ?? 0) + 1);
    }
  }

  const openEdges = [...edgeCounts.values()].filter((count) => count !== 2);
  assert.deepEqual(openEdges, [], "sample mesh must be closed and two-manifold");
}

for (const sample of samples) {
  test(`${sample.title} sample is a clean, closed multipart 3MF`, () => {
    const archive = unzipSync(new Uint8Array(readFileSync(sample.path)));
    const modelEntry = archive["3D/3dmodel.model"];

    assert.ok(modelEntry, "3MF must contain the core model document");
    const modelXml = strFromU8(modelEntry);
    assert.match(modelXml, new RegExp(`<metadata name="Title">${sample.title}</metadata>`));
    assert.match(
      modelXml,
      /<metadata name="TextBloom:ExportMode">clean-parts<\/metadata>/,
    );
    assert.doesNotMatch(modelXml, /colorgroup|xmlns:m=|requiredextensions=|filament/i);
    assert.doesNotMatch(modelXml, /\b(?:pid|pindex|p1|p2|p3)="[^"]*"/);

    const meshes = [
      ...modelXml.matchAll(/<mesh>([\s\S]*?)<\/mesh>/g),
    ].map((match) => match[1]);

    assert.ok(meshes.length >= 4, "3MF must contain independently assignable parts");
    const triangleCount = meshes.reduce(
      (total, mesh) => total + [...mesh.matchAll(/<triangle\b/g)].length,
      0,
    );
    assert.ok(triangleCount < 20_000, "sample should avoid excessive flat-cap triangles");
    meshes.forEach(assertClosedMesh);
  });
}
