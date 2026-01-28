// js/dataCache.js
const memoryCache = new Map();
const inFlight = new Map();

export async function cachedFetchJSON(url) {
  // already loaded
  if (memoryCache.has(url)) {
    return memoryCache.get(url);
  }

  // request already running
  if (inFlight.has(url)) {
    return inFlight.get(url);
  }

  const p = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
      const json = await res.json();
      memoryCache.set(url, json);
      return json;
    })
    .finally(() => {
      inFlight.delete(url);
    });

  inFlight.set(url, p);
  return p;
}

export function clearCache() {
  memoryCache.clear();
  inFlight.clear();
}

export function cacheSize() {
  return memoryCache.size;
}
