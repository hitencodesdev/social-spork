const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_SECRET_KEY: process.env.API_SECRET_KEY || 'spork_secret_ingest_key_2026',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/social_spork',
  WHATSAPP: {
    MODE: process.env.WHATSAPP_MODE || 'mock', // 'mock' or 'live'
    API_VERSION: process.env.WHATSAPP_API_VERSION || 'v21.0',
    PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WABA_ID: process.env.WHATSAPP_WABA_ID,
    WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'social_spork_webhook_verify_2026',
    TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME || 'restaurant_complaint_alert_v1',
    TEMPLATE_LANG: process.env.WHATSAPP_TEMPLATE_LANG || 'en'
  },
  GOOGLE_SHEETS: {
    SHEET_ID: process.env.GOOGLE_SHEET_ID,
    SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY
  },
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5173'
};
