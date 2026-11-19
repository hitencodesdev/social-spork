const config = require('../config/env');
const WhatsAppService = require('../services/whatsappService');

class WebhookController {
  /**
   * Meta WhatsApp Webhook Verification Handshake
   * GET /api/v1/webhooks/whatsapp
   */
  verifyWhatsAppWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.WHATSAPP.WEBHOOK_VERIFY_TOKEN) {
      console.log('[Meta Webhook] Successfully verified webhook challenge handshake.');
      return res.status(200).send(challenge);
    } else {
      console.warn('[Meta Webhook] Challenge verification failed. Token mismatch.');
      return res.sendStatus(403);
    }
  }

  /**
   * Meta WhatsApp Incoming Status & Message Events
   * POST /api/v1/webhooks/whatsapp
   */
  async handleWhatsAppWebhook(req, res, next) {
    try {
      const body = req.body;

      if (body.object === 'whatsapp_business_account') {
        const entries = body.entry || [];
        for (const entry of entries) {
          await WhatsAppService.processWebhookEvent(entry);
        }
        return res.status(200).send('EVENT_RECEIVED');
      }

      return res.sendStatus(404);
    } catch (error) {
      console.error('[Meta Webhook Error]', error);
      return res.sendStatus(500);
    }
  }
}

module.exports = new WebhookController();
