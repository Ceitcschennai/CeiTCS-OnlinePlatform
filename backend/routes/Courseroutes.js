const express = require("express");
const router = express.Router();

const Course = require("../models/Course");

const generateCourseCode = async (courseName) => {

  const cleanedName = courseName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  const prefix =
    cleanedName.length >= 4
      ? cleanedName.substring(0, 4)
      : cleanedName || "CRS";

  // Find all courses with same prefix
  const courses = await Course.find({
    courseCode: {
      $regex: `^${prefix}`,
      $options: "i" 
    }
  }).select("courseCode");

  let maxNumber = 0;

  courses.forEach(course => {
    const number = parseInt(
      course.courseCode.replace(prefix, "")
    );

    if (!isNaN(number) && number > maxNumber) {
      maxNumber = number;
    }
  });

  const nextNumber = maxNumber + 1;

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};


// @route   GET /api/courses
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { courseName: { $regex: search, $options: 'i' } },
        { courseCode: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Course.countDocuments(query);

    res.json({
      courses,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalCourses: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});


const Teacher = require("../models/Teacher");

router.post("/", async (req, res) => {
  try {

    const courseCode = await generateCourseCode(
      req.body.courseName
    );

    const course = new Course({
      ...req.body,
      courseCode
    });

    await course.save();

    // Push course into faculty
    if (course.facultyId) {

      await Teacher.findByIdAndUpdate(
        course.facultyId,
        {
          $addToSet: {
            assignedCourses: {
              courseId: course._id,
              courseCode: course.courseCode
            }
          }
        }
      );

    }

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      course
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: error.message
    });

  }
});


router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId).maxTimeMS(8000);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    

    const assignedCourseCodes =
      teacher.assignedCourses
        ? teacher.assignedCourses
            .map(course => String(course?.courseCode || '').trim())
            .filter(Boolean)
        : [];

    const courses = await Course.find({
      courseCode: { $in: assignedCourseCodes },
      isActive: true
    }).maxTimeMS(8000);

    res.json({
      success: true,
      courses
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// UPDATE COURSE
router.put("/:id", async (req, res) => {
  try {

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      course
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


router.delete("/:id", async (req, res) => {
  try {

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found"
      });
    }

    // Remove course from teacher
    if (course.facultyId) {

      await Teacher.findByIdAndUpdate(
        course.facultyId,
        {
          $pull: {
            assignedCourses: {
              courseId: course._id,
              courseCode: course.courseCode
            }
          }
        }
      );

    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Course deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
});


router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found"
      });
    }

    course.isActive = !course.isActive;
    await course.save();

    res.json({
      success: true,
      message: `Course ${
        course.isActive ? "activated" : "deactivated"
      } successfully`
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});



module.exports = router;