const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

router.use(authenticateUser);
router.use(requireAdmin);

router.get('/whatsapp', (req, res, next) => settingsController.getWhatsAppSettings(req, res, next));
router.post('/whatsapp', (req, res, next) => settingsController.updateWhatsAppSettings(req, res, next));
router.post('/whatsapp/test-send', (req, res, next) => settingsController.testSend(req, res, next));

module.exports = router;
