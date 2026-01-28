// js/windSampler3D.js


export function sampleWind3D(windField, ROI, lat, lon, height) {
  if (!windField || !ROI) return null;

  const levels = Object.keys(windField);
  if (!levels.length) return null;

  //  pick nearest level by comparing heights
  let bestLevel = levels[0];
  let bestDiff = Infinity;

  for (const lvl of levels) {
    const lvlHeight = windField[lvl]?.height ?? 0;
    const diff = Math.abs(height - lvlHeight);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestLevel = lvl;
    }
  }

  const data = windField[bestLevel];
  if (!data) return null;

  const { lat: latArr, lon: lonArr, u, v } = data;

  if (!Array.isArray(latArr) || !Array.isArray(lonArr)) return null;
  if (!Array.isArray(u) || !Array.isArray(v)) return null;

  // ROI check
  if (
    lat < ROI.minLat || lat > ROI.maxLat ||
    lon < ROI.minLon || lon > ROI.maxLon
  ) return null;

  let iLat = Math.round(((lat - ROI.minLat) / (ROI.maxLat - ROI.minLat)) * (latArr.length - 1));
  let iLon = Math.round(((lon - ROI.minLon) / (ROI.maxLon - ROI.minLon)) * (lonArr.length - 1));

  iLat = clamp(iLat, 0, latArr.length - 1);
  iLon = clamp(iLon, 0, lonArr.length - 1);

  const uu = u[iLat]?.[iLon];
  const vv = v[iLat]?.[iLon];

  if (uu === undefined || vv === undefined) return null;

  return { u: uu, v: vv, w: 0 };
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

