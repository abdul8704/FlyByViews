const { getSceneryAlongRoute } = require('../service/trips.service');

const getRouteScenery = async (req, res, next) => {
  try {
    const { sourceCity, destCity } = req.body;
    const data = await getSceneryAlongRoute(sourceCity, destCity);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getRouteScenery };


