import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { createCanvas, GlobalFonts, Path2D } from "@napi-rs/canvas";
import {
  createModelParts,
  MASK_HEIGHT,
  MASK_SCALE,
  MASK_WIDTH,
  maskToClipperPaths,
  meshForPaths,
  offsetPaths,
  pathsBounds,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "../app/model-geometry.ts";

const macCjkFont = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf";
if (existsSync(macCjkFont)) {
  GlobalFonts.registerFromPath(macCjkFont, "Geometry Test CJK");
}
const fontFamily = existsSync(macCjkFont)
  ? '"Geometry Test CJK"'
  : "sans-serif";

const defaultDecorations = [
  {
    kind: "wordmark",
    x: 758,
    y: 92,
    scale: 1.04,
    rotation: -5,
    tone: "shadow",
  },
  {
    kind: "flame",
    x: 120,
    y: 130,
    scale: 1.04,
    rotation: -10,
    tone: "accent",
  },
  {
    kind: "computer",
    x: 874,
    y: 286,
    scale: 0.86,
    rotation: 8,
    tone: "shadow",
  },
  {
    kind: "star",
    x: 148,
    y: 304,
    scale: 0.78,
    rotation: -12,
    tone: "accent",
  },
  {
    kind: "burst",
    x: 892,
    y: 174,
    scale: 0.78,
    rotation: -4,
    tone: "accent",
  },
];

const computerPath = new Path2D(
  "M -54 -40 H 54 V 28 H 12 V 42 H 35 V 51 H -35 V 42 H -12 V 28 H -54 Z M -41 -28 V 15 H 41 V -28 Z",
);

function drawStar(context) {
  context.beginPath();
  [
    [0, -52],
    [13, -17],
    [50, -16],
    [21, 7],
    [31, 44],
    [0, 23],
    [-31, 44],
    [-21, 7],
    [-50, -16],
    [-13, -17],
  ].forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fill();
}

function drawFlame(context) {
  context.beginPath();
  context.moveTo(3, -58);
  context.bezierCurveTo(28, -35, 42, -16, 35, 8);
  context.bezierCurveTo(31, 26, 18, 45, 0, 53);
  context.bezierCurveTo(-23, 46, -38, 27, -35, 4);
  context.bezierCurveTo(-33, -14, -22, -27, -10, -37);
  context.bezierCurveTo(-10, -18, -1, -12, 5, -4);
  context.bezierCurveTo(14, -16, 12, -35, 3, -58);
  context.closePath();
  context.fill();
}

function drawDecoration(context, decoration) {
  context.save();
  context.translate(decoration.x, decoration.y);
  context.rotate((decoration.rotation * Math.PI) / 180);
  context.scale(decoration.scale, decoration.scale);
  context.fillStyle = "#000";
  context.strokeStyle = "#000";

  if (decoration.kind === "star") drawStar(context);
  if (decoration.kind === "flame") drawFlame(context);
  if (decoration.kind === "computer") {
    context.fill(computerPath, "evenodd");
  }
  if (decoration.kind === "burst") {
    context.lineWidth = 13;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-48, -30);
    context.lineTo(18, -11);
    context.moveTo(-54, 0);
    context.lineTo(22, 0);
    context.moveTo(-46, 30);
    context.lineTo(18, 11);
    context.stroke();
  }
  if (decoration.kind === "wordmark") {
    context.font = `italic 900 48px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("ccneed", 0, 0);
  }
  context.restore();
}

function drawText(context) {
  const characters = Array.from("救火圣手");
  const spacing = -10;
  context.font = `900 164px ${fontFamily}`;
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  const widths = characters.map(
    (character) => context.measureText(character).width,
  );
  const total =
    widths.reduce((sum, width) => sum + width, 0) +
    (characters.length - 1) * spacing;
  let x = VIEW_WIDTH / 2 - total / 2;
  characters.forEach((character, index) => {
    context.fillText(character, x, 266);
    x += widths[index] + spacing;
  });
}

function renderMask(tone) {
  const scale = tone === "shadow" ? MASK_SCALE : 1;
  const width = Math.round(VIEW_WIDTH * scale);
  const height = Math.round(VIEW_HEIGHT * scale);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#000";
  context.strokeStyle = "#000";
  if (tone === "face") drawText(context);
  defaultDecorations
    .filter((decoration) => decoration.tone === tone)
    .forEach((decoration) => drawDecoration(context, decoration));

  const rgba = context.getImageData(0, 0, width, height).data;
  const data = new Uint8Array(width * height);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = rgba[index * 4 + 3];
  }
  return { data, width, height, scale };
}

function renderCroppedMask(bounds, paint) {
  const originX = Math.floor(bounds.x);
  const originY = Math.floor(bounds.y);
  const maxX = Math.ceil(bounds.x + bounds.width);
  const maxY = Math.ceil(bounds.y + bounds.height);
  const width = (maxX - originX) * MASK_SCALE;
  const height = (maxY - originY) * MASK_SCALE;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.scale(MASK_SCALE, MASK_SCALE);
  context.translate(-originX, -originY);
  context.fillStyle = "#000";
  context.strokeStyle = "#000";
  paint(context);

  const rgba = context.getImageData(0, 0, width, height).data;
  const data = new Uint8Array(width * height);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = rgba[index * 4 + 3];
  }
  return {
    data,
    width,
    height,
    scale: MASK_SCALE,
    originX,
    originY,
  };
}

function defaultMasks() {
  const masks = {
    face: [
      renderCroppedMask(
        { x: 100, y: 55, width: 800, height: 280 },
        drawText,
      ),
    ],
    accent: [],
    shadow: [],
  };
  defaultDecorations.forEach((decoration) => {
    const localRadius = decoration.kind === "wordmark" ? 112 : 84;
    const radius = localRadius * decoration.scale + 6;
    masks[decoration.tone].push(
      renderCroppedMask(
        {
          x: decoration.x - radius,
          y: decoration.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
        (context) => drawDecoration(context, decoration),
      ),
    );
  });
  return masks;
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
  const invalid = [...edgeCounts.values()].filter((count) => count !== 2);
  assert.equal(invalid.length, 0, `${label} should be a closed two-manifold mesh`);
}

test("default 救火圣手 model creates closed meshes for every color part", () => {
  const parts = createModelParts(defaultMasks(), {
    base: 3.2,
    shadow: 2.8,
    top: 3,
  });
  assert.equal(parts.length, 6);
  const rim = parts.find((part) => part.name === "Pink top rim");
  const face = parts.find((part) => part.name === "Cream text");
  assert.ok(rim);
  assert.ok(face);
  assert.equal(rim.z1, face.z0);
  assert.equal(face.z1, 9);
  const bounds = pathsBounds(parts[0].paths);
  parts.forEach((part) => {
    const mesh = meshForPaths(part.paths, part.z0, part.z1, bounds, 140);
    assert.ok(mesh.vertices.length > 0, `${part.name} should contain vertices`);
    assert.ok(mesh.triangles.length > 0, `${part.name} should contain triangles`);
    assertClosed(mesh, part.name);
  });
});

test("keeps antialiased alpha detail when tracing text contours", () => {
  const face = renderMask("face");
  assert.ok(
    face.data.some((value) => value > 0 && value < 255),
    "the raster mask should preserve antialiased alpha values",
  );

  const paths = maskToClipperPaths(face);
  const hasInterpolatedCoordinate = paths
    .flat()
    .some(
      (point) =>
        Math.abs(point.X % 50) > 0 || Math.abs(point.Y % 50) > 0,
    );
  assert.ok(
    hasInterpolatedCoordinate,
    "the traced outline should not be locked to integer/half-pixel coordinates",
  );
});

test("keeps small circular and SVG-sized curves smooth", () => {
  assert.equal(MASK_SCALE, 3);
  const canvas = createCanvas(MASK_WIDTH, MASK_HEIGHT);
  const context = canvas.getContext("2d");
  context.scale(MASK_SCALE, MASK_SCALE);
  context.fillStyle = "#000";
  context.beginPath();
  context.arc(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 24, 0, Math.PI * 2);
  context.fill();

  const rgba = context.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data;
  const data = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = rgba[index * 4 + 3];
  }

  const ring = maskToClipperPaths({
    data,
    width: MASK_WIDTH,
    height: MASK_HEIGHT,
    scale: MASK_SCALE,
  }).sort(
    (first, second) => second.length - first.length,
  )[0];
  assert.ok(ring.length >= 400, "the curve should retain enough contour samples");

  let maximumRadialError = 0;
  let maximumSegmentLength = 0;
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length];
    const x = point.X / 100;
    const y = point.Y / 100;
    maximumRadialError = Math.max(
      maximumRadialError,
      Math.abs(Math.hypot(x - VIEW_WIDTH / 2, y - VIEW_HEIGHT / 2) - 24),
    );
    maximumSegmentLength = Math.max(
      maximumSegmentLength,
      Math.hypot((next.X - point.X) / 100, (next.Y - point.Y) / 100),
    );
  });

  assert.ok(maximumRadialError < 0.1);
  assert.ok(maximumSegmentLength < 1.5);

  const expanded = offsetPaths([ring], 22).sort(
    (first, second) => second.length - first.length,
  )[0];
  let expandedRadialError = 0;
  let expandedSegmentLength = 0;
  expanded.forEach((point, index) => {
    const next = expanded[(index + 1) % expanded.length];
    const x = point.X / 100;
    const y = point.Y / 100;
    expandedRadialError = Math.max(
      expandedRadialError,
      Math.abs(Math.hypot(x - VIEW_WIDTH / 2, y - VIEW_HEIGHT / 2) - 46),
    );
    expandedSegmentLength = Math.max(
      expandedSegmentLength,
      Math.hypot((next.X - point.X) / 100, (next.Y - point.Y) / 100),
    );
  });
  assert.ok(expanded.length >= 400);
  assert.ok(expandedRadialError < 0.12);
  assert.ok(expandedSegmentLength < 2.5);
});

test("combines independently cropped high-resolution masks in world space", () => {
  const size = 90;
  const scale = MASK_SCALE;
  const canvas = createCanvas(size * scale, size * scale);
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#000";
  context.beginPath();
  context.arc(size / 2, size / 2, 18, 0, Math.PI * 2);
  context.fill();

  const rgba = context.getImageData(
    0,
    0,
    size * scale,
    size * scale,
  ).data;
  const data = new Uint8Array(size * scale * size * scale);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = rgba[index * 4 + 3];
  }

  const paths = maskToClipperPaths({
    data,
    width: size * scale,
    height: size * scale,
    scale,
    originX: 320,
    originY: 80,
  });
  const bounds = pathsBounds(paths);
  assert.ok(Math.abs((bounds.minX + bounds.maxX) / 2 - 365) < 0.1);
  assert.ok(Math.abs((bounds.minY + bounds.maxY) / 2 - 125) < 0.1);
});
