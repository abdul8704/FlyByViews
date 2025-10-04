// trips.service.js
const { getCoordinates, getGreatCirclePathByDistance, haversineDistance } = require("../utils/flight.utils");
const { ROUTE_SPACING_KM } = require("../constants/app.constants");
const { ConfigurableGeoService, GEO_SERVICE_TYPES } = require("./configurableGeo.service");

// Initialize with file streaming (can be changed)
const geoService = new ConfigurableGeoService(GEO_SERVICE_TYPES.FILE_STREAMING);

// Determine side of a point relative to a directed segment (A->B)
const classifySide = (ax, ay, bx, by, px, py) => {
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  if (Math.abs(cross) < 1e-9) return 'both';
  return cross > 0 ? 'left' : 'right';
};

// Fetch all scenery near a point using configurable service
const getSceneryNearPoint = async (lat, lon, radiusKm = 50) => {
  console.log(`Searching for features within ${radiusKm}km of (${lat}, ${lon})`);
  
  const features = await geoService.getSceneryNearPoint(lat, lon, radiusKm);
  
  console.log(`Found: ${features.length} total features`);
  
  // Group by type for logging
  const counts = features.reduce((acc, f) => {
    acc[f.genericType] = (acc[f.genericType] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`Breakdown: ${Object.entries(counts).map(([type, count]) => `${count} ${type}s`).join(', ')}`);
  
  return features;
};

// Function to switch geo service type
const setGeoServiceType = (serviceType) => {
  geoService.setServiceType(serviceType);
};

// Get current geo service configuration
const getGeoServiceConfig = () => {
  return geoService.getConfig();
};

// Main function
const getSceneryAlongRoute = async (sourceCity, destCity) => {
  const { lat: sLat, lon: sLon } = await getCoordinates(sourceCity);
  const { lat: dLat, lon: dLon } = await getCoordinates(destCity);

  console.log(`Route: ${sourceCity} (${sLat}, ${sLon}) -> ${destCity} (${dLat}, ${dLon})`);

  // Use larger spacing for file-based searches to reduce processing time
  const OPTIMIZED_SPACING_KM = ROUTE_SPACING_KM * 3; // Every ~150km instead of 50km
  const path = getGreatCirclePathByDistance(sLat, sLon, dLat, dLon, OPTIMIZED_SPACING_KM);
  console.log(`Generated ${path.length} waypoints along route (every ${OPTIMIZED_SPACING_KM}km)`);

  const featuresSeen = new Map();
  const segments = path.slice(0, -1).map((a, i) => ({ a, b: path[i + 1] }));

  const results = { left: [], right: [], both: [] };
  let totalItemsFound = 0;

  for (let i = 0; i < segments.length; i++) {
    const { a, b } = segments[i];
    const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
    
    // Use larger search radius since we're checking fewer points
    const radius = 75; // Increased from 50km to cover gaps

    console.log(`[${i + 1}/${segments.length}] Searching around (${mid.lat.toFixed(4)}, ${mid.lon.toFixed(4)}) with radius ${radius}km`);
    
    const items = await getSceneryNearPoint(mid.lat, mid.lon, radius);
    console.log(`Found ${items.length} items near this segment`);
    totalItemsFound += items.length;

    for (const item of items) {
      const key = `${item.genericType}:${item.id}`;
      if (featuresSeen.has(key)) continue;

      const side = classifySide(a.lon, a.lat, b.lon, b.lat, item.lon, item.lat);
      results[side].push(item);
      featuresSeen.set(key, true);
    }
    
    // Progress indicator for long routes
    if (i % 5 === 0 && i > 0) {
      console.log(`Progress: ${i}/${segments.length} segments processed, ${featuresSeen.size} unique features found so far`);
    }
  }

  console.log(`Total items found: ${totalItemsFound}, Unique items: ${featuresSeen.size}`);
  console.log(`Results - Left: ${results.left.length}, Right: ${results.right.length}, Both: ${results.both.length}`);

  return { path, results };
};

module.exports = { 
  getSceneryAlongRoute, 
  setGeoServiceType, 
  getGeoServiceConfig 
};
