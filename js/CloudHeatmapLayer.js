import { cloudTransfer } from "./cloudTransfer.js";

export class CloudHeatmapLayer {
  constructor(viewer, ROI) {
    this.viewer = viewer;
    this.ROI = ROI;

    this.layer = null;
    this.data = null;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    this.minC = 999999;
    this.maxC = -999999;
  }

  async setData(cloudData) {
    this.data = cloudData;

    if (
      !cloudData ||
      !Array.isArray(cloudData.lat) ||
      !Array.isArray(cloudData.lon) ||
      !Array.isArray(cloudData.cloud)
    ) {
      throw new Error("Invalid cloud format from backend");
    }

    this._buildCanvasTexture();
    this._applyAsCesiumLayer();
  }

  _buildCanvasTexture() {
    const W = 800;
    const H = 500;

    this.canvas.width = W;
    this.canvas.height = H;

    const img = this.ctx.createImageData(W, H);

    const latLen = this.data.lat.length;
    const lonLen = this.data.lon.length;

    this.minC = Infinity;
    this.maxC = -Infinity;

    for (let y = 0; y < H; y++) {
      const lat =
        this.ROI.maxLat -
        (y / (H - 1)) * (this.ROI.maxLat - this.ROI.minLat);

      //  fast lat index (no nearest search)
      let latIdx = Math.round(
        ((lat - this.ROI.minLat) / (this.ROI.maxLat - this.ROI.minLat)) *
          (latLen - 1)
      );
      latIdx = Math.max(0, Math.min(latLen - 1, latIdx));

      const row = this.data.cloud[latIdx];
      if (!row) continue;

      for (let x = 0; x < W; x++) {
        const lon =
          this.ROI.minLon +
          (x / (W - 1)) * (this.ROI.maxLon - this.ROI.minLon);

        let lonIdx = Math.round(
          ((lon - this.ROI.minLon) / (this.ROI.maxLon - this.ROI.minLon)) *
            (lonLen - 1)
        );
        lonIdx = Math.max(0, Math.min(lonLen - 1, lonIdx));

        const cVal = row[lonIdx];
        if (cVal == null) continue;

        this.minC = Math.min(this.minC, cVal);
        this.maxC = Math.max(this.maxC, cVal);

        const { r, g, b, a } = cloudTransfer(cVal);

        const idx = (y * W + x) * 4;
        img.data[idx] = (r * 255) | 0;
        img.data[idx + 1] = (g * 255) | 0;
        img.data[idx + 2] = (b * 255) | 0;
        img.data[idx + 3] = (a * 255) | 0;
      }
    }

    this.ctx.putImageData(img, 0, 0);
    // smooth cloud look
    this.ctx.filter = "blur(2px)";
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = "none";

  }
  _applyAsCesiumLayer() {
    if (this.layer) {
      this.viewer.imageryLayers.remove(this.layer, true);
      this.layer = null;
    }

    const rect = Cesium.Rectangle.fromDegrees(
      this.ROI.minLon,
      this.ROI.minLat,
      this.ROI.maxLon,
      this.ROI.maxLat
    );

    const provider = new Cesium.SingleTileImageryProvider({
      url: this.canvas.toDataURL("image/png"),
      rectangle: rect,
    });

    this.layer = this.viewer.imageryLayers.addImageryProvider(provider);
    this.layer.alpha = 0.85;
  }

  setVisible(v) {
    if (this.layer) this.layer.show = v;
  }

  getStats() {
    return {
      min: this.minC,
      max: this.maxC,
    };
  }

  _nearestIndex(arr, value) {
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const d = Math.abs(arr[i] - value);
      if (d < bestDiff) {
        bestDiff = d;
        best = i;
      }
    }
    return best;
  }

  sampleAt(lat, lon) {
    if (!this.data) return null;

    const latIdx = this._nearestIndex(this.data.lat, lat);
    const lonIdx = this._nearestIndex(this.data.lon, lon);

    const row = this.data.cloud[latIdx];
    if (!row) return null;

    return row[lonIdx] ?? null;
  }
}
