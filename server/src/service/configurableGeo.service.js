// Configuration-based geographic service selector
const { getSceneryFromFilesBounded } = require('./geoStream.service');
const ExternalGeoService = require('./externalGeo.service');
const GridService = require('./grid.service');

const GEO_SERVICE_TYPES = {
  FILE_STREAMING: 'file_streaming',
  EXTERNAL_API: 'external_api', 
  GRID_SYSTEM: 'grid_system',
  MONGODB: 'mongodb' // Your original approach
};

class ConfigurableGeoService {
  constructor(serviceType = GEO_SERVICE_TYPES.FILE_STREAMING) {
    this.serviceType = serviceType;
    this.externalGeo = new ExternalGeoService();
    this.gridService = new GridService();
  }

  // Main method that routes to the appropriate service
  async getSceneryNearPoint(lat, lon, radiusKm = 50) {
    console.log(`Using ${this.serviceType} for geographic queries`);

    switch (this.serviceType) {
      case GEO_SERVICE_TYPES.FILE_STREAMING:
        return await this.getFromFiles(lat, lon, radiusKm);
        
      case GEO_SERVICE_TYPES.EXTERNAL_API:
        return await this.getFromAPI(lat, lon, radiusKm);
        
      case GEO_SERVICE_TYPES.GRID_SYSTEM:
        return await this.getFromGrid(lat, lon, radiusKm);
        
      case GEO_SERVICE_TYPES.MONGODB:
        return await this.getFromMongoDB(lat, lon, radiusKm);
        
      default:
        throw new Error(`Unknown service type: ${this.serviceType}`);
    }
  }

  async getFromFiles(lat, lon, radiusKm) {
    const features = await getSceneryFromFilesBounded(lat, lon, radiusKm);
    console.log(`File streaming found ${features.length} features`);
    return features;
  }

  async getFromAPI(lat, lon, radiusKm) {
    const features = await this.externalGeo.findNearby(lat, lon, radiusKm);
    console.log(`External API found ${features.length} features`);
    return features;
  }

  async getFromGrid(lat, lon, radiusKm) {
    const features = await this.gridService.findNearby(lat, lon, radiusKm);
    console.log(`Grid system found ${features.length} features`);
    return features;
  }

  async getFromMongoDB(lat, lon, radiusKm) {
    // Your original MongoDB approach would go here
    console.log('MongoDB service not implemented - collections are empty');
    return [];
  }

  // Switch service type at runtime
  setServiceType(newType) {
    if (Object.values(GEO_SERVICE_TYPES).includes(newType)) {
      this.serviceType = newType;
      console.log(`Switched to ${newType} service`);
    } else {
      throw new Error(`Invalid service type: ${newType}`);
    }
  }

  // Get current configuration
  getConfig() {
    return {
      currentService: this.serviceType,
      availableServices: Object.values(GEO_SERVICE_TYPES),
      performance: {
        [GEO_SERVICE_TYPES.FILE_STREAMING]: {
          speed: 'Slow',
          setup: 'None required',
          dataFreshness: 'Static files',
          reliability: 'High'
        },
        [GEO_SERVICE_TYPES.EXTERNAL_API]: {
          speed: 'Medium',
          setup: 'None required',
          dataFreshness: 'Live data',
          reliability: 'Medium (depends on internet)'
        },
        [GEO_SERVICE_TYPES.GRID_SYSTEM]: {
          speed: 'Fast',
          setup: 'Grid index must be built first',
          dataFreshness: 'Static files',
          reliability: 'High'
        },
        [GEO_SERVICE_TYPES.MONGODB]: {
          speed: 'Very Fast',
          setup: 'Import all data to MongoDB',
          dataFreshness: 'Static files',
          reliability: 'High'
        }
      }
    };
  }
}

module.exports = {
  ConfigurableGeoService,
  GEO_SERVICE_TYPES
};