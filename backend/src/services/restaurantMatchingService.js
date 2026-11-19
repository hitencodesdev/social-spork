const DataStore = require('../models/dataStore');

class RestaurantMatchingService {
  /**
   * Sanitizes and formats phone numbers to standard E.164 (+91XXXXXXXXXX)
   */
  sanitizePhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');

    // If starts with 0, strip leading 0
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // If 10 digits (India standard mobile), prefix with +91
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }

    // If 12 digits starting with 91, prefix with +
    if (/^91[6-9]\d{9}$/.test(cleaned)) {
      return `+${cleaned}`;
    }

    // If already in international + format
    if (/^\+[1-9]\d{9,14}$/.test(cleaned)) {
      return cleaned;
    }

    return null; // Invalid format
  }

  /**
   * Matches a platform complaint to a restaurant in the database
   * Swiggy -> S-RID
   * Zomato -> Z-RID
   */
  async matchRestaurant(platform, platformRestaurantId) {
    const p = (platform || '').toUpperCase();
    const rid = String(platformRestaurantId || '').trim();

    if (!rid) {
      return {
        matched: false,
        restaurant: null,
        status: 'UNMATCHED_RESTAURANT',
        reason: 'Missing platform restaurant ID in complaint payload'
      };
    }

    if (p !== 'SWIGGY' && p !== 'ZOMATO') {
      return {
        matched: false,
        restaurant: null,
        status: 'UNMATCHED_RESTAURANT',
        reason: `Unsupported platform: ${platform}`
      };
    }

    const restaurant = await DataStore.findRestaurantByPlatformId(p, rid);

    if (!restaurant) {
      return {
        matched: false,
        restaurant: null,
        status: 'UNMATCHED_RESTAURANT',
        reason: `No restaurant found with ${p === 'SWIGGY' ? 'S-RID' : 'Z-RID'}: ${rid}`
      };
    }

    if (!restaurant.isActive) {
      return {
        matched: false,
        restaurant,
        status: 'NEEDS_ATTENTION',
        reason: `Restaurant '${restaurant.name}' (${rid}) is currently marked inactive`
      };
    }

    const formattedPhone = this.sanitizePhoneNumber(restaurant.whatsAppNumber);
    if (!formattedPhone) {
      return {
        matched: true,
        restaurant,
        status: 'MISSING_PHONE',
        formattedPhone: null,
        reason: `Restaurant '${restaurant.name}' does not have a valid WhatsApp phone number configured`
      };
    }

    return {
      matched: true,
      restaurant,
      status: 'MATCHED',
      formattedPhone,
      reason: null
    };
  }
}

module.exports = new RestaurantMatchingService();
