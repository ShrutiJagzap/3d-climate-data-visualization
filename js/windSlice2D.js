import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";
import { sampleWind3D } from "./windSampler3D.js";

export class WindSlice2D {
  constructor(overlay, windField, ROI) {
    this.overlay = overlay;
    this.windField = windField;
    this.ROI = ROI;

    this.count = 6000;
    this.positions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      this.seed(i);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );

    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 60000,
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, this.material);
    overlay.scene.add(this.points);
  }

  seed(i) {
    const R = this.ROI;
    const lon = R.minLon + Math.random() * (R.maxLon - R.minLon);
    const lat = R.minLat + Math.random() * (R.maxLat - R.minLat);
    const h = R.minHeight + 200;

    const cart = Cesium.Cartesian3.fromDegrees(lon, lat, h);
    const idx = i * 3;
    this.positions[idx] = cart.x;
    this.positions[idx + 1] = cart.y;
    this.positions[idx + 2] = cart.z;

    this.pointsData ??= [];
    this.pointsData[i] = { lon, lat };
  }

  update() {
    for (let i = 0; i < this.count; i++) {
      const p = this.pointsData[i];

      const wind = sampleWind3D(
        this.windField,
        this.ROI,
        p.lat,
        p.lon,
        this.ROI.minHeight + 200
      );

      if (!wind) {
        this.seed(i);
        continue;
      }

      p.lat += wind.v * 0.02;
      p.lon += wind.u * 0.02;

      const cart = Cesium.Cartesian3.fromDegrees(
        p.lon,
        p.lat,
        this.ROI.minHeight + 200
      );

      const idx = i * 3;
      this.positions[idx] = cart.x;
      this.positions[idx + 1] = cart.y;
      this.positions[idx + 2] = cart.z;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }

  setVisible(v) {
    this.points.visible = v;
  }
}
