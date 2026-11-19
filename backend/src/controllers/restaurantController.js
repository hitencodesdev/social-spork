const DataStore = require('../models/dataStore');
const RestaurantMatchingService = require('../services/restaurantMatchingService');
const SheetSyncService = require('../services/sheetSyncService');

class RestaurantController {
  /**
   * Retrieves restaurants list with search and filter
   * GET /api/v1/restaurants
   */
  async getRestaurants(req, res, next) {
    try {
      const { search, city, missingPhone, isActive } = req.query;
      let restaurants = await DataStore.findRestaurants({});

      // RBAC: If logged in as EMPLOYEE, return only assigned restaurants
      if (req.user && req.user.role === 'EMPLOYEE') {
        const allowedIds = req.user.assignedRestaurantIds || [];
        restaurants = restaurants.filter(r => 
          r.assignedEmployeeId === req.user.id || allowedIds.includes(r._id)
        );
      }

      if (isActive !== undefined) {
        const activeBool = isActive === 'true';
        restaurants = restaurants.filter(r => r.isActive === activeBool);
      }

      if (missingPhone === 'true') {
        restaurants = restaurants.filter(r => !r.whatsAppNumber || !RestaurantMatchingService.sanitizePhoneNumber(r.whatsAppNumber));
      }

      if (city) {
        restaurants = restaurants.filter(r => r.city && r.city.toLowerCase() === city.toLowerCase());
      }

      if (search) {
        const q = search.toLowerCase();
        restaurants = restaurants.filter(r =>
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.zRid && r.zRid.includes(q)) ||
          (r.sRid && r.sRid.includes(q)) ||
          (r.subzone && r.subzone.toLowerCase().includes(q)) ||
          (r.whatsAppNumber && r.whatsAppNumber.includes(q))
        );
      }

      return res.json({
        success: true,
        count: restaurants.length,
        restaurants
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves single restaurant by ID
   * GET /api/v1/restaurants/:id
   */
  async getRestaurantById(req, res, next) {
    try {
      const restaurant = await DataStore.findRestaurantById(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ success: false, error: 'Restaurant not found' });
      }
      return res.json({ success: true, restaurant });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Creates a new restaurant record
   * POST /api/v1/restaurants
   */
  async createRestaurant(req, res, next) {
    try {
      const { name, zRid, sRid, subzone, city, whatsAppNumber, whatsAppContactName, isActive, notes } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Restaurant name is required.' });
      }

      if (!zRid && !sRid) {
        return res.status(400).json({ success: false, error: 'At least one ID (Z-RID or S-RID) is required.' });
      }

      let sanitizedPhone = '';
      if (whatsAppNumber) {
        sanitizedPhone = RestaurantMatchingService.sanitizePhoneNumber(whatsAppNumber);
        if (!sanitizedPhone) {
          return res.status(400).json({
            success: false,
            error: `Invalid WhatsApp phone number: '${whatsAppNumber}'. Please provide a valid 10-digit Indian mobile or E.164 number.`
          });
        }
      }

      // Check duplicates
      if (zRid) {
        const existingZ = await DataStore.findRestaurantByPlatformId('ZOMATO', zRid);
        if (existingZ) {
          return res.status(400).json({ success: false, error: `Restaurant with Z-RID '${zRid}' already exists: ${existingZ.name}` });
        }
      }
      if (sRid) {
        const existingS = await DataStore.findRestaurantByPlatformId('SWIGGY', sRid);
        if (existingS) {
          return res.status(400).json({ success: false, error: `Restaurant with S-RID '${sRid}' already exists: ${existingS.name}` });
        }
      }

      const newRestaurant = await DataStore.createRestaurant({
        name: name.trim(),
        zRid: zRid ? String(zRid).trim() : null,
        sRid: sRid ? String(sRid).trim() : null,
        subzone: subzone || '',
        city: city || '',
        whatsAppNumber: sanitizedPhone || '',
        whatsAppContactName: whatsAppContactName || '',
        isActive: isActive !== undefined ? !!isActive : true,
        syncSource: 'MANUAL',
        notes: notes || '',
        lastSyncedAt: new Date()
      });

      return res.status(201).json({ success: true, restaurant: newRestaurant });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates restaurant details, especially registered WhatsApp number
   * PUT /api/v1/restaurants/:id
   */
  async updateRestaurant(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await DataStore.findRestaurantById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Restaurant not found' });
      }

      const { name, zRid, sRid, subzone, city, whatsAppNumber, whatsAppContactName, isActive, notes, assignedEmployeeId, assignedEmployeeName } = req.body;
      const updatePayload = {};

      if (assignedEmployeeId !== undefined) updatePayload.assignedEmployeeId = assignedEmployeeId || null;
      if (assignedEmployeeName !== undefined) updatePayload.assignedEmployeeName = assignedEmployeeName || 'Unassigned';

      if (name) updatePayload.name = name.trim();
      if (subzone !== undefined) updatePayload.subzone = subzone;
      if (city !== undefined) updatePayload.city = city;
      if (whatsAppContactName !== undefined) updatePayload.whatsAppContactName = whatsAppContactName;
      if (isActive !== undefined) updatePayload.isActive = !!isActive;
      if (notes !== undefined) updatePayload.notes = notes;

      if (zRid !== undefined) updatePayload.zRid = zRid ? String(zRid).trim() : null;
      if (sRid !== undefined) updatePayload.sRid = sRid ? String(sRid).trim() : null;

      if (whatsAppNumber !== undefined) {
        if (!whatsAppNumber) {
          updatePayload.whatsAppNumber = '';
        } else {
          const sanitized = RestaurantMatchingService.sanitizePhoneNumber(whatsAppNumber);
          if (!sanitized) {
            return res.status(400).json({
              success: false,
              error: `Invalid WhatsApp phone number: '${whatsAppNumber}'. Please provide a valid 10-digit Indian mobile or E.164 number.`
            });
          }
          updatePayload.whatsAppNumber = sanitized;
        }
      }

      const updated = await DataStore.updateRestaurant(id, updatePayload);
      return res.json({ success: true, restaurant: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generates and downloads a sample Excel Master Sheet template
   * GET /api/v1/restaurants/sample-template
   */
  async downloadSampleTemplate(req, res, next) {
    try {
      const workbook = await SheetSyncService.generateSampleExcelWorkbook();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Social_Spork_Restaurant_Master_Template.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RestaurantController();
