const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null
    },
    recipientPhone: {
      type: String,
      required: true
    },
    wabaMessageId: {
      type: String,
      trim: true,
      index: true,
      default: null
    },
    templateName: {
      type: String,
      default: 'restaurant_complaint_alert_v1'
    },
    payloadSent: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'QUEUED',
      index: true
    },
    attempts: {
      type: Number,
      default: 1
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        details: {
          type: String,
          default: ''
        }
      }
    ],
    errorMessage: {
      type: String,
      default: null
    },
    errorCode: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
