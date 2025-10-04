const { getSceneryAlongRoute } = require('../service/trips.service');
const { testGeoStreaming, testRoute } = require('../service/test.service');
const Volcano = require('../models/Volcano.model');
const Peak = require('../models/Peaks.model');
const Coastline = require('../models/Coastlines.model');

const getRouteScenery = async (req, res, next) => {
  try {
    const { sourceCity, destCity } = req.body;
    const data = await getSceneryAlongRoute(sourceCity, destCity);
    res.status(200).json(data);
  } catch (err) {
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

module.exports = { 
  getRouteScenery, 
  checkCollections, 
  testFileStreaming, 
  testShortRoute 
};


