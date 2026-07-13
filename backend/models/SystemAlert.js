const mongoose = require('mongoose');

const systemAlertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderModel: {
    type: String,
    enum: ['Admin', 'Teacher', 'Employee'],
    required: true
  },
  senderName: {
    type: String,
    required: true,
    trim: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  recipientModel: {
    type: String,
    enum: ['Admin', 'Teacher', 'Employee'],
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['admin', 'teacher', 'employee'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
systemAlertSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
systemAlertSchema.index({ recipientId: 1, recipientRole: 1 });
systemAlertSchema.index({ senderId: 1 });
systemAlertSchema.index({ createdAt: 1 });

module.exports = mongoose.model('SystemAlert', systemAlertSchema);