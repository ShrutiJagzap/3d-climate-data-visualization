// js/windParticles3D.js

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";
import { sampleWind3D } from "./windSampler3D.js";

export class WindParticles3D {
  constructor(overlay, windFieldAtTime, ROI) {
    this.overlay = overlay;
    this.viewer = overlay.viewer;
    this.windField = windFieldAtTime; // { surface, 850, 700, 500 }
    this.ROI = ROI;

    this.count = 3500;
    this.dt = 0.05;

    //  trail length
    this.trailLength = 18;

    //  Each particle gives (trailLength-1) segments
    this.segmentCountPerParticle = this.trailLength - 1;

    //  Each segment needs 2 points (A,B), each point has 3 floats
    this.floatsPerParticle =
      this.segmentCountPerParticle * 2 * 3;

    this.positions = new Float32Array(this.count * this.floatsPerParticle);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );

    this.material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });

    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.frustumCulled = false; //  important for globe
    this.overlay.scene.add(this.lines);

    this.particles = [];
    this.seedParticles();
  }

  setWindField(newWindFeild){
    this.windField = newWindFeild;

    //if wind data updated, re-seed particles so they appear instantly
    this.seedParticles();
  }

  seedParticles() {
    const levels = Object.keys(this.windField || {});

    if (!levels.length) {
      console.warn("WindParticles3D: No wind levels available yet");
      return;
    }

    this.particles = [];

    // cyclone / center region (change as you like)
    const centerLat = 20.5937;
    const centerLon = 78.9629;

    // radius size in degrees (bigger = spread more)
    const radiusDeg = 10;

    for (let i = 0; i < this.count; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const height = this.getHeightForLevel(level);

      // circular spawn (instead of full ROI random)
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radiusDeg;

      let lat = centerLat + r * Math.cos(angle);
      let lon = centerLon + r * Math.sin(angle);

      // Keep inside ROI (important)
      lat = Math.max(this.ROI.minLat, Math.min(this.ROI.maxLat, lat));
      lon = Math.max(this.ROI.minLon, Math.min(this.ROI.maxLon, lon));

      const trail = [];
      for (let t = 0; t < this.trailLength; t++) {
        trail.push({ lat, lon, height });
      }

      this.particles.push({ lat, lon, height, trail, level });
    }
  }


  getHeightForLevel(level) {
    const base = 200000;
    const map = {
      surface: base + 300000,
      850: base + 900000,
      700: base + 1500000,
      500: base + 2200000
    };
    return map[level] ?? (base +500000);
  }

  update() {
    if (!this.particles.length) return;

    const camera = this.viewer.camera;
    const topView = camera.pitch < -1.48;

    let ptr = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const wind = sampleWind3D(
        this.windField,
        this.ROI,
        p.lat,
        p.lon,
        p.height,
        // p.level
      );

      if(wind){
        const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);

        const maxSpeed = 40;
        let tSpeed = speed / maxSpeed;
        tSpeed = Math.max(0, Math.min(1, tSpeed));

        //blue -> red
        this.material.color.setHSL(0.66 - 0.66 * tSpeed, 1.0, 0.55);
      }
      
      if (!wind) {
        // respawn
        const centerLat = 20.5937;
        const centerLon = 78.9629;
        const radiusDeg = 10;

        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radiusDeg;

        p.lat = centerLat + r * Math.cos(angle);
        p.lon = centerLon + r * Math.sin(angle);

        //keep inside ROI
        p.lat = Math.max(this.ROI.minLat, Math.min(this.ROI.maxLat, p.lat));
        p.lon = Math.max(this.ROI.minLon, Math.min(this.ROI.maxLon, p.lon));

        p.height = this.getHeightForLevel(p.level);

        // reset trail
        for (let t = 0; t < this.trailLength; t++) {
          p.trail[t] = { lat: p.lat, lon: p.lon, height: p.height };
        }
      } else {
        // integrate motion
        p.lat += wind.v * this.dt * 0.2;
        p.lon += wind.u * this.dt * 0.2;

        if (!topView && wind.w !== undefined) {
          p.height += wind.w * this.dt;
        }
      }

      // update trail history
      p.trail.pop();
      p.trail.unshift({
        lat: p.lat,
        lon: p.lon,
        // height: p.height
        height: this.getHeightForLevel(p.level)
      });

      // build segments into buffer
      for (let t = 0; t < this.trailLength - 1; t++) {
        const a = p.trail[t];
        const b = p.trail[t + 1];

        const ca = Cesium.Cartesian3.fromDegrees(a.lon, a.lat, a.height);
        const cb = Cesium.Cartesian3.fromDegrees(b.lon, b.lat, b.height);

        // A
        this.positions[ptr++] = ca.x;
        this.positions[ptr++] = ca.y;
        this.positions[ptr++] = ca.z;

        // B
        this.positions[ptr++] = cb.x;
        this.positions[ptr++] = cb.y;
        this.positions[ptr++] = cb.z;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  setVisible(v) {
    this.lines.visible = v;
  }

  dispose() {
    this.overlay.scene.remove(this.lines);
    this.geometry.dispose();
    this.material.dispose();
  }
}

