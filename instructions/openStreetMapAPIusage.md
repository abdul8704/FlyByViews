# OpenStreetMap Nominatim API Usage

This guide shows how to use Nominatim for geocoding (city name to coordinates) and reverse geocoding (coordinates to address).

---

## 1. Geocoding: Convert City Name to Coordinates

- Endpoint:

```text
GET https://nominatim.openstreetmap.org/search?q={city_name}&format=json
```

- Example (JavaScript):

```js
const axios = require('axios'); // If using Node.js
// In a browser, make sure axios is imported via a script tag or bundler

// 1️⃣ Geocoding: City Name → Coordinates
async function getCoordinates(city) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: city,
        format: 'json'
      },
      headers: {
        'User-Agent': 'MyFlightApp/1.0 (your-email@example.com)' // Required by Nominatim
      }
    });

    const data = response.data;
    if (!data || data.length === 0) throw new Error('City not found');

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    };
  } catch (error) {
    console.error('Error fetching coordinates:', error.message);
    throw error;
  }
}

// Example usage
getCoordinates('Chennai').then(console.log);
// Output: { lat: 13.0827, lon: 80.2707 }
```

- Notes:
  - Replace `{city_name}` with the desired city.
  - The `format=json` parameter ensures the response is in JSON format.
  - Always encode the city name using `encodeURIComponent` to handle special characters.

---

## 2. Reverse Geocoding: Convert Coordinates to Address

- Endpoint:

```text
GET https://nominatim.openstreetmap.org/reverse?lat={latitude}&lon={longitude}&format=json
```

- Example (JavaScript):

```js
async function getAddress(lat, lon) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  );
  const data = await response.json();
  if (!data.address) throw new Error("Address not found");
  return data.address;
}

// Usage
getAddress(13.0827, 80.2707).then(console.log);
// Output: { road: "Mount Road", city: "Chennai", ... }
```

- Notes:
  - Replace `{latitude}` and `{longitude}` with the desired coordinates.
  - The `format=json` parameter ensures the response is in JSON format.

---

## 3. Usage Policy and Best Practices

- Rate limiting: Limit your requests to ~1 per second to avoid overloading the server.
- Attribution: Provide proper attribution as required by the Open Database License (ODbL).
- User-Agent: Include a unique `User-Agent` header to identify your application.
- Caching: Cache results to minimize repeated requests and improve performance.
- Bulk geocoding: Avoid bulk geocoding unless you run your own Nominatim instance.

---

## 4. Further Resources

- Official Documentation: Nominatim API Overview
- Demo Interface: Nominatim Demo
- Installation Guide: Setting Up Nominatim Locally