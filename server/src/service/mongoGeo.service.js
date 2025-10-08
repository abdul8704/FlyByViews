// MongoDB-based geographic service - Simplified for direct queries only
const mongoose = require('mongoose');
const { formatFeatures, createCirclePolygon } = require('../utils/geoFormat.utils');

// Get direct access to MongoDB collections
function getCollections() {
  const db = mongoose.connection.db;
  return {
    peaks: db.collection('peaks'),
    volcanoes: db.collection('volcanoes'),
    coastlines: db.collection('coastlines')
  };
}

// Main function to get scenery features near a point using MongoDB geospatial queries
async function getSceneryNearPoint(lat, lon, radiusKm = 50) {
  console.log(
    `MongoDB query: Finding features within ${radiusKm}km of (${lat}, ${lon})`
  );

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
  const { coastlines } = getCollections();

  // Query coastlines using $geoIntersects
  const nearbyCoastlines = await coastlines.find({
    "geometry.type": { $in: ["LineString", "MultiPolygon"] },
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: "Polygon",
          coordinates: [createCirclePolygon(lat, lon, radiusMeters)]
        }
      }
    }
  }).toArray();

  return nearbyCoastlines;
}



module.exports = {
  getSceneryNearPoint
};