const { getSceneryFromFilesBounded } = require('./geoStream.service');

// Test function to quickly check if file streaming works
const testGeoStreaming = async () => {
  console.log('=== Testing Geo Streaming Service ===');
  
  // Test with a location in India (should find some features)
  const testLat = 28.6139; // Delhi
  const testLon = 77.2090;
  const radiusKm = 100;
  
  console.log(`Testing around Delhi (${testLat}, ${testLon}) within ${radiusKm}km`);
  
  const startTime = Date.now();
  const features = await getSceneryFromFilesBounded(testLat, testLon, radiusKm);
  const endTime = Date.now();
  
  console.log(`Found ${features.length} features in ${endTime - startTime}ms`);
  
  // Show first few results
  if (features.length > 0) {
    console.log('Sample features:');
    features.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name} (${f.genericType}) at (${f.lat.toFixed(4)}, ${f.lon.toFixed(4)})`);
    });
  }
  
  return features;
};

// Test with a route
const testRoute = async (from, to) => {
  console.log(`\n=== Testing Route: ${from} -> ${to} ===`);
  
  const { getSceneryAlongRoute } = require('./trips.service');
  
  try {
    const result = await getSceneryAlongRoute(from, to);
    console.log('Route completed successfully!');
    return result;
  } catch (error) {
    console.error('Route test failed:', error.message);
    return null;
  }
};

module.exports = {
  testGeoStreaming,
  testRoute
};