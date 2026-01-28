// js/pressureRenderer.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";
import { pressureTransfer } from "./pressureTransfer.js";

export function renderPressureVolume(
  overlay,
  voxelGrid,
  roi,
  spacing
) {
  const group = new THREE.Group();
  const height = roi.minHeight + 15000;

  for (let y = 0; y < voxelGrid.ny; y++) {
    for (let x = 0; x < voxelGrid.nx; x++) {
      const voxel = voxelGrid.get(x, y, 0);
      if (!voxel || voxel.pressure === undefined) continue;

      const lon =
        roi.minLon + x * spacing.dLon + spacing.dLon * 0.5;
      const lat =
        roi.minLat + y * spacing.dLat + spacing.dLat * 0.5;

      const cart = Cesium.Cartesian3.fromDegrees(
        lon,
        lat,
        height
      );

      const material = new THREE.MeshBasicMaterial({
        color: pressureTransfer(voxel.pressure),
        transparent: true,
        opacity: 0.18,
        depthTest: true,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          spacing.dLon * 9000,
          spacing.dLat * 9000,
          18000
        ),
        material
      );

      mesh.position.set(cart.x, cart.y, cart.z);
      group.add(mesh);
    }
  }

  overlay.scene.add(group);
  return group;
}
