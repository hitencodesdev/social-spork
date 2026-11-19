const config = require('../config/env');
const authService = require('../services/authService');
const DataStore = require('../models/dataStore');

/**
 * Validates API key (used by Chrome extension and automated scrapers)
 */
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (apiKey && apiKey === config.API_SECRET_KEY) {
    req.user = {
      id: 'admin_api',
      name: 'Master Admin (API Key)',
      email: 'admin@socialspork.com',
      role: 'ADMIN',
      assignedRestaurantIds: []
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Invalid or missing X-API-Key header'
  });
};

/**
 * Universal Authentication Middleware
 * Accepts either:
 * 1. Bearer Token (JWT for UI dashboard users)
 * 2. X-API-Key header (for automated scripts / Chrome extension)
 */
const authenticateUser = async (req, res, next) => {
  try {
    // 1. Check Bearer Token
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const decoded = authService.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'Session expired or invalid token. Please log in again.'
        });
      }

      // Refresh assignedRestaurantIds & status from DB
      const user = await DataStore.findUserById(decoded.id);
      if (!user || user.isActive === false) {
        return res.status(401).json({
          success: false,
          error: 'User account is deactivated or no longer exists.'
        });
      }

      req.user = {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedRestaurantIds: user.assignedRestaurantIds || []
      };

      return next();
    }

    // 2. Check X-API-Key fallback
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (apiKey && apiKey === config.API_SECRET_KEY) {
      req.user = {
        id: 'admin_api',
        name: 'Master Admin (API Key)',
        email: 'admin@socialspork.com',
        role: 'ADMIN',
        assignedRestaurantIds: []
      };
      return next();
    }

    // No valid credentials provided
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error: ' + err.message
    });
  }
};

/**
 * Optional Authentication Middleware
 * Sets req.user if a valid token is provided, but does not block if omitted
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const decoded = authService.verifyToken(token);
      if (decoded) {
        const user = await DataStore.findUserById(decoded.id);
        if (user && user.isActive !== false) {
          req.user = {
            id: user._id || user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedRestaurantIds: user.assignedRestaurantIds || []
          };
        }
      }
    } else if (req.headers['x-api-key'] === config.API_SECRET_KEY) {
      req.user = {
        id: 'admin_api',
        name: 'Master Admin (API Key)',
        email: 'admin@socialspork.com',
        role: 'ADMIN',
        assignedRestaurantIds: []
      };
    }
  } catch (e) {
    // ignore in optional auth
  }
  next();
};

/**
 * Ensures user is an ADMIN
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Master Admin permissions required for this action.'
    });
  }
  next();
};

module.exports = {
  verifyApiKey,
  authenticateUser,
  optionalAuth,
  requireAdmin
};
