const express = require('express');
const router = express.Router();

const { getRouteScenery } = require('../controllers/flights.controller');
const { validateSceneryRouteRequest } = require('../validators/route.validators');

router.post('/route-scenery', validateSceneryRouteRequest, getRouteScenery);

module.exports = router;


