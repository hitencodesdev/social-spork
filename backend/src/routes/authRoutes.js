const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// Public login endpoint
router.post('/login', (req, res, next) => authController.login(req, res, next));

// Current user profile
router.get('/me', authenticateUser, (req, res, next) => authController.getMe(req, res, next));

// Team management (Admin only)
router.get('/users', authenticateUser, requireAdmin, (req, res, next) => authController.getUsers(req, res, next));
router.post('/users', authenticateUser, requireAdmin, (req, res, next) => authController.createUser(req, res, next));
router.put('/users/:id', authenticateUser, requireAdmin, (req, res, next) => authController.updateUser(req, res, next));
router.delete('/users/:id', authenticateUser, requireAdmin, (req, res, next) => authController.deleteUser(req, res, next));

module.exports = router;
