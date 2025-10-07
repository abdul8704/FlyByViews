const { getSceneryAlongRoute } = require('../service/trips.service');
const { testGeoStreaming, testRoute } = require('../service/test.service');
const { getCoordinates } = require('../utils/geocoding.utils');
const { cacheGet, cacheSet } = require('../utils/redisClient');
const Volcano = require('../models/Volcano.model');
const Peak = require('../models/Peaks.model');
const Coastline = require('../models/Coastlines.model');
const { TTL_SECONDS }= require("../constants/app.constants"); // 7 days
const { getSceneryNearPoint } = require('../service/mongoGeo.service');

const getRouteScenery = async (req, res, next) => {
  try {
    const { sourceCity, destCity, departureTime, arrivalTime } = req.body;
    
    // Validate required fields
    if (!sourceCity || !destCity) {
      return res.status(400).json({
        error: 'Both sourceCity and destCity are required'
      });
    }

    console.log(`Planning route: ${sourceCity} → ${destCity}`);

    // Cache key and TTL (7 days)
    const key = `${String(sourceCity).trim().toLowerCase()}-${String(destCity).trim().toLowerCase()}`;

    // Try cache
    try {
      const cached = await cacheGet(key);
      if (cached) {
        console.log(`[CACHE HIT] ${key}`);
        return res.status(200).json(JSON.parse(cached));
      }
    } catch (e) {
      console.log(`[CACHE READ FAIL] ${key}:`, e.message);
    }
    
    // Geocode both cities to get coordinates
    let sourceCoords, destCoords;
    
    try {
      // Geocode source city
      sourceCoords = await getCoordinates(sourceCity);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to find source city "${sourceCity}": ${error.message}`
      });
    }
    
    try {
      // Geocode destination city  
      destCoords = await getCoordinates(destCity);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to find destination city "${destCity}": ${error.message}`
      });
    }
    
    // Prepare source and destination data for the service
    const sourceData = {
      lat: sourceCoords.lat,
      lon: sourceCoords.lon,
      name: sourceCoords.city || sourceCity,
      country: sourceCoords.country
    };
    
    const destData = {
      lat: destCoords.lat,
      lon: destCoords.lon,
      name: destCoords.city || destCity,
      country: destCoords.country
    };
    
    console.log(`Route coordinates: ${sourceData.name} (${sourceData.lat}, ${sourceData.lon}) → ${destData.name} (${destData.lat}, ${destData.lon})`);
    
    // Create a flight path (can be enhanced to create curved path later)
    const flightPath = [
      { lat: sourceData.lat, lon: sourceData.lon },
      { lat: destData.lat, lon: destData.lon }
    ];
    
    // Get scenery along the route
    const sceneryData = await getSceneryAlongRoute(sourceData, destData);
    
    // Format response to match expected structure
    const response = {
      path: flightPath,
      results: sceneryData.results || {
        left: [],
        right: [],
        both: []
      },
      metadata: {
        source: {
          ...sourceData,
          originalInput: sourceCity,
          geocoded: sourceCoords
        },
        destination: {
          ...destData,
          originalInput: destCity,
          geocoded: destCoords
        },
        departureTime,
        arrivalTime,
        sceneryAlgorithm: sceneryData.algorithm || 'file-streaming',
        distance: calculateDistance(sourceData.lat, sourceData.lon, destData.lat, destData.lon)
      }
    };
    
    // Store in cache (best-effort)
    try {
      await cacheSet(key, JSON.stringify(response), TTL_SECONDS);
      console.log(`[CACHE SET] ${key} (ttl=${TTL_SECONDS}s)`);
    } catch (e) {
      console.log(`[CACHE WRITE FAIL] ${key}:`, e.message);
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Route scenery error:', err);
    next(err);
  }
};

// Test the new file-based streaming approach
const testFileStreaming = async (req, res, next) => {
  try {
    console.log('Starting file streaming test...');
    const features = await testGeoStreaming();
    
    res.json({
      success: true,
      message: 'File streaming test completed',
      featuresFound: features.length,
      sampleFeatures: features.slice(0, 10)
    });
  } catch (err) {
    console.error('File streaming test failed:', err);
    next(err);
  }
};

// Test a short route with file streaming
const testShortRoute = async (req, res, next) => {
  try {
    const { from = 'delhi', to = 'mumbai' } = req.query;
    console.log(`Testing route: ${from} -> ${to}`);
    
    const result = await testRoute(from, to);
    
    res.json({
      success: true,
      route: `${from} -> ${to}`,
      result: result ? {
        waypointsGenerated: result.path.length,
        featuresFound: {
          left: result.results.left.length,
          right: result.results.right.length,
          both: result.results.both.length,
          total: result.results.left.length + result.results.right.length + result.results.both.length
        },
        sampleFeatures: [
          ...result.results.left.slice(0, 3),
          ...result.results.right.slice(0, 3),
          ...result.results.both.slice(0, 3)
        ]
      } : 'Route test failed'
    });
  } catch (err) {
    console.error('Route test failed:', err);
    next(err);
  }
};

// Temporary debug endpoint to check database collections
const checkCollections = async (req, res, next) => {
  try {
    const [volcanoCount, peakCount, coastlineCount] = await Promise.all([
      Volcano.countDocuments(),
      Peak.countDocuments(),
      Coastline.countDocuments()
    ]);

    // Get sample documents
    const [sampleVolcano, samplePeak, sampleCoastline] = await Promise.all([
      Volcano.findOne().lean(),
      Peak.findOne().lean(),
      Coastline.findOne().lean()
    ]);

    res.json({
      counts: {
        volcanoes: volcanoCount,
        peaks: peakCount,
        coastlines: coastlineCount
      },
      samples: {
        volcano: sampleVolcano,
        peak: samplePeak,
        coastline: sampleCoastline
      }
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

// MongoDB-based route scenery controller
const getRouteSceneryMongo = async (req, res, next) => {
  try {
    const { sourceCity, destCity, departureTime, arrivalTime } = req.body;
    
    // Validate required fields
    if (!sourceCity || !destCity) {
      return res.status(400).json({
        error: 'Both sourceCity and destCity are required'
      });
    }

    console.log(`[MONGODB] Planning route: ${sourceCity} → ${destCity}`);

    // Cache key for MongoDB results
    const key = `mongo-${String(sourceCity).trim().toLowerCase()}-${String(destCity).trim().toLowerCase()}`;

    // Try cache first
    // try {
    //   const cached = await cacheGet(key);
    //   if (cached) {
    //     console.log(`[CACHE HIT] ${key}`);
    //     return res.status(200).json(JSON.parse(cached));
    //   }
    // } catch (e) {
    //   console.log(`[CACHE READ FAIL] ${key}:`, e.message);
    // }
    
    // Geocode both cities to get coordinates
    let sourceCoords, destCoords;
    
    try {
      sourceCoords = await getCoordinates(sourceCity);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to find source city "${sourceCity}": ${error.message}`
      });
    }
    
    try {
      destCoords = await getCoordinates(destCity);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to find destination city "${destCity}": ${error.message}`
      });
    }
    
    // Calculate route distance
    const distance = calculateDistance(
      sourceCoords.lat, sourceCoords.lon,
      destCoords.lat, destCoords.lon
    );

    console.log(`Route coordinates: ${sourceCity} (${sourceCoords.lat}, ${sourceCoords.lon}) → ${destCity} (${destCoords.lat}, ${destCoords.lon}), Distance: ${distance} km`);
    
    // Get scenery features using MongoDB queries
    // Query multiple points along the route for comprehensive coverage
    const routePoints = generateRoutePoints(sourceCoords, destCoords, 5); // 5 points along route
    const allFeatures = [];
    
    for (const point of routePoints) {
      const features = await getSceneryNearPoint(point.lat, point.lon, 200); // 100km radius
      allFeatures.push(...features);
    }
    
    // Remove duplicates based on coordinates (within 1km)
    const uniqueFeatures = removeDuplicateFeatures(allFeatures);
    
    // Classify features by side (left/right/both) relative to flight path
    const classifiedFeatures = classifyFeaturesBySide(uniqueFeatures, sourceCoords, destCoords);

    // Format response
    const response = {
      metadata: {
        source: {
          lat: sourceCoords.lat,
          lon: sourceCoords.lon,
          name: sourceCoords.name || sourceCity,
          originalInput: sourceCity
        },
        destination: {
          lat: destCoords.lat,
          lon: destCoords.lon,
          name: destCoords.name || destCity,
          originalInput: destCity
        },
        distance: distance,
        ...(departureTime && { departureTime }),
        ...(arrivalTime && { arrivalTime }),
        queryMethod: 'mongodb',
        totalFeatures: uniqueFeatures.length,
        queryRadius: '100km per point',
        routePoints: routePoints.length
      },
      results: classifiedFeatures,
      stats: {
        left: classifiedFeatures.left?.length || 0,
        right: classifiedFeatures.right?.length || 0,
        both: classifiedFeatures.both?.length || 0,
        total: uniqueFeatures.length
      }
    };

    // Cache the response
    // try {
    //   await cacheSet(key, JSON.stringify(response), TTL_SECONDS);
    //   console.log(`[CACHE SET] ${key}`);
    // } catch (e) {
    //   console.log(`[CACHE WRITE FAIL] ${key}:`, e.message);
    // }

    res.status(200).json(response);

  } catch (error) {
    console.error('MongoDB route scenery error:', error);
    next(error);
  }
};

// Helper function to generate intermediate points along route
function generateRoutePoints(source, dest, numPoints = 5) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const lat = source.lat + (dest.lat - source.lat) * fraction;
    const lon = source.lon + (dest.lon - source.lon) * fraction;
    points.push({ lat, lon });
  }
  return points;
}

// Helper function to remove duplicate features
function removeDuplicateFeatures(features, tolerance = 0.01) { // ~1km tolerance
  const unique = [];
  const seen = new Set();
  
  for (const feature of features) {
    const key = `${Math.round(feature.lat / tolerance) * tolerance}_${Math.round(feature.lon / tolerance) * tolerance}_${feature.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(feature);
    }
  }
  
  return unique;
}

// Helper function to classify features by side
function classifyFeaturesBySide(features, source, dest) {
  const result = { left: [], right: [], both: [] };
  
  for (const feature of features) {
    const side = determineSide(source, dest, feature);
    result[side].push(feature);
  }
  
  return result;
}

// Determine which side of the flight path a feature is on
function determineSide(source, dest, feature) {
  // Vector from source to destination
  const dx = dest.lon - source.lon;
  const dy = dest.lat - source.lat;
  
  // Vector from source to feature
  const fx = feature.lon - source.lon;
  const fy = feature.lat - source.lat;
  
  // Cross product to determine side
  const cross = dx * fy - dy * fx;
  
  if (Math.abs(cross) < 0.001) return 'both'; // Very close to the path
  return cross > 0 ? 'left' : 'right';
}

module.exports = { 
  getRouteScenery, 
  getRouteSceneryMongo,
  checkCollections, 
  testFileStreaming, 
  testShortRoute 
};


