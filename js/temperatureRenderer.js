// js/temperatureRenderer.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";
import { temperatureTransfer } from "./temperatureTransfer.js";

export function renderTemperatureVolume(
  overlay,
  voxelGrid,
  ROI,
  voxelInfo,
  options = {}
) {
  const {
    layers = 1,          // more slices = more "filled" like KMA
    opacity = 0.08,       // per-slice opacity (accumulates)
    useAdditive = true,
    zLayer = 0            // temperature is mapped at z=0 only in your mapper
  } = options;

  // Remove previous volume
  if (overlay._tempVolumeGroup) {
    overlay.scene.remove(overlay._tempVolumeGroup);
    overlay._tempVolumeGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    overlay._tempVolumeGroup = null;
  }

  const group = new THREE.Group();
  overlay._tempVolumeGroup = group;
  overlay.scene.add(group);

  //Use your voxelGrid dimensions (VoxelGrid class)
  const nx = voxelGrid.nx;
  const ny = voxelGrid.ny;

  if (!nx || !ny) {
    console.warn("Temperature volume: voxelGrid empty or invalid VoxelGrid");
    return;
  }

  // ROI bounds
  const minLon = ROI.minLon;
  const maxLon = ROI.maxLon;
  const minLat = ROI.minLat;
  const maxLat = ROI.maxLat;

  // altitude range
  const minH = ROI.minHeight;
  const maxH = ROI.maxHeight;

  const totalH = maxH - minH;
  const stepH = totalH / layers;

  // Smoothness (subdivision)
  const segX = Math.min(40, nx - 1);
  const segY = Math.min(25, ny - 1);

  const baseGeo = new THREE.PlaneGeometry(1, 1, segX, segY);

  const baseMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 1.0,
    blending: useAdditive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide,
    vertexColors: true,
  });

  for (let i = 0; i < layers; i++) {
    const h = minH + i * stepH;

    const geom = baseGeo.clone();
    const pos = geom.attributes.position;

    const colors = new Float32Array(pos.count * 3);

    for (let v = 0; v < pos.count; v++) {
      // local plane coords => [0..1]
      const u = pos.getX(v) + 0.5;
      const t = pos.getY(v) + 0.5;

      const lon = minLon + u * (maxLon - minLon);
      const lat = minLat + t * (maxLat - minLat);

      // Sample temperature from your VoxelGrid (mapped at z=0)
      const tempK = sampleTempFromVoxelGrid(voxelGrid, ROI, voxelInfo, lat, lon, zLayer);

      const { r, g, b } = temperatureTransfer(tempK);

      const cidx = v * 3;
      colors[cidx] = r;
      colors[cidx + 1] = g;
      colors[cidx + 2] = b;

      // Warp this plane vertex onto the globe at altitude h
      const cart = Cesium.Cartesian3.fromDegrees(lon, lat, h);
      pos.setXYZ(v, cart.x, cart.y, cart.z);
    }

    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.attributes.position.needsUpdate = true;

    const mesh = new THREE.Mesh(geom, baseMat.clone());
    mesh.material.opacity = opacity;
    mesh.renderOrder = 60;

    group.add(mesh);
  }

  console.log(" Temperature Volume Rendered:", layers, "slices");
}

function sampleTempFromVoxelGrid(voxelGrid, ROI, voxelInfo, lat, lon, z = 0) {
  const { dLon, dLat } = voxelInfo;

  const x = Math.floor((lon - ROI.minLon) / dLon);
  const y = Math.floor((lat - ROI.minLat) / dLat);

  if (x < 0 || x >= voxelGrid.nx || y < 0 || y >= voxelGrid.ny) {
    return undefined;
  }

  const cell = voxelGrid.get(x, y, z);
  if (!cell) return undefined;

  // mapper stored { temperature }
  return cell.temperature;


}
