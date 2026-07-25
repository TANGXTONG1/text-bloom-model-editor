"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointer2, Pause, Play, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  geometryFromMesh,
  type PreviewGeometryMesh,
} from "./preview-geometry";

export type PreviewMesh = PreviewGeometryMesh & {
  name: string;
  color: string;
};

type ViewportRuntime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  modelGroup: THREE.Group;
  homePosition: THREE.Vector3;
  frame: number;
};

type ModelViewportProps = {
  meshes: PreviewMesh[];
  status: "idle" | "working" | "ready" | "error";
  errorMessage: string;
  modelLabel: string;
  onRetry: () => void;
};

function disposeModel(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    if (!(child instanceof THREE.Mesh)) continue;
    child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else {
      child.material.dispose();
    }
  }
}

export function ModelViewport({
  meshes,
  status,
  errorMessage,
  modelLabel,
  onRetry,
}: ModelViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ViewportRuntime | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rendererError, setRendererError] = useState("");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      const timer = window.setTimeout(
        () => setRendererError("当前浏览器无法启动 WebGL 3D 视窗"),
        0,
      );
      return () => window.clearTimeout(timer);
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xfffbf5, 260, 620);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI - 0.08;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd7b6a2, 2.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(-90, 130, 220);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8ed8e5, 1.15);
    fillLight.position.set(150, -90, 90);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(320, 32, 0x8ab9c1, 0xd7e5e3);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -3;
    const gridMaterials = Array.isArray(grid.material)
      ? grid.material
      : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.34;
    });
    scene.add(grid);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const runtime: ViewportRuntime = {
      scene,
      camera,
      renderer,
      controls,
      modelGroup,
      homePosition: new THREE.Vector3(120, 80, 220),
      frame: 0,
    };
    runtimeRef.current = runtime;

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const renderFrame = () => {
      controls.update();
      renderer.render(scene, camera);
      runtime.frame = window.requestAnimationFrame(renderFrame);
    };
    renderFrame();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(runtime.frame);
      controls.dispose();
      disposeModel(modelGroup);
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const { modelGroup, camera, controls } = runtime;
    disposeModel(modelGroup);
    modelGroup.position.set(0, 0, 0);

    meshes.forEach((meshData, index) => {
      const geometry = geometryFromMesh(meshData);
      const material = new THREE.MeshStandardMaterial({
        color: meshData.color,
        roughness: 0.58,
        metalness: 0.015,
        flatShading: true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -index * 0.04,
      });
      const modelMesh = new THREE.Mesh(geometry, material);
      modelMesh.name = meshData.name;
      modelGroup.add(modelMesh);
    });

    if (!meshes.length) return;

    const bounds = new THREE.Box3().setFromObject(modelGroup);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    modelGroup.position.set(-center.x, -center.y, -center.z);

    const span = Math.max(size.x, size.y, size.z * 4, 36);
    const distance = span * 1.55;
    runtime.homePosition.set(distance * 0.54, distance * 0.34, distance);
    camera.position.copy(runtime.homePosition);
    camera.near = Math.max(0.1, span / 300);
    camera.far = distance * 8;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = span * 0.55;
    controls.maxDistance = span * 5;
    controls.update();
  }, [meshes]);

  useEffect(() => {
    if (runtimeRef.current) {
      runtimeRef.current.controls.autoRotate = autoRotate;
      runtimeRef.current.controls.autoRotateSpeed = 1.25;
    }
  }, [autoRotate]);

  function resetView() {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.camera.position.copy(runtime.homePosition);
    runtime.controls.target.set(0, 0, 0);
    runtime.controls.update();
  }

  const visibleError = rendererError || (status === "error" ? errorMessage : "");

  return (
    <div
      className="three-viewport"
      role="img"
      aria-label={`${modelLabel}的可旋转三维模型预览`}
    >
      <div ref={mountRef} className="three-canvas-mount" />

      <div className="viewport-toolbar" aria-label="三维视图控制">
        <button type="button" onClick={resetView}>
          <RotateCcw size={16} aria-hidden="true" />
          回正
        </button>
        <button
          type="button"
          aria-pressed={autoRotate}
          onClick={() => setAutoRotate((value) => !value)}
        >
          {autoRotate ? (
            <Pause size={16} aria-hidden="true" />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}
          {autoRotate ? "停止旋转" : "自动旋转"}
        </button>
      </div>

      <div className="viewport-gesture-hint">
        <MousePointer2 size={15} aria-hidden="true" />
        拖动旋转 · 滚轮或双指缩放
      </div>

      {status === "working" && (
        <div className="viewport-status is-working" role="status">
          <span className="viewport-spinner" aria-hidden="true" />
          正在重建同源网格…
        </div>
      )}

      {visibleError && (
        <div className="viewport-error" role="alert">
          <strong>3D 预览暂不可用</strong>
          <span>{visibleError}</span>
          {!rendererError && (
            <button type="button" onClick={onRetry}>
              重新生成
            </button>
          )}
        </div>
      )}
    </div>
  );
}
