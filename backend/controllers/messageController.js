const Message = require('../models/Message');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Employee = require('../models/Employee');
const Course = require('../models/Course');

const getUserModel = (role) => {
  const roleMap = {
    'admin': Admin,
    'teacher': Teacher,
    'employee': Employee
  };
  return roleMap[role];
};

const formatUserName = (user, userModel) => {
  if (!user) return null;
  
  if (userModel === 'Admin') {
    return user.instituteName || 'Admin';
  } else {
    const salutation = user.salutation || '';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${salutation} ${firstName} ${lastName}`.trim() || `${firstName} ${lastName}`.trim() || 'User';
    return fullName;
  }
};

const enrichMessagesWithNames = async (messages) => {
  try {
    if (!messages || messages.length === 0) return messages;
    
    // Step 1: Collect unique user references
    const senderRefs = new Map(); // key: `${userId}_${model}`, value: { userId, userModel }
    const receiverRefs = new Map();
    
    messages.forEach(msg => {
      const senderKey = `${msg._id}_${msg.senderModel}_${msg.senderId}`;
      const receiverKey = `${msg._id}_${msg.receiverModel}_${msg.receiverId}`;
      
      if (msg.senderId && msg.senderModel && !senderRefs.has(senderKey)) {
        senderRefs.set(senderKey, { id: msg.senderId, model: msg.senderModel });
      }
      
      if (msg.receiverId && msg.receiverModel && !receiverRefs.has(receiverKey)) {
        receiverRefs.set(receiverKey, { id: msg.receiverId, model: msg.receiverModel });
      }
    });
    
    // Step 2: Group by model
    const adminIds = new Set();
    const teacherIds = new Set();
    const employeeIds = new Set();
    
    const senderIdToModel = new Map();
    const receiverIdToModel = new Map();
    
    senderRefs.forEach(ref => {
      if (ref.model === 'Admin') adminIds.add(ref.id);
      else if (ref.model === 'Teacher') teacherIds.add(ref.id);
      else if (ref.model === 'Employee') employeeIds.add(ref.id);
      senderIdToModel.set(ref.id, ref.model);
    });
    
    receiverRefs.forEach(ref => {
      if (ref.model === 'Admin') adminIds.add(ref.id);
      else if (ref.model === 'Teacher') teacherIds.add(ref.id);
      else if (ref.model === 'Employee') employeeIds.add(ref.id);
      receiverIdToModel.set(ref.id, ref.model);
    });
    
    // Step 3: Batch query each collection ONCE
    const [admins, teachers, employees] = await Promise.all([
      adminIds.size > 0 ? Admin.find({ _id: { $in: Array.from(adminIds) } }).maxTimeMS(8000) : [],
      teacherIds.size > 0 ? Teacher.find({ _id: { $in: Array.from(teacherIds) } }).maxTimeMS(8000) : [],
      employeeIds.size > 0 ? Employee.find({ _id: { $in: Array.from(employeeIds) } }).maxTimeMS(8000) : []
    ]);
    
    // Step 4: Create lookup maps
    const userMap = new Map();
    
    admins.forEach(admin => {
      userMap.set(`Admin_${admin._id}`, { _id: admin._id, displayName: formatUserName(admin, 'Admin'), model: 'Admin' });
    });
    
    teachers.forEach(teacher => {
      userMap.set(`Teacher_${teacher._id}`, { _id: teacher._id, displayName: formatUserName(teacher, 'Teacher'), model: 'Teacher' });
    });
    
    employees.forEach(employee => {
      userMap.set(`Employee_${employee._id}`, { _id: employee._id, displayName: formatUserName(employee, 'Employee'), model: 'Employee' });
    });
    
    // Step 5: Attach names to messages
    const enrichedMessages = await Promise.all(
      messages.map(async msg => {
        const senderKey = `_senderModel_${msg.senderId}`;
        const receiverKey = `_receiverModel_${msg.receiverId}`;
        
        // Use the model-based lookup
        const senderModelKey = `${msg.senderModel}_${msg.senderId}`;
        const receiverModelKey = `${msg.receiverModel}_${msg.receiverId}`;
        
        const senderData = userMap.get(senderModelKey);
        const receiverData = userMap.get(receiverModelKey);
        
        return {
          ...msg.toObject(),
          senderName: senderData?.displayName || null,
          receiverName: receiverData?.displayName || null
        };
      })
    );
    
    return enrichedMessages;
  } catch (error) {
    console.error('Error enriching messages with names:', error);
    // Fallback: return messages without names rather than failing entirely
    return messages.map(msg => ({
      ...msg.toObject(),
      senderName: null,
      receiverName: null
    }));
  }
};

const getSenderRole = async (user) => {
  if (user.role) return user.role;
  
  const adminCheck = await Admin.findById(user._id);
  if (adminCheck) return 'admin';
  
  const teacherCheck = await Teacher.findById(user._id);
  if (teacherCheck) return 'teacher';
  
  return 'employee';
};

const getFacultyCourseCodes = async (teacherId) => {
  const teacher = await Teacher.findById(teacherId).select('assignedCourses').maxTimeMS(8000);
  if (!teacher || !Array.isArray(teacher.assignedCourses)) {
    return [];
  }
  return teacher.assignedCourses
    .map(course => String(course?.courseCode || '').trim())
    .filter(Boolean);
};

const getParticipantCourseCodes = async (employeeId) => {
  const employee = await Employee.findById(employeeId).select('courseCode enrolledSubjects').maxTimeMS(8000);
  if (!employee) {
    return [];
  }
  
  const courseCodes = [];
  
  if (employee.courseCode) {
    courseCodes.push(String(employee.courseCode).trim());
  }
  
  if (Array.isArray(employee.enrolledSubjects)) {
    employee.enrolledSubjects.forEach(subject => {
      if (subject.courseCode) {
        courseCodes.push(String(subject.courseCode).trim());
      }
    });
  }
  
  return courseCodes;
};

const getSharedCourse = async (senderId, senderRole, receiverId, receiverRole) => {
  if (senderRole === 'admin' || receiverRole === 'admin') {
    return null;
  }
  
  let senderCourseCodes = [];
  let receiverCourseCodes = [];
  
  if (senderRole === 'teacher') {
    senderCourseCodes = await getFacultyCourseCodes(senderId);
  } else if (senderRole === 'employee') {
    senderCourseCodes = await getParticipantCourseCodes(senderId);
  }
  
  if (receiverRole === 'teacher') {
    receiverCourseCodes = await getFacultyCourseCodes(receiverId);
  } else if (receiverRole === 'employee') {
    receiverCourseCodes = await getParticipantCourseCodes(receiverId);
  }
  
  const sharedCodes = senderCourseCodes.filter(code => receiverCourseCodes.includes(code));
  
  if (sharedCodes.length > 0) {
    const course = await Course.findOne({ courseCode: sharedCodes[0] }).maxTimeMS(8000);
    return course;
  }
  
  return null;
};

const canSendMessage = async (senderId, senderRole, receiverId, receiverRole) => {
  if (senderRole === 'admin' || receiverRole === 'admin') {
    return true;
  }
  
  const sharedCourse = await getSharedCourse(senderId, senderRole, receiverId, receiverRole);
  return !!sharedCourse;
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, receiverRole, message, replyTo } = req.body;
    const senderId = req.user?._id;
    const senderRole = req.user?.role || await getSenderRole(req.user);

    const hasText = message && message.trim().length > 0;
    const hasFile = req.file;
    
    if (!receiverId || !receiverRole) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: receiverId, receiverRole'
      });
    }

    if (!hasText && !hasFile) {
      return res.status(400).json({
        success: false,
        message: 'Message or file is required'
      });
    }

    if (hasText && message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message must be 1000 characters or less'
      });
    }

    if (!['admin', 'teacher', 'employee'].includes(receiverRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receiver role'
      });
    }

    const ReceiverModel = getUserModel(receiverRole);
    const receiver = await ReceiverModel.findById(receiverId);

    const senderModel = senderRole === 'admin' ? 'Admin' : (senderRole === 'teacher' || senderRole === 'trainee') ? 'Teacher' : 'Employee';
    const receiverModel = receiverRole === 'admin' ? 'Admin' : receiverRole === 'teacher' ? 'Teacher' : 'Employee';

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const canSendResult = await canSendMessage(senderId, senderRole, receiverId, receiverRole);

    if (!canSendResult) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send message to this recipient'
      });
    }

    const rateLimitWindow = Date.now() - 60 * 1000;
    const messagesInLastMinute = await Message.countDocuments({
      senderId: senderId,
      createdAt: { $gte: new Date(rateLimitWindow) }
    });

    if (messagesInLastMinute >= 10) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded: Maximum 10 messages per minute'
      });
    }

    const dailyLimitWindow = Date.now() - 24 * 60 * 60 * 1000;
    const messagesInLastDay = await Message.countDocuments({
      senderId: senderId,
      createdAt: { $gte: new Date(dailyLimitWindow) }
    });

    if (messagesInLastDay >= 100) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded: Maximum 100 messages per day'
      });
    }

    const sharedCourse = await getSharedCourse(senderId, senderRole, receiverId, receiverRole);

    const attachments = hasFile ? [{
      filename: req.file.originalname,
      url: req.file.path,
      publicId: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      resourceType: req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
    }] : [];

    const newMessage = new Message({
      senderId,
      senderModel,
      receiverId,
      receiverModel,
      courseId: sharedCourse?._id || null,
      courseCode: sharedCourse?.courseCode || null,
      message: hasText ? message.trim() : '',
      replyTo: replyTo || null,
      attachments
    });

    await newMessage.save();

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Send Message Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getInbox = async (req, res) => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('replyTo', 'message senderModel createdAt')
    .maxTimeMS(8000);

    const total = await Message.countDocuments({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });

    // Resolve sender and receiver names using batch lookup
    messages = await enrichMessagesWithNames(messages);

    return res.status(200).json({
      success: true,
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { otherUserId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const ObjectId = require('mongoose').Types.ObjectId;
    
    let messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('replyTo', 'message senderModel createdAt')
    .maxTimeMS(8000);

    const total = await Message.countDocuments({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    });

    // Resolve sender and receiver names using batch lookup
    messages = await enrichMessagesWithNames(messages);

    return res.status(200).json({
      success: true,
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized conversation access'
      });
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: message
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?._id;

    const unreadCount = await Message.countDocuments({
      receiverId: userId,
      isRead: false
    }).maxTimeMS(5000);

    return res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getRecipients = async (req, res) => {
  try {
    const senderId = req.user?._id;
    let senderRole = req.user?.role;
    
    if (!senderRole) {
      const modelName = req.user?.constructor?.modelName;
      if (modelName === 'Admin') {
        senderRole = 'admin';
      } else if (modelName === 'Teacher') {
        senderRole = req.user?.role === 'trainee' ? 'trainee' : 'teacher';
      } else if (modelName === 'Employee') {
        senderRole = 'employee';
      }
    }

    if (!senderId || !senderRole) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    let recipients = [];

    if (senderRole === 'admin') {
      const [teachers, employees] = await Promise.all([
        Teacher.find({ isApproved: true, isActive: true })
          .select('_id firstName lastName email')
          .maxTimeMS(8000),
        Employee.find({ isApproved: true, isActive: true })
          .select('_id firstName lastName email')
          .maxTimeMS(8000)
      ]);

      recipients = [
        ...teachers.map(t => ({
          _id: t._id,
          name: `${t.firstName} ${t.lastName}`,
          email: t.email,
          role: 'teacher',
          model: 'Teacher'
        })),
        ...employees.map(e => ({
          _id: e._id,
          name: `${e.firstName} ${e.lastName}`,
          email: e.email,
          role: 'employee',
          model: 'Employee'
        }))
      ];
    } else if (senderRole === 'teacher' || senderRole === 'trainee') {
      const facultyCourseCodes = await getFacultyCourseCodes(senderId);
      
      const eligibleParticipants = await Employee.find({
        isApproved: true,
        isActive: true,
        $or: [
          { courseCode: { $in: facultyCourseCodes } },
          { 'enrolledSubjects.courseCode': { $in: facultyCourseCodes } }
        ]
      })
      .select('_id firstName lastName email')
      .maxTimeMS(8000);

      recipients = eligibleParticipants.map(e => ({
        _id: e._id,
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        role: 'employee',
        model: 'Employee'
      }));
    } else if (senderRole === 'employee') {
      const participantCourseCodes = await getParticipantCourseCodes(senderId);
      
      const eligibleFaculty = await Teacher.find({
        isApproved: true,
        isActive: true,
        'assignedCourses.courseCode': { $in: participantCourseCodes }
      })
      .select('_id firstName lastName email')
      .maxTimeMS(8000);

      recipients = eligibleFaculty.map(t => ({
        _id: t._id,
        name: `${t.firstName} ${t.lastName}`,
        email: t.email,
        role: 'teacher',
        model: 'Teacher'
      }));
    }

    return res.status(200).json({
      success: true,
      recipients
    });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.searchMessages = async (req, res) => {
  try {
    const userId = req.user?._id;
    const searchQuery = req.query.q ? req.query.q.trim() : '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!searchQuery || searchQuery.length === 0) {
      return res.status(200).json({
        success: true,
        messages: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    const searchRegex = new RegExp(searchQuery, 'i');

    const query = {
      $and: [
        { $or: [{ senderId: userId }, { receiverId: userId }] },
        { $or: [{ message: searchRegex }, { 'attachments.filename': searchRegex }] }
      ]
    };

    const [messages, total] = await Promise.all([
      Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('replyTo', 'message senderModel createdAt')
      .maxTimeMS(8000),
      Message.countDocuments(query).maxTimeMS(8000)
    ]);

    // Resolve sender and receiver names using batch lookup
    const resolvedMessages = await enrichMessagesWithNames(messages);

    return res.status(200).json({
      success: true,
      messages: resolvedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};