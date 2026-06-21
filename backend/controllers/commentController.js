const Comment = require('../models/Comment');

/**
 * Get all comments (global or by entity)
 */
exports.getComments = async (req, res) => {
  try {
    const { entityId, entityType, limit = 50 } = req.query;
    
    let query = {};
    if (entityId && entityType) {
      query = { entityId, entityType };
    } else {
      // If no entity is specified, return global comments (where entityId is not set)
      query = { entityId: { $exists: false } };
    }

    // Role and mention visibility logic
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    // Filter out messages that the user deleted for themselves
    query.deletedForUsers = { $ne: userId };

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      // Non-admins can only see public comments, comments they sent, or comments where they are mentioned
      query.$or = [
        { isPublic: true },
        { userId: userId },
        { mentionedUserIds: userId }
      ];
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: 1 }) // Return oldest to newest for chat interfaces
      .limit(Number(limit));
      
    res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
};

/**
 * Create a new comment
 */
exports.createComment = async (req, res) => {
  try {
    const { text, entityId, entityType, mentionedUserIds = [] } = req.body;
    
    // Determine if it's public based on mentions (no mentions = public, has mentions = private)
    const isPublic = mentionedUserIds.length === 0;
    
    // Using user info from the auth middleware
    const userId = req.user._id || req.user.id;
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Unknown User';
    
    // Generate initials
    const initials = userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const newComment = new Comment({
      userId,
      userName,
      userInitials: initials,
      text,
      entityId,
      entityType,
      mentionedUserIds,
      isPublic
    });

    const savedComment = await newComment.save();
    
    // Create notifications for mentioned users
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      try {
        const Notification = require('../models/Notification');
        const notifications = mentionedUserIds.map(recipientId => ({
          title: `New Mention from ${userName}`,
          message: text.length > 50 ? text.substring(0, 50) + '...' : text,
          type: 'new_message',
          senderId: userId,
          senderRole: req.user.role || 'staff',
          recipientId: recipientId,
          category: 'system',
          priority: 'medium'
        }));
        await Notification.insertMany(notifications);
      } catch (notifErr) {
        console.error('Error creating mention notifications:', notifErr);
      }
    }
    
    // Try to emit via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      if (entityId) {
        io.to(`${entityType}_${entityId}`).emit('new_comment', savedComment);
      } else {
        io.emit('new_global_comment', savedComment);
      }
    }

    res.status(201).json(savedComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment', error: error.message });
  }
};

/**
 * Delete a comment (either for everyone or just for the current user)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteType = 'both' } = req.query; // 'both' (both sides) or 'me' (only for me)
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    // Check permission: Must be admin, super_admin, or have deleteMessages permission
    const User = require('../models/User');
    const dbUser = await User.findById(userId);
    
    const isAdmin = userRole === 'admin' || userRole === 'super_admin' || (dbUser && (dbUser.role === 'admin' || dbUser.role === 'super_admin'));
    const hasPermission = dbUser && dbUser.permissions && dbUser.permissions.deleteMessages === true;

    if (!isAdmin && !hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to delete messages' });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (deleteType === 'both') {
      // Hard delete from database
      await Comment.findByIdAndDelete(id);

      // Emit socket event to notify other clients
      const io = req.app.get('io');
      if (io) {
        if (comment.entityId) {
          io.to(`${comment.entityType}_${comment.entityId}`).emit('delete_comment', id);
        } else {
          io.emit('delete_global_comment', id);
        }
      }
      
      return res.status(200).json({ success: true, message: 'Message deleted for everyone', id });
    } else {
      // Delete only for the current user (soft delete / hide)
      await Comment.findByIdAndUpdate(id, {
        $addToSet: { deletedForUsers: userId }
      });
      
      return res.status(200).json({ success: true, message: 'Message deleted for you', id });
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
};
