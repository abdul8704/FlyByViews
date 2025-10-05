const ApiError = require('../utils/ApiError');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const validateSceneryRouteRequest = (req, res, next) => {
  const { sourceCity, destCity } = req.body || {};

  // Validate required city names
  if (!isNonEmptyString(sourceCity)) {
    return next(new ApiError(400, 'bad_request', 'sourceCity is required and must be a non-empty string'));
  }
  
  if (!isNonEmptyString(destCity)) {
    return next(new ApiError(400, 'bad_request', 'destCity is required and must be a non-empty string'));
  }

  // Optional: Validate departure and arrival times if provided
  const { departureTime, arrivalTime } = req.body;
  
  if (departureTime && !isValidDateTime(departureTime)) {
    return next(new ApiError(400, 'bad_request', 'departureTime must be a valid ISO 8601 datetime string'));
  }
  
  if (arrivalTime && !isValidDateTime(arrivalTime)) {
    return next(new ApiError(400, 'bad_request', 'arrivalTime must be a valid ISO 8601 datetime string'));
  }
  
  if (departureTime && arrivalTime) {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    
    if (arrival <= departure) {
      return next(new ApiError(400, 'bad_request', 'arrivalTime must be after departureTime'));
    }
  }

  next();
};

// Helper function to validate datetime strings
function isValidDateTime(dateString) {
  if (typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = { validateSceneryRouteRequest };

module.exports = { validateSceneryRouteRequest };


