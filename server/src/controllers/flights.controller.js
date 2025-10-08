const { getSceneryAlongRouteMongo } = require('../service/trips.service');
const { getCoordinates } = require('../utils/geocoding.utils');
const { cacheGet, cacheSet } = require('../utils/redisClient');
const { TTL_SECONDS }= require("../constants/app.constants"); // 7 days
const { calculateDistance } = require('../utils/flight.utils');

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
  getRouteSceneryMongo,
};


