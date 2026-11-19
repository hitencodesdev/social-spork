const fs = require('fs');
const path = require('path');
const { getDBStatus } = require('../config/db');
const Restaurant = require('./Restaurant');
const Complaint = require('./Complaint');
const NotificationLog = require('./NotificationLog');
const SyncHistory = require('./SyncHistory');
const User = require('./User');

const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory & File-backed Fallback Store
class FileStore {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    this.items = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error(`Failed to load ${this.collectionName}:`, e.message);
    }
    return [];
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 2), 'utf8');
    } catch (e) {
      console.error(`Failed to save ${this.collectionName}:`, e.message);
    }
  }

  async find(filter = {}) {
    return this.items.filter(item => {
      for (const key of Object.keys(filter)) {
        if (filter[key] instanceof RegExp) {
          if (!filter[key].test(item[key] || '')) return false;
        } else if (item[key] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async findOne(filter = {}) {
    const list = await this.find(filter);
    return list.length > 0 ? list[0] : null;
  }

  async findById(id) {
    return this.items.find(item => item._id === id || item._id?.toString() === id?.toString()) || null;
  }

  async create(data) {
    const doc = {
      _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.items.unshift(doc);
    this.save();
    return doc;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const index = this.items.findIndex(item => item._id === id || item._id?.toString() === id?.toString());
    if (index === -1) return null;

    const current = this.items[index];
    const updated = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString()
    };
    this.items[index] = updated;
    this.save();
    return updated;
  }

  async countDocuments(filter = {}) {
    const list = await this.find(filter);
    return list.length;
  }

  async deleteOne(filter = {}) {
    const initialLen = this.items.length;
    this.items = this.items.filter(item => {
      for (const key of Object.keys(filter)) {
        if (item[key] === filter[key]) return false;
      }
      return true;
    });
    this.save();
    return { deletedCount: initialLen - this.items.length };
  }
}

const fileStores = {
  restaurants: new FileStore('restaurants'),
  complaints: new FileStore('complaints'),
  notification_logs: new FileStore('notification_logs'),
  sync_history: new FileStore('sync_history'),
  users: new FileStore('users')
};

// Unified Data Access Interface
const DataStore = {
  async findRestaurants(filter = {}) {
    if (getDBStatus().connected) {
      return await Restaurant.find(filter).sort({ name: 1 }).lean();
    }
    return await fileStores.restaurants.find(filter);
  },

  async findRestaurantById(id) {
    if (getDBStatus().connected) {
      return await Restaurant.findById(id).lean();
    }
    return await fileStores.restaurants.findById(id);
  },

  async findRestaurantByPlatformId(platform, platformRestaurantId) {
    const cleanId = String(platformRestaurantId).trim();
    if (getDBStatus().connected) {
      if (platform.toUpperCase() === 'SWIGGY') {
        return await Restaurant.findOne({ sRid: cleanId }).lean();
      } else {
        return await Restaurant.findOne({ zRid: cleanId }).lean();
      }
    }

    const key = platform.toUpperCase() === 'SWIGGY' ? 'sRid' : 'zRid';
    return await fileStores.restaurants.findOne({ [key]: cleanId });
  },

  async createRestaurant(data) {
    if (getDBStatus().connected) {
      return await Restaurant.create(data);
    }
    return await fileStores.restaurants.create(data);
  },

  async updateRestaurant(id, update) {
    if (getDBStatus().connected) {
      return await Restaurant.findByIdAndUpdate(id, update, { new: true }).lean();
    }
    return await fileStores.restaurants.findByIdAndUpdate(id, update);
  },

  async upsertRestaurantFromSync(query, updateData) {
    if (getDBStatus().connected) {
      const existing = await Restaurant.findOne(query);
      if (existing) {
        // Protect existing WhatsApp number if not provided in sync
        const safeUpdate = { ...updateData };
        if (!safeUpdate.whatsAppNumber && existing.whatsAppNumber) {
          delete safeUpdate.whatsAppNumber;
        }
        return await Restaurant.findByIdAndUpdate(existing._id, safeUpdate, { new: true });
      } else {
        return await Restaurant.create(updateData);
      }
    }

    const existing = await fileStores.restaurants.findOne(query);
    if (existing) {
      const safeUpdate = { ...updateData };
      if (!safeUpdate.whatsAppNumber && existing.whatsAppNumber) {
        delete safeUpdate.whatsAppNumber;
      }
      return await fileStores.restaurants.findByIdAndUpdate(existing._id, safeUpdate);
    } else {
      return await fileStores.restaurants.create(updateData);
    }
  },

  // Complaints
  async findComplaints(filter = {}, sort = { ingestedAt: -1 }) {
    if (getDBStatus().connected) {
      return await Complaint.find(filter).populate('restaurantId').sort(sort).lean();
    }
    const complaints = await fileStores.complaints.find(filter);
    // Enrich with restaurant data
    for (const comp of complaints) {
      if (comp.restaurantId && typeof comp.restaurantId === 'string') {
        comp.restaurant = await fileStores.restaurants.findById(comp.restaurantId);
      }
    }
    return complaints;
  },

  async findComplaintById(id) {
    if (getDBStatus().connected) {
      return await Complaint.findById(id).populate('restaurantId').lean();
    }
    const comp = await fileStores.complaints.findById(id);
    if (comp && comp.restaurantId) {
      comp.restaurant = await fileStores.restaurants.findById(comp.restaurantId);
    }
    return comp;
  },

  async findComplaintByDedupKey(dedupKey) {
    if (getDBStatus().connected) {
      return await Complaint.findOne({ dedupKey }).lean();
    }
    return await fileStores.complaints.findOne({ dedupKey });
  },

  async createComplaint(data) {
    if (getDBStatus().connected) {
      return await Complaint.create(data);
    }
    return await fileStores.complaints.create(data);
  },

  async updateComplaint(id, update) {
    if (getDBStatus().connected) {
      return await Complaint.findByIdAndUpdate(id, update, { new: true }).lean();
    }
    return await fileStores.complaints.findByIdAndUpdate(id, update);
  },

  // Notification Logs
  async createNotificationLog(data) {
    if (getDBStatus().connected) {
      return await NotificationLog.create(data);
    }
    return await fileStores.notification_logs.create(data);
  },

  async updateNotificationLogByWabaId(wabaMessageId, status, details = '') {
    if (getDBStatus().connected) {
      return await NotificationLog.findOneAndUpdate(
        { wabaMessageId },
        {
          status,
          $push: {
            statusHistory: {
              status,
              timestamp: new Date(),
              details
            }
          }
        },
        { new: true }
      );
    }

    const log = await fileStores.notification_logs.findOne({ wabaMessageId });
    if (log) {
      const history = log.statusHistory || [];
      history.push({ status, timestamp: new Date().toISOString(), details });
      return await fileStores.notification_logs.findByIdAndUpdate(log._id, {
        status,
        statusHistory: history
      });
    }
    return null;
  },

  async findNotificationLogs(filter = {}) {
    if (getDBStatus().connected) {
      return await NotificationLog.find(filter).sort({ createdAt: -1 }).lean();
    }
    return await fileStores.notification_logs.find(filter);
  },

  // Sync History
  async createSyncHistory(data) {
    if (getDBStatus().connected) {
      return await SyncHistory.create(data);
    }
    return await fileStores.sync_history.create(data);
  },

  async findSyncHistory(limit = 20) {
    if (getDBStatus().connected) {
      return await SyncHistory.find().sort({ startedAt: -1 }).limit(limit).lean();
    }
    const list = await fileStores.sync_history.find({});
    return list.slice(0, limit);
  },

  // Users & Authentication
  async findUsers(filter = {}) {
    if (getDBStatus().connected) {
      return await User.find(filter).select('-passwordHash -salt').sort({ createdAt: -1 }).lean();
    }
    const users = await fileStores.users.find(filter);
    return users.map(u => {
      const { passwordHash, salt, ...safeUser } = u;
      return safeUser;
    });
  },

  async findUserById(id) {
    if (getDBStatus().connected) {
      return await User.findById(id).lean();
    }
    return await fileStores.users.findById(id);
  },

  async findUserByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (getDBStatus().connected) {
      return await User.findOne({ email: cleanEmail }).lean();
    }
    return await fileStores.users.findOne({ email: cleanEmail });
  },

  async createUser(data) {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const payload = {
      ...data,
      email: cleanEmail
    };
    if (getDBStatus().connected) {
      return await User.create(payload);
    }
    return await fileStores.users.create(payload);
  },

  async updateUser(id, update) {
    if (getDBStatus().connected) {
      return await User.findByIdAndUpdate(id, update, { new: true }).select('-passwordHash -salt').lean();
    }
    const updated = await fileStores.users.findByIdAndUpdate(id, update);
    if (updated) {
      const { passwordHash, salt, ...safeUser } = updated;
      return safeUser;
    }
    return null;
  },

  async deleteUser(id) {
    if (getDBStatus().connected) {
      return await User.findByIdAndDelete(id);
    }
    return await fileStores.users.deleteOne({ _id: id });
  }
};

module.exports = DataStore;
