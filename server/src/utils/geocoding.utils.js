const axios = require('axios');

const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';

function buildNominatimHeaders() {
  const contactEmail = process.env.USER_EMAIL || process.env.NOMINATIM_EMAIL;
  const userAgent =
    process.env.NOMINATIM_USER_AGENT ||
    `FlyByViews/1.0${contactEmail ? ` (${contactEmail})` : ''}`;

  return {
    // Nominatim usage policy requires a valid identifying User-Agent.
    'User-Agent': userAgent,
    'Accept-Language': 'en',
  };
}

/**
 * Geocoding utility using OpenStreetMap Nominatim API
 * Converts city name to coordinates
 */
async function getCoordinates(cityName) {
  try {
    if (!cityName || typeof cityName !== 'string') {
      throw new Error('City name is required and must be a string');
    }

    console.log(`Geocoding city: ${cityName}`);
    
    const contactEmail = process.env.USER_EMAIL || process.env.NOMINATIM_EMAIL;

    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: cityName.trim(),
        format: 'json',
        limit: 1, // Only get the first result
        addressdetails: 1, // Include address details
        ...(contactEmail ? { email: contactEmail } : {})
      },
      headers: {
        ...buildNominatimHeaders()
      },
      timeout: 10000 // 10 second timeout
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`City "${cityName}" not found`);
    }

    const result = data[0];
    const coordinates = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      name: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || cityName,
      country: result.address?.country
    };

    console.log(`Geocoded ${cityName}:`, coordinates);
    return coordinates;
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Geocoding timeout for "${cityName}". Please try again.`);
    }
    
    if (error.response) {
      console.error('Geocoding API error:', error.response.status, error.response.data);
      if (error.response.status === 403) {
        throw new Error(
          `Failed to geocode "${cityName}": Nominatim returned 403 (Access denied). ` +
            `This usually means your requests are being blocked by the public OSM Nominatim usage policy ` +
            `(missing/invalid User-Agent contact, too many requests, or automated traffic).`
        );
      }
      throw new Error(`Failed to geocode "${cityName}": API error ${error.response.status}`);
    }
    
    console.error('Geocoding error for', cityName, ':', error.message);
    throw new Error(`Failed to geocode "${cityName}": ${error.message}`);
  }
}

/**
 * Reverse geocoding: Convert coordinates to address
 */
async function getAddress(lat, lon) {
  try {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }

    const contactEmail = process.env.USER_EMAIL || process.env.NOMINATIM_EMAIL;

    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: lat,
        lon: lon,
        format: 'json',
        addressdetails: 1,
        ...(contactEmail ? { email: contactEmail } : {})
      },
      headers: {
        ...buildNominatimHeaders()
      },
      timeout: 10000
    });

    const data = response.data;
    
    if (!data || !data.address) {
      throw new Error(`No address found for coordinates ${lat}, ${lon}`);
    }

    return {
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      address: data.address,
      displayName: data.display_name
    };
    
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    throw error;
  }
}

/**
 * Add delay between geocoding requests to respect rate limits
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geocode multiple cities with rate limiting
 */
async function geocodeMultiple(cities) {
  const results = [];
  
  for (let i = 0; i < cities.length; i++) {
    try {
      const coordinates = await getCoordinates(cities[i]);
      results.push(coordinates);
      
      // Add delay between requests (1 second) to respect Nominatim rate limits
      if (i < cities.length - 1) {
        await delay(1000);
      }
    } catch (error) {
      results.push({ error: error.message, city: cities[i] });
    }
  }
  
  return results;
}

module.exports = {
  getCoordinates,
  getAddress,
  geocodeMultiple,
  delay
};