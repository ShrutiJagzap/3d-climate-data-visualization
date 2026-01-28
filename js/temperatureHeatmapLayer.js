import { temperatureTransfer } from "./temperatureTransfer.js";

export class TemperatureHeatmapLayer {
  constructor(viewer, ROI) {
    this.viewer = viewer;
    this.ROI = ROI;

    this.layer = null;
    this.tempData = null;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    this.minK = 9999;
    this.maxK = -9999;
  }

  async setData(tempData) {
    this.tempData = tempData;

    // backend format check
    if (
      !tempData ||
      !Array.isArray(tempData.lat) ||
      !Array.isArray(tempData.lon) ||
      !Array.isArray(tempData.temp)
    ) {
      throw new Error("Invalid temperature format from backend");
    }

    this._buildCanvasTexture();
    this._applyAsCesiumLayer();
  }

  _buildCanvasTexture() {
    const latCount = this.tempData.lat.length;
    const lonCount = this.tempData.lon.length;

    // Canvas resolution = ROI grid density
    // (small canvas is fast, Cesium stretches it smoothly)
    const W = 400;
    const H = 250;

    this.canvas.width = W;
    this.canvas.height = H;

    const img = this.ctx.createImageData(W, H);

    this.minK = 9999;
    this.maxK = -9999;

    for (let y = 0; y < H; y++) {
      const lat = this.ROI.maxLat - (y / (H - 1)) * (this.ROI.maxLat - this.ROI.minLat);
      const latIdx = this._nearestIndex(this.tempData.lat, lat);

      const row = this.tempData.temp[latIdx];
      if (!row) continue;

      for (let x = 0; x < W; x++) {
        const lon = this.ROI.minLon + (x / (W - 1)) * (this.ROI.maxLon - this.ROI.minLon);
        const lonIdx = this._nearestIndex(this.tempData.lon, lon);

        const tempK = row[lonIdx];
        if (tempK == null) continue;

        this.minK = Math.min(this.minK, tempK);
        this.maxK = Math.max(this.maxK, tempK);

        const { r, g, b, a } = temperatureTransfer(tempK);

        const idx = (y * W + x) * 4;
        img.data[idx] = Math.floor(r * 255);
        img.data[idx + 1] = Math.floor(g * 255);
        img.data[idx + 2] = Math.floor(b * 255);

        // alpha makes it look like a layer on earth not full block
        img.data[idx + 3] = Math.floor((a > 0 ? 0.75 : 0.0) * 255);
      }
    }

    this.ctx.putImageData(img, 0, 0);
  }

  _applyAsCesiumLayer() {
    // remove old layer if exists
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
      rectangle: rect
    });

    this.layer = this.viewer.imageryLayers.addImageryProvider(provider);
    this.layer.alpha = 0.85;
  }

  getStats() {
    return {
      minK: this.minK,
      maxK: this.maxK,
      minC: this.minK - 273.15,
      maxC: this.maxK - 273.15
    };
  }

  // nearest index helper
  _nearestIndex(arr, value) {
    // binary search would be faster, but this works fine for now
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

  // returns temperature in Kelvin for tooltip
  sampleAt(lat, lon) {
    if (!this.tempData) return null;

    const latIdx = this._nearestIndex(this.tempData.lat, lat);
    const lonIdx = this._nearestIndex(this.tempData.lon, lon);

    const row = this.tempData.temp[latIdx];
    if (!row) return null;

    const tempK = row[lonIdx];
    return tempK ?? null;
  }

    setVisible(v) {
    if (this.layer) {
      this.layer.show = v;   // Cesium ImageryLayer visibility
    }
  }

}
