const SheetSyncService = require('../services/sheetSyncService');
const DataStore = require('../models/dataStore');
const fs = require('fs');

class SyncController {
  /**
   * Uploads and synchronizes weekly Restaurant Master Excel file
   * POST /api/v1/sync/excel
   */
  async uploadExcelSync(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No Excel file uploaded. Please upload a .xlsx or .csv file.'
        });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;

      const result = await SheetSyncService.syncFromExcel(filePath, originalName, 'ADMIN_MANUAL_UPLOAD');

      // Cleanup temp uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // ignore cleanup error
      }

      return res.json({
        success: result.success,
        message: `Sync completed with ${result.summary.recordsCreated} created, ${result.summary.recordsUpdated} updated, ${result.summary.recordsFailed} failed.`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Triggers synchronization from Google Sheets
   * POST /api/v1/sync/google-sheets
   */
  async triggerGoogleSheetsSync(req, res, next) {
    try {
      return res.status(501).json({
        success: false,
        message: 'Google Sheets direct API integration configured for automated weekly cron. Please use Excel Upload or provide Service Account credentials in .env.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves synchronization audit trail
   * GET /api/v1/sync/history
   */
  async getSyncHistory(req, res, next) {
    try {
      const history = await DataStore.findSyncHistory(30);
      return res.json({
        success: true,
        count: history.length,
        history
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SyncController();
