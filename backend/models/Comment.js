const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userInitials: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  // If we ever want to attach comments to a specific entity (like an invoice or patient), we can use these
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  entityType: {
    type: String,
    required: false
  },
  mentionedUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  deletedForUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for faster queries when loading the global chat
commentSchema.index({ createdAt: -1 });
// Index for specific entity comments
commentSchema.index({ entityId: 1, entityType: 1, createdAt: -1 });
// Index for user visibility filtering
commentSchema.index({ userId: 1 });
commentSchema.index({ mentionedUserIds: 1 });
commentSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Comment', commentSchema);
