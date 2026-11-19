const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { optionalAuth, requireAdmin } = require('../middleware/auth');

router.use(optionalAuth);

router.get('/sample-template', (req, res, next) => restaurantController.downloadSampleTemplate(req, res, next));
router.get('/', (req, res, next) => restaurantController.getRestaurants(req, res, next));
router.get('/:id', (req, res, next) => restaurantController.getRestaurantById(req, res, next));
router.post('/', (req, res, next) => restaurantController.createRestaurant(req, res, next));
router.put('/:id', (req, res, next) => restaurantController.updateRestaurant(req, res, next));

module.exports = router;
