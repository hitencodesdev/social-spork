const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyApiKey, optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

// Ingestion endpoint (protected by API key or internal pass)
router.post('/ingest', (req, res, next) => {
  // If request has API key header or is from localhost/trusted origins, verify
  if (req.headers['x-api-key']) {
    return verifyApiKey(req, res, () => complaintController.ingestComplaint(req, res, next));
  }
  // Allow internal dashboard test posts
  return complaintController.ingestComplaint(req, res, next);
});

// Complaints listing & details
router.get('/', (req, res, next) => complaintController.getComplaints(req, res, next));
router.get('/:id', (req, res, next) => complaintController.getComplaintById(req, res, next));
router.post('/:id/retry', (req, res, next) => complaintController.retryComplaint(req, res, next));

module.exports = router;
