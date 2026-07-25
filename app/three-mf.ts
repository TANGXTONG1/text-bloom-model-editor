import { strToU8, zipSync } from "fflate";
import {
  meshForPaths,
  pathsBounds,
  type ModelPart,
  type Palette,
} from "./model-geometry.ts";

export type ThreeMfColorMode = "clean" | "standard";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function create3mfArchive(
  text: string,
  parts: ModelPart[],
  palette: Palette,
  widthMm: number,
  colorMode: ThreeMfColorMode,
) {
  const bounds = pathsBounds(parts[0].paths);
  const colors = [palette.base, palette.shadow, palette.face, palette.accent].map(
    (color) => color.toUpperCase(),
  );
  const objectXml: string[] = [];
  const componentXml: string[] = [];

  parts.forEach((part, index) => {
    const objectId = index + 2;
    const mesh = meshForPaths(part.paths, part.z0, part.z1, bounds, widthMm);
    const vertices = mesh.vertices
      .map(
        ([x, y, z]) =>
          `<vertex x="${x.toFixed(4)}" y="${y.toFixed(4)}" z="${z.toFixed(4)}"/>`,
      )
      .join("");
    const colorAttributes =
      colorMode === "standard"
        ? ` pid="1" p1="${part.colorIndex}" p2="${part.colorIndex}" p3="${part.colorIndex}"`
        : "";
    const triangles = mesh.triangles
      .map(
        ([a, b, c]) =>
          `<triangle v1="${a}" v2="${b}" v3="${c}"${colorAttributes}/>`,
      )
      .join("");
    const objectColorAttributes =
      colorMode === "standard"
        ? ` pid="1" pindex="${part.colorIndex}"`
        : "";
    const colorHint = `slot ${part.colorIndex + 1} ${colors[part.colorIndex]}`;
    objectXml.push(
      `<object id="${objectId}" type="model"${objectColorAttributes} name="${escapeXml(`${part.name} [${colorHint}]`)}"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>`,
    );
    componentXml.push(`<component objectid="${objectId}"/>`);
  });

  const assemblyId = parts.length + 2;
  const materialsNamespace =
    colorMode === "standard"
      ? ' xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" requiredextensions="m"'
      : "";
  const colorResources =
    colorMode === "standard"
      ? `<m:colorgroup id="1">${colors.map((color) => `<m:color color="${color}"/>`).join("")}</m:colorgroup>`
      : "";
  const modeLabel =
    colorMode === "clean" ? "clean-parts" : "standard-color-hints";
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"${materialsNamespace} unit="millimeter" xml:lang="zh-CN">
<metadata name="Title">${escapeXml(text || "文字花模型")}</metadata>
<metadata name="Application">Text Bloom Model Editor 1.0</metadata>
<metadata name="TextBloom:ExportMode">${modeLabel}</metadata>
<resources>
${colorResources}
${objectXml.join("")}
<object id="${assemblyId}" type="model" name="${escapeXml(text || "文字花模型")}（四色装配）"><components>${componentXml.join("")}</components></object>
</resources>
<build><item objectid="${assemblyId}"/></build>
</model>`;

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>';
  const relationships =
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>';

  return zipSync(
    {
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(relationships),
      "3D/3dmodel.model": strToU8(model),
    },
    { level: 6 },
  );
}

export function create3mfBlob(
  text: string,
  parts: ModelPart[],
  palette: Palette,
  widthMm: number,
  colorMode: ThreeMfColorMode,
) {
  return new Blob(
    [create3mfArchive(text, parts, palette, widthMm, colorMode)],
    { type: "model/3mf" },
  );
}
