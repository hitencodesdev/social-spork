const DataStore = require('../models/dataStore');
const authService = require('../services/authService');

class AuthController {
  /**
   * Logs in a user (Admin or Employee)
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Please provide both email and password.'
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await DataStore.findUserByEmail(cleanEmail);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.'
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          error: 'Your account has been deactivated. Please contact your Master Admin.'
        });
      }

      const isMatch = authService.verifyPassword(password, user.salt, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.'
        });
      }

      const token = authService.generateToken(user, 7);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          assignedRestaurantIds: user.assignedRestaurantIds || []
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves profile of current logged-in user
   * GET /api/v1/auth/me
   */
  async getMe(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const user = await DataStore.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      return res.json({
        success: true,
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          assignedRestaurantIds: user.assignedRestaurantIds || [],
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves list of all team members (Admin only)
   * GET /api/v1/auth/users
   */
  async getUsers(req, res, next) {
    try {
      const users = await DataStore.findUsers({});
      return res.json({
        success: true,
        count: users.length,
        users
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Creates a new employee or admin user (Admin only)
   * POST /api/v1/auth/users
   */
  async createUser(req, res, next) {
    try {
      const { name, email, password, role, assignedRestaurantIds } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, and password are required.'
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await DataStore.findUserByEmail(cleanEmail);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `A user with email '${cleanEmail}' already exists.`
        });
      }

      const salt = authService.generateSalt();
      const passwordHash = authService.hashPassword(password, salt);

      const newUser = await DataStore.createUser({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        salt,
        role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
        assignedRestaurantIds: Array.isArray(assignedRestaurantIds) ? assignedRestaurantIds : [],
        isActive: true
      });

      // Update the assigned restaurants with this employee's info
      if (Array.isArray(assignedRestaurantIds) && assignedRestaurantIds.length > 0) {
        for (const rid of assignedRestaurantIds) {
          await DataStore.updateRestaurant(rid, {
            assignedEmployeeId: newUser._id || newUser.id,
            assignedEmployeeName: newUser.name
          });
        }
      }

      const { passwordHash: p, salt: s, ...safeUser } = newUser;
      return res.status(201).json({
        success: true,
        message: `Employee '${name}' created successfully.`,
        user: safeUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing user (Admin only)
   * PUT /api/v1/auth/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { name, role, password, assignedRestaurantIds, isActive } = req.body;

      const user = await DataStore.findUserById(id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const updatePayload = {};
      if (name) updatePayload.name = name.trim();
      if (role && (role === 'ADMIN' || role === 'EMPLOYEE')) updatePayload.role = role;
      if (isActive !== undefined) updatePayload.isActive = !!isActive;

      if (password && password.trim().length >= 6) {
        const salt = authService.generateSalt();
        updatePayload.salt = salt;
        updatePayload.passwordHash = authService.hashPassword(password.trim(), salt);
      }

      if (Array.isArray(assignedRestaurantIds)) {
        updatePayload.assignedRestaurantIds = assignedRestaurantIds;

        // Sync restaurant assignment tags
        // 1. Remove this employee from previous assignments
        const prevAssigned = user.assignedRestaurantIds || [];
        for (const prevId of prevAssigned) {
          if (!assignedRestaurantIds.includes(prevId)) {
            await DataStore.updateRestaurant(prevId, {
              assignedEmployeeId: null,
              assignedEmployeeName: 'Unassigned'
            });
          }
        }
        // 2. Set this employee on new assignments
        for (const newId of assignedRestaurantIds) {
          await DataStore.updateRestaurant(newId, {
            assignedEmployeeId: id,
            assignedEmployeeName: name || user.name
          });
        }
      }

      const updated = await DataStore.updateUser(id, updatePayload);

      return res.json({
        success: true,
        message: 'User updated successfully',
        user: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a user (Admin only)
   * DELETE /api/v1/auth/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await DataStore.findUserById(id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (user.email === 'admin@socialspork.com') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the primary Master Admin account.'
        });
      }

      await DataStore.deleteUser(id);

      // Unassign any restaurants
      const assigned = user.assignedRestaurantIds || [];
      for (const rid of assigned) {
        await DataStore.updateRestaurant(rid, {
          assignedEmployeeId: null,
          assignedEmployeeName: 'Unassigned'
        });
      }

      return res.json({
        success: true,
        message: `User '${user.name}' deleted successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Seeds default Master Admin if no users exist
   */
  async seedInitialAdmin() {
    try {
      const users = await DataStore.findUsers({});
      if (users.length === 0) {
        console.log('[Auth] Seeding default Master Admin account (admin@socialspork.com)...');
        const salt = authService.generateSalt();
        const passwordHash = authService.hashPassword('Admin@Spork2026', salt);

        await DataStore.createUser({
          name: 'Master Admin',
          email: 'admin@socialspork.com',
          passwordHash,
          salt,
          role: 'ADMIN',
          assignedRestaurantIds: [],
          isActive: true
        });

        console.log('[Auth] Master Admin created: admin@socialspork.com / Admin@Spork2026');
      }
    } catch (err) {
      console.error('[Auth] Failed to seed initial admin:', err.message);
    }
  }
}

module.exports = new AuthController();
