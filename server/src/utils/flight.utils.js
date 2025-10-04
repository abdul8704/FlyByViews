const axios = require('axios');
const { EARTH_RADIUS_KM } = require('../constants/app.constants');
const ApiError = require('./ApiError');
require('dotenv').config();

// 1️⃣ Get coordinates of a city
const getCoordinates = async (city) => {
  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    throw new ApiError(400, 'bad_request', 'City is required');
  }

  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: city, format: 'json' },
    headers: { 'User-Agent': process.env.USER_EMAIL },
    timeout: 15000 // 15 seconds
  });

  const data = response.data;
  if (!data || data.length === 0) {
    throw new ApiError(404, 'not_found', 'City not found');
  }

  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
};

// 2️⃣ Convert degrees ↔ radians
const toRad = (deg) => { 
    return deg * Math.PI / 180; 
}

const toDeg = (rad) => { 
    return rad * 180 / Math.PI; 
}

// 3️⃣ Haversine formula to calculate distance between two coordinates
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c; // Distance in km
};

// 4️⃣ Generate great-circle path with points every `spacingKm` km
const getGreatCirclePathByDistance = (lat1, lon1, lat2, lon2, spacingKm = 50) => {
  const totalDistance = haversineDistance(lat1, lon1, lat2, lon2);
  const numPoints = Math.ceil(totalDistance / spacingKm);

  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const Δσ = Math.acos(
    Math.sin(φ1) * Math.sin(φ2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
  );

  const path = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints; // Fraction along path
    const A = Math.sin((1 - f) * Δσ) / Math.sin(Δσ);
    const B = Math.sin(f * Δσ) / Math.sin(Δσ);

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λi = Math.atan2(y, x);

    path.push({ lat: toDeg(φi), lon: toDeg(λi) });
  }

  return path;
};

// 4b️⃣ Initial bearing from point A to B (degrees 0..360)
const initialBearing = (lat1, lon1, lat2, lon2) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lon1);
  const λ2 = toRad(lon2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const brng = Math.atan2(y, x);
  const deg = (toDeg(brng) + 360) % 360;
  return deg;
};

// 5️⃣ Generate flight path given two city names
const generateFlightPath = async (cityA, cityB, spacingKm = 50) => {
  const coordA = await getCoordinates(cityA);
  const coordB = await getCoordinates(cityB);

  const path = getGreatCirclePathByDistance(coordA.lat, coordA.lon, coordB.lat, coordB.lon, spacingKm);

  console.log(`Generated path with ${path.length} points (~${spacingKm} km apart each)`);
  console.log(path);
};

module.exports = { generateFlightPath, getCoordinates, haversineDistance, getGreatCirclePathByDistance, initialBearing };