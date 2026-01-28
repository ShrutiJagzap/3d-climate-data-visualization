// roiEdges.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";

export function createROIEdges(ROI) {
  const positions = [];

  const corners = [
    [ROI.minLon, ROI.minLat, ROI.minHeight],
    [ROI.maxLon, ROI.minLat, ROI.minHeight],
    [ROI.maxLon, ROI.maxLat, ROI.minHeight],
    [ROI.minLon, ROI.maxLat, ROI.minHeight],
    [ROI.minLon, ROI.minLat, ROI.maxHeight],
    [ROI.maxLon, ROI.minLat, ROI.maxHeight],
    [ROI.maxLon, ROI.maxLat, ROI.maxHeight],
    [ROI.minLon, ROI.maxLat, ROI.maxHeight]
  ].map(c => Cesium.Cartesian3.fromDegrees(c[0], c[1], c[2]));

  const edges = [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7]
  ];

  for (const [a,b] of edges) {
    positions.push(corners[a].x, corners[a].y, corners[a].z);
    positions.push(corners[b].x, corners[b].y, corners[b].z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,   // 🔑 critical
    depthTest: true
  });

  return new THREE.LineSegments(geometry, material);
}
