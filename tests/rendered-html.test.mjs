import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the text bloom model editor", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>字花模型编辑器｜在线生成彩色 3MF<\/title>/);
  assert.match(html, /救火圣手/);
  assert.match(html, /ccneed/);
  assert.match(html, /下载 Bambu 纯净 3MF/);
  assert.match(html, /下载带颜色提示 3MF/);
  assert.match(html, /自定义 SVG/);
  assert.match(html, /2D 排版/);
  assert.match(html, /3D 模型/);
  assert.match(html, /3D 与 3MF 同源/);
  assert.match(html, /可爱上新/);
  assert.match(html, /添加小花/);
  assert.match(html, /添加云朵/);
  assert.match(html, /添加蝴蝶结/);
  assert.match(html, /添加肉垫/);
  assert.match(html, /添加樱桃/);
  assert.match(html, /添加兔兔/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps one mesh pipeline for the 3D preview and 3MF exporter", async () => {
  const [
    editor,
    geometry,
    previewGeometry,
    viewport,
    cuteDecorations,
    packageJson,
  ] = await Promise.all([
    readFile(new URL("../app/ModelEditor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/model-geometry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/preview-geometry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/ModelViewport.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cute-decorations.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(editor, /create3mfBlob/);
  assert.match(editor, /createPreviewMeshes/);
  assert.match(editor, /meshForPaths\(part\.paths, part\.z0, part\.z1/);
  assert.match(editor, /create3mfBlob\(text, parts, palette, widthMm, colorMode\)/);
  assert.match(geometry, /ClipperOffset/);
  assert.match(geometry, /MASK_SCALE = 3/);
  assert.match(geometry, /OFFSET_ARC_TOLERANCE = 0\.01/);
  assert.match(geometry, /MESH_MAX_PLANAR_ERROR_MM = 0\.03/);
  assert.match(geometry, /const rimFull = offsetPaths\(allPaths, 10\)/);
  assert.match(geometry, /export function meshForPaths/);
  assert.match(editor, /createMaskCanvas\(\s*MASK_SCALE,\s*bounds/);
  assert.match(editor, /originX/);
  assert.match(viewport, /OrbitControls/);
  assert.match(viewport, /geometryFromMesh/);
  assert.match(viewport, /flatShading/);
  assert.doesNotMatch(viewport, /shadowMap\.enabled = true/);
  assert.doesNotMatch(viewport, /receiveShadow = true/);
  assert.match(editor, /isCuteDecorationKind/);
  assert.match(editor, /drawCuteDecoration/);
  assert.match(cuteDecorations, /CUTE_DECORATION_KINDS/);
  assert.match(cuteDecorations, /drawCuteDecoration/);
  assert.match(previewGeometry, /mesh\.triangles/);
  assert.doesNotMatch(previewGeometry, /setIndex/);
  assert.match(packageJson, /"d3-contour"/);
  assert.match(packageJson, /"earcut"/);
  assert.match(packageJson, /"three"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
