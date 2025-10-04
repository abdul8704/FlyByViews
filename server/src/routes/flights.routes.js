const express = require('express');
const router = express.Router();

const { 
  getRouteScenery, 
  checkCollections, 
  testFileStreaming, 
  testShortRoute 
} = require('../controllers/flights.controller');
const { validateSceneryRouteRequest } = require('../validators/route.validators');

router.post('/route-scenery', validateSceneryRouteRequest, getRouteScenery);
router.get('/debug/collections', checkCollections);
router.get('/test/file-streaming', testFileStreaming);
router.get('/test/short-route', testShortRoute);

module.exports = router;


