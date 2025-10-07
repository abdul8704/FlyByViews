// MongoDB-based geographic service - Simple functions with direct MongoDB queries
const mongoose = require('mongoose');

// Get direct access to MongoDB collections
function getCollections() {
  const db = mongoose.connection.db;
  return {
    peaks: db.collection('peaks'),
    volcanoes: db.collection('volcanoes'),
    coastlines: db.collection('coastlines')
  };
}

// Create required indexes for geospatial queries
async function ensureIndexes() {
  try {
    const { peaks, volcanoes, coastlines } = getCollections();
    
    console.log('Creating 2dsphere indexes for geospatial queries...');
    
    // Create indexes in parallel
    await Promise.all([
      peaks.createIndex({ "geometry": "2dsphere" }),
      peaks.createIndex({ "properties.natural": 1 }),
      volcanoes.createIndex({ "geometry": "2dsphere" }),
      volcanoes.createIndex({ "properties.natural": 1 }),
      coastlines.createIndex({ "geometry": "2dsphere" }),
      coastlines.createIndex({ "properties.natural": 1 })
    ]);
    
    console.log('All geospatial indexes created successfully');
    return true;
  } catch (error) {
    console.error('Error creating indexes:', error.message);
    return false;
  }
}

// Main function to get scenery features near a point using MongoDB geospatial queries
async function getSceneryNearPoint(lat, lon, radiusKm = 50) {
  console.log(
    `MongoDB query: Finding features within ${radiusKm}km of (${lat}, ${lon})`
  );

  // Ensure indexes exist before querying
  await ensureIndexes();

  const radiusMeters = radiusKm * 1000;
  const results = {
    peaks: [],
    volcanoes: [],
    coastlines: [],
  };

  try {
    // Query peaks
    const peaks = await findPeaksNear(lat, lon, radiusMeters);
    results.peaks = formatFeatures(peaks, "mountain_peak");

    // Query volcanoes
    const volcanoes = await findVolcanoesNear(lat, lon, radiusMeters);
    results.volcanoes = formatFeatures(volcanoes, "volcano");

    // Query coastlines
    const coastlines = await findCoastlinesNear(lat, lon, radiusMeters);
    results.coastlines = formatFeatures(coastlines, "coastline");

    const totalFeatures =
      results.peaks.length +
      results.volcanoes.length +
      results.coastlines.length;
    console.log(
      `MongoDB found: ${results.peaks.length} peaks, ${results.volcanoes.length} volcanoes, ${results.coastlines.length} coastlines (${totalFeatures} total)`
    );

    // Combine all features into a single array
    return [...results.peaks, ...results.volcanoes, ...results.coastlines];
  } catch (error) {
    console.error("MongoDB query error:", error);
    throw new Error(`MongoDB geospatial query failed: ${error.message}`);
  }
}

// Find peaks near a coordinate
async function findPeaksNear(lat, lon, radiusMeters) {
  const { peaks } = getCollections();
  
  // Query Point geometries with $nearSphere
  const points = await peaks.find({
    "properties.natural": "peak",
    "geometry.type": "Point",
    geometry: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lon, lat] },
        $maxDistance: radiusMeters
      }
    }
  }).limit(200).toArray();

  // Query LineString/Polygon/MultiPolygon with $geoIntersects
  const others = await peaks.find({
    "properties.natural": "peak",
    "geometry.type": { $in: ["LineString","Polygon","MultiPolygon"] },
    geometry: {
      $geoIntersects: {
        $geometry: { type: "Polygon", coordinates: [createCirclePolygon(lat, lon, radiusMeters)] }
      }
    }
  }).limit(200).toArray();

  // Merge results
  return [...points, ...others];
}

// Find volcanoes near a coordinate
async function findVolcanoesNear(lat, lon, radiusMeters) {
  const { volcanoes } = getCollections();
  
  // Query Point geometries with $nearSphere
  const points = await volcanoes.find({
    "properties.natural": "volcano",
    "geometry.type": "Point",
    geometry: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lon, lat] },
        $maxDistance: radiusMeters
      }
    }
  }).limit(200).toArray();

  // Query LineString/Polygon/MultiPolygon with $geoIntersects
  const others = await volcanoes.find({
    "properties.natural": "volcano",
    "geometry.type": { $in: ["LineString","Polygon","MultiPolygon"] },
    geometry: {
      $geoIntersects: {
        $geometry: { type: "Polygon", coordinates: [createCirclePolygon(lat, lon, radiusMeters)] }
      }
    }
  }).limit(200).toArray();

  // Merge results
  return [...points, ...others];
}

async function findCoastlinesNear(lat, lon, radiusMeters) {
  const { coastlines } = await getCollections(); // make sure this returns the native collection

  // Only need $geoIntersects since all coastlines are LineString / MultiPolygon
  const circlePolygon = createCirclePolygon(lat, lon, radiusMeters, 64); // 64 points for smoother circle

  // Query coastlines using $geoIntersects
  const nearbyCoastlines = await coastlines.find({
    "geometry.type": { $in: ["LineString", "MultiPolygon"] },
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: "Polygon",
          coordinates: [circlePolygon] // GeoJSON expects array of linear rings
        }
      }
    }
  }).toArray();

  return nearbyCoastlines;
}

// Create a circular polygon (GeoJSON-compliant)
function createCirclePolygon(lat, lon, radiusMeters, points = 32) {
  const earthRadius = 6371000; // meters
  const coordinates = [];

  for (let i = 0; i <= points; i++) { // <= to close the polygon
    const angle = (i * 360 / points) * Math.PI / 180;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);

    const deltaLat = (dy / earthRadius) * (180 / Math.PI);
    const deltaLon = (dx / (earthRadius * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);

    coordinates.push([lon + deltaLon, lat + deltaLat]);
  }

  return coordinates;
}
// (async () => {
//   const lat = 13.0836939;
//   const lon = 80.270186;
//   const radiusMeters = 100000; // 100 km

//   const nearby = await findCoastlinesNear(lat, lon, radiusMeters);
//   console.log('Nearby coastlines:', nearby.length);
// })();


// Format MongoDB documents to match the expected feature format
function formatFeatures(docs, genericType) {
  return docs.map(doc => {
    // Extract coordinates based on geometry type
    let lat, lon;
    if (doc.geometry.type === 'Point') {
      [lon, lat] = doc.geometry.coordinates;
    } else if (doc.geometry.type === 'LineString') {
      // Use first coordinate for LineString
      [lon, lat] = doc.geometry.coordinates[0];
    } else if (doc.geometry.type === 'Polygon') {
      // Use first coordinate of first ring for Polygon
      [lon, lat] = doc.geometry.coordinates[0][0];
    }

    // Handle elevation data (can be string, number, or object)
    let elevation = null;
    if (doc.properties.elevation) {
      elevation = parseFloat(doc.properties.elevation);
    } else if (doc.properties.ele) {
      if (typeof doc.properties.ele === 'object' && doc.properties.ele.$numberDouble) {
        elevation = parseFloat(doc.properties.ele.$numberDouble);
      } else {
        elevation = parseFloat(doc.properties.ele);
      }
    }

    return {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      name: doc.properties.name || doc.properties.alt_name || 'Unnamed',
      type: doc.properties.natural,
      genericType: genericType,
      elevation: isNaN(elevation) ? null : elevation,
      source: 'mongodb',
      geometry_type: doc.geometry.type,
      // Include additional properties if available
      ...(doc.properties.prominence && { prominence: doc.properties.prominence }),
      ...(doc.properties.isolation && { isolation: doc.properties.isolation })
    };
  });
}

// Get service statistics
async function getServiceStats() {
  try {
    const { peaks, volcanoes, coastlines } = getCollections();
    
    const [peakCount, volcanoCount, coastlineCount] = await Promise.all([
      peaks.countDocuments(),
      volcanoes.countDocuments(),
      coastlines.countDocuments(),
    ]);

    return {
      serviceName: "MongoDB Geographic Service (Direct Queries)",
      totalFeatures: peakCount + volcanoCount + coastlineCount,
      breakdown: {
        peaks: peakCount,
        volcanoes: volcanoCount,
        coastlines: coastlineCount,
      },
      indexesAvailable: "Check with db.peaks.getIndexes(), etc.",
      recommendedIndexes: [
        "geometry (2dsphere index)",
        "properties.natural (regular index)",
      ],
    };
  } catch (error) {
    console.error("Error getting service stats:", error);
    return { error: error.message };
  }
}

module.exports = {
  getSceneryNearPoint,
  findPeaksNear,
  findVolcanoesNear,
  findCoastlinesNear,
  formatFeatures,
  getServiceStats,
  ensureIndexes
};