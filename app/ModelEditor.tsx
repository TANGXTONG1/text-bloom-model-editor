"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Cherry,
  Cloud,
  Download,
  FileDown,
  Flame,
  Flower2,
  Heart,
  ImagePlus,
  Laptop,
  Monitor,
  PawPrint,
  PencilRuler,
  Rabbit,
  Ribbon,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import {
  BOW_PATH,
  BUNNY_PATH,
  CHERRY_LEAF_PATH,
  CHERRY_STEMS_PATH,
  CLOUD_PATH,
  CUTE_DECORATION_KINDS,
  drawCuteDecoration,
  FLOWER_PETALS,
  isCuteDecorationKind,
  PAW_PAD_PATH,
  type CuteDecorationKind,
} from "./cute-decorations";
import {
  createModelParts,
  MASK_SCALE,
  meshForPaths,
  pathsBounds,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type LayerSettings,
  type ModelPart,
  type Palette,
  type RasterMask,
} from "./model-geometry";
import {
  create3mfBlob,
  type ThreeMfColorMode,
} from "./three-mf";
import type { PreviewMesh } from "./ModelViewport";

const ModelViewport = lazy(async () => {
  const viewportModule = await import("./ModelViewport");
  return { default: viewportModule.ModelViewport };
});

type Tone = "face" | "accent" | "shadow";
type AssetCategory = "classic" | "cute";
type DecorationKind =
  | "star"
  | "flame"
  | "computer"
  | "burst"
  | "heart"
  | "wordmark"
  | "custom"
  | CuteDecorationKind;

type Decoration = {
  id: string;
  kind: DecorationKind;
  name: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  tone: Tone;
  src?: string;
};

const DEFAULT_DECORATIONS: Decoration[] = [
  {
    id: "logo-ccneed",
    kind: "wordmark",
    name: "ccneed 字标",
    x: 758,
    y: 92,
    scale: 1.04,
    rotation: -5,
    tone: "shadow",
  },
  {
    id: "flame-left",
    kind: "flame",
    name: "火苗",
    x: 120,
    y: 130,
    scale: 1.04,
    rotation: -10,
    tone: "accent",
  },
  {
    id: "computer-right",
    kind: "computer",
    name: "电脑",
    x: 874,
    y: 286,
    scale: 0.86,
    rotation: 8,
    tone: "shadow",
  },
  {
    id: "star-left",
    kind: "star",
    name: "星星",
    x: 148,
    y: 304,
    scale: 0.78,
    rotation: -12,
    tone: "accent",
  },
  {
    id: "burst-right",
    kind: "burst",
    name: "发散短线",
    x: 892,
    y: 174,
    scale: 0.78,
    rotation: -4,
    tone: "accent",
  },
];

const PRESETS: Record<string, Palette> = {
  candy: {
    base: "#f36f98",
    shadow: "#3499ac",
    face: "#fff1d4",
    accent: "#ffc62f",
  },
  rescue: {
    base: "#f45a4f",
    shadow: "#176b87",
    face: "#fff4db",
    accent: "#ffb000",
  },
  night: {
    base: "#8b5cf6",
    shadow: "#18a8b8",
    face: "#fff7ed",
    accent: "#facc15",
  },
};

const PALETTE_ITEMS: Array<{
  kind: DecorationKind;
  label: string;
  icon: typeof Star;
  tone: Tone;
  category: AssetCategory;
}> = [
  {
    kind: "star",
    label: "星星",
    icon: Star,
    tone: "accent",
    category: "classic",
  },
  {
    kind: "flame",
    label: "火苗",
    icon: Flame,
    tone: "accent",
    category: "classic",
  },
  {
    kind: "computer",
    label: "电脑",
    icon: Monitor,
    tone: "shadow",
    category: "classic",
  },
  {
    kind: "burst",
    label: "发散线",
    icon: Sparkles,
    tone: "accent",
    category: "classic",
  },
  {
    kind: "heart",
    label: "爱心",
    icon: Heart,
    tone: "shadow",
    category: "classic",
  },
  {
    kind: "wordmark",
    label: "字标",
    icon: Laptop,
    tone: "shadow",
    category: "classic",
  },
  {
    kind: "flower",
    label: "小花",
    icon: Flower2,
    tone: "accent",
    category: "cute",
  },
  {
    kind: "cloud",
    label: "云朵",
    icon: Cloud,
    tone: "shadow",
    category: "cute",
  },
  {
    kind: "bow",
    label: "蝴蝶结",
    icon: Ribbon,
    tone: "accent",
    category: "cute",
  },
  {
    kind: "paw",
    label: "肉垫",
    icon: PawPrint,
    tone: "shadow",
    category: "cute",
  },
  {
    kind: "cherry",
    label: "樱桃",
    icon: Cherry,
    tone: "accent",
    category: "cute",
  },
  {
    kind: "bunny",
    label: "兔兔",
    icon: Rabbit,
    tone: "shadow",
    category: "cute",
  },
];

const STAR_POINTS = [
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
]
  .map(([x, y]) => `${x},${y}`)
  .join(" ");

const FLAME_PATH =
  "M 3 -58 C 28 -35 42 -16 35 8 C 31 26 18 45 0 53 C -23 46 -38 27 -35 4 C -33 -14 -22 -27 -10 -37 C -10 -18 -1 -12 5 -4 C 14 -16 12 -35 3 -58 Z";

const HEART_PATH =
  "M 0 45 C -12 34 -50 7 -50 -19 C -50 -43 -20 -55 0 -30 C 20 -55 50 -43 50 -19 C 50 7 12 34 0 45 Z";

const COMPUTER_PATH =
  "M -54 -40 H 54 V 28 H 12 V 42 H 35 V 51 H -35 V 42 H -12 V 28 H -54 Z M -41 -28 V 15 H 41 V -28 Z";

function toneColor(tone: Tone, palette: Palette) {
  return tone === "face"
    ? palette.face
    : tone === "accent"
      ? palette.accent
      : palette.shadow;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DecorationArtwork({
  item,
  palette,
}: {
  item: Decoration;
  palette: Palette;
}) {
  const fill = toneColor(item.tone, palette);
  const transform = `translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.scale})`;

  return (
    <g transform={transform} fill={fill}>
      {item.kind === "star" && <polygon points={STAR_POINTS} />}
      {item.kind === "flame" && <path d={FLAME_PATH} />}
      {item.kind === "heart" && <path d={HEART_PATH} />}
      {item.kind === "computer" && (
        <path d={COMPUTER_PATH} fillRule="evenodd" />
      )}
      {item.kind === "burst" && (
        <g
          fill="none"
          stroke={fill}
          strokeWidth="13"
          strokeLinecap="round"
        >
          <path d="M -48 -30 L 18 -11" />
          <path d="M -54 0 L 22 0" />
          <path d="M -46 30 L 18 11" />
        </g>
      )}
      {item.kind === "wordmark" && (
        <text
          x="0"
          y="12"
          textAnchor="middle"
          fontSize="48"
          fontWeight="900"
          fontStyle="italic"
          letterSpacing="-2"
        >
          ccneed
        </text>
      )}
      {item.kind === "flower" && (
        <>
          {FLOWER_PETALS.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="22" />
          ))}
          <circle cx="0" cy="0" r="18" />
        </>
      )}
      {item.kind === "cloud" && <path d={CLOUD_PATH} />}
      {item.kind === "bow" && <path d={BOW_PATH} />}
      {item.kind === "paw" && (
        <>
          <circle cx="-30" cy="-23" r="13" />
          <circle cx="-10" cy="-40" r="12" />
          <circle cx="12" cy="-40" r="12" />
          <circle cx="31" cy="-23" r="13" />
          <path d={PAW_PAD_PATH} />
        </>
      )}
      {item.kind === "cherry" && (
        <>
          <path
            d={CHERRY_STEMS_PATH}
            fill="none"
            stroke={fill}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="-22" cy="25" r="23" />
          <circle cx="21" cy="25" r="23" />
          <path d={CHERRY_LEAF_PATH} />
        </>
      )}
      {item.kind === "bunny" && <path d={BUNNY_PATH} />}
      {item.kind === "custom" && item.src && (
        <>
          <mask
            id={`custom-mask-${item.id}`}
            maskUnits="userSpaceOnUse"
            x="-60"
            y="-60"
            width="120"
            height="120"
          >
            <image
              href={item.src}
              x="-55"
              y="-55"
              width="110"
              height="110"
              preserveAspectRatio="xMidYMid meet"
            />
          </mask>
          <rect
            x="-60"
            y="-60"
            width="120"
            height="120"
            fill={fill}
            mask={`url(#custom-mask-${item.id})`}
          />
        </>
      )}
    </g>
  );
}

function DecorationHitArea({
  item,
  selected,
  onPointerDown,
}: {
  item: Decoration;
  selected: boolean;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const width = item.kind === "wordmark" ? 150 : 116;
  return (
    <g
      transform={`translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.scale})`}
      className="decoration-hit"
      onPointerDown={onPointerDown}
      aria-label={`${item.name}，拖动调整位置`}
      role="button"
    >
      <rect
        x={-width / 2}
        y="-60"
        width={width}
        height="120"
        rx="12"
        fill="transparent"
        stroke={selected ? "currentColor" : "transparent"}
        strokeWidth={selected ? 3 / item.scale : 0}
        strokeDasharray={selected ? `${8 / item.scale} ${6 / item.scale}` : undefined}
        className={selected ? "selection-box" : undefined}
      />
      {selected && (
        <circle
          cx={width / 2}
          cy="-60"
          r={7 / item.scale}
          fill="currentColor"
          className="selection-handle"
        />
      )}
    </g>
  );
}

function rgbaMask(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  originX = 0,
  originY = 0,
): RasterMask {
  const image = context.getImageData(0, 0, width, height).data;
  const data = new Uint8Array(width * height);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = image[index * 4 + 3];
  }
  return { data, width, height, scale, originX, originY };
}

function drawStar(context: CanvasRenderingContext2D) {
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

function drawFlame(context: CanvasRenderingContext2D) {
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

function drawHeart(context: CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(0, 45);
  context.bezierCurveTo(-12, 34, -50, 7, -50, -19);
  context.bezierCurveTo(-50, -43, -20, -55, 0, -30);
  context.bezierCurveTo(20, -55, 50, -43, 50, -19);
  context.bezierCurveTo(50, 7, 12, 34, 0, 45);
  context.closePath();
  context.fill();
}

function drawComputer(context: CanvasRenderingContext2D) {
  const path = new Path2D(COMPUTER_PATH);
  context.fill(path, "evenodd");
}

function drawBurst(context: CanvasRenderingContext2D) {
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

function letteredTextLayout(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  spacing: number,
  fontFamily: string,
) {
  const characters = Array.from(text || "字");
  context.font = `900 ${fontSize}px ${fontFamily}`;
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  const widths = characters.map((character) => context.measureText(character).width);
  const total =
    widths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, characters.length - 1) * spacing;
  return {
    characters,
    widths,
    total,
    startX: VIEW_WIDTH / 2 - total / 2,
  };
}

function drawLetteredText(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  spacing: number,
  fontFamily: string,
) {
  const layout = letteredTextLayout(
    context,
    text,
    fontSize,
    spacing,
    fontFamily,
  );
  let x = layout.startX;
  for (let index = 0; index < layout.characters.length; index += 1) {
    context.fillText(layout.characters[index], x, 266);
    x += layout.widths[index] + spacing;
  }
}

async function loadImage(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

function drawDecoration(
  context: CanvasRenderingContext2D,
  item: Decoration,
  images: Map<string, HTMLImageElement>,
  fontFamily: string,
) {
  context.save();
  context.translate(item.x, item.y);
  context.rotate((item.rotation * Math.PI) / 180);
  context.scale(item.scale, item.scale);
  context.fillStyle = "#000";
  context.strokeStyle = "#000";
  if (item.kind === "star") drawStar(context);
  if (item.kind === "flame") drawFlame(context);
  if (item.kind === "heart") drawHeart(context);
  if (item.kind === "computer") drawComputer(context);
  if (item.kind === "burst") drawBurst(context);
  if (isCuteDecorationKind(item.kind)) {
    drawCuteDecoration(context, item.kind);
  }
  if (item.kind === "wordmark") {
    context.font = `italic 900 48px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("ccneed", 0, 0);
  }
  if (item.kind === "custom" && item.src) {
    const image = images.get(item.src);
    if (image) context.drawImage(image, -55, -55, 110, 110);
  }
  context.restore();
}

type MaskBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function createMaskCanvas(scale: number, bounds: MaskBounds) {
  const originX = Math.floor(bounds.x);
  const originY = Math.floor(bounds.y);
  const maxX = Math.ceil(bounds.x + bounds.width);
  const maxY = Math.ceil(bounds.y + bounds.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((maxX - originX) * scale));
  canvas.height = Math.max(1, Math.round((maxY - originY) * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法创建模型画布");
  context.scale(scale, scale);
  context.translate(-originX, -originY);
  return { canvas, context, originX, originY };
}

function createPreviewMeshes(
  parts: ModelPart[],
  palette: Palette,
  widthMm: number,
): PreviewMesh[] {
  const bounds = pathsBounds(parts[0].paths);
  const colors = [palette.base, palette.shadow, palette.face, palette.accent];
  return parts.map((part) => ({
    name: part.name,
    color: colors[part.colorIndex],
    ...meshForPaths(part.paths, part.z0, part.z1, bounds, widthMm),
  }));
}

export function ModelEditor() {
  const [text, setText] = useState("救火圣手");
  const [fontSize, setFontSize] = useState(164);
  const [letterSpacing, setLetterSpacing] = useState(-10);
  const [widthMm, setWidthMm] = useState(140);
  const [palette, setPalette] = useState<Palette>(PRESETS.rescue);
  const [layers, setLayers] = useState<LayerSettings>({
    base: 3.2,
    shadow: 2.8,
    top: 3,
  });
  const [decorations, setDecorations] =
    useState<Decoration[]>(DEFAULT_DECORATIONS);
  const [selectedId, setSelectedId] = useState<string | null>("logo-ccneed");
  const [exportState, setExportState] = useState<
    "idle" | "working" | "done" | "error"
  >("idle");
  const [exportMessage, setExportMessage] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "3d">("3d");
  const [assetCategory, setAssetCategory] =
    useState<AssetCategory>("cute");
  const [previewMeshes, setPreviewMeshes] = useState<PreviewMesh[]>([]);
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "working" | "ready" | "error"
  >("working");
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewRevision, setPreviewRevision] = useState(0);
  const [estimatedHeight, setEstimatedHeight] = useState(58);
  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<SVGGElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    id: string;
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const selected = useMemo(
    () => decorations.find((item) => item.id === selectedId) || null,
    [decorations, selectedId],
  );
  const totalHeight = layers.base + layers.shadow + layers.top;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!contentRef.current) return;
      const bounds = contentRef.current.getBBox();
      const outlinedWidth = bounds.width + 44;
      const outlinedHeight = bounds.height + 44;
      setEstimatedHeight(
        Math.max(30, (widthMm * outlinedHeight) / Math.max(1, outlinedWidth)),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [text, fontSize, letterSpacing, widthMm, decorations]);

  function addDecoration(kind: DecorationKind, tone: Tone) {
    const count = decorations.length;
    let suffix = count;
    let id = `${kind}-${suffix}`;
    while (decorations.some((item) => item.id === id)) {
      suffix += 1;
      id = `${kind}-${suffix}`;
    }
    const next: Decoration = {
      id,
      kind,
      name:
        kind === "wordmark"
          ? "ccneed 字标"
          : PALETTE_ITEMS.find((item) => item.kind === kind)?.label || "装饰",
      x: count % 2 === 0 ? 152 : 846,
      y: 116 + ((count * 37) % 190),
      scale: kind === "wordmark" ? 1 : 0.82,
      rotation: count % 2 === 0 ? -8 : 8,
      tone,
    };
    setDecorations((items) => [...items, next]);
    setSelectedId(next.id);
  }

  function updateSelected(patch: Partial<Decoration>) {
    if (!selectedId) return;
    setDecorations((items) =>
      items.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)),
    );
  }

  function deleteSelected() {
    if (!selectedId) return;
    setDecorations((items) => items.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  }

  function pointerDown(
    event: React.PointerEvent<SVGGElement>,
    item: Decoration,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    dragRef.current = {
      id: item.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: item.x,
      startY: item.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg) return;
    const bounds = svg.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.pointerX) / bounds.width) * VIEW_WIDTH;
    const deltaY = ((event.clientY - drag.pointerY) / bounds.height) * VIEW_HEIGHT;
    setDecorations((items) =>
      items.map((item) =>
        item.id === drag.id
          ? {
              ...item,
              x: Math.max(30, Math.min(VIEW_WIDTH - 30, drag.startX + deltaX)),
              y: Math.max(30, Math.min(VIEW_HEIGHT - 30, drag.startY + deltaY)),
            }
          : item,
      ),
    );
  }

  function stopPointer() {
    dragRef.current = null;
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    if (file.size > 2_000_000) {
      setExportState("error");
      setExportMessage("请上传 2 MB 以内的 SVG 或透明 PNG");
      return;
    }
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const next: Decoration = {
      id: `custom-${Date.now()}`,
      kind: "custom",
      name: file.name.replace(/\.[^.]+$/, "") || "自定义图案",
      x: 820,
      y: 105,
      scale: 0.9,
      rotation: 0,
      tone: "shadow",
      src: source,
    };
    setDecorations((items) => [...items, next]);
    setSelectedId(next.id);
  }

  const buildMasks = useCallback(async () => {
    await document.fonts.ready;
    const customSources = decorations
      .filter((item) => item.kind === "custom" && item.src)
      .map((item) => item.src as string);
    const images = new Map<string, HTMLImageElement>();
    await Promise.all(
      customSources.map(async (source) => {
        images.set(source, await loadImage(source));
      }),
    );
    const fontFamily =
      getComputedStyle(svgRef.current || document.body).fontFamily ||
      '"Noto Sans SC", sans-serif';

    const renderMask = (
      bounds: MaskBounds,
      paint: (context: CanvasRenderingContext2D) => void,
    ) => {
      const { canvas, context, originX, originY } = createMaskCanvas(
        MASK_SCALE,
        bounds,
      );
      context.fillStyle = "#000";
      context.strokeStyle = "#000";
      paint(context);
      return rgbaMask(
        context,
        canvas.width,
        canvas.height,
        MASK_SCALE,
        originX,
        originY,
      );
    };

    const measurementCanvas = document.createElement("canvas");
    const measurementContext = measurementCanvas.getContext("2d");
    if (!measurementContext) {
      throw new Error("当前浏览器无法测量文字轮廓");
    }
    const textLayout = letteredTextLayout(
      measurementContext,
      text,
      fontSize,
      letterSpacing,
      fontFamily,
    );
    const textPadding = Math.max(6, fontSize * 0.06);
    const textMask = renderMask(
      {
        x: textLayout.startX - textPadding,
        y: 266 - fontSize * 1.08 - textPadding,
        width: textLayout.total + textPadding * 2,
        height: fontSize * 1.36 + textPadding * 2,
      },
      (context) => {
        drawLetteredText(
          context,
          text,
          fontSize,
          letterSpacing,
          fontFamily,
        );
      },
    );

    const masksByTone: Record<Tone, RasterMask[]> = {
      face: [textMask],
      accent: [],
      shadow: [],
    };
    decorations.forEach((item) => {
      const localRadius =
        item.kind === "wordmark"
          ? 112
          : item.kind === "custom"
            ? 88
            : 84;
      const radius = localRadius * item.scale + 6;
      const decorationMask = renderMask(
        {
          x: item.x - radius,
          y: item.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
        (context) => {
          drawDecoration(context, item, images, fontFamily);
        },
      );
      masksByTone[item.tone].push(decorationMask);
    });

    return {
      face: masksByTone.face,
      accent: masksByTone.accent,
      shadow: masksByTone.shadow,
    };
  }, [decorations, fontSize, letterSpacing, text]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setPreviewStatus("working");
        setPreviewMessage("");
      }
      void (async () => {
        try {
          const masks = await buildMasks();
          const parts = createModelParts(masks, layers);
          const meshes = createPreviewMeshes(parts, palette, widthMm);
          if (cancelled) return;
          setPreviewMeshes(meshes);
          setPreviewStatus("ready");
        } catch (error) {
          if (cancelled) return;
          setPreviewStatus("error");
          setPreviewMessage(
            error instanceof Error
              ? error.message
              : "3D 模型生成失败，请减少复杂图案后重试",
          );
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [buildMasks, layers, palette, previewRevision, widthMm]);

  async function export3mf(colorMode: ThreeMfColorMode) {
    setExportState("working");
    setExportMessage("正在计算轮廓和闭合实体…");
    try {
      const masks = await buildMasks();
      const parts = createModelParts(masks, layers);
      const meshes = createPreviewMeshes(parts, palette, widthMm);

      const blob = create3mfBlob(text, parts, palette, widthMm, colorMode);
      setPreviewMeshes(meshes);
      setPreviewStatus("ready");
      const safeName = (text || "文字花模型").replace(/[\\/:*?"<>|]/g, "-");
      const suffix =
        colorMode === "clean" ? "Bambu纯净分件" : "标准颜色提示";
      downloadBlob(blob, `${safeName}-${suffix}.3mf`);
      setExportState("done");
      setExportMessage(
        colorMode === "clean"
          ? "已生成不含耗材配置的闭合分件 3MF，请在 Bambu Studio 中按色区指定现有耗材"
          : "已生成标准颜色提示；新版 Bambu Studio 可能询问映射并追加临时自定义耗材",
      );
    } catch (error) {
      setExportState("error");
      setExportMessage(
        error instanceof Error ? error.message : "模型生成失败，请减少复杂图案后重试",
      );
    }
  }

  function exportSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(".editor-hit-layer").forEach((node) => node.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml",
    });
    downloadBlob(blob, `${text || "文字花模型"}-预览.svg`);
  }

  function resetExample() {
    setText("救火圣手");
    setFontSize(164);
    setLetterSpacing(-10);
    setWidthMm(140);
    setPalette(PRESETS.rescue);
    setLayers({ base: 3.2, shadow: 2.8, top: 3 });
    setDecorations(DEFAULT_DECORATIONS);
    setSelectedId("logo-ccneed");
    setExportState("idle");
    setExportMessage("");
    setViewMode("3d");
    setAssetCategory("cute");
  }

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            字
          </div>
          <div>
            <p className="eyebrow">TEXT BLOOM LAB</p>
            <h1>字花模型编辑器</h1>
          </div>
        </div>
        <div className="header-actions">
          <span className="source-badge">
            <span aria-hidden="true">●</span> 3D 与 3MF 同源
          </span>
          <button className="button button-quiet" type="button" onClick={resetExample}>
            <RotateCcw size={16} aria-hidden="true" />
            恢复示例
          </button>
        </div>
      </header>

      <section className="studio-grid">
        <aside className="tool-panel left-panel" aria-label="内容与装饰">
          <div className="panel-section">
            <div className="section-heading">
              <span>01</span>
              <h2>文字内容</h2>
            </div>
            <label className="field-label" htmlFor="model-text">
              主文字
            </label>
            <input
              id="model-text"
              className="text-input"
              value={text}
              maxLength={10}
              onChange={(event) => setText(event.target.value)}
            />
            <div className="range-stack">
              <label>
                <span>
                  字号 <strong>{fontSize}</strong>
                </span>
                <input
                  type="range"
                  min="105"
                  max="205"
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                />
              </label>
              <label>
                <span>
                  字距 <strong>{letterSpacing}</strong>
                </span>
                <input
                  type="range"
                  min="-28"
                  max="18"
                  value={letterSpacing}
                  onChange={(event) => setLetterSpacing(Number(event.target.value))}
                />
              </label>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-heading">
              <span>02</span>
              <h2>装饰素材</h2>
            </div>
            <div
              className="asset-tabs"
              role="tablist"
              aria-label="装饰素材分类"
            >
              {(
                [
                  [
                    "cute",
                    "可爱上新",
                    CUTE_DECORATION_KINDS.length,
                  ],
                  [
                    "classic",
                    "经典",
                    PALETTE_ITEMS.filter(
                      (item) => item.category === "classic",
                    ).length,
                  ],
                ] as Array<[AssetCategory, string, number]>
              ).map(([category, label, count]) => (
                <button
                  className={assetCategory === category ? "is-active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={assetCategory === category}
                  onClick={() => setAssetCategory(category)}
                  key={category}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <div className="asset-grid" role="tabpanel">
              {PALETTE_ITEMS.filter(
                (item) => item.category === assetCategory,
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className="asset-button"
                    type="button"
                    key={item.kind}
                    aria-label={`添加${item.label}`}
                    onClick={() => addDecoration(item.kind, item.tone)}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <input
              ref={uploadRef}
              type="file"
              accept=".svg,.png,image/svg+xml,image/png"
              hidden
              onChange={(event) => {
                void handleUpload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <button
              className="upload-button"
              type="button"
              onClick={() => uploadRef.current?.click()}
            >
              <ImagePlus size={18} aria-hidden="true" />
              上传 ccneed Logo / 自定义 SVG
            </button>
            <p className="helper-copy">
              建议使用轮廓清晰的单色 SVG 或透明 PNG，导出时会自动转为当前色区。
            </p>
          </div>
        </aside>

        <section className="canvas-column" aria-label="模型画布">
          <div className="canvas-toolbar">
            <div>
              <span className="canvas-kicker">实时模型</span>
              <strong>
                {widthMm.toFixed(0)} × {estimatedHeight.toFixed(0)} ×{" "}
                {totalHeight.toFixed(1)} mm
              </strong>
            </div>
            <div className="view-switch" role="group" aria-label="画布显示模式">
              <button
                type="button"
                className={viewMode === "edit" ? "is-active" : ""}
                aria-pressed={viewMode === "edit"}
                onClick={() => setViewMode("edit")}
              >
                <PencilRuler size={15} aria-hidden="true" />
                2D 排版
              </button>
              <button
                type="button"
                className={viewMode === "3d" ? "is-active" : ""}
                aria-pressed={viewMode === "3d"}
                onClick={() => setViewMode("3d")}
              >
                <Box size={15} aria-hidden="true" />
                3D 模型
              </button>
            </div>
          </div>

          <div className={`model-stage is-${viewMode}`}>
            <div className="stage-grid" aria-hidden="true" />
            <svg
              ref={svgRef}
              className={`model-canvas ${viewMode === "edit" ? "is-active" : ""}`}
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              role="img"
              aria-hidden={viewMode !== "edit"}
              aria-label={`${text}文字花钥匙牌模型预览`}
              onPointerMove={pointerMove}
              onPointerUp={stopPointer}
              onPointerCancel={stopPointer}
              onPointerDown={() => setSelectedId(null)}
            >
              <defs>
                <filter
                  id="base-expand"
                  x="-100"
                  y="-100"
                  width="1200"
                  height="620"
                  filterUnits="userSpaceOnUse"
                >
                  <feMorphology
                    in="SourceAlpha"
                    operator="dilate"
                    radius="22"
                    result="expanded"
                  />
                  <feFlood floodColor={palette.base} result="color" />
                  <feComposite in="color" in2="expanded" operator="in" />
                </filter>
                <filter
                  id="shadow-expand"
                  x="-100"
                  y="-100"
                  width="1200"
                  height="620"
                  filterUnits="userSpaceOnUse"
                >
                  <feMorphology
                    in="SourceAlpha"
                    operator="dilate"
                    radius="14"
                    result="expanded"
                  />
                  <feFlood floodColor={palette.shadow} result="color" />
                  <feComposite in="color" in2="expanded" operator="in" />
                </filter>
                <filter
                  id="rim-expand"
                  x="-100"
                  y="-100"
                  width="1200"
                  height="620"
                  filterUnits="userSpaceOnUse"
                >
                  <feMorphology
                    in="SourceAlpha"
                    operator="dilate"
                    radius="7"
                    result="expanded"
                  />
                  <feFlood floodColor={palette.base} result="color" />
                  <feComposite in="color" in2="expanded" operator="in" />
                </filter>
                <g id="face-content" ref={contentRef}>
                  <text
                    x={VIEW_WIDTH / 2}
                    y="266"
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight="900"
                    letterSpacing={letterSpacing}
                    fill={palette.face}
                  >
                    {text || "字"}
                  </text>
                  {decorations.map((item) => (
                    <DecorationArtwork
                      key={item.id}
                      item={item}
                      palette={palette}
                    />
                  ))}
                </g>
              </defs>

              <g transform="translate(0 16)" className="layer-depth base-depth">
                <use href="#face-content" filter="url(#base-expand)" />
              </g>
              <g transform="translate(0 10)" className="layer-depth shadow-depth">
                <use href="#face-content" filter="url(#shadow-expand)" />
              </g>
              <g transform="translate(0 4)" className="layer-depth rim-depth">
                <use href="#face-content" filter="url(#rim-expand)" />
              </g>
              <use href="#face-content" className="face-layer" />

              <g className="editor-hit-layer">
                {decorations.map((item) => (
                  <DecorationHitArea
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    onPointerDown={(event) => pointerDown(event, item)}
                  />
                ))}
              </g>
            </svg>
            {viewMode === "3d" && (
              <div className="model-viewport-layer">
                <Suspense
                  fallback={
                    <div className="viewport-bootstrap" role="status">
                      <span className="viewport-spinner" aria-hidden="true" />
                      正在载入 3D 引擎…
                    </div>
                  }
                >
                  <ModelViewport
                    meshes={previewMeshes}
                    status={previewStatus}
                    errorMessage={previewMessage}
                    modelLabel={text || "文字花模型"}
                    onRetry={() => setPreviewRevision((value) => value + 1)}
                  />
                </Suspense>
              </div>
            )}
          </div>

          <div className="stage-mode-note" aria-live="polite">
            <span
              className={`model-sync-dot is-${previewStatus}`}
              aria-hidden="true"
            />
            {viewMode === "3d"
              ? previewStatus === "ready"
                ? "当前 3D 网格就是下载 3MF 使用的闭合网格"
                : "正在把当前排版重建为可旋转闭合网格"
              : "在 2D 画布拖动图案，切回 3D 查看真实厚度"}
          </div>

          <div className="palette-strip">
            <span>配色方案</span>
            <div className="preset-buttons">
              <button type="button" onClick={() => setPalette(PRESETS.rescue)}>
                救火橙蓝
              </button>
              <button type="button" onClick={() => setPalette(PRESETS.candy)}>
                糖果粉蓝
              </button>
              <button type="button" onClick={() => setPalette(PRESETS.night)}>
                夜班霓虹
              </button>
            </div>
            <div className="color-row" aria-label="自定义四色">
              {(
                [
                  ["base", "底层"],
                  ["shadow", "阴影"],
                  ["face", "文字"],
                  ["accent", "强调"],
                ] as Array<[keyof Palette, string]>
              ).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="color"
                    value={palette[key]}
                    onChange={(event) =>
                      setPalette((colors) => ({
                        ...colors,
                        [key]: event.target.value,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <aside className="tool-panel right-panel" aria-label="模型参数">
          <div className="panel-section inspector-section">
            <div className="section-heading">
              <span>03</span>
              <h2>选中图案</h2>
            </div>
            {selected ? (
              <>
                <div className="selected-title">
                  <span>{selected.name}</span>
                  <button
                    type="button"
                    aria-label={`删除${selected.name}`}
                    onClick={deleteSelected}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
                <div className="range-stack compact">
                  <label>
                    <span>
                      水平 <strong>{Math.round(selected.x)}</strong>
                    </span>
                    <input
                      type="range"
                      min="30"
                      max="970"
                      value={selected.x}
                      onChange={(event) =>
                        updateSelected({ x: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>
                      垂直 <strong>{Math.round(selected.y)}</strong>
                    </span>
                    <input
                      type="range"
                      min="30"
                      max="390"
                      value={selected.y}
                      onChange={(event) =>
                        updateSelected({ y: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>
                      大小 <strong>{selected.scale.toFixed(2)}×</strong>
                    </span>
                    <input
                      type="range"
                      min="0.35"
                      max="2.1"
                      step="0.01"
                      value={selected.scale}
                      onChange={(event) =>
                        updateSelected({ scale: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>
                      旋转 <strong>{Math.round(selected.rotation)}°</strong>
                    </span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={selected.rotation}
                      onChange={(event) =>
                        updateSelected({ rotation: Number(event.target.value) })
                      }
                    />
                  </label>
                </div>
                <fieldset className="tone-switch">
                  <legend>色区</legend>
                  {(
                    [
                      ["face", "文字色"],
                      ["accent", "强调色"],
                      ["shadow", "阴影色"],
                    ] as Array<[Tone, string]>
                  ).map(([tone, label]) => (
                    <label key={tone}>
                      <input
                        type="radio"
                        name="tone"
                        checked={selected.tone === tone}
                        onChange={() => updateSelected({ tone })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
              </>
            ) : (
              <div className="empty-inspector">
                <Upload size={22} aria-hidden="true" />
                <p>点选或拖动一个装饰图案后，可在这里精确调整。</p>
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-heading">
              <span>04</span>
              <h2>打印参数</h2>
            </div>
            <label className="number-field">
              <span>模型宽度</span>
              <div>
                <input
                  type="number"
                  min="60"
                  max="220"
                  value={widthMm}
                  onChange={(event) => setWidthMm(Number(event.target.value))}
                />
                <em>mm</em>
              </div>
            </label>
            <div className="layer-grid">
              {(
                [
                  ["base", "底层"],
                  ["shadow", "阴影"],
                  ["top", "面层"],
                ] as Array<[keyof LayerSettings, string]>
              ).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    min="0.8"
                    max="8"
                    step="0.1"
                    value={layers[key]}
                    onChange={(event) =>
                      setLayers((values) => ({
                        ...values,
                        [key]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="model-summary">
              <span>装配结构</span>
              <strong>闭合实体 · 独立四色分件</strong>
              <small>
                {decorations.length} 个装饰 · 总厚 {totalHeight.toFixed(1)} mm
              </small>
            </div>
          </div>

          <div className="export-stack">
            <button
              className="button button-primary"
              type="button"
              disabled={exportState === "working"}
              onClick={() => void export3mf("clean")}
            >
              <Download size={18} aria-hidden="true" />
              {exportState === "working" ? "正在生成…" : "下载 Bambu 纯净 3MF"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={exportState === "working"}
              onClick={() => void export3mf("standard")}
            >
              <Download size={17} aria-hidden="true" />
              下载带颜色提示 3MF
            </button>
            <p className="export-note">
              推荐纯净版：保留独立色区，但不写入会触发颜色映射的 Materials 资源，也不内嵌耗材配置。
            </p>
            <button className="button button-secondary" type="button" onClick={exportSvg}>
              <FileDown size={17} aria-hidden="true" />
              导出 SVG 预览
            </button>
            {exportMessage && (
              <p
                className={`export-message ${exportState === "error" ? "is-error" : ""}`}
                role="status"
              >
                {exportMessage}
              </p>
            )}
          </div>
        </aside>
      </section>

      <footer className="studio-footer">
        <span>字体、图案与色区都在浏览器本地计算</span>
        <span>建议首次打印前在 Bambu Studio 中检查耗材映射与缩放</span>
      </footer>
    </main>
  );
}
