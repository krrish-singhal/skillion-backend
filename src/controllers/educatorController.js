import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import { Purchase } from "../models/Purchase.js";

export const updateRoleToEducator = async (req, res) => {
  try {
    const { userId } = req.auth;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    console.log("Updating user role for:", userId);

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    // Fetch the updated user and return it for debugging
    const updatedUser = await clerkClient.users.getUser(userId);
    console.log("Updated user publicMetadata:", updatedUser.publicMetadata);

    res.json({
      success: true,
      message: "You can publish courses as a educator",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    console.log("=== ADD COURSE REQUEST ===");
    console.log("Educator ID:", educatorId);
    console.log("Image file:", imageFile ? "Present" : "Missing");

    if (!imageFile) {
      return res.json({
        success: false,
        message: "Thumbnail Not Attached",
      });
    }

    const parsedCourseData = JSON.parse(courseData);
    parsedCourseData.educator = educatorId;
    parsedCourseData.isPublished = true; // Auto-publish new courses

    console.log("Course data to save:", JSON.stringify(parsedCourseData, null, 2));

    const newCourse = await Course.create(parsedCourseData);
    console.log("Course created in DB:", newCourse._id);

    const imageUpload = await cloudinary.uploader.upload(imageFile.path);
    newCourse.courseThumbnail = imageUpload.secure_url;
    await newCourse.save();

    console.log("Course saved successfully with thumbnail");

    res.json({
      success: true,
      message: "Course Added Successfully",
      course: newCourse,
    });
  } catch (error) {
    console.error("Error adding course:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCourseData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({ 
      educator,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });

    res.json({
      success: true,
      courses,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find(
      {
        educator: educator,
        isDeleted: false,
      },
      {
        _id: 1,
        courseTitle: 1,
      },
    );
    const totalCourses = courses.length;
    const courseIds = courses.map((c) => c._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    })
      .populate("userId", "name imageUrl")
      .populate("courseId", "courseTitle")
      .lean();

    let totalEarnings = 0;
    const enrolledStudentsData = purchases.map((purchase) => {
      totalEarnings += purchase.amount;
      return {
        student: purchase.userId,
        courseTitle: purchase.courseId.courseTitle,
        purchaseDate: purchase.createdAt,
      };
    });
    res.status(200).json({
      success: true,
      dashboardData: {
        totalCourses,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        enrolledStudentsData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load educator dashboard",
    });
  }
};


export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educatorId = req.auth.userId;

    const courses = await Course.find(
      { educator: educatorId, isDeleted: false },
      { _id: 1 }
    );

    const courseIds = courses.map(course => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    })
      .populate("userId", "name imageUrl")
      .populate("courseId", "courseTitle")
      .lean();

    const enrolledStudents = purchases.map(purchase => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    res.status(200).json({ success: true, enrolledStudents });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load enrolled students",
    });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const educatorId = req.auth.userId;

    console.log("=== DELETE COURSE REQUEST ===");
    console.log("Course ID:", courseId);
    console.log("Educator ID:", educatorId);

    // Find the course and verify ownership
    const course = await Course.findOne({
      _id: courseId,
      educator: educatorId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you don't have permission to delete it",
      });
    }

    // Soft delete - mark as deleted instead of removing from database
    course.isDeleted = true;
    await course.save();

    console.log("Course marked as deleted successfully");

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete course",
    });
  }
};

export const togglePublishStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { isPublished } = req.body;
    const educatorId = req.auth.userId;

    console.log("=== TOGGLE PUBLISH STATUS ===");
    console.log("Course ID:", courseId);
    console.log("Educator ID:", educatorId);
    console.log("New Status:", isPublished);

    // Find the course and verify ownership
    const course = await Course.findOne({
      _id: courseId,
      educator: educatorId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you don't have permission to update it",
      });
    }

    // Update publish status
    course.isPublished = isPublished;
    await course.save();

    console.log(`Course ${isPublished ? 'published' : 'unpublished'} successfully`);

    res.status(200).json({
      success: true,
      message: `Course ${isPublished ? 'published' : 'unpublished'} successfully`,
      course,
    });
  } catch (error) {
    console.error("Error toggling publish status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update course status",
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const educatorId = req.auth.userId;

    const course = await Course.findOne({
      _id: courseId,
      educator: educatorId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you don't have permission to access it",
      });
    }

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course",
    });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    console.log("=== UPDATE COURSE REQUEST ===");
    console.log("Course ID:", courseId);
    console.log("Educator ID:", educatorId);
    console.log("Image file:", imageFile ? "Present" : "Not updated");

    // Find the course and verify ownership
    const course = await Course.findOne({
      _id: courseId,
      educator: educatorId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you don't have permission to update it",
      });
    }

    const parsedCourseData = JSON.parse(courseData);

    // Ensure chapterOrder and lectureOrder are set correctly
    if (parsedCourseData.courseContent) {
      parsedCourseData.courseContent = parsedCourseData.courseContent.map((chapter, chapterIndex) => {
        const updatedChapter = {
          ...chapter,
          chapterOrder: chapter.chapterOrder || chapterIndex + 1
        };
        
        if (updatedChapter.chapterContent) {
          updatedChapter.chapterContent = updatedChapter.chapterContent.map((lecture, lectureIndex) => ({
            ...lecture,
            lectureOrder: lecture.lectureOrder || lectureIndex + 1
          }));
        }
        
        return updatedChapter;
      });
    }

    // Update course fields
    Object.keys(parsedCourseData).forEach((key) => {
      if (key !== 'educator' && key !== '_id') {
        course[key] = parsedCourseData[key];
      }
    });

    // Update thumbnail if new image is provided
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path);
      course.courseThumbnail = imageUpload.secure_url;
    }

    await course.save();

    console.log("Course updated successfully");

    res.json({
      success: true,
      message: "Course Updated Successfully",
      course,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
