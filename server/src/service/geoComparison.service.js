const { getSceneryFromFilesBounded } = require('./geoStream.service');
const ExternalGeoService = require('./externalGeo.service');
const GridService = require('./grid.service');

class GeoServiceComparison {
  constructor() {
    this.externalGeo = new ExternalGeoService();
    this.gridService = new GridService();
  }

  async compareApproaches(lat, lon, radiusKm = 50) {
    console.log(`\n=== Comparing Geo Services for (${lat}, ${lon}) within ${radiusKm}km ===`);
    
    const results = {};

    // Test 1: File Streaming (Current Implementation)
    console.log('\n1. Testing File Streaming...');
    const start1 = Date.now();
    try {
      const fileResults = await getSceneryFromFilesBounded(lat, lon, radiusKm);
      results.fileStreaming = {
        success: true,
        features: fileResults.length,
        timeMs: Date.now() - start1,
        sampleFeatures: fileResults.slice(0, 3)
      };
      console.log(`   ✅ Found ${fileResults.length} features in ${results.fileStreaming.timeMs}ms`);
    } catch (error) {
      results.fileStreaming = {
        success: false,
        error: error.message,
        timeMs: Date.now() - start1
      };
      console.log(`   ❌ Failed: ${error.message}`);
    }

    // Test 2: External APIs
    console.log('\n2. Testing External APIs...');
    const start2 = Date.now();
    try {
      const apiResults = await this.externalGeo.findNearby(lat, lon, radiusKm);
      results.externalAPI = {
        success: true,
        features: apiResults.length,
        timeMs: Date.now() - start2,
        sampleFeatures: apiResults.slice(0, 3)
      };
      console.log(`   ✅ Found ${apiResults.length} features in ${results.externalAPI.timeMs}ms`);
    } catch (error) {
      results.externalAPI = {
        success: false,
        error: error.message,
        timeMs: Date.now() - start2
      };
      console.log(`   ❌ Failed: ${error.message}`);
    }

    // Test 3: Grid System (if index exists)
    console.log('\n3. Testing Grid System...');
    const start3 = Date.now();
    try {
      const gridResults = await this.gridService.findNearby(lat, lon, radiusKm);
      results.gridSystem = {
        success: true,
        features: gridResults.length,
        timeMs: Date.now() - start3,
        sampleFeatures: gridResults.slice(0, 3)
      };
      console.log(`   ✅ Found ${gridResults.length} features in ${results.gridSystem.timeMs}ms`);
    } catch (error) {
      results.gridSystem = {
        success: false,
        error: error.message,
        timeMs: Date.now() - start3,
        note: 'Grid index may not be built yet. Run GridService.buildGridIndex() first.'
      };
      console.log(`   ❌ Failed: ${error.message}`);
    }

    return results;
  }

  // Test with different locations to see which approach works best
  async runBenchmarks() {
    const testLocations = [
      { name: 'Delhi, India', lat: 28.6139, lon: 77.2090 },
      { name: 'Mumbai, India', lat: 19.0760, lon: 72.8777 },
      { name: 'Bangalore, India', lat: 12.9716, lon: 77.5946 },
      { name: 'Chennai, India', lat: 13.0827, lon: 80.2707 }
    ];

    console.log('🚀 Running Geographic Service Benchmarks');
    console.log('==========================================');

    const allResults = {};

    for (const location of testLocations) {
      console.log(`\n📍 Testing: ${location.name}`);
      const results = await this.compareApproaches(location.lat, location.lon, 100);
      allResults[location.name] = results;
      
      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log('\n📊 BENCHMARK SUMMARY');
    console.log('====================');
    
    const approaches = ['fileStreaming', 'externalAPI', 'gridSystem'];
    
    for (const approach of approaches) {
      console.log(`\n${approach.toUpperCase()}:`);
      
      const successes = Object.values(allResults).filter(r => r[approach]?.success).length;
      const avgTime = Object.values(allResults)
        .filter(r => r[approach]?.success)
        .reduce((sum, r) => sum + r[approach].timeMs, 0) / successes || 0;
      const avgFeatures = Object.values(allResults)
        .filter(r => r[approach]?.success)
        .reduce((sum, r) => sum + r[approach].features, 0) / successes || 0;

      console.log(`  Success Rate: ${successes}/${testLocations.length}`);
      console.log(`  Avg Time: ${avgTime.toFixed(0)}ms`);
      console.log(`  Avg Features Found: ${avgFeatures.toFixed(0)}`);
    }

    return allResults;
  }
}

module.exports = GeoServiceComparison;