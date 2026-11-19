const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.get('/whatsapp', (req, res) => webhookController.verifyWhatsAppWebhook(req, res));
router.post('/whatsapp', (req, res, next) => webhookController.handleWhatsAppWebhook(req, res, next));

module.exports = router;
