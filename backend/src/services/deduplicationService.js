const crypto = require('crypto');
const DataStore = require('../models/dataStore');

class DeduplicationService {
  /**
   * Generates a deterministic SHA-256 fingerprint for a complaint
   * Prioritizes canonical event ID (Tier 1) over composite item/order info (Tier 2).
   */
  generateFingerprint(payload) {
    const platform = (payload.platform || '').trim().toUpperCase();
    const restaurantId = (payload.restaurantId || payload.platformRestaurantId || '').trim();
    const orderId = (payload.orderId || '').trim();
    const eventId = (payload.complaintEventId || payload.disputeId || '').trim();
    const item = (payload.productName || payload.item || '').trim().toLowerCase();
    const issue = (payload.issue || payload.category || '').trim().toLowerCase();

    let rawString = '';
    let tier = 'TIER_1_CANONICAL';

    if (eventId) {
      // Tier 1: Canonical Platform Dispute/Event ID
      rawString = `${platform}_${restaurantId}_${eventId}`;
      tier = 'TIER_1_CANONICAL';
    } else if (orderId) {
      // Tier 2: Composite Order + Item + Issue
      rawString = `${platform}_${restaurantId}_${orderId}_${item}_${issue}`;
      tier = 'TIER_2_COMPOSITE';
    } else {
      // Tier 3: Incomplete data fallback (flagged for review)
      rawString = `${platform}_${restaurantId}_${Date.now()}_${Math.random()}`;
      tier = 'TIER_3_INCOMPLETE';
    }

    const dedupKey = crypto.createHash('sha256').update(rawString).digest('hex');

    return { dedupKey, tier, rawFingerprintSource: rawString };
  }

  /**
   * Checks if the complaint has already been ingested.
   */
  async checkDuplicate(dedupKey) {
    const existing = await DataStore.findComplaintByDedupKey(dedupKey);
    return {
      isDuplicate: !!existing,
      existingComplaint: existing || null
    };
  }
}

module.exports = new DeduplicationService();
