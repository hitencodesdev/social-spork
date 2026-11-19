const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { uploadExcel } = require('../middleware/upload');

router.post('/excel', uploadExcel.single('file'), (req, res, next) => syncController.uploadExcelSync(req, res, next));
router.post('/google-sheets', (req, res, next) => syncController.triggerGoogleSheetsSync(req, res, next));
router.get('/history', (req, res, next) => syncController.getSyncHistory(req, res, next));

module.exports = router;
