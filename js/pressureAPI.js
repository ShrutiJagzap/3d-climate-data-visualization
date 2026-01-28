// js/pressureAPI.js
import { cachedFetchJSON } from "./dataCache.js";

export async function fetchPressure() {
  const url = "https://weather-globe.onrender.com/pressure";

  // return await res.json();
  return await cachedFetchJSON(url);
}
