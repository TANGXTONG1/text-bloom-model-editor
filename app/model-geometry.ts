import { contours } from "d3-contour";
import earcut from "earcut";
import ClipperLib from "clipper-lib";

export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 420;
export const MASK_SCALE = 3;
export const MASK_WIDTH = VIEW_WIDTH * MASK_SCALE;
export const MASK_HEIGHT = VIEW_HEIGHT * MASK_SCALE;
export const MASK_ALPHA_THRESHOLD = 128;
const CLIPPER_SCALE = 100;
const PATH_CLEAN_DISTANCE = CLIPPER_SCALE * 0.002;
export const OFFSET_ARC_TOLERANCE = 0.01;
export const MESH_MAX_PLANAR_ERROR_MM = 0.03;

export type Palette = {
  base: string;
  shadow: string;
  face: string;
  accent: string;
};

export type LayerSettings = {
  base: number;
  shadow: number;
  top: number;
};

export type ClipPoint = { X: number; Y: number };
export type ClipPath = ClipPoint[];
export type Mesh = {
  vertices: Array<[number, number, number]>;
  triangles: Array<[number, number, number]>;
};
export type RasterMask = {
  data: Uint8Array;
  width: number;
  height: number;
  scale: number;
  originX?: number;
  originY?: number;
};
export type RasterLayer = RasterMask | RasterMask[];
export type ModelMasks = {
  face: RasterLayer;
  accent: RasterLayer;
  shadow: RasterLayer;
};
export type ModelPart = {
  name: string;
  colorIndex: number;
  paths: ClipPath[];
  z0: number;
  z1: number;
};

function smoothContour(
  points: Array<[number, number]>,
): Array<[number, number]> {
  if (points.length < 5) return points;
  return points.map(([x, y], index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    return [
      (previous[0] + x * 2 + next[0]) / 4,
      (previous[1] + y * 2 + next[1]) / 4,
    ];
  });
}

export function maskToClipperPaths(mask: RasterMask): ClipPath[] {
  let threshold = 0.5;
  for (const value of mask.data) {
    if (value > 1) {
      threshold = MASK_ALPHA_THRESHOLD - 0.5;
      break;
    }
  }
  const result = contours()
    .size([mask.width, mask.height])
    .smooth(true)
    .thresholds([threshold])(mask.data)[0];
  if (!result) return [];
  const paths: ClipPath[] = [];
  const originX = mask.originX ?? 0;
  const originY = mask.originY ?? 0;
  for (const polygon of result.coordinates as Array<
    Array<Array<[number, number]>>
  >) {
    polygon.forEach((ring: Array<[number, number]>, ringIndex: number) => {
      const smoothed = smoothContour(ring.slice(0, -1));
      const points = smoothed.map(([x, y]) => ({
        X: Math.round((x / mask.scale + originX) * CLIPPER_SCALE),
        Y: Math.round((y / mask.scale + originY) * CLIPPER_SCALE),
      }));
      if (points.length < 3) return;
      const shouldBePositive = ringIndex === 0;
      if (ClipperLib.Clipper.Orientation(points) !== shouldBePositive) {
        points.reverse();
      }
      paths.push(points);
    });
  }
  return ClipperLib.Clipper.CleanPolygons(paths, PATH_CLEAN_DISTANCE);
}

export function unionPaths(paths: ClipPath[]) {
  if (!paths.length) return [];
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
  const output: ClipPath[] = [];
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    output,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );
  return output;
}

export function offsetPaths(paths: ClipPath[], delta: number) {
  const offsetter = new ClipperLib.ClipperOffset(
    2,
    CLIPPER_SCALE * OFFSET_ARC_TOLERANCE,
  );
  offsetter.AddPaths(
    paths,
    ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon,
  );
  const output: ClipPath[] = [];
  offsetter.Execute(output, delta * CLIPPER_SCALE);
  return output;
}

function traceRasterLayer(layer: RasterLayer) {
  const masks = Array.isArray(layer) ? layer : [layer];
  return unionPaths(
    masks.flatMap((mask) => maskToClipperPaths(mask)),
  );
}

export function differencePaths(subject: ClipPath[], clip: ClipPath[]) {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(subject, ClipperLib.PolyType.ptSubject, true);
  clipper.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
  const output: ClipPath[] = [];
  clipper.Execute(
    ClipperLib.ClipType.ctDifference,
    output,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );
  return output;
}

function signedArea(points: Array<[number, number]>) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    area += points[index][0] * points[next][1] - points[next][0] * points[index][1];
  }
  return area / 2;
}

function pointInRing(point: [number, number], ring: Array<[number, number]>) {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [x, y] = ring[index];
    const [px, py] = ring[previous];
    const crosses =
      y > point[1] !== py > point[1] &&
      point[0] < ((px - x) * (point[1] - y)) / (py - y || 1e-9) + x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function sanitizeRing(ring: Array<[number, number]>) {
  const duplicateEpsilonSquared = 1e-12;
  let cleaned = ring.filter((point, index) => {
    if (index === 0) return true;
    const previous = ring[index - 1];
    const dx = point[0] - previous[0];
    const dy = point[1] - previous[1];
    return dx * dx + dy * dy > duplicateEpsilonSquared;
  });

  if (cleaned.length > 1) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    const dx = first[0] - last[0];
    const dy = first[1] - last[1];
    if (dx * dx + dy * dy <= duplicateEpsilonSquared) {
      cleaned = cleaned.slice(0, -1);
    }
  }

  let changed = true;
  while (changed && cleaned.length > 3) {
    changed = false;
    const nextRing = cleaned.filter((point, index) => {
      const previous = cleaned[(index - 1 + cleaned.length) % cleaned.length];
      const next = cleaned[(index + 1) % cleaned.length];
      const firstX = point[0] - previous[0];
      const firstY = point[1] - previous[1];
      const secondX = next[0] - point[0];
      const secondY = next[1] - point[1];
      const cross = firstX * secondY - firstY * secondX;
      const dot = firstX * secondX + firstY * secondY;
      if (Math.abs(cross) <= 1e-9 && dot >= 0) {
        changed = true;
        return false;
      }
      return true;
    });
    cleaned = nextRing;
  }

  return cleaned;
}

function squaredDistanceToSegment(
  point: [number, number],
  start: [number, number],
  end: [number, number],
) {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (segmentLengthSquared === 0) {
    const dx = point[0] - start[0];
    const dy = point[1] - start[1];
    return dx * dx + dy * dy;
  }
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * segmentX +
        (point[1] - start[1]) * segmentY) /
        segmentLengthSquared,
    ),
  );
  const dx = point[0] - (start[0] + projection * segmentX);
  const dy = point[1] - (start[1] + projection * segmentY);
  return dx * dx + dy * dy;
}

function simplifyOpenLine(
  points: Array<[number, number]>,
  toleranceSquared: number,
) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const ranges: Array<[number, number]> = [[0, points.length - 1]];

  while (ranges.length) {
    const [start, end] = ranges.pop() as [number, number];
    let furthest = -1;
    let maximumDistance = toleranceSquared;
    for (let index = start + 1; index < end; index += 1) {
      const distance = squaredDistanceToSegment(
        points[index],
        points[start],
        points[end],
      );
      if (distance > maximumDistance) {
        maximumDistance = distance;
        furthest = index;
      }
    }
    if (furthest < 0) continue;
    keep[furthest] = 1;
    ranges.push([start, furthest], [furthest, end]);
  }

  return points.filter((_, index) => keep[index] === 1);
}

function ringChain(
  ring: Array<[number, number]>,
  start: number,
  end: number,
) {
  const chain: Array<[number, number]> = [];
  let index = start;
  while (true) {
    chain.push(ring[index]);
    if (index === end) break;
    index = (index + 1) % ring.length;
  }
  return chain;
}

function simplifyClosedRing(
  ring: Array<[number, number]>,
  tolerance: number,
) {
  if (ring.length < 8 || tolerance <= 0) return ring;
  const center = ring.reduce(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
    [0, 0],
  );
  center[0] /= ring.length;
  center[1] /= ring.length;

  let first = 0;
  let firstDistance = -1;
  ring.forEach((point, index) => {
    const dx = point[0] - center[0];
    const dy = point[1] - center[1];
    const distance = dx * dx + dy * dy;
    if (distance > firstDistance) {
      firstDistance = distance;
      first = index;
    }
  });

  let second = first === 0 ? 1 : 0;
  let secondDistance = -1;
  ring.forEach((point, index) => {
    const dx = point[0] - ring[first][0];
    const dy = point[1] - ring[first][1];
    const distance = dx * dx + dy * dy;
    if (distance > secondDistance) {
      secondDistance = distance;
      second = index;
    }
  });

  const toleranceSquared = tolerance * tolerance;
  const firstHalf = simplifyOpenLine(
    ringChain(ring, first, second),
    toleranceSquared,
  );
  const secondHalf = simplifyOpenLine(
    ringChain(ring, second, first),
    toleranceSquared,
  );
  const simplified = sanitizeRing([
    ...firstHalf.slice(0, -1),
    ...secondHalf.slice(0, -1),
  ]);
  if (
    simplified.length < 3 ||
    signedArea(simplified) * signedArea(ring) <= 0
  ) {
    return ring;
  }
  return simplified;
}

function polygonGroups(paths: ClipPath[], tolerance = 0) {
  const rings = paths
    .map((path) =>
      simplifyClosedRing(
        sanitizeRing(
          path.map(
            (point) =>
              [point.X / CLIPPER_SCALE, point.Y / CLIPPER_SCALE] as [
                number,
                number,
              ],
          ),
        ),
        tolerance,
      ),
    )
    .filter((ring) => ring.length >= 3 && Math.abs(signedArea(ring)) > 0.5)
    .map((ring) => ({
      ring,
      area: Math.abs(signedArea(ring)),
      parent: -1,
      depth: 0,
    }))
    .sort((a, b) => b.area - a.area);

  rings.forEach((entry, index) => {
    let parent = -1;
    let parentArea = Number.POSITIVE_INFINITY;
    for (let candidate = 0; candidate < index; candidate += 1) {
      if (
        rings[candidate].area < parentArea &&
        pointInRing(entry.ring[0], rings[candidate].ring)
      ) {
        parent = candidate;
        parentArea = rings[candidate].area;
      }
    }
    entry.parent = parent;
    entry.depth = parent < 0 ? 0 : rings[parent].depth + 1;
  });

  return rings
    .map((entry, index) => {
      if (entry.depth % 2 !== 0) return null;
      const holes = rings
        .filter(
          (candidate) =>
            candidate.parent === index && candidate.depth % 2 === 1,
        )
        .map((candidate) => candidate.ring);
      return { outer: entry.ring, holes };
    })
    .filter(
      (
        group,
      ): group is {
        outer: Array<[number, number]>;
        holes: Array<Array<[number, number]>>;
      } => group !== null,
    );
}

export function pathsBounds(paths: ClipPath[]) {
  const points = paths.flat();
  if (!points.length) throw new Error("模型中没有可导出的形状");
  return {
    minX: Math.min(...points.map((point) => point.X)) / CLIPPER_SCALE,
    minY: Math.min(...points.map((point) => point.Y)) / CLIPPER_SCALE,
    maxX: Math.max(...points.map((point) => point.X)) / CLIPPER_SCALE,
    maxY: Math.max(...points.map((point) => point.Y)) / CLIPPER_SCALE,
  };
}

export function meshForPaths(
  paths: ClipPath[],
  z0: number,
  z1: number,
  bounds: ReturnType<typeof pathsBounds>,
  widthMm: number,
): Mesh {
  const vertices: Array<[number, number, number]> = [];
  const triangles: Array<[number, number, number]> = [];
  const indices = new Map<string, number>();
  const scale = widthMm / (bounds.maxX - bounds.minX);
  const planarTolerance = MESH_MAX_PLANAR_ERROR_MM / scale;

  function modelPoint(point: [number, number]) {
    return [
      (point[0] - bounds.minX) * scale,
      (bounds.maxY - point[1]) * scale,
    ] as [number, number];
  }

  function addVertex(point: [number, number, number]) {
    const key = point.map((value) => value.toFixed(5)).join(",");
    const existing = indices.get(key);
    if (existing !== undefined) return existing;
    const index = vertices.length;
    indices.set(key, index);
    vertices.push(point);
    return index;
  }

  for (const group of polygonGroups(paths, planarTolerance)) {
    const rings = [group.outer, ...group.holes].map((ring) =>
      ring.map(modelPoint),
    );
    const flat: number[] = [];
    const holeIndices: number[] = [];
    rings.forEach((ring, ringIndex) => {
      if (ringIndex > 0) holeIndices.push(flat.length / 2);
      ring.forEach(([x, y]) => flat.push(x, y));
    });
    const triangulated = earcut(flat, holeIndices, 2);
    for (let index = 0; index < triangulated.length; index += 3) {
      const ids = triangulated.slice(index, index + 3);
      const top = ids.map((id) =>
        addVertex([flat[id * 2], flat[id * 2 + 1], z1]),
      ) as [number, number, number];
      const bottom = ids.map((id) =>
        addVertex([flat[id * 2], flat[id * 2 + 1], z0]),
      ) as [number, number, number];
      triangles.push(top);
      triangles.push([bottom[2], bottom[1], bottom[0]]);
    }

    for (const ring of rings) {
      for (let index = 0; index < ring.length; index += 1) {
        const next = (index + 1) % ring.length;
        const [ax, ay] = ring[index];
        const [bx, by] = ring[next];
        const a0 = addVertex([ax, ay, z0]);
        const b0 = addVertex([bx, by, z0]);
        const b1 = addVertex([bx, by, z1]);
        const a1 = addVertex([ax, ay, z1]);
        triangles.push([a0, b0, b1], [a0, b1, a1]);
      }
    }
  }

  const edgeCounts = new Map<string, number>();
  triangles.forEach(([a, b, c]) => {
    [
      [a, b],
      [b, c],
      [c, a],
    ].forEach(([first, second]) => {
      const key = first < second ? `${first}:${second}` : `${second}:${first}`;
      edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    });
  });
  const invalidEdgeCounts = [...edgeCounts.values()].filter(
    (count) => count !== 2,
  );
  if (invalidEdgeCounts.length) {
    const summary = Object.entries(
      invalidEdgeCounts.reduce<Record<string, number>>((counts, count) => {
        counts[count] = (counts[count] || 0) + 1;
        return counts;
      }, {}),
    )
      .map(([count, total]) => `${total}×${count}`)
      .join(", ");
    throw new Error(
      `模型轮廓包含自交或过细缝隙，无法生成闭合实体（异常边：${summary}）`,
    );
  }
  return { vertices, triangles };
}

export function createModelParts(
  masks: ModelMasks,
  layers: LayerSettings,
): ModelPart[] {
  const facePaths = traceRasterLayer(masks.face);
  const accentPaths = differencePaths(
    traceRasterLayer(masks.accent),
    facePaths,
  );
  const faceAndAccentPaths = unionPaths([...facePaths, ...accentPaths]);
  const shadowFacePaths = differencePaths(
    traceRasterLayer(masks.shadow),
    faceAndAccentPaths,
  );
  const allPaths = unionPaths([
    ...faceAndAccentPaths,
    ...shadowFacePaths,
  ]);
  if (!allPaths.length || !facePaths.length) {
    throw new Error("至少需要一个可见文字或图案");
  }

  const rimFull = offsetPaths(allPaths, 10);
  const shadowFull = offsetPaths(allPaths, 14);
  const baseFull = offsetPaths(allPaths, 22);
  const z1 = layers.base;
  const z2 = z1 + layers.shadow;
  const z3 = z2 + Math.min(0.8, Math.max(0.3, layers.top * 0.28));
  const z4 = z2 + layers.top;

  return [
    {
      name: "Pink base",
      colorIndex: 0,
      paths: baseFull,
      z0: 0,
      z1,
    },
    {
      name: "Blue shadow",
      colorIndex: 1,
      paths: shadowFull,
      z0: z1,
      z1: z2,
    },
    {
      name: "Pink top rim",
      colorIndex: 0,
      paths: rimFull,
      z0: z2,
      z1: z3,
    },
    {
      name: "Cream text",
      colorIndex: 2,
      paths: facePaths,
      z0: z3,
      z1: z4,
    },
    {
      name: "Yellow decorations",
      colorIndex: 3,
      paths: accentPaths,
      z0: z3,
      z1: z4,
    },
    {
      name: "Blue decorations",
      colorIndex: 1,
      paths: shadowFacePaths,
      z0: z3,
      z1: z4,
    },
  ].filter((part) => part.paths.length);
}
