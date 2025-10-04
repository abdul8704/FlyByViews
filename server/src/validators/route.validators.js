const ApiError = require('../utils/ApiError');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const validateSceneryRouteRequest = (req, res, next) => {
  const { sourceCity, destCity } = req.body || {};

  if (!isNonEmptyString(sourceCity)) {
    return next(new ApiError(400, 'bad_request', 'sourceCity is required'));
  }
  if (!isNonEmptyString(destCity)) {
    return next(new ApiError(400, 'bad_request', 'destCity is required'));
  }
  // spacingKm is fixed by configuration; not user-provided

  next();
};

module.exports = { validateSceneryRouteRequest };


