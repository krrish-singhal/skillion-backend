import Certificate from '../models/Certificate.js';
import Course from '../models/Course.js';
import { CourseProgress } from '../models/CourseProgress.js';

// Generate certificate ID
const generateCertificateId = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `SKL-${year}-${random}`;
};

// Generate certificate when course is completed
export const generateCertificate = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId } = req.body;

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ userId, courseId });
    if (existingCertificate) {
      return res.status(200).json({
        success: true,
        message: 'Certificate already exists',
        data: existingCertificate
      });
    }

    // Verify course completion
    const progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress || !progress.completed) {
      return res.status(400).json({
        success: false,
        message: 'Course not completed yet'
      });
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Calculate total lectures and duration
    let totalLectures = 0;
    let totalDuration = 0;
    course.courseContent.forEach(chapter => {
      chapter.chapterContent.forEach(lecture => {
        if (!lecture.isAssignment && !lecture.isProject) {
          totalLectures++;
          totalDuration += lecture.lectureDuration || 0;
        }
      });
    });

    // Get user info from progress
    const userName = progress.userName || 'Student';

    // Create certificate
    const certificate = new Certificate({
      userId,
      userName,
      courseId,
      courseTitle: course.courseTitle,
      courseThumbnail: course.courseThumbnail,
      certificateId: generateCertificateId(),
      totalLectures,
      totalDuration
    });

    await certificate.save();

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: certificate
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate',
      error: error.message
    });
  }
};

// Get user's certificates
export const getUserCertificates = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const certificates = await Certificate.find({ userId })
      .sort({ completionDate: -1 })
      .populate('courseId', 'courseTitle courseThumbnail');

    res.status(200).json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
};

// Get certificate by ID
export const getCertificateById = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate('courseId', 'courseTitle courseThumbnail');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.status(200).json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate',
      error: error.message
    });
  }
};

// Verify certificate
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate('courseId', 'courseTitle');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Certificate not found'
      });
    }

    res.status(200).json({
      success: true,
      verified: true,
      data: {
        certificateId: certificate.certificateId,
        userName: certificate.userName,
        courseTitle: certificate.courseTitle,
        completionDate: certificate.completionDate
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
};
