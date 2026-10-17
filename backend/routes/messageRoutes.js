const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// All routes require authentication
router.use(protect);

// Send a message (with optional file)
router.post('/send', upload.single('file'), messageController.sendMessage);

// Get inbox (all messages for user)
router.get('/inbox', messageController.getInbox);

// Get conversation between two users
router.get('/conversation/:otherUserId', messageController.getConversation);

// Mark message as read
router.put('/read/:messageId', messageController.markAsRead);

// Get unread count
router.get('/unread-count', messageController.getUnreadCount);

// Get recipients for messaging
router.get('/recipients', messageController.getRecipients);

// Search messages
router.get('/search', messageController.searchMessages);

module.exports = router;