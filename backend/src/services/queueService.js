const DataStore = require('../models/dataStore');
const WhatsAppService = require('./whatsappService');
const MediaBufferService = require('./mediaBufferService');
const RestaurantMatchingService = require('./restaurantMatchingService');

class QueueService {
  constructor() {
    this.isProcessing = false;
    this.queue = [];
  }

  /**
   * Enqueues a complaint for background processing and notification dispatch
   */
  async enqueueComplaint(complaintId) {
    this.queue.push(complaintId);
    this.processNext();
  }

  /**
   * Processes queued complaints sequentially with safe error isolation
   */
  async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const complaintId = this.queue.shift();

    try {
      await this.processComplaint(complaintId);
    } catch (err) {
      console.error(`[QueueService] Error processing complaint ${complaintId}:`, err);
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  /**
   * Core execution pipeline for a single complaint
   */
  async processComplaint(complaintId) {
    const complaint = await DataStore.findComplaintById(complaintId);
    if (!complaint) return;

    // 1. Restaurant Matching
    const matchResult = await RestaurantMatchingService.matchRestaurant(
      complaint.platform,
      complaint.platformRestaurantId
    );

    if (!matchResult.matched) {
      await DataStore.updateComplaint(complaint._id, {
        processingStatus: matchResult.status,
        failureReason: matchResult.reason
      });
      console.warn(`[QueueService] Complaint ${complaint.orderId} could not be matched: ${matchResult.reason}`);
      return;
    }

    if (matchResult.status === 'MISSING_PHONE') {
      await DataStore.updateComplaint(complaint._id, {
        restaurantId: matchResult.restaurant._id,
        restaurantName: matchResult.restaurant.name,
        processingStatus: 'MISSING_PHONE',
        failureReason: matchResult.reason
      });
      console.warn(`[QueueService] Restaurant ${matchResult.restaurant.name} has no WhatsApp number configured`);
      return;
    }

    const restaurant = matchResult.restaurant;
    const recipientPhone = matchResult.formattedPhone;

    // Update restaurant reference
    await DataStore.updateComplaint(complaint._id, {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      processingStatus: 'QUEUED'
    });

    // 2. Buffer Images and Upload to Meta Media API
    let primaryMediaId = null;
    let bufferedMedia = [];

    if (complaint.imageUrls && complaint.imageUrls.length > 0) {
      console.log(`[QueueService] Buffering ${complaint.imageUrls.length} images for complaint ${complaint.orderId}...`);
      bufferedMedia = await MediaBufferService.processComplaintImages(complaint.imageUrls);
      
      const successfulUpload = bufferedMedia.find(m => m.wabaMediaId);
      if (successfulUpload) {
        primaryMediaId = successfulUpload.wabaMediaId;
      }

      await DataStore.updateComplaint(complaint._id, { bufferedMedia });
    }

    // 3. Dispatch WhatsApp Notification
    console.log(`[QueueService] Dispatching WhatsApp alert to ${recipientPhone} for ${restaurant.name}...`);
    const sendResult = await WhatsAppService.sendComplaintAlert(
      complaint,
      restaurant,
      recipientPhone,
      primaryMediaId
    );

    console.log(`[QueueService] Dispatch completed for ${complaint.orderId}:`, sendResult.status);
    return sendResult;
  }
}

module.exports = new QueueService();
