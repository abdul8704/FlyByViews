// Alternative: Pre-computed grid system
// Divide world into grid cells and pre-index features

const fs = require('fs');
const path = require('path');

class GridService {
  constructor(gridSizeKm = 50) {
    this.gridSizeKm = gridSizeKm;
    this.gridSizeDegrees = gridSizeKm / 111; // Rough conversion
    this.gridIndex = new Map();
    this.dataPath = path.join(__dirname, '../../../data/grid');
  }

  // Convert lat/lon to grid cell ID
  getGridCell(lat, lon) {
    const gridLat = Math.floor(lat / this.gridSizeDegrees);
    const gridLon = Math.floor(lon / this.gridSizeDegrees);
    return `${gridLat}_${gridLon}`;
  }

  // Get all grid cells within radius
  getGridCellsInRadius(lat, lon, radiusKm) {
    const cellsNeeded = Math.ceil(radiusKm / this.gridSizeKm);
    const cells = [];
    
    for (let i = -cellsNeeded; i <= cellsNeeded; i++) {
      for (let j = -cellsNeeded; j <= cellsNeeded; j++) {
        const cellLat = lat + (i * this.gridSizeDegrees);
        const cellLon = lon + (j * this.gridSizeDegrees);
        cells.push(this.getGridCell(cellLat, cellLon));
      }
    }
    
    return [...new Set(cells)]; // Remove duplicates
  }

  // Load features for specific grid cells
  async loadGridCells(cellIds) {
    const features = [];
    
    for (const cellId of cellIds) {
      const filePath = path.join(this.dataPath, `${cellId}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const cellData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          features.push(...cellData);
        } catch (error) {
          console.warn(`Failed to load grid cell ${cellId}:`, error.message);
        }
      }
    }
    
    return features;
  }

  // Find features near a point
  async findNearby(lat, lon, radiusKm) {
    const gridCells = this.getGridCellsInRadius(lat, lon, radiusKm);
    const features = await this.loadGridCells(gridCells);
    
    // Filter by actual distance
    const nearby = features.filter(feature => {
      const distance = this.haversineDistance(lat, lon, feature.lat, feature.lon);
      return distance <= radiusKm;
    });
    
    return nearby;
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Build grid index from NDJSON files (one-time setup)
  async buildGridIndex() {
    console.log('Building grid index...');
    
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }

    const files = [
      { path: '../../../overpass-data/asia_volcanoes.ndjson', type: 'volcano' },
      { path: '../../../overpass-data/asia_peaks.ndjson', type: 'peak' },
      { path: '../../../overpass-data/asia_coastlines.ndjson', type: 'coastline' }
    ];

    const gridData = new Map();

    for (const file of files) {
      const filePath = path.join(__dirname, file.path);
      if (fs.existsSync(filePath)) {
        console.log(`Processing ${file.type}...`);
        
        const fileStream = fs.createReadStream(filePath);
        const readline = require('readline');
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });

        let count = 0;
        for await (const line of rl) {
          try {
            const feature = JSON.parse(line.trim());
            
            // Extract coordinates
            let coords = [];
            if (feature.geometry.type === 'Point') {
              coords = [feature.geometry.coordinates];
            } else if (feature.geometry.type === 'LineString') {
              coords = feature.geometry.coordinates;
            } else if (feature.geometry.type === 'Polygon') {
              coords = feature.geometry.coordinates[0];
            }

            // Add to appropriate grid cells
            for (const coord of coords) {
              const [lon, lat] = coord;
              const cellId = this.getGridCell(lat, lon);
              
              if (!gridData.has(cellId)) {
                gridData.set(cellId, []);
              }
              
              gridData.get(cellId).push({
                id: feature.id || `${file.type}_${count}`,
                lat, lon,
                genericType: file.type,
                name: feature.properties?.name || 'Unnamed'
              });
            }
            
            count++;
            if (count % 10000 === 0) {
              console.log(`  Processed ${count} features`);
            }
          } catch (error) {
            // Skip malformed lines
          }
        }
        console.log(`Completed ${file.type}: ${count} features`);
      }
    }

    // Write grid cells to files
    console.log(`Writing ${gridData.size} grid cells...`);
    for (const [cellId, features] of gridData) {
      const filePath = path.join(this.dataPath, `${cellId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(features));
    }

    console.log('Grid index build complete!');
  }
}

module.exports = GridService;