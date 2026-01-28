// js/pressureTransfer.js

export function pressureTransfer(pPa, minP, maxP) {
  if (pPa == null || Number.isNaN(pPa)) return { r: 0, g: 0, b: 0, a: 0 };

  //  use real min/max from dataset
  // const MIN = (minPa != null ? minPa : 95000);
  // const MAX = (maxPa != null ? maxPa : 105000);
  const MIN = minP ?? 95000;
  const MAX = maxP ?? 105000;

  let t = (pPa - MIN) / (MAX - MIN);
  // t = clamp01(t);
  t = Math.max(0, Math.min(1, t));

  const { r, g, b } = ramp(t);
  return { r, g, b, a: 0.55 };
}

function ramp(t) {
  const stops = [
    { t: 0.0, c: [0.0, 0.0, 1.0] },
    { t: 0.25, c: [0.0, 1.0, 1.0] },
    { t: 0.5, c: [0.0, 1.0, 0.0] },
    { t: 0.75, c: [1.0, 1.0, 0.0] },
    { t: 1.0, c: [1.0, 0.0, 0.0] },
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
  return { r: 1, g: 0, b: 0 };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
