import mongoose from "mongoose";
import Course from "../models/Course.js";

export const getAllCourse = async (req, res) => {
  try {
    const courses = await Course.find(
      { isPublished: true, isDeleted: false },
      { courseContent: 0, enrolledStudents: 0 }
    )
      .populate("educator", "name imageUrl")
      .lean();

    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load courses",
    });
  }
};





export const getCourseId = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid course ID",
    });
  }

  try {
    const course = await Course.findOne({
      _id: id,
      isPublished: true,
      isDeleted: false,
    })
      .populate("educator", "name imageUrl")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const sanitizedContent = course.courseContent.map(chapter => ({
      ...chapter,
      chapterContent: chapter.chapterContent.map(lecture => ({
        ...lecture,
        lectureUrl: lecture.isPreviewFree ? lecture.lectureUrl : "",
      })),
    }));

    res.status(200).json({
      success: true,
      courseData: {
        ...course,
        courseContent: sanitizedContent,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load course",
    });
  }
};
