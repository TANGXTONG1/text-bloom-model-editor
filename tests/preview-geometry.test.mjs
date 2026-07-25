import assert from "node:assert/strict";
import test from "node:test";
import {
  meshForPaths,
  pathsBounds,
} from "../app/model-geometry.ts";
import { geometryFromMesh } from "../app/preview-geometry.ts";

const clipperScale = 100;
const outline = [
  [0, 0],
  [140, 0],
  [140, 18],
  [82, 18],
  [82, 60],
  [140, 60],
  [140, 78],
  [0, 78],
  [0, 60],
  [58, 60],
  [58, 18],
  [0, 18],
].map(([x, y]) => ({
  X: x * clipperScale,
  Y: y * clipperScale,
}));

test("uses hard cap normals so planar tops do not show triangulation", () => {
  const paths = [outline];
  const mesh = meshForPaths(paths, 0, 3, pathsBounds(paths), 140);
  const geometry = geometryFromMesh(mesh);
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");

  assert.equal(geometry.index, null);
  let topTriangles = 0;

  for (let index = 0; index < positions.count; index += 3) {
    const isTop =
      positions.getZ(index) === 3 &&
      positions.getZ(index + 1) === 3 &&
      positions.getZ(index + 2) === 3;
    if (!isTop) continue;
    topTriangles += 1;

    for (let offset = 0; offset < 3; offset += 1) {
      assert.ok(Math.abs(normals.getX(index + offset)) < 1e-6);
      assert.ok(Math.abs(normals.getY(index + offset)) < 1e-6);
      assert.ok(normals.getZ(index + offset) > 0.999999);
    }
  }

  assert.ok(topTriangles > 0);
  geometry.dispose();
});
