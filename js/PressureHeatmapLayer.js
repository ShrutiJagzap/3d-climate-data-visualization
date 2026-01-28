import { pressureTransfer } from "./pressureTransfer.js";

export class PressureHeatmapLayer {
  constructor(viewer, ROI) {
    this.viewer = viewer;
    this.ROI = ROI;

    this.layer = null;
    this.data = null;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    this.minP = 999999999;
    this.maxP = -999999999;
  }

  async setData(pressureData) {
    this.data = pressureData;

    if (
      !pressureData ||
      !Array.isArray(pressureData.lat) ||
      !Array.isArray(pressureData.lon) ||
      !Array.isArray(pressureData.pressure)
    ) {
      throw new Error("Invalid pressure format from backend");
    }

    this._buildCanvasTexture();
    this._applyAsCesiumLayer();
  }

  _buildCanvasTexture() {
    const W = 400;
    const H = 250;

    this.canvas.width = W;
    this.canvas.height = H;

    const img = this.ctx.createImageData(W, H);

    //1.find dataset min/max inside ROI
    this.minP = Infinity;
    this.maxP = -Infinity;

    for (let y = 0; y < H; y++) {
      const lat =
        this.ROI.maxLat -
        (y / (H - 1)) * (this.ROI.maxLat - this.ROI.minLat);
      const latIdx = this._nearestIndex(this.data.lat, lat);

      const row = this.data.pressure[latIdx];
      if (!row) continue;

      for (let x = 0; x < W; x++) {
        const lon =
          this.ROI.minLon +
          (x / (W - 1)) * (this.ROI.maxLon - this.ROI.minLon);
        const lonIdx = this._nearestIndex(this.data.lon, lon);

        const pPa = row[lonIdx];
        if (pPa == null || Number.isNaN(pPa)) continue;

        this.minP = Math.min(this.minP, pPa);
        this.maxP = Math.max(this.maxP, pPa);
      }
    }
        //2. paint colors using dataset min/max
    for(let y = 0; y< H; y++) {
      const lat = this.ROI.maxLat - (y / (H-1)) * (this.ROI.maxLat - this.ROI.minLat);
      const latIdx = this._nearestIndex(this.data.lat, lat);
      const row = this.data.pressure[latIdx];
      if (!row) continue;

      for (let x = 0; x < W; x++){
        const lon = this.ROI.minLon + (x / (W - 1) * (this.ROI.maxLon - this.ROI.minLon));
        const lonIdx = this._nearestIndex(this.data.lon, lon);

        const pPa = row[lonIdx];
        if (pPa == null || Number.isNaN(pPa)) continue;

        //dynamic color based on your real min/max
        const { r, g, b, a } = pressureTransfer(pPa, this.minP, this.maxP);

        const idx = (y * W + x) * 4;
        img.data[idx] = Math.floor(r * 255);
        img.data[idx + 1] = Math.floor(g * 255);
        img.data[idx + 2] = Math.floor(b * 255);
        img.data[idx + 3] = Math.floor(a * 255);
      }
    }
      
    this.ctx.putImageData(img, 0, 0);
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
    this.layer.alpha = 0.55;
  }

  setVisible(v) {
    if (this.layer) this.layer.show = v;
  }

  getStats() {
    if(!isFinite(this.minP) || !isFinite(this.maxP)) return null;
    return {
      // minHpa: this.minP,
      // maxHpa: this.maxP,
      minHpa: this.minP / 100,
      maxHpa: this.maxP / 100,
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

    const row = this.data.pressure[latIdx];
    if (!row) return null;

    return row[lonIdx] ?? null;
  }
}
