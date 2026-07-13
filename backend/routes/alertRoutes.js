const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Create a new alert
router.post('/', alertController.createAlert);

// Get all alerts for authenticated user
router.get('/user', alertController.getUserAlerts);

// Get single alert by ID
router.get('/:id', alertController.getAlertById);

// Mark alert as read
router.put('/:id/read', alertController.markAlertAsRead);

// Mark all alerts as read
router.put('/read-all', alertController.markAllAlertsAsRead);

// Delete alert (soft delete)
router.delete('/:id', alertController.deleteAlert);

// Bulk delete alerts (admin only)
router.delete('/bulk', alertController.bulkDeleteAlerts);

module.exports = router;