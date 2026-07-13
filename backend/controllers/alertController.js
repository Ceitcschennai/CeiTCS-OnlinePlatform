const SystemAlert = require('../models/SystemAlert');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Employee = require('../models/Employee');

// Valid sender/recipient role combinations per business rules
const VALID_ROLE_COMBINATIONS = {
  admin: ['teacher', 'employee'],
  teacher: ['admin', 'employee'],
  employee: ['admin', 'teacher']
};

// Get model by role name
const getUserModel = (role) => {
  const roleMap = {
    'admin': Admin,
    'teacher': Teacher,
    'employee': Employee
  };
  return roleMap[role];
};

// Get model name by role
const getModelName = (role) => {
  const modelMap = {
    'admin': 'Admin',
    'teacher': 'Teacher',
    'employee': 'Employee'
  };
  return modelMap[role];
};

// Create a new alert
exports.createAlert = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      recipientId,
      recipientRole,
      recipientModel
    } = req.body;

    // Validate required fields
    if (!title || !message || !recipientId || !recipientRole) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, message, recipientId, recipientRole'
      });
    }

    // Validate title/message length
    if (title.length < 3 || title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be between 3 and 200 characters'
      });
    }

    if (message.length < 1 || message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message must be between 1 and 2000 characters'
      });
    }

    // Validate alert type
    if (!['info', 'warning', 'error', 'success'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert type. Must be info, warning, error, or success'
      });
    }

    // Validate recipient role
    if (!['admin', 'teacher', 'employee'].includes(recipientRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipient role'
      });
    }

    // Validate sender can send to recipient role (business rules)
    const senderRole = req.user.role;
    const allowedRecipients = VALID_ROLE_COMBINATIONS[senderRole];
    if (!allowedRecipients || !allowedRecipients.includes(recipientRole)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send alerts to this recipient type'
      });
    }

    // Validate recipient exists
    const RecipientModel = recipientModel || getModelName(recipientRole);
    const recipient = await getUserModel(recipientRole).findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Get sender info
    const senderId = req.user.id;
    const sender = await getUserModel(senderRole).findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    // Create alert
    const alert = new SystemAlert({
      title,
      message,
      type,
      senderId: senderId,
      senderModel: getModelName(senderRole),
      senderName: `${sender.firstName || sender.instituteName || ''} ${sender.lastName || ''}`.trim(),
      recipientId,
      recipientModel: RecipientModel,
      recipientRole
    });

    await alert.save();

    return res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get alerts for authenticated user
exports.getUserAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const alerts = await SystemAlert.find({
      recipientId: userId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    const unreadCount = await SystemAlert.countDocuments({
      recipientId: userId,
      read: false,
      isDeleted: false
    });

    return res.status(200).json({
      success: true,
      alerts,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get single alert by ID
exports.getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const alert = await SystemAlert.findOne({
      _id: id,
      recipientId: userId,
      isDeleted: false
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    return res.status(200).json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Mark single alert as read
exports.markAlertAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const alert = await SystemAlert.findOne({
      _id: id,
      recipientId: userId,
      isDeleted: false
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (!alert.read) {
      alert.read = true;
      alert.readAt = new Date();
      await alert.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Alert marked as read',
      alert
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Mark all alerts as read for user
exports.markAllAlertsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await SystemAlert.updateMany(
      { recipientId: userId, read: false, isDeleted: false },
      { read: true, readAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      message: 'All alerts marked as read'
    });
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Soft delete alert
exports.deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const alert = await SystemAlert.findOne({
      _id: id,
      recipientId: userId,
      isDeleted: false
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.isDeleted = true;
    await alert.save();

    return res.status(200).json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Bulk delete alerts (admin only)
exports.bulkDeleteAlerts = async (req, res) => {
  try {
    // Admin-only authorization check
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can perform bulk operations'
      });
    }

    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'alertIds array is required'
      });
    }

    await SystemAlert.updateMany(
      { _id: { $in: alertIds } },
      { isDeleted: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Alerts deleted successfully'
    });
  } catch (error) {
    console.error('Error bulk deleting alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};