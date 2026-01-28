// js/threeOverlay.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";

export class ThreeOverlay {
  constructor(viewer) {
    this.viewer = viewer;

    // THREE scene
    this.scene = new THREE.Scene();

    // THREE camera (will be synced)
    this.camera = new THREE.PerspectiveCamera();

    // THREE renderer (transparent, over Cesium)
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(
      viewer.canvas.clientWidth,
      viewer.canvas.clientHeight
    );
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.top = "0";
    this.renderer.domElement.style.pointerEvents = "none";

    viewer.container.appendChild(this.renderer.domElement);

    // Resize handling
    window.addEventListener("resize", () => {
      this.renderer.setSize(
        viewer.canvas.clientWidth,
        viewer.canvas.clientHeight
      );
    });

    // Render loop hook
    viewer.scene.postRender.addEventListener(() => {
      this.syncCamera();
      this.render();
    });
  }

  syncCamera() {
    const cesiumCamera = this.viewer.camera;

    const cvm = cesiumCamera.viewMatrix;
    const civm = cesiumCamera.inverseViewMatrix;

    this.camera.matrixWorld.set(
      civm[0], civm[4], civm[8],  civm[12],
      civm[1], civm[5], civm[9],  civm[13],
      civm[2], civm[6], civm[10], civm[14],
      civm[3], civm[7], civm[11], civm[15]
    );

    this.camera.matrixWorldInverse.set(
      cvm[0], cvm[4], cvm[8],  cvm[12],
      cvm[1], cvm[5], cvm[9],  cvm[13],
      cvm[2], cvm[6], cvm[10], cvm[14],
      cvm[3], cvm[7], cvm[11], cvm[15]
    );

    this.camera.projectionMatrix.fromArray(
      cesiumCamera.frustum.projectionMatrix
    );

    this.camera.matrixAutoUpdate = false;
    this.camera.matrixWorldInverseNeedsUpdate = false;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
