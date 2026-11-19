const mongoose = require('mongoose');

const syncHistorySchema = new mongoose.Schema(
  {
    syncType: {
      type: String,
      enum: ['EXCEL_UPLOAD', 'GOOGLE_SHEETS'],
      required: true
    },
    fileName: {
      type: String,
      default: ''
    },
    triggeredBy: {
      type: String,
      default: 'OPERATOR'
    },
    totalRowsRead: {
      type: Number,
      default: 0
    },
    recordsCreated: {
      type: Number,
      default: 0
    },
    recordsUpdated: {
      type: Number,
      default: 0
    },
    recordsSkipped: {
      type: Number,
      default: 0
    },
    recordsFailed: {
      type: Number,
      default: 0
    },
    validationErrors: [
      {
        row: Number,
        restaurantName: String,
        reason: String
      }
    ],
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED'],
      default: 'SUCCESS'
    },
    durationMs: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SyncHistory', syncHistorySchema);
