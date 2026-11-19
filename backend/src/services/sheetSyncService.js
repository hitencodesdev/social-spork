const ExcelJS = require('exceljs');
const DataStore = require('../models/dataStore');
const RestaurantMatchingService = require('./restaurantMatchingService');
const config = require('../config/env');

class SheetSyncService {
  /**
   * Normalizes header strings (e.g., 'Z-RID', 'z_rid', 'Zomato ID' -> 'zRid')
   */
  normalizeHeader(header) {
    if (!header) return '';
    const clean = String(header).trim().toLowerCase().replace(/[\s\-_]/g, '');

    if (clean.includes('zrid') || clean.includes('zomatoid') || clean.includes('zomatorestaurantid')) return 'zRid';
    if (clean.includes('srid') || clean.includes('swiggyid') || clean.includes('swiggyrestaurantid')) return 'sRid';
    if (clean.includes('name') || clean.includes('restaurantname')) return 'name';
    if (clean.includes('subzone') || clean.includes('zone') || clean.includes('area') || clean.includes('locality')) return 'subzone';
    if (clean.includes('city')) return 'city';
    if (clean.includes('whatsapp') || clean.includes('phone') || clean.includes('contact') || clean.includes('mobile')) return 'whatsAppNumber';
    if (clean.includes('status') || clean.includes('isactive') || clean.includes('active')) return 'isActive';
    if (clean.includes('contactname') || clean.includes('manager')) return 'whatsAppContactName';

    return clean;
  }

  /**
   * Parses and synchronizes an Excel (.xlsx/.csv) workbook buffer or file
   */
  async syncFromExcel(bufferOrPath, originalFileName = 'restaurant_master.xlsx', triggeredBy = 'MANUAL_EXCEL_UPLOAD') {
    const startTime = Date.now();
    const workbook = new ExcelJS.Workbook();

    if (typeof bufferOrPath === 'string') {
      await workbook.xlsx.readFile(bufferOrPath);
    } else {
      await workbook.xlsx.load(bufferOrPath);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel workbook contains no sheets.');
    }

    const headerMap = {};
    let headerRowNumber = 1;

    // Detect header row (first row with recognizable columns)
    worksheet.eachRow((row, rowNumber) => {
      if (Object.keys(headerMap).length > 0) return;
      const values = row.values;
      for (let col = 1; col < values.length; col++) {
        const normalized = this.normalizeHeader(values[col]);
        if (normalized) {
          headerMap[col] = normalized;
        }
      }
      if (headerMap[1] || headerMap[2] || headerMap[3]) {
        headerRowNumber = rowNumber;
      }
    });

    let totalRowsRead = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let recordsFailed = 0;
    const validationErrors = [];

    const seenZRids = new Set();
    const seenSRids = new Set();

    // Iterate through data rows
    const rowPromises = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return; // Skip headers
      totalRowsRead++;

      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const fieldName = headerMap[colNumber];
        if (fieldName) {
          rowData[fieldName] = cell.text ? String(cell.text).trim() : (cell.value ? String(cell.value).trim() : '');
        }
      });

      // Basic validation
      const name = rowData.name || '';
      const zRid = rowData.zRid ? String(rowData.zRid).trim() : '';
      const sRid = rowData.sRid ? String(rowData.sRid).trim() : '';

      if (!name && !zRid && !sRid) {
        recordsSkipped++;
        return;
      }

      if (!zRid && !sRid) {
        recordsFailed++;
        validationErrors.push({
          row: rowNumber,
          restaurantName: name || 'Unknown',
          reason: 'Both Z-RID and S-RID are missing'
        });
        return;
      }

      // Check duplicates in the sheet itself
      if (zRid && seenZRids.has(zRid)) {
        validationErrors.push({
          row: rowNumber,
          restaurantName: name,
          reason: `Duplicate Z-RID (${zRid}) detected in input sheet`
        });
      }
      if (sRid && seenSRids.has(sRid)) {
        validationErrors.push({
          row: rowNumber,
          restaurantName: name,
          reason: `Duplicate S-RID (${sRid}) detected in input sheet`
        });
      }
      if (zRid) seenZRids.add(zRid);
      if (sRid) seenSRids.add(sRid);

      // Validate WhatsApp number if present in sheet
      let sanitizedPhone = null;
      if (rowData.whatsAppNumber) {
        sanitizedPhone = RestaurantMatchingService.sanitizePhoneNumber(rowData.whatsAppNumber);
        if (!sanitizedPhone) {
          validationErrors.push({
            row: rowNumber,
            restaurantName: name,
            reason: `Invalid phone number format: '${rowData.whatsAppNumber}'`
          });
        }
      }

      // Active status parser
      let isActive = true;
      if (rowData.isActive !== undefined && rowData.isActive !== '') {
        const val = String(rowData.isActive).toLowerCase();
        if (val === 'false' || val === '0' || val === 'inactive' || val === 'closed') {
          isActive = false;
        }
      }

      // Prepare upsert payload
      const syncRecord = {
        name: name || `Restaurant ${zRid || sRid}`,
        zRid: zRid || null,
        sRid: sRid || null,
        subzone: rowData.subzone || '',
        city: rowData.city || '',
        isActive,
        syncSource: 'EXCEL_IMPORT',
        lastSyncedAt: new Date()
      };

      if (sanitizedPhone) {
        syncRecord.whatsAppNumber = sanitizedPhone;
      }
      if (rowData.whatsAppContactName) {
        syncRecord.whatsAppContactName = rowData.whatsAppContactName;
      }

      rowPromises.push(async () => {
        try {
          // Find matching existing record: either by zRid or by sRid
          const orConditions = [];
          if (zRid) orConditions.push({ zRid });
          if (sRid) orConditions.push({ sRid });

          let existing = null;
          for (const cond of orConditions) {
            const key = Object.keys(cond)[0];
            const found = await DataStore.findRestaurantByPlatformId(key === 'zRid' ? 'ZOMATO' : 'SWIGGY', cond[key]);
            if (found) {
              existing = found;
              break;
            }
          }

          if (existing) {
            // Update existing without erasing WhatsApp number if missing in new sheet
            const updatePayload = { ...syncRecord };
            if (!syncRecord.whatsAppNumber && existing.whatsAppNumber) {
              delete updatePayload.whatsAppNumber;
            }
            await DataStore.updateRestaurant(existing._id, updatePayload);
            recordsUpdated++;
          } else {
            await DataStore.createRestaurant(syncRecord);
            recordsCreated++;
          }
        } catch (err) {
          recordsFailed++;
          validationErrors.push({
            row: rowNumber,
            restaurantName: name,
            reason: `Database error: ${err.message}`
          });
        }
      });
    });

    for (const promiseFn of rowPromises) {
      await promiseFn();
    }

    const durationMs = Date.now() - startTime;
    const status = recordsFailed === 0 ? 'SUCCESS' : (recordsCreated + recordsUpdated > 0 ? 'PARTIAL_SUCCESS' : 'FAILED');

    // Create sync history audit log
    const historyDoc = await DataStore.createSyncHistory({
      syncType: 'EXCEL_UPLOAD',
      fileName: originalFileName,
      triggeredBy,
      totalRowsRead,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      recordsFailed,
      validationErrors,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      status,
      durationMs
    });

    return {
      success: status !== 'FAILED',
      syncId: historyDoc._id,
      summary: {
        totalRowsRead,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errorsCount: validationErrors.length,
        durationMs
      },
      validationErrors
    };
  }

  /**
   * Generates a sample Master Excel file with proper headers and demo restaurants
   */
  async generateSampleExcelWorkbook() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Restaurant Master');

    sheet.columns = [
      { header: 'Restaurant Name', key: 'name', width: 25 },
      { header: 'Z-RID', key: 'zRid', width: 15 },
      { header: 'S-RID', key: 'sRid', width: 15 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Subzone', key: 'subzone', width: 20 },
      { header: 'WhatsApp Number', key: 'whatsAppNumber', width: 20 },
      { header: 'Manager Name', key: 'whatsAppContactName', width: 20 },
      { header: 'Status', key: 'isActive', width: 12 }
    ];

    sheet.addRows([
      {
        name: 'Sidewok Asian Diner',
        zRid: '18492011',
        sRid: '12345',
        city: 'Bengaluru',
        subzone: 'Indiranagar',
        whatsAppNumber: '+919876543210',
        whatsAppContactName: 'Rajesh Kumar',
        isActive: 'Active'
      },
      {
        name: 'The Burger Club',
        zRid: '19203948',
        sRid: '67890',
        city: 'Bengaluru',
        subzone: 'Koramangala',
        whatsAppNumber: '+919812345678',
        whatsAppContactName: 'Anil Sharma',
        isActive: 'Active'
      },
      {
        name: 'Pizza Di Roma',
        zRid: '20394857',
        sRid: '54321',
        city: 'Mumbai',
        subzone: 'Bandra West',
        whatsAppNumber: '+919898765432',
        whatsAppContactName: 'Priya Mehta',
        isActive: 'Active'
      },
      {
        name: 'Royal Biryani House',
        zRid: '31425364',
        sRid: '98765',
        city: 'Hyderabad',
        subzone: 'Madhapur',
        whatsAppNumber: '+919765432109',
        whatsAppContactName: 'Mohammed Tariq',
        isActive: 'Active'
      }
    ]);

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' } // Dark gray / navy
    };

    return workbook;
  }
}

module.exports = new SheetSyncService();
