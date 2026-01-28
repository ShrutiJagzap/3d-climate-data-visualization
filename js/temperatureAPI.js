// js/temperatureAPI.js
import { cachedFetchJSON } from "./dataCache.js";

export async function fetchTemperature(step = "000") {
  const url = `https://weather-globe.onrender.com/temperature/${step}`; 

  // return await res.json();
  return await cachedFetchJSON(url);
}
