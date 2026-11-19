const DataStore = require('../models/dataStore');
const DeduplicationService = require('../services/deduplicationService');
const QueueService = require('../services/queueService');

class ComplaintController {
  /**
   * Ingests a new complaint from Swiggy, Zomato, Extension or Batch upload
   * POST /api/v1/complaints/ingest
   */
  async ingestComplaint(req, res, next) {
    try {
      const {
        platform,
        restaurantId,
        platformRestaurantId,
        orderId,
        complaintEventId,
        disputeId,
        category,
        issue,
        productName,
        customerDescription,
        imageUrls,
        platformCreatedAt
      } = req.body;

      const p = (platform || '').trim().toUpperCase();
      const rid = (platformRestaurantId || restaurantId || '').trim();
      const oid = (orderId || '').trim();

      if (!p || (p !== 'SWIGGY' && p !== 'ZOMATO')) {
        return res.status(400).json({
          success: false,
          error: "Valid 'platform' ('SWIGGY' or 'ZOMATO') is required."
        });
      }

      if (!rid) {
        return res.status(400).json({
          success: false,
          error: "Platform restaurant ID ('restaurantId' or 'platformRestaurantId') is required."
        });
      }

      if (!oid) {
        return res.status(400).json({
          success: false,
          error: "'orderId' is required."
        });
      }

      // 1. Generate Deterministic Deduplication Fingerprint (Hierarchical)
      const { dedupKey, tier, rawFingerprintSource } = DeduplicationService.generateFingerprint({
        platform: p,
        restaurantId: rid,
        orderId: oid,
        complaintEventId: complaintEventId || disputeId,
        productName,
        issue,
        category
      });

      // 2. Check for Duplicates
      const { isDuplicate, existingComplaint } = await DeduplicationService.checkDuplicate(dedupKey);

      if (isDuplicate) {
        console.log(`[Ingest] Idempotent skip: Duplicate complaint detected for ${oid} (${dedupKey})`);
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Complaint has already been ingested and processed.',
          complaintId: existingComplaint._id,
          dedupKey,
          status: existingComplaint.processingStatus
        });
      }

      // 3. Create Complaint Document
      const complaintData = {
        dedupKey,
        platform: p,
        platformRestaurantId: rid,
        orderId: oid,
        complaintEventId: (complaintEventId || disputeId || '').trim() || null,
        category: category || 'General Complaint',
        issue: issue || '',
        productName: productName || '',
        customerDescription: customerDescription || '',
        imageUrls: Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []),
        platformCreatedAt: platformCreatedAt ? new Date(platformCreatedAt) : new Date(),
        ingestedAt: new Date(),
        processingStatus: 'PENDING'
      };

      const newComplaint = await DataStore.createComplaint(complaintData);

      // 4. Enqueue for Asynchronous Matching & Dispatch
      await QueueService.enqueueComplaint(newComplaint._id);

      return res.status(201).json({
        success: true,
        duplicate: false,
        message: 'Complaint successfully ingested and queued for WhatsApp notification.',
        complaint: newComplaint,
        dedupTier: tier
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves list of complaints with filtering and search
   * GET /api/v1/complaints
   */
  async getComplaints(req, res, next) {
    try {
      const { platform, status, restaurantId, search } = req.query;
      const filter = {};

      if (platform) {
        filter.platform = platform.toUpperCase();
      }
      if (status) {
        filter.processingStatus = status;
      }
      if (restaurantId) {
        filter.platformRestaurantId = restaurantId;
      }

      let complaints = await DataStore.findComplaints(filter);

      // RBAC: If logged in as EMPLOYEE, restrict complaints to assigned outlets
      if (req.user && req.user.role === 'EMPLOYEE') {
        const myRestaurants = await DataStore.findRestaurants({});
        const myOutlets = myRestaurants.filter(r =>
          r.assignedEmployeeId === req.user.id || (req.user.assignedRestaurantIds && req.user.assignedRestaurantIds.includes(r._id))
        );
        const myOutletIds = myOutlets.map(r => r._id);
        const myPlatformRids = myOutlets.flatMap(r => [r.sRid, r.zRid].filter(Boolean));

        complaints = complaints.filter(c =>
          (c.restaurantId && myOutletIds.includes(c.restaurantId)) ||
          (c.platformRestaurantId && myPlatformRids.includes(c.platformRestaurantId))
        );
      }

      if (search) {
        const q = search.toLowerCase();
        complaints = complaints.filter(c =>
          (c.orderId && c.orderId.toLowerCase().includes(q)) ||
          (c.restaurantName && c.restaurantName.toLowerCase().includes(q)) ||
          (c.productName && c.productName.toLowerCase().includes(q)) ||
          (c.issue && c.issue.toLowerCase().includes(q)) ||
          (c.platformRestaurantId && c.platformRestaurantId.includes(q))
        );
      }

      return res.json({
        success: true,
        count: complaints.length,
        complaints
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves single complaint details and its WhatsApp delivery log
   * GET /api/v1/complaints/:id
   */
  async getComplaintById(req, res, next) {
    try {
      const { id } = req.params;
      const complaint = await DataStore.findComplaintById(id);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          error: 'Complaint not found'
        });
      }

      const logs = await DataStore.findNotificationLogs({ complaintId: complaint._id });

      return res.json({
        success: true,
        complaint,
        notificationLogs: logs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually retries failed WhatsApp notification dispatch
   * POST /api/v1/complaints/:id/retry
   */
  async retryComplaint(req, res, next) {
    try {
      const { id } = req.params;
      const complaint = await DataStore.findComplaintById(id);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          error: 'Complaint not found'
        });
      }

      // Reset retry count and enqueue
      await DataStore.updateComplaint(complaint._id, {
        processingStatus: 'PENDING',
        retryCount: (complaint.retryCount || 0) + 1,
        failureReason: null
      });

      await QueueService.enqueueComplaint(complaint._id);

      return res.json({
        success: true,
        message: 'Notification retry initiated successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ComplaintController();
