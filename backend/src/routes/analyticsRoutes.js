const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

router.get('/overview', (req, res, next) => analyticsController.getOverviewMetrics(req, res, next));

module.exports = router;
