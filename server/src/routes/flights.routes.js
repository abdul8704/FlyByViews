const express = require('express');
const router = express.Router();

const { getRouteSceneryMongo } = require('../controllers/flights.controller');
const { validateSceneryRouteRequest } = require('../validators/route.validators');

router.post('/route-scenery', validateSceneryRouteRequest, getRouteSceneryMongo);

module.exports = router;