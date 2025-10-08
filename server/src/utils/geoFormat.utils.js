// Formatting utilities for MongoDB geographic data
// Converts MongoDB documents to standardized feature format

// Format MongoDB documents to match the expected feature format
function formatFeatures(docs, genericType) {
  return docs.map(doc => {
    // Extract coordinates based on geometry type
    let lat, lon;
    if (doc.geometry.type === 'Point') {
      [lon, lat] = doc.geometry.coordinates;
    } else if (doc.geometry.type === 'LineString') {
      // Use first coordinate for LineString
      [lon, lat] = doc.geometry.coordinates[0];
    } else if (doc.geometry.type === 'Polygon') {
      // Use first coordinate of first ring for Polygon
      [lon, lat] = doc.geometry.coordinates[0][0];
    }

    // Handle elevation data (can be string, number, or object)
    let elevation = null;
    if (doc.properties.elevation) {
      elevation = parseFloat(doc.properties.elevation);
    } else if (doc.properties.ele) {
      if (typeof doc.properties.ele === 'object' && doc.properties.ele.$numberDouble) {
        elevation = parseFloat(doc.properties.ele.$numberDouble);
      } else {
        elevation = parseFloat(doc.properties.ele);
      }
    }

    return {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      name: doc.properties.name || doc.properties.alt_name || 'Unnamed',
      type: doc.properties.natural,
      genericType: genericType,
      elevation: isNaN(elevation) ? null : elevation,
      source: 'mongodb',
      geometry_type: doc.geometry.type,
      // Include additional properties if available
      ...(doc.properties.prominence && { prominence: doc.properties.prominence }),
      ...(doc.properties.isolation && { isolation: doc.properties.isolation })
    };
  });
}

// Create a circular polygon for area queries (approximate)
function createCirclePolygon(lat, lon, radiusMeters, points = 16) {
  const earthRadius = 6371000; // Earth radius in meters
  const coordinates = [];
  
  // Create points around the circle
  for (let i = 0; i < points; i++) {
    const angle = (i * 360 / points) * Math.PI / 180;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    
    const deltaLat = dy / earthRadius * 180 / Math.PI;
    const deltaLon = dx / (earthRadius * Math.cos(lat * Math.PI / 180)) * 180 / Math.PI;
    
    coordinates.push([lon + deltaLon, lat + deltaLat]);
  }
  
  // Close the polygon by adding the first point as the last point
  if (coordinates.length > 0) {
    coordinates.push([...coordinates[0]]);
  }
  
  return coordinates;
}

function preparePolygonForMongo(coords) {
  // Close loop if necessary
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push(first);
  }

  // Round floats to avoid tiny precision errors
  const rounded = coords.map(([lon, lat]) => [parseFloat(lon.toFixed(6)), parseFloat(lat.toFixed(6))]);

  return [rounded]; // wrap in extra array for GeoJSON Polygon
}

module.exports = {
  formatFeatures,
  createCirclePolygon,
  preparePolygonForMongo
};