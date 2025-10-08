const { getSceneryAlongRoute, getSceneryAlongRouteMongo } = require('../service/trips.service');
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

    // Cache key for MongoDB results (exactly like getRouteScenery but with mongo prefix)
    const key = `mongo-${String(sourceCity).trim().toLowerCase()}-${String(destCity).trim().toLowerCase()}`;

    // Try cache first
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
    
    // Get scenery along the route using MongoDB service
    const sceneryData = await getSceneryAlongRouteMongo(sourceData, destData);
    
    // Format response to match expected structure (EXACTLY like getRouteScenery)
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
        sceneryAlgorithm: sceneryData.algorithm || 'mongodb-direct',
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

module.exports = { 
  getRouteScenery, 
  getRouteSceneryMongo,
  checkCollections, 
  testFileStreaming, 
  testShortRoute 
};


