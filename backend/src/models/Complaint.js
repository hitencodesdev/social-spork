const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    dedupKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    platform: {
      type: String,
      required: true,
      enum: ['SWIGGY', 'ZOMATO'],
      index: true
    },
    platformRestaurantId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null
    },
    restaurantName: {
      type: String,
      default: ''
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    complaintEventId: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    category: {
      type: String,
      default: 'General Complaint'
    },
    issue: {
      type: String,
      default: ''
    },
    productName: {
      type: String,
      default: ''
    },
    customerDescription: {
      type: String,
      default: ''
    },
    imageUrls: {
      type: [String],
      default: []
    },
    bufferedMedia: [
      {
        originalUrl: String,
        localPath: String,
        wabaMediaId: String,
        mimeType: String,
        status: {
          type: String,
          enum: ['PENDING', 'BUFFERED', 'UPLOADED_TO_WABA', 'FAILED'],
          default: 'PENDING'
        }
      }
    ],
    platformCreatedAt: {
      type: Date,
      default: null
    },
    ingestedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    processingStatus: {
      type: String,
      enum: [
        'PENDING',
        'MATCHED',
        'UNMATCHED_RESTAURANT',
        'MISSING_PHONE',
        'QUEUED',
        'SENT',
        'DELIVERED',
        'READ',
        'FAILED',
        'NEEDS_ATTENTION'
      ],
      default: 'PENDING',
      index: true
    },
    failureReason: {
      type: String,
      default: null
    },
    lastAttemptAt: {
      type: Date,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

complaintSchema.index({ platform: 1, platformRestaurantId: 1 });
complaintSchema.index({ ingestedAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
