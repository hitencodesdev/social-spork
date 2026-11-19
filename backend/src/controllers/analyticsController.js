const DataStore = require('../models/dataStore');

class AnalyticsController {
  /**
   * Retrieves high-level KPI metrics for the Admin Dashboard
   * GET /api/v1/analytics/overview
   */
  async getOverviewMetrics(req, res, next) {
    try {
      let complaints = await DataStore.findComplaints({});
      let restaurants = await DataStore.findRestaurants({});

      // RBAC: If logged in as EMPLOYEE, filter by assigned outlets
      if (req.user && req.user.role === 'EMPLOYEE') {
        const myOutlets = restaurants.filter(r =>
          r.assignedEmployeeId === req.user.id || (req.user.assignedRestaurantIds && req.user.assignedRestaurantIds.includes(r._id))
        );
        const myOutletIds = myOutlets.map(r => r._id);
        const myPlatformRids = myOutlets.flatMap(r => [r.sRid, r.zRid].filter(Boolean));

        restaurants = myOutlets;
        complaints = complaints.filter(c =>
          (c.restaurantId && myOutletIds.includes(c.restaurantId)) ||
          (c.platformRestaurantId && myPlatformRids.includes(c.platformRestaurantId))
        );
      }

      const totalComplaints = complaints.length;
      let swiggyCount = 0;
      let zomatoCount = 0;
      let deliveredCount = 0;
      let sentCount = 0;
      let failedCount = 0;
      let pendingCount = 0;
      let needsAttentionCount = 0;

      for (const c of complaints) {
        if (c.platform === 'SWIGGY') swiggyCount++;
        if (c.platform === 'ZOMATO') zomatoCount++;

        const st = c.processingStatus;
        if (st === 'DELIVERED' || st === 'READ') deliveredCount++;
        else if (st === 'SENT') sentCount++;
        else if (st === 'FAILED') failedCount++;
        else if (st === 'PENDING' || st === 'QUEUED' || st === 'MATCHED') pendingCount++;
        else if (st === 'UNMATCHED_RESTAURANT' || st === 'MISSING_PHONE' || st === 'NEEDS_ATTENTION') needsAttentionCount++;
      }

      const totalRestaurants = restaurants.length;
      const activeRestaurants = restaurants.filter(r => r.isActive).length;
      const missingPhoneRestaurants = restaurants.filter(r => !r.whatsAppNumber).length;

      // Recent 7 days activity breakdown
      const dateMap = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        dateMap[dateKey] = { date: dateKey, total: 0, swiggy: 0, zomato: 0, delivered: 0 };
      }

      for (const c of complaints) {
        const cDate = (c.ingestedAt || c.createdAt || '').toString().split('T')[0];
        if (dateMap[cDate]) {
          dateMap[cDate].total++;
          if (c.platform === 'SWIGGY') dateMap[cDate].swiggy++;
          if (c.platform === 'ZOMATO') dateMap[cDate].zomato++;
          if (c.processingStatus === 'DELIVERED' || c.processingStatus === 'READ') dateMap[cDate].delivered++;
        }
      }

      return res.json({
        success: true,
        metrics: {
          totalComplaints,
          swiggyCount,
          zomatoCount,
          deliveredCount,
          sentCount,
          failedCount,
          pendingCount,
          needsAttentionCount,
          deliveryRate: totalComplaints > 0 ? Math.round(((deliveredCount + sentCount) / totalComplaints) * 100) : 100,
          totalRestaurants,
          activeRestaurants,
          missingPhoneRestaurants
        },
        chartData: Object.values(dateMap)
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
