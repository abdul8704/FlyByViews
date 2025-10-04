const { findMountains, findLakesRivers, findCoastline } = require("./scenery.service");
const { getCoordinates, getGreatCirclePathByDistance, haversineDistance } = require("../utils/flight.utils");
const { ROUTE_SPACING_KM } = require("../constants/app.constants");


// Determine side of a point relative to a directed segment (A->B)
// Returns 'left' | 'right' | 'both'
const classifySide = (ax, ay, bx, by, px, py, toleranceKm = 5) => {
    // Use cross product sign to determine side
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    if (Math.abs(cross) < 1e-9) return 'both';
    return cross > 0 ? 'left' : 'right';
  };
  
  // Fetch scenery for a segment midpoint, using a radius ~ half segment length (capped)
  const getSceneryNearPoint = async (lat, lon, radiusKm = 50) => {
    const mountains = await findMountains(lat, lon);
    const waters = await findLakesRivers(lat, lon);
    const coasts = await findCoastline(lat, lon);
    return [...mountains, ...waters, ...coasts];
  };
  
// Public API
const getSceneryAlongRoute = async (sourceCity, destCity) => {
    const { lat: sLat, lon: sLon } = await getCoordinates(sourceCity);
    const { lat: dLat, lon: dLon } = await getCoordinates(destCity);
  
  const path = getGreatCirclePathByDistance(sLat, sLon, dLat, dLon, ROUTE_SPACING_KM);
  
    const featuresSeen = new Map(); // key -> feature
    const segments = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      segments.push({ a, b });
    }
  
    const results = { left: [], right: [], both: [] };
  
    for (const { a, b } of segments) {
      // Midpoint query to approximate features near the segment
      const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
      const segmentLen = haversineDistance(a.lat, a.lon, b.lat, b.lon);
      const radius = Math.min(60, Math.max(20, segmentLen / 2));
  
      const groups = await getSceneryNearPoint(mid.lat, mid.lon, radius);
  
      // Flatten grouped structure to individual items with genericType
      const items = [];
      for (const group of groups) {
        for (const cluster of group.clusters) {
          if (cluster.sample) items.push({ ...cluster.sample, genericType: group.genericType });
        }
      }
  
      for (const item of items) {
        const key = `${item.genericType}:${item.id}`;
        if (featuresSeen.has(key)) continue; // dedupe globally
  
        // Classify side relative to segment A->B using planar approximation
        const side = classifySide(a.lon, a.lat, b.lon, b.lat, item.lon, item.lat);
  
        results[side].push(item);
        featuresSeen.set(key, true);
      }
    }
  
    return { path, results };
  };

module.exports = { getSceneryAlongRoute };
