const express = require("express");
const router = express.Router();
const CourseNotification = require("../models/CourseNotification");
const Employee = require("../models/Employee");

// GET unread count for a participant
router.get("/courses/unread-count", async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const count = await CourseNotification.countDocuments({
      notificationType: "new-course",
      viewedBy: { $ne: null, $not: { $elemMatch: { employeeId: employeeId } } }
    });

    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

// GET new course notifications for a participant
router.get("/courses", async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const notifications = await CourseNotification.find({
      notificationType: "new-course"
    })
      .sort({ createdAt: -1 })
      .lean();

    const notificationsWithViewedStatus = notifications.map((notification) => {
      const viewed = notification.viewedBy?.some(
        (v) => v.employeeId && v.employeeId.toString() === employeeId
      );
      return {
        _id: notification._id,
        subjectName: notification.subjectName,
        createdAt: notification.createdAt,
        notificationType: notification.notificationType,
        viewed
      };
    });

    res.json({ notifications: notificationsWithViewedStatus });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// MARK single notification as viewed
router.post("/courses/:id/view", async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required" });
    }

    const notification = await CourseNotification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const alreadyViewed = notification.viewedBy?.some(
      (v) => v.employeeId && v.employeeId.toString() === employeeId
    );

    if (!alreadyViewed) {
      notification.viewedBy.push({ employeeId });
      await notification.save();
    }

    res.json({ success: true, message: "Marked as viewed" });
  } catch (error) {
    console.error("Error marking notification as viewed:", error);
    res.status(500).json({ message: "Failed to mark notification as viewed" });
  }
});

// MARK all notifications as viewed for a participant
router.post("/courses/view-all", async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const notifications = await CourseNotification.find({
      notificationType: "new-course"
    });

    for (const notification of notifications) {
      const alreadyViewed = notification.viewedBy?.some(
        (v) => v.employeeId && v.employeeId.toString() === employeeId
      );
      if (!alreadyViewed) {
        notification.viewedBy.push({ employeeId });
      }
    }

    if (notifications.length > 0) {
      await Promise.all(notifications.map((n) => n.save()));
    }

    res.json({ success: true, message: "All notifications marked as viewed" });
  } catch (error) {
    console.error("Error marking all notifications as viewed:", error);
    res.status(500).json({ message: "Failed to mark all notifications as viewed" });
  }
});

module.exports = router;