export const CUTE_DECORATION_KINDS = [
  "flower",
  "cloud",
  "bow",
  "paw",
  "cherry",
  "bunny",
] as const;

export type CuteDecorationKind = (typeof CUTE_DECORATION_KINDS)[number];

export function isCuteDecorationKind(
  kind: string,
): kind is CuteDecorationKind {
  return CUTE_DECORATION_KINDS.some((candidate) => candidate === kind);
}

export const FLOWER_PETALS = [
  [0, -27],
  [26, -8],
  [16, 22],
  [-16, 22],
  [-26, -8],
] as const;

export const CLOUD_PATH =
  "M -52 17 C -54 -5 -38 -22 -18 -20 C -10 -43 23 -47 36 -25 C 52 -23 60 -8 56 8 C 52 25 39 32 22 32 H -28 C -43 32 -52 26 -52 17 Z";

export const BOW_PATH =
  "M -8 -7 C -22 -37 -54 -42 -55 -13 C -56 13 -29 19 -8 4 Z M 8 -7 C 22 -37 54 -42 55 -13 C 56 13 29 19 8 4 Z M -12 -12 Q 0 -21 12 -12 L 12 12 Q 0 21 -12 12 Z M -7 8 L -29 49 L -7 39 L 0 53 L 7 8 Z M 7 8 L 29 49 L 7 39 L 0 53 L -7 8 Z";

export const PAW_PAD_PATH =
  "M 0 -13 C 25 -13 38 10 30 31 C 22 51 -22 51 -30 31 C -38 10 -25 -13 0 -13 Z";

export const CHERRY_STEMS_PATH =
  "M -22 8 C -18 -19 -7 -37 8 -49 M 20 9 C 19 -17 14 -36 8 -49";

export const CHERRY_LEAF_PATH =
  "M 8 -46 C 26 -59 45 -54 50 -37 C 33 -29 19 -34 8 -46 Z";

export const BUNNY_PATH =
  "M -26 -8 C -42 -35 -39 -59 -25 -56 C -13 -53 -11 -32 -9 -21 C -3 -24 3 -24 9 -21 C 11 -32 13 -53 25 -56 C 39 -59 42 -35 26 -8 C 40 1 45 18 37 34 C 28 51 -28 51 -37 34 C -45 18 -40 1 -26 -8 Z";

function fillCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawFlower(context: CanvasRenderingContext2D) {
  FLOWER_PETALS.forEach(([x, y]) => fillCircle(context, x, y, 22));
  fillCircle(context, 0, 0, 18);
}

function drawCloud(context: CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(-52, 17);
  context.bezierCurveTo(-54, -5, -38, -22, -18, -20);
  context.bezierCurveTo(-10, -43, 23, -47, 36, -25);
  context.bezierCurveTo(52, -23, 60, -8, 56, 8);
  context.bezierCurveTo(52, 25, 39, 32, 22, 32);
  context.lineTo(-28, 32);
  context.bezierCurveTo(-43, 32, -52, 26, -52, 17);
  context.closePath();
  context.fill();
}

function drawBow(context: CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(-8, -7);
  context.bezierCurveTo(-22, -37, -54, -42, -55, -13);
  context.bezierCurveTo(-56, 13, -29, 19, -8, 4);
  context.closePath();
  context.moveTo(8, -7);
  context.bezierCurveTo(22, -37, 54, -42, 55, -13);
  context.bezierCurveTo(56, 13, 29, 19, 8, 4);
  context.closePath();
  context.moveTo(-12, -12);
  context.quadraticCurveTo(0, -21, 12, -12);
  context.lineTo(12, 12);
  context.quadraticCurveTo(0, 21, -12, 12);
  context.closePath();
  context.moveTo(-7, 8);
  context.lineTo(-29, 49);
  context.lineTo(-7, 39);
  context.lineTo(0, 53);
  context.lineTo(7, 8);
  context.closePath();
  context.moveTo(7, 8);
  context.lineTo(29, 49);
  context.lineTo(7, 39);
  context.lineTo(0, 53);
  context.lineTo(-7, 8);
  context.closePath();
  context.fill();
}

function drawPaw(context: CanvasRenderingContext2D) {
  [
    [-30, -23, 13],
    [-10, -40, 12],
    [12, -40, 12],
    [31, -23, 13],
  ].forEach(([x, y, radius]) => fillCircle(context, x, y, radius));
  context.beginPath();
  context.moveTo(0, -13);
  context.bezierCurveTo(25, -13, 38, 10, 30, 31);
  context.bezierCurveTo(22, 51, -22, 51, -30, 31);
  context.bezierCurveTo(-38, 10, -25, -13, 0, -13);
  context.closePath();
  context.fill();
}

function drawCherry(context: CanvasRenderingContext2D) {
  context.save();
  context.lineWidth = 8;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(-22, 8);
  context.bezierCurveTo(-18, -19, -7, -37, 8, -49);
  context.moveTo(20, 9);
  context.bezierCurveTo(19, -17, 14, -36, 8, -49);
  context.stroke();
  context.restore();

  fillCircle(context, -22, 25, 23);
  fillCircle(context, 21, 25, 23);
  context.beginPath();
  context.moveTo(8, -46);
  context.bezierCurveTo(26, -59, 45, -54, 50, -37);
  context.bezierCurveTo(33, -29, 19, -34, 8, -46);
  context.closePath();
  context.fill();
}

function drawBunny(context: CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(-26, -8);
  context.bezierCurveTo(-42, -35, -39, -59, -25, -56);
  context.bezierCurveTo(-13, -53, -11, -32, -9, -21);
  context.bezierCurveTo(-3, -24, 3, -24, 9, -21);
  context.bezierCurveTo(11, -32, 13, -53, 25, -56);
  context.bezierCurveTo(39, -59, 42, -35, 26, -8);
  context.bezierCurveTo(40, 1, 45, 18, 37, 34);
  context.bezierCurveTo(28, 51, -28, 51, -37, 34);
  context.bezierCurveTo(-45, 18, -40, 1, -26, -8);
  context.closePath();
  context.fill();
}

export function drawCuteDecoration(
  context: CanvasRenderingContext2D,
  kind: CuteDecorationKind,
) {
  if (kind === "flower") drawFlower(context);
  if (kind === "cloud") drawCloud(context);
  if (kind === "bow") drawBow(context);
  if (kind === "paw") drawPaw(context);
  if (kind === "cherry") drawCherry(context);
  if (kind === "bunny") drawBunny(context);
}
