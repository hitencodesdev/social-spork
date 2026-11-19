const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const WhatsAppService = require('../services/whatsappService');

const ENV_PATH = path.resolve(__dirname, '../../.env');

class SettingsController {
  /**
   * Retrieves current WhatsApp Sender & API Configuration
   * GET /api/v1/settings/whatsapp
   */
  getWhatsAppSettings(req, res) {
    const isMock = config.WHATSAPP.MODE === 'mock';
    const token = config.WHATSAPP.ACCESS_TOKEN || '';
    const maskedToken = token.length > 10 ? `${token.slice(0, 6)}...${token.slice(-4)}` : (isMock ? 'mock_token' : '');

    return res.json({
      success: true,
      settings: {
        mode: config.WHATSAPP.MODE,
        phoneNumberId: config.WHATSAPP.PHONE_NUMBER_ID || '',
        wabaId: config.WHATSAPP.WABA_ID || '',
        templateName: config.WHATSAPP.TEMPLATE_NAME || 'restaurant_complaint_alert_v1',
        templateLang: config.WHATSAPP.TEMPLATE_LANG || 'en',
        hasToken: !!token && token !== 'mock_permanent_system_user_token',
        maskedToken,
        senderDisplayNumber: process.env.WHATSAPP_DISPLAY_NUMBER || (isMock ? '+91 99999 00000 (Simulated Sender)' : 'Verified Meta Business Number')
      }
    });
  }

  /**
   * Updates WhatsApp Sender Configuration and updates .env file
   * POST /api/v1/settings/whatsapp
   */
  async updateWhatsAppSettings(req, res, next) {
    try {
      const { mode, phoneNumberId, accessToken, wabaId, displayNumber, templateName } = req.body;

      if (mode && (mode !== 'mock' && mode !== 'live')) {
        return res.status(400).json({ success: false, error: "Mode must be 'mock' or 'live'." });
      }

      // Read current .env
      let envContent = '';
      if (fs.existsSync(ENV_PATH)) {
        envContent = fs.readFileSync(ENV_PATH, 'utf8');
      }

      const updateOrAppend = (key, value) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      };

      if (mode !== undefined) {
        config.WHATSAPP.MODE = mode;
        updateOrAppend('WHATSAPP_MODE', mode);
      }
      if (phoneNumberId !== undefined) {
        config.WHATSAPP.PHONE_NUMBER_ID = phoneNumberId.trim();
        updateOrAppend('WHATSAPP_PHONE_NUMBER_ID', phoneNumberId.trim());
      }
      if (accessToken !== undefined && accessToken.trim()) {
        config.WHATSAPP.ACCESS_TOKEN = accessToken.trim();
        updateOrAppend('WHATSAPP_ACCESS_TOKEN', accessToken.trim());
      }
      if (wabaId !== undefined) {
        config.WHATSAPP.WABA_ID = wabaId.trim();
        updateOrAppend('WHATSAPP_WABA_ID', wabaId.trim());
      }
      if (displayNumber !== undefined) {
        process.env.WHATSAPP_DISPLAY_NUMBER = displayNumber.trim();
        updateOrAppend('WHATSAPP_DISPLAY_NUMBER', displayNumber.trim());
      }
      if (templateName !== undefined) {
        config.WHATSAPP.TEMPLATE_NAME = templateName.trim();
        updateOrAppend('WHATSAPP_TEMPLATE_NAME', templateName.trim());
      }

      fs.writeFileSync(ENV_PATH, envContent.trim() + '\n', 'utf8');

      console.log(`[Settings] WhatsApp Sender configuration updated. Mode: ${config.WHATSAPP.MODE}`);

      return res.json({
        success: true,
        message: 'WhatsApp sender settings updated successfully.',
        settings: {
          mode: config.WHATSAPP.MODE,
          phoneNumberId: config.WHATSAPP.PHONE_NUMBER_ID,
          wabaId: config.WHATSAPP.WABA_ID,
          templateName: config.WHATSAPP.TEMPLATE_NAME,
          senderDisplayNumber: process.env.WHATSAPP_DISPLAY_NUMBER || (config.WHATSAPP.MODE === 'mock' ? '+91 99999 00000 (Simulated Sender)' : 'Verified Meta Business Number')
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sends a test WhatsApp ping to verify Sender credentials
   * POST /api/v1/settings/whatsapp/test-send
   */
  async testSend(req, res, next) {
    try {
      const { testPhone } = req.body;
      if (!testPhone) {
        return res.status(400).json({ success: false, error: 'Recipient test phone number is required.' });
      }

      const dummyComplaint = {
        _id: 'test_complaint_' + Date.now(),
        platform: 'SWIGGY',
        platformRestaurantId: '12345',
        orderId: 'TEST-999999',
        category: 'Test Alert',
        issue: 'WhatsApp Sender Connection Test',
        productName: 'System Test Item',
        customerDescription: 'This is a test notification to verify your Social Spork WhatsApp sender account.',
        platformCreatedAt: new Date(),
        ingestedAt: new Date()
      };

      const dummyRestaurant = {
        _id: 'test_rest',
        name: 'Social Spork Test Kitchen',
        whatsAppNumber: testPhone
      };

      const result = await WhatsAppService.sendComplaintAlert(
        dummyComplaint,
        dummyRestaurant,
        testPhone,
        null
      );

      return res.json({
        success: result.success,
        mode: result.mode,
        wabaMessageId: result.wabaMessageId,
        message: result.success
          ? `Test WhatsApp message successfully sent to ${testPhone} in ${result.mode.toUpperCase()} mode!`
          : `Failed: ${result.error || 'Unknown error'}`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
