const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    zRid: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      default: null
    },
    sRid: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      default: null
    },
    subzone: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    whatsAppNumber: {
      type: String,
      trim: true,
      index: true,
      default: ''
    },
    whatsAppContactName: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    syncSource: {
      type: String,
      enum: ['EXCEL_IMPORT', 'GOOGLE_SHEETS', 'MANUAL'],
      default: 'MANUAL'
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    },
    assignedEmployeeId: {
      type: String,
      default: null,
      index: true
    },
    assignedEmployeeName: {
      type: String,
      default: 'Unassigned'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
