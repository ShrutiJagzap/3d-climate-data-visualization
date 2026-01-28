import { CESIUM_TOKEN } from "./config.js";
import { ThreeOverlay } from "./threeOverlay.js";
import { ROI } from "./roi.js";
// import { createROIEdges } from "./roiEdges.js";


//temperature
import { fetchTemperature } from "./temperatureAPI.js";
import { TemperatureHeatmapLayer } from "./temperatureHeatmapLayer.js";

//Clouds
import { fetchClouds } from "./cloudAPI.js";
import { CloudHeatmapLayer } from "./CloudHeatmapLayer.js";

//Pressure
import { fetchPressure } from "./pressureAPI.js";
import { PressureHeatmapLayer } from "./PressureHeatmapLayer.js";

//Wind
import { WindParticles3D } from "./windParticles3D.js";
import { fetchWind } from "./windAPI.js";
// import { WindSlice2D } from "./windSlice2D.js";


Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;

// Create viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  geocoder: true,
  sceneModePicker: false,
  navigationHelpButton: true,
  infoBox: false,
  shouldAnimate: true,
  baseLayerPicker: true
});
viewer.cesiumWidget.creditContainer.style.display = "none";

//Bhuvan Map + OSM
viewer.imageryLayers.removeAll();

//OSM Base map
const osmLayer = viewer.imageryLayers.addImageryProvider(
  new Cesium.OpenStreetMapImageryProvider({
    url: "https://a.tile.openstreetmap.org/"
  })
);
osmLayer.alpha = 1.0;

// viewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider());

//add Bhuvan WMS as overlay
const BhuvanLayer = viewer.imageryLayers.addImageryProvider(
  new Cesium.WebMapServiceImageryProvider({
    url: "https://bhuvanmaps.nrsc.gov.in/vec1wms/gwc/service/wms",
    layers: "cadastral:cadastral_india",
    parameters: {
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    transparent: true,
    format: "image/png",
    styles: "",
    tiled: true
    }
  })
);
BhuvanLayer.alpha = 0.35;
// bhuvanLayer.maximumLevel = 6;

//Improve visual quality
viewer.scene.globe.enableLighting = false;
viewer.scene.skyAtmosphere.show = false;
viewer.scene.globe.depthTestAgainstTerrain = true;

// Initial camera position
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    78.9629,   // longitude (India center)
    20.5937,   // latitude
    20_000_000 // height (meters)
  )
});

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(80, 20, 6000000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-35),
    roll: 0
  }
});

const overlay = new ThreeOverlay(viewer);

const timeSteps = ["000", "006", "012"];

let selectedOverlay = null;
let selectedWindLevel = "surface";
let selectedTime = "000";

let windRenderer = null;
let windField = {};
let windEnabled = false;  // wind off initially

let wind3DEnabled = false;
let windCache = {};    //store multiple Levels
let windLoadedLevels = new Set();

// Lazy loading flags
let tempLoaded = false;
let windLoaded = false;
let pressureLoaded = false;
let cloudLoaded = false;


// ROI edges
// const roiEdges = createROIEdges(ROI);
// overlay.scene.add(roiEdges);

// viewer.scene.postRender.addEventListener(() => {
//   const topView = viewer.camera.pitch < -1.45;
//   roiEdges.material.opacity = topView ? 0.5 : 1.0;

// });


//temp heatmap
const tempLayer = new TemperatureHeatmapLayer(viewer, ROI);
const pressureLayer = new PressureHeatmapLayer(viewer, ROI);
const cloudLayer = new CloudHeatmapLayer(viewer, ROI);


async function loadTemperature(step) {
  console.log("Loading Temperature step:", step);

  const data = await fetchTemperature(step);
  await tempLayer.setData(data);

  const stats = tempLayer.getStats();
  document.getElementById("tempMin").innerText = stats.minC.toFixed(1) + " °C";
  document.getElementById("tempMax").innerText = stats.maxC.toFixed(1) + " °C";
}
//initial temp Load
// await loadTemperature(selectedTime).then(() => {
//   tempLoaded = true;
// })
// tempLoaded = true;


//ToolTip
const tooltip = document.getElementById("tooltip");
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

handler.setInputAction((movement) => {
  const cartesian = viewer.camera.pickEllipsoid(
    movement.endPosition,
    viewer.scene.globe.ellipsoid
  );
  if (!cartesian) {
    tooltip.style.display = "none";
    return;
  }
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);

   //only show inside ROI
  if( lon < ROI.minLon || lon > ROI.maxLon || lat < ROI.minLat || lat > ROI.maxLat) {
    tooltip.style.display = "none";
    return;
  }

  const tempK = tempLayer.sampleAt(lat, lon);
  if(tempK == null){
    tooltip.style.display = "none";
    return;
  }

  const tempC = tempK - 273.15;

  tooltip.style.display = "block";
  tooltip.style.left = movement.endPosition.x + 15 + "px";
  tooltip.style.top = movement.endPosition.y + 15 + "px";
  tooltip.innerHTML =
  `Lat: ${lat.toFixed(2)}<br>` +
  `Lon: ${lon.toFixed(2)}<br>` +
  `Temp: ${tempC.toFixed(1)} °C`;

}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

//volume rendering
// const resolution = {
//     lon: 140,
//     lat:100,
//     height: 60
// };

//UI helper
function setActiveButton(groupId, value) {
  document.querySelectorAll(`#${groupId} .btn`).forEach((btn) => {
    const match =
      btn.dataset.overlay === value || btn.dataset.level === value;
    btn.classList.toggle("active", match);
  });
}

function updateHeightUI() {
  const heightRow = document.getElementById("heightRow");
  const heightButtons = document.querySelectorAll("#heightBtns .btn");

  if(!heightRow) return;

  //hide full row when wind is off
  heightRow.style.display = windEnabled ? "block" : "none";

  heightButtons.forEach((b) => {
    b.disabled = !windEnabled;
  });
}

function updateLegend(type) {
  const legend = document.getElementById("legendVertical");
  const maxEl = document.getElementById("tempMax");
  const minEl = document.getElementById("tempMin");

  if (!legend || !maxEl || !minEl) return;

  //  Hide legend for wind
  if (type === "wind") {
    legend.style.display = "none";
    return;
  }

  legend.style.display = "flex";

  // reset legend class
  legend.classList.remove("temp" , "pressure", "cloud");
  legend.classList.add(type);

  maxEl.innerText = "--";
  minEl.innerText = "--";

  //  TEMP
  if (type === "temp") {
    const stats = tempLayer?.getStats?.();
    if(!stats || stats.maxC == null || stats.minC == null) return;
    maxEl.innerText = stats.maxC.toFixed(1) + " °C";
    minEl.innerText = stats.minC.toFixed(1) + " °C";
    return;
  }

  //  PRESSURE
  if (type === "pressure") {
    const stats = pressureLayer?.getStats?.();
    if (!stats || stats.maxHpa == null || stats.minHpa == null) {
      maxEl.innerText = "-- hPa";
      minEl.innerText = "-- hPa";
      return;
    }
    maxEl.innerText = stats.maxHpa.toFixed(1) + " hPa";
    minEl.innerText = stats.minHpa.toFixed(1) + " hPa";
    return;
  }

  //  CLOUD
  if (type === "cloud") {
    const stats = cloudLayer?.getStats?.();
    if(!stats || stats.max == null || stats.min == null) return;
    // maxEl.innerText = "--";
    // minEl.innerText = "--";
    maxEl.innerText = stats.max.toFixed(2);
    minEl.innerText = stats.min.toFixed(2);
    return;
  }

}

//wind Loader
function getWindHeight(level) {
  const base = 200000
  if (level === "surface") return base + 300000;
  if (level === "850") return base + 900000;
  if (level === "700") return base + 1500000;
  return base + 2200000; // 500
}

async function loadWindLevel(level, time) {
  console.log("Loading wind ONLY:", level, time);

  const windData = await fetchWind(level, time);
  windCache = { [level]: windData };
  windLoadedLevels = new Set([level]);
  const height = getWindHeight(level);

  windField = {
    [level]: { ...windData, height },
  };

  // create renderer once
  if (!windRenderer) {
    windRenderer = new WindParticles3D(overlay, windField, ROI);

    // update wind ONLY when enabled
    let lastUpdate = 0;
    viewer.scene.postRender.addEventListener(() => {
      if (!windRenderer) return;
      // if (selectedOverlay !== "wind") return;
      if(!windEnabled) return;

      const now = performance.now();
      if (now - lastUpdate < 33) return; // 30 FPS cap
      lastUpdate = now;

      windRenderer.update();
    });
  } else {
    windRenderer.windField = windField;
    windRenderer.seedParticles();
    windRenderer.update(); // refresh new level particles
  }
   windRenderer.setWindField(windField);

  console.log(" Wind loaded:", Object.keys(windField));
}

async function loadWindAllLevels(time) {
  const levels = ["surface", "850", "700", "500"];

  console.log("Loading ALL wind levels:", levels, "time:", time);

  // fetch all in parallel
  const results = await Promise.all(levels.map(lvl => fetchWind(lvl, time)));

  // store in cache
  windCache = {};
  windLoadedLevels = new Set();

  for (let i = 0; i < levels.length; i++) {
    // windCache[levels[i]] = results[i];
    // windLoadedLevels.add(levels[i]);
    const lvl = levels[i];
    // windCache[lvl] = results[i];
    const height = getWindHeight(lvl);

    windCache[lvl] = {
      ...results[i],
      height
    };

    // windCache[lvl].height = getWindHeight(lvl);
    windLoadedLevels.add(lvl);
  }

  if (!windRenderer) {
    windRenderer = new WindParticles3D(overlay, windCache, ROI);
  }else {
     windRenderer.setWindField(windCache);
  }
  console.log("3D Wind levels loaded:", Object.keys(windCache));
}

const wind3DToggle = document.getElementById("wind3DToggle");

wind3DToggle.addEventListener("change", async () => {
  wind3DEnabled = wind3DToggle.checked;

  console.log("3D Wind Enabled:", wind3DEnabled);

  if(wind3DEnabled) {
    windEnabled = true;

    document.querySelector(`#overlayBtns .btn[data-overlay="wind]`) ?.classList.add("active");
    updateHeightUI();

    //load all wind levels
    await loadWindAllLevels(selectedTime);
    windLoaded = true;
  } else {
    if (windEnabled) {
      await loadWindLevel(selectedWindLevel, selectedTime);
      windLoaded = true;
    }
  }

  await refreshOverlay();
});



// Load overlay data ONLY when needed
async function ensureOverlayLoaded() {
  // TEMP
  if (selectedOverlay === "temp" && !tempLoaded) {
    await loadTemperature(selectedTime);
    tempLoaded = true;
  }

  // WIND
  if (windEnabled && !windLoaded) {
    await loadWindLevel(selectedWindLevel, selectedTime);
    windLoaded = true;
  }

  // PRESSURE
  if (selectedOverlay === "pressure" && !pressureLoaded) {
    console.log("Loading Pressure...");
    const pressureData = await fetchPressure();
    await pressureLayer.setData(pressureData);
    pressureLoaded = true;
  }

  // CLOUD
  if (selectedOverlay === "cloud" && !cloudLoaded) {
    console.log("Loading Clouds...");
    const cloudData = await fetchClouds();
    await cloudLayer.setData(cloudData);
    cloudLoaded = true;
  }
}
async function refreshOverlay() {
  //  make sure selected overlay is loaded first
  await ensureOverlayLoaded();
  updateLegend(selectedOverlay);

  // Hide all
  tempLayer.setVisible(false);
  pressureLayer.setVisible(false);
  cloudLayer.setVisible(false);

  if (windRenderer) windRenderer.setVisible(false);

  // Show Temp
  if (selectedOverlay === "temp") {
    tempLayer.setVisible(true);
  }

  // Show Pressure
  if (selectedOverlay === "pressure") {
    pressureLayer.setVisible(true);
  }

  // Show Cloud
  if (selectedOverlay === "cloud") {
    cloudLayer.setVisible(true);
  }

  if (windEnabled) {
    if (wind3DEnabled) {
      // Ensure all Levels Loaded
      if(windLoadedLevels.size < 4) {
        await loadWindAllLevels(selectedTime);
      }
    } else {
      // Ensure selected level loaded
      if (!windLoadedLevels.has(selectedWindLevel)) {
        await loadWindLevel(selectedWindLevel, selectedTime);
      }
    }

    if (windRenderer) windRenderer.setVisible(true);
  }

}

//time slider
const slider = document.getElementById("timeSlider");
const timeLabel = document.getElementById("timeLabel");

slider.addEventListener("input", async () => {
  const idx = Number(slider.value);
  selectedTime = timeSteps[idx];
  timeLabel.innerText = selectedTime;

  if (selectedOverlay === "temp") {
    await loadTemperature(selectedTime);
    tempLoaded = true;
  }

  //update wind only if enabled
  if(windEnabled){
    await loadWindLevel(selectedWindLevel, selectedTime);
    windLoaded = true;
  }
  await refreshOverlay();

  // pressure/cloud has no time step → do nothing
});

document.querySelectorAll("#overlayBtns .btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const overlayType = btn.dataset.overlay;

    //wind= toggle mode
    if(overlayType === "wind"){
      windEnabled = !windEnabled;
      btn.classList.toggle("active", windEnabled);

      updateHeightUI();

      if(windEnabled){
        await loadWindLevel(selectedWindLevel, selectedTime);
        windLoaded = true;
      }

      await refreshOverlay();
      return;
    }
    //temp / pressure / cloud = main overlay
    selectedOverlay = overlayType;
    setActiveButton("overlayBtns", selectedOverlay);

    //keep wind button active is on
    document.querySelector(`#overlayBtns .btn[data-overlay="wind"]`) ?.classList.toggle("active", windEnabled);

    await refreshOverlay();
  });
});

//height button
document.querySelectorAll("#heightBtns .btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    selectedWindLevel = btn.dataset.level;
    setActiveButton("heightBtns", selectedWindLevel);

    //if wind is on, reload immediately
    if (windEnabled && !wind3DEnabled) {
      await loadWindLevel(selectedWindLevel, selectedTime);
      windLoaded = true;
      await refreshOverlay();
    }
  });
});

updateHeightUI();

//init
await refreshOverlay();
