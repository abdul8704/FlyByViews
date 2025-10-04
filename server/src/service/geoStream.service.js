const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Haversine distance calculation
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Check if point is within radius of target
const isWithinRadius = (targetLat, targetLon, pointLat, pointLon, radiusKm) => {
  return haversineDistance(targetLat, targetLon, pointLat, pointLon) <= radiusKm;
};

// Stream NDJSON file and find features within radius
const findFeaturesInRadius = async (filePath, targetLat, targetLon, radiusKm, featureType) => {
  return new Promise((resolve, reject) => {
    const features = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineCount = 0;
    
    rl.on('line', (line) => {
      try {
        lineCount++;
        if (lineCount % 10000 === 0) {
          console.log(`Processed ${lineCount} lines from ${featureType}...`);
        }

        const feature = JSON.parse(line.trim());
        
        // Extract coordinates based on geometry type
        let coords = [];
        if (feature.geometry.type === 'Point') {
          coords = [feature.geometry.coordinates];
        } else if (feature.geometry.type === 'LineString') {
          coords = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'Polygon') {
          // Use first coordinate of outer ring
          coords = feature.geometry.coordinates[0];
        }

        // Check if any coordinate is within radius
        for (const coord of coords) {
          const [lon, lat] = coord;
          if (isWithinRadius(targetLat, targetLon, lat, lon, radiusKm)) {
            features.push({
              id: feature.id || `${featureType}_${lineCount}`,
              lat: lat,
              lon: lon,
              genericType: featureType,
              name: feature.properties?.name || feature.properties?.alt_name || 'Unnamed',
              properties: feature.properties
            });
            break; // Only add once per feature
          }
        }
      } catch (error) {
        console.error(`Error parsing line ${lineCount}:`, error.message);
      }
    });

    rl.on('close', () => {
      console.log(`Finished processing ${lineCount} lines from ${featureType}, found ${features.length} features`);
      resolve(features);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
};

// Main function to get scenery from NDJSON files
const getSceneryFromFiles = async (lat, lon, radiusKm = 50) => {
  const dataPath = path.join(__dirname, '../../../overpass-data');
  
  const files = [
    { path: path.join(dataPath, 'asia_volcanoes.ndjson'), type: 'volcano' },
    { path: path.join(dataPath, 'asia_peaks.ndjson'), type: 'mountain_peak' },
    { path: path.join(dataPath, 'asia_coastlines.ndjson'), type: 'coastline' }
  ];

  console.log(`Searching for features within ${radiusKm}km of (${lat}, ${lon})`);
  
  const results = [];
  
  for (const file of files) {
    if (fs.existsSync(file.path)) {
      console.log(`Processing ${file.type} from ${file.path}`);
      const features = await findFeaturesInRadius(file.path, lat, lon, radiusKm, file.type);
      results.push(...features);
    } else {
      console.log(`File not found: ${file.path}`);
    }
  }

  return results;
};

// Optimized version that pre-filters by bounding box
const getSceneryFromFilesBounded = async (lat, lon, radiusKm = 50) => {
  const dataPath = path.join(__dirname, '../../../overpass-data');
  
  // Calculate bounding box for quick filtering
  const latRadiusKm = radiusKm / 111; // Rough conversion: 1 degree ≈ 111km
  const lonRadiusKm = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  
  const bounds = {
    minLat: lat - latRadiusKm,
    maxLat: lat + latRadiusKm,
    minLon: lon - lonRadiusKm,
    maxLon: lon + lonRadiusKm
  };

  console.log(`Bounding box: lat(${bounds.minLat.toFixed(4)}, ${bounds.maxLat.toFixed(4)}), lon(${bounds.minLon.toFixed(4)}, ${bounds.maxLon.toFixed(4)})`);

  const files = [
    { path: path.join(dataPath, 'asia_volcanoes.ndjson'), type: 'volcano' },
    { path: path.join(dataPath, 'asia_peaks.ndjson'), type: 'mountain_peak' },
    { path: path.join(dataPath, 'asia_coastlines.ndjson'), type: 'coastline' }
  ];

  const results = [];
  
  for (const file of files) {
    if (fs.existsSync(file.path)) {
      console.log(`Processing ${file.type} with bounding box filter...`);
      const features = await findFeaturesInBounds(file.path, bounds, lat, lon, radiusKm, file.type);
      results.push(...features);
    }
  }

  return results;
};

// Helper function for bounding box filtering
const findFeaturesInBounds = async (filePath, bounds, targetLat, targetLon, radiusKm, featureType) => {
  return new Promise((resolve, reject) => {
    const features = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineCount = 0;
    let inBoundsCount = 0;
    
    rl.on('line', (line) => {
      try {
        lineCount++;
        if (lineCount % 50000 === 0) {
          console.log(`  Processed ${lineCount} lines, ${inBoundsCount} in bounds, ${features.length} within radius`);
        }

        const feature = JSON.parse(line.trim());
        
        // Quick bounding box check first
        let coords = [];
        if (feature.geometry.type === 'Point') {
          coords = [feature.geometry.coordinates];
        } else if (feature.geometry.type === 'LineString') {
          coords = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'Polygon') {
          coords = feature.geometry.coordinates[0];
        }

        // Check if any coordinate is within bounding box
        let inBounds = false;
        for (const coord of coords) {
          const [lon, lat] = coord;
          if (lat >= bounds.minLat && lat <= bounds.maxLat && 
              lon >= bounds.minLon && lon <= bounds.maxLon) {
            inBounds = true;
            inBoundsCount++;
            
            // Now do precise distance check
            if (isWithinRadius(targetLat, targetLon, lat, lon, radiusKm)) {
              features.push({
                id: feature.id || `${featureType}_${lineCount}`,
                lat: lat,
                lon: lon,
                genericType: featureType,
                name: feature.properties?.name || feature.properties?.alt_name || 'Unnamed',
                properties: feature.properties
              });
            }
            break;
          }
        }
      } catch (error) {
        // Skip malformed lines
      }
    });

    rl.on('close', () => {
      console.log(`  Finished: ${lineCount} total, ${inBoundsCount} in bounds, ${features.length} within radius`);
      resolve(features);
    });

    rl.on('error', reject);
  });
};

module.exports = {
  getSceneryFromFiles,
  getSceneryFromFilesBounded,
  findFeaturesInRadius,
  haversineDistance
};