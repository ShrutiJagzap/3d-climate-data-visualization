// js/temperatureTransfer.js

export function temperatureTransfer(tempK) {
  // If undefined / null / NaN
  if (tempK === undefined || tempK === null || Number.isNaN(tempK)) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  //  Realistic atmosphere range:
  // 200K ~ very cold upper air
  // 320K ~ hot surface
  const MIN = 200;
  const MAX = 320;

  let t = (tempK - MIN) / (MAX - MIN);
  t = clamp01(t);

  // alpha control (important for volume look)
  // reduce noise values → not every voxel becomes visible
  let a = 1.0;

  // You can tune this threshold to control visibility
  if (t > 0.03) a = 1.0;

  // Color ramp: blue → cyan → green → yellow → red
  const { r, g, b } = lerpColorRamp(t);

  return { r, g, b, a };
}

function lerpColorRamp(t) {
  // 5-stop ramp (smooth like KMA)
  const stops = [
    { t: 0.0, c: [0.0, 0.0, 1.0] }, // blue
    { t: 0.25, c: [0.0, 1.0, 1.0] }, // cyan
    { t: 0.5, c: [0.0, 1.0, 0.0] }, // green
    { t: 0.75, c: [1.0, 1.0, 0.0] }, // yellow
    { t: 1.0, c: [1.0, 0.0, 0.0] }, // red
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];

    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);

      return {
        r: a.c[0] + (b.c[0] - a.c[0]) * k,
        g: a.c[1] + (b.c[1] - a.c[1]) * k,
        b: a.c[2] + (b.c[2] - a.c[2]) * k,
      };
    }
  }

  return { r, g, b, a };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

