// Alternative: Use external APIs for geographic data
// This approach queries live APIs instead of local files

const axios = require('axios');

class ExternalGeoService {
  constructor() {
    this.overpassUrl = 'https://overpass-api.de/api/interpreter';
    this.geonamesUrl = 'http://api.geonames.org';
  }

  // Query Overpass API for features near a point
  async queryOverpass(lat, lon, radiusKm) {
    const radiusMeters = radiusKm * 1000;
    
    // Overpass QL query for peaks, volcanoes near point
    const query = `
      [out:json][timeout:25];
      (
        node["natural"="peak"](around:${radiusMeters},${lat},${lon});
        node["natural"="volcano"](around:${radiusMeters},${lat},${lon});
        way["natural"="coastline"](around:${radiusMeters},${lat},${lon});
      );
      out geom;
    `;

    try {
      const response = await axios.post(this.overpassUrl, query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 30000
      });

      return this.parseOverpassResponse(response.data);
    } catch (error) {
      console.error('Overpass query failed:', error.message);
      return [];
    }
  }

  parseOverpassResponse(data) {
    if (!data.elements) return [];

    return data.elements.map(element => {
      let lat, lon;
      
      if (element.lat && element.lon) {
        lat = element.lat;
        lon = element.lon;
      } else if (element.geometry && element.geometry.length > 0) {
        lat = element.geometry[0].lat;
        lon = element.geometry[0].lon;
      } else {
        return null;
      }

      return {
        id: element.id.toString(),
        lat, lon,
        genericType: this.getFeatureType(element.tags),
        name: element.tags?.name || element.tags?.alt_name || 'Unnamed',
        tags: element.tags
      };
    }).filter(Boolean);
  }

  getFeatureType(tags) {
    if (tags?.natural === 'peak') return 'mountain_peak';
    if (tags?.natural === 'volcano') return 'volcano';
    if (tags?.natural === 'coastline') return 'coastline';
    return 'unknown';
  }

  // Query GeoNames for peaks and features
  async queryGeoNames(lat, lon, radiusKm, username = 'demo') {
    try {
      const response = await axios.get(`${this.geonamesUrl}/findNearbyJSON`, {
        params: {
          lat, lng: lon,
          radius: radiusKm,
          maxRows: 100,
          username
        },
        timeout: 10000
      });

      return response.data.geonames?.map(place => ({
        id: place.geonameId.toString(),
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lng),
        genericType: this.mapGeoNamesFeature(place.fcl, place.fcode),
        name: place.name,
        properties: place
      })) || [];
    } catch (error) {
      console.error('GeoNames query failed:', error.message);
      return [];
    }
  }

  mapGeoNamesFeature(fcl, fcode) {
    if (fcode === 'PK' || fcode === 'PKS') return 'mountain_peak';
    if (fcode === 'VLC') return 'volcano';
    if (fcl === 'H') return 'water_feature';
    return 'geographic_feature';
  }

  // Combined query using multiple sources
  async findNearby(lat, lon, radiusKm) {
    console.log(`Querying external APIs around (${lat}, ${lon}) within ${radiusKm}km`);
    
    try {
      // Try Overpass first (more comprehensive)
      const overpassResults = await this.queryOverpass(lat, lon, radiusKm);
      
      if (overpassResults.length > 0) {
        console.log(`Found ${overpassResults.length} features from Overpass API`);
        return overpassResults;
      }

      // Fallback to GeoNames
      console.log('Overpass returned no results, trying GeoNames...');
      const geonamesResults = await this.queryGeoNames(lat, lon, radiusKm);
      console.log(`Found ${geonamesResults.length} features from GeoNames API`);
      
      return geonamesResults;
    } catch (error) {
      console.error('All external APIs failed:', error.message);
      return [];
    }
  }
}

module.exports = ExternalGeoService;