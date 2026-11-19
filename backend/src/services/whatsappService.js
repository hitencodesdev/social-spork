const axios = require('axios');
const config = require('../config/env');
const DataStore = require('../models/dataStore');

class WhatsAppService {
  /**
   * Formats the WhatsApp message payload using approved template structure
   */
  buildTemplatePayload(recipientPhone, complaint, restaurant, primaryMediaId = null) {
    const templateName = config.WHATSAPP.TEMPLATE_NAME;
    const lang = config.WHATSAPP.TEMPLATE_LANG;

    // Body parameters:
    // {{1}}: Restaurant Name
    // {{2}}: Platform (Swiggy / Zomato)
    // {{3}}: Platform Restaurant ID
    // {{4}}: Order ID
    // {{5}}: Complaint Category / Issue
    // {{6}}: Product Name
    // {{7}}: Customer Note
    // {{8}}: Timestamp
    // {{9}}: Inspection URL / Token
    const rawDate = complaint.platformCreatedAt || complaint.ingestedAt || complaint.createdAt || new Date();
    const dateObj = new Date(rawDate);
    const validDate = !isNaN(dateObj.getTime()) ? dateObj : new Date();

    const formattedDate = validDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: restaurant.name || 'Restaurant' },
          { type: 'text', text: complaint.platform || 'Platform' },
          { type: 'text', text: complaint.platformRestaurantId || 'N/A' },
          { type: 'text', text: complaint.orderId || 'N/A' },
          { type: 'text', text: complaint.issue || complaint.category || 'Quality Issue' },
          { type: 'text', text: complaint.productName || 'Order Item' },
          { type: 'text', text: complaint.customerDescription || 'Customer dispute reported.' },
          { type: 'text', text: formattedDate },
          { type: 'text', text: complaint._id ? String(complaint._id) : 'details' }
        ]
      }
    ];

    // If media ID is available, attach to Header
    if (primaryMediaId) {
      components.unshift({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: {
              id: primaryMediaId
            }
          }
        ]
      });
    }

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone.replace('+', ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: lang },
        components
      }
    };
  }

  /**
   * Sends complaint notification via WhatsApp Cloud API or Mock Simulator
   */
  async sendComplaintAlert(complaint, restaurant, recipientPhone, primaryMediaId = null) {
    const payload = this.buildTemplatePayload(recipientPhone, complaint, restaurant, primaryMediaId);

    // Initial log creation in database
    const notificationLog = await DataStore.createNotificationLog({
      complaintId: complaint._id,
      restaurantId: restaurant._id,
      recipientPhone,
      templateName: config.WHATSAPP.TEMPLATE_NAME,
      payloadSent: payload,
      status: 'QUEUED',
      attempts: 1,
      statusHistory: [
        {
          status: 'QUEUED',
          timestamp: new Date(),
          details: `Queued in ${config.WHATSAPP.MODE.toUpperCase()} mode`
        }
      ]
    });

    // MOCK MODE: Simulate successful delivery
    if (config.WHATSAPP.MODE === 'mock') {
      const mockWabaId = `wamid.MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      console.log(`[WhatsApp Mock] Sending alert to ${recipientPhone} for ${restaurant.name} (Order: ${complaint.orderId})`);
      console.log(`[WhatsApp Mock Payload]`, JSON.stringify(payload, null, 2));

      // Update log with mock WABA ID and SENT status
      await DataStore.updateNotificationLogByWabaId(mockWabaId, 'SENT', 'Mock transmission successful');
      await DataStore.updateComplaint(complaint._id, {
        processingStatus: 'SENT',
        lastAttemptAt: new Date()
      });

      // Simulate webhook delivery after 1.5 seconds
      setTimeout(async () => {
        await DataStore.updateNotificationLogByWabaId(mockWabaId, 'DELIVERED', 'Delivered to recipient handset (simulated)');
        await DataStore.updateComplaint(complaint._id, {
          processingStatus: 'DELIVERED'
        });
        console.log(`[WhatsApp Mock] Callback delivered for ${mockWabaId} -> DELIVERED`);
      }, 1500);

      return {
        success: true,
        wabaMessageId: mockWabaId,
        mode: 'mock',
        status: 'SENT'
      };
    }

    // LIVE META CLOUD API MODE
    try {
      const url = `https://graph.facebook.com/${config.WHATSAPP.API_VERSION}/${config.WHATSAPP.PHONE_NUMBER_ID}/messages`;
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.WHATSAPP.ACCESS_TOKEN}`
        },
        timeout: 10000
      });

      const wabaMessageId = response.data?.messages?.[0]?.id;

      await DataStore.updateNotificationLogByWabaId(wabaMessageId, 'SENT', 'Transmitted to Meta Cloud API');
      await DataStore.updateComplaint(complaint._id, {
        processingStatus: 'SENT',
        lastAttemptAt: new Date()
      });

      return {
        success: true,
        wabaMessageId,
        mode: 'live',
        status: 'SENT'
      };
    } catch (error) {
      const errorData = error.response?.data?.error || {};
      const errorMessage = errorData.message || error.message;
      const errorCode = errorData.code ? String(errorData.code) : 'NETWORK_ERROR';

      console.error(`[WhatsApp Live Error] Code: ${errorCode}, Message: ${errorMessage}`);

      await DataStore.updateComplaint(complaint._id, {
        processingStatus: 'FAILED',
        failureReason: `WhatsApp API Error (${errorCode}): ${errorMessage}`,
        lastAttemptAt: new Date()
      });

      return {
        success: false,
        error: errorMessage,
        errorCode,
        status: 'FAILED'
      };
    }
  }

  /**
   * Handles incoming Meta Webhook delivery status events (sent, delivered, read, failed)
   */
  async processWebhookEvent(entry) {
    try {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const statuses = change?.value?.statuses || [];
        for (const statusObj of statuses) {
          const wabaId = statusObj.id;
          const status = (statusObj.status || '').toUpperCase(); // 'SENT', 'DELIVERED', 'READ', 'FAILED'
          const timestamp = statusObj.timestamp ? new Date(statusObj.timestamp * 1000) : new Date();

          let details = `Meta status update: ${status}`;
          if (status === 'FAILED' && statusObj.errors) {
            details += ` - Error: ${JSON.stringify(statusObj.errors)}`;
          }

          console.log(`[WhatsApp Webhook] Message ${wabaId} updated to ${status}`);
          await DataStore.updateNotificationLogByWabaId(wabaId, status, details);

          // Update associated complaint status
          const logs = await DataStore.findNotificationLogs({ wabaMessageId: wabaId });
          if (logs && logs.length > 0) {
            const complaintId = logs[0].complaintId;
            await DataStore.updateComplaint(complaintId, {
              processingStatus: status
            });
          }
        }
      }
      return true;
    } catch (error) {
      console.error('[WhatsApp Webhook Handler Error]', error);
      return false;
    }
  }
}

module.exports = new WhatsAppService();
