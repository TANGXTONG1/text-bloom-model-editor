import * as THREE from "three";

export type PreviewGeometryMesh = {
  vertices: Array<[number, number, number]>;
  triangles: Array<[number, number, number]>;
};

export function geometryFromMesh(mesh: PreviewGeometryMesh) {
  const positions = new Float32Array(mesh.triangles.length * 9);
  let cursor = 0;

  mesh.triangles.forEach((triangle) => {
    triangle.forEach((vertexIndex) => {
      const [x, y, z] = mesh.vertices[vertexIndex];
      positions[cursor] = x;
      positions[cursor + 1] = y;
      positions[cursor + 2] = z;
      cursor += 3;
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
