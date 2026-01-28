// js/cloudAPI.js
import { cachedFetchJSON } from "./dataCache.js";

export async function fetchClouds() {
  const url = "https://weather-globe.onrender.com/clouds";

  // return await res.json();
  return await cachedFetchJSON(url);
}
