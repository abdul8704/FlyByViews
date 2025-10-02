const { OVERPASS_API } = require("../constants/api.constants");
const { MOUNTAIN_RADIUS, LAKE_RADIUS, BEACH_RADIUS } = require("../constants/app.constants");
const { haversineDistance } = require("../utils/flight.utils");
const axios = require("axios");
const ApiError = require('../utils/ApiError');


// Map OSM tags to a generic type label
const getGenericType = (tags = {}) => {
  const natural = tags.natural;
  const waterway = tags.waterway;
  const water = tags.water;
  const place = tags.place;

  if (natural === 'peak' || natural === 'hill' || natural === 'volcano') return 'mountain_peak';
  if (natural === 'mountain_range' || tags.mountain_range) return 'mountain_range';
  if (natural === 'beach') return 'beach';
  if (natural === 'coastline') return 'coastline';

  // Large water bodies only (exclude lakes/rivers)
  if (place === 'sea' || place === 'ocean') return 'large_water_body';
  if (natural === 'water' && /^(sea|ocean|bay|gulf|strait|sound)$/i.test(String(water))) return 'large_water_body';

  return natural || waterway || 'unknown';
};

// Group results by generic type, then by name or proximity
const groupByTypeThenNameOrProximity = (places, maxClusterDistance = 20) => {
  const byType = new Map();

  for (const place of places) {
    const type = place.genericType || getGenericType(place.tags);
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(place);
  }

  const result = [];
  for (const [genericType, items] of byType.entries()) {
    const clusters = [];

    for (const place of items) {
      const name = place.tags?.name || place.tags?.mountain_range;

      if (name) {
        let cluster = clusters.find(c => c.name === name);
        if (!cluster) {
          cluster = { name, items: [] };
          clusters.push(cluster);
        }
        cluster.items.push(place);
      } else {
        let cluster = clusters.find(c =>
          c.items.some(p => haversineDistance(p.lat, p.lon, place.lat, place.lon) < maxClusterDistance)
        );
        if (!cluster) {
          cluster = { name: 'Unnamed Cluster', items: [] };
          clusters.push(cluster);
        }
        cluster.items.push(place);
      }
    }

    // Provide a concise summary for each cluster
    const summarized = clusters.map(c => ({
      name: c.name,
      count: c.items.length,
      sample: c.items[0],
    }));

    result.push({ genericType, clusters: summarized });
  }

  return result;
};

// Generic function with grouping built-in
const queryOverpass = async (lat, lon, radius, selectors, clusterDistance = 20) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new ApiError(400, 'bad_request', 'lat and lon must be numbers');
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new ApiError(400, 'bad_request', 'radius must be a positive number');
  }
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw new ApiError(400, 'bad_request', 'selectors must be a non-empty array');
  }

  const union = selectors.map(s => `  ${s.type}(around:${radius},${lat},${lon})${s.filter};`).join("\n");

  const query = `
    [out:json][timeout:25];
    (
    ${union}
    );
    out center;
    `;

  const response = await axios.post(OVERPASS_API, query, {
    headers: { "Content-Type": "text/plain" },
    timeout: 30000,
  });

  const elements = Array.isArray(response.data?.elements) ? response.data.elements : [];
  const parsed = elements.map(el => ({
    id: el.id,
    type: el.type,
    lat: el.lat ?? el.center?.lat,
    lon: el.lon ?? el.center?.lon,
    tags: el.tags || {},
    genericType: getGenericType(el.tags || {}),
  })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  // Group by generic type, then by name/proximity
  return groupByTypeThenNameOrProximity(parsed, clusterDistance);
};

// Specific helpers (now return grouped clusters)
const findMountains = (lat, lon) => queryOverpass(lat, lon, MOUNTAIN_RADIUS, [
  { type: 'node', filter: '["natural"="peak"]' },
  { type: 'node', filter: '["natural"="mountain_range"]' },
  { type: 'way', filter: '["natural"="mountain_range"]' }
], 100);

const findLakesRivers = (lat, lon) => queryOverpass(lat, lon, LAKE_RADIUS, [
  { type: 'node', filter: '["place"~"^(sea|ocean)$",i]' },
  { type: 'way', filter: '["place"~"^(sea|ocean)$",i]' },
  { type: 'relation', filter: '["place"~"^(sea|ocean)$",i]' },
  { type: 'way', filter: '["natural"="water"]["water"~"^(sea|ocean|bay|gulf|strait|sound)$",i]' },
  { type: 'relation', filter: '["natural"="water"]["water"~"^(sea|ocean|bay|gulf|strait|sound)$",i]' }
], 100);

const findBeaches = (lat, lon) => queryOverpass(lat, lon, BEACH_RADIUS, [
  { type: 'way', filter: '["natural"="coastline"]' },
  { type: 'relation', filter: '["natural"="coastline"]' }
], 100);

(async () => {
  const lat = 12.9716;
  const lon = 77.5946;

  const mountains = await findMountains(lat, lon);
  const largeWaterBodies = await findLakesRivers(lat, lon);
  const beaches = await findBeaches(lat, lon);

  console.log("Grouped Mountains:", mountains);
  console.log("Grouped Large Water Bodies:", largeWaterBodies);
  console.log("Grouped Coastline:", beaches);
})();

module.exports = { findMountains, findLakesRivers, findBeaches };
