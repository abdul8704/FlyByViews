// trips.service.js
const {  getGreatCirclePathByDistance } = require("../utils/flight.utils");
const { ROUTE_SPACING_KM } = require("../constants/app.constants");
const { getSceneryNearPoint: getSceneryNearPointMongo } = require("./mongoGeo.service");

const classifySide = (ax, ay, bx, by, px, py) => {
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  if (Math.abs(cross) < 1e-9) return 'both';
  return cross > 0 ? 'left' : 'right';
};

// MongoDB-based scenery along route - same approach but using MongoDB service
const getSceneryAlongRouteMongo = async (source, destination) => {
  // Extract coordinates from the source and destination objects
  const sLat = source.lat;
  const sLon = source.lon;
  const sourceName = source.name;
  
  const dLat = destination.lat;
  const dLon = destination.lon;
  const destName = destination.name;

  console.log(`[MONGODB] Route: ${sourceName} (${sLat}, ${sLon}) -> ${destName} (${dLat}, ${dLon})`);

  // Use larger spacing for MongoDB searches to reduce processing time
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

    console.log(`[MONGODB][${i + 1}/${segments.length}] Searching around (${mid.lat.toFixed(4)}, ${mid.lon.toFixed(4)}) with radius ${radius}km`);
    
    const items = await getSceneryNearPointMongo(mid.lat, mid.lon, radius);
    console.log(`Found ${items.length} items near this segment`);
    totalItemsFound += items.length;

    for (const item of items) {
      const key = `${item.genericType}:${item.name}:${item.lat}:${item.lon}`;
      if (featuresSeen.has(key)) continue;

      const side = classifySide(a.lon, a.lat, b.lon, b.lat, item.lon, item.lat);
      results[side].push(item);
      featuresSeen.set(key, true);
    }
    
    // Progress indicator for long routes
    if (i % 5 === 0 && i > 0) {
      console.log(`[MONGODB] Progress: ${i}/${segments.length} segments processed, ${featuresSeen.size} unique features found so far`);
    }
  }

  console.log(`[MONGODB] Total items found: ${totalItemsFound}, Unique items: ${featuresSeen.size}`);
  console.log(`[MONGODB] Results - Left: ${results.left.length}, Right: ${results.right.length}, Both: ${results.both.length}`);

  return { 
    path, 
    results, 
    algorithm: 'mongodb-direct' 
  };
};

module.exports = { 
  getSceneryAlongRouteMongo,
};
