// js/windAPI.js
import { cachedFetchJSON } from "./dataCache.js";

const BASE_URL = "https://weather-globe.onrender.com";

export async function fetchWind(level, time) {
  const url = `${BASE_URL}/wind/${level}/${time}`;
  console.log("Fetching wind",url);

  // return await res.json();
  return await cachedFetchJSON(url);
}
