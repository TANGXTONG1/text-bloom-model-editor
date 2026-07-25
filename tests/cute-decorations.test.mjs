import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import {
  CUTE_DECORATION_KINDS,
  drawCuteDecoration,
} from "../app/cute-decorations.ts";
import {
  maskToClipperPaths,
  meshForPaths,
  offsetPaths,
  pathsBounds,
  unionPaths,
} from "../app/model-geometry.ts";

const canvasSize = 320;
const maskScale = 2;

function renderCuteMask(kind) {
  const width = canvasSize * maskScale;
  const height = canvasSize * maskScale;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.scale(maskScale, maskScale);
  context.translate(canvasSize / 2, canvasSize / 2);
  context.fillStyle = "#000";
  context.strokeStyle = "#000";
  drawCuteDecoration(context, kind);

  const rgba = context.getImageData(0, 0, width, height).data;
  const data = new Uint8Array(width * height);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = rgba[index * 4 + 3];
  }
  return { data, width, height, scale: maskScale };
}

function assertClosed(mesh, label) {
  const edgeCounts = new Map();
  mesh.triangles.forEach(([a, b, c]) => {
    [
      [a, b],
      [b, c],
      [c, a],
    ].forEach(([first, second]) => {
      const key = first < second ? `${first}:${second}` : `${second}:${first}`;
      edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    });
  });
  assert.ok(edgeCounts.size > 0, `${label} should contain mesh edges`);
  assert.equal(
    [...edgeCounts.values()].filter((count) => count !== 2).length,
    0,
    `${label} should be a closed two-manifold mesh`,
  );
}

test("all cute decorations trace into smooth closed printable solids", () => {
  CUTE_DECORATION_KINDS.forEach((kind) => {
    const mask = renderCuteMask(kind);
    assert.ok(
      mask.data.some((value) => value > 0),
      `${kind} should paint visible pixels`,
    );
    assert.ok(
      mask.data.some((value) => value > 0 && value < 255),
      `${kind} should preserve antialiased curve samples`,
    );

    const paths = unionPaths(maskToClipperPaths(mask));
    assert.ok(paths.length > 0, `${kind} should create vector paths`);
    assert.ok(
      paths.flat().length > 20,
      `${kind} should retain enough outline points for rounded curves`,
    );

    const expanded = offsetPaths(paths, 10);
    const bounds = pathsBounds(expanded);
    const mesh = meshForPaths(expanded, 0, 3, bounds, 80);
    assert.ok(mesh.vertices.length > 0, `${kind} should create vertices`);
    assert.ok(mesh.triangles.length > 0, `${kind} should create triangles`);
    assertClosed(mesh, kind);
  });
});
