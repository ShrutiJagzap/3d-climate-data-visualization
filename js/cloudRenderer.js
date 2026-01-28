// js/cloudRenderer.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";
import { cloudTransfer } from "./cloudTransfer.js";

export function renderCloudVolume(
  overlay,
  voxelGrid,
  roi,
  spacing,
  {
    layers = 60,
    layerSpacing = 700
  } = {}
) {
  const group = new THREE.Group();

  for (let z = 0; z < layers; z++) {
    const height = roi.minHeight + z * layerSpacing;

    for (let y = 0; y < voxelGrid.ny; y++) {
      for (let x = 0; x < voxelGrid.nx; x++) {
        const voxel = voxelGrid.get(x, y, 0);
        if (!voxel || voxel.cloudDensity <= 0) continue;

        const lon =
          roi.minLon + x * spacing.dLon + spacing.dLon * 0.5;
        const lat =
          roi.minLat + y * spacing.dLat + spacing.dLat * 0.5;

        const cart = Cesium.Cartesian3.fromDegrees(
          lon,
          lat,
          height
        );

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            spacing.dLon * 8000,
            spacing.dLat * 8000,
            layerSpacing * 0.9
          ),
          cloudTransfer(voxel.cloudDensity)
        );

        mesh.position.set(cart.x, cart.y, cart.z);
        group.add(mesh);
      }
    }
  }

  overlay.scene.add(group);
  return group;
}
