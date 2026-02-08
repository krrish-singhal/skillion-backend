import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import mongoose from "mongoose";
import SkillTracker from "../models/SkillTracker.js";

import dotenv from "dotenv";
dotenv.config();
import Stripe from "stripe";
import { CourseProgress } from "../models/CourseProgress.js";
import Badge from "../models/Badge.js";
import Certificate from "../models/Certificate.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.log("Stripe Secret Key Not found");
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;




export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    console.log("Fetching user data for userId:", userId);

    let user = await User.findById(
      userId,
      { name: 1, imageUrl: 1, enrolledCourses: 1, role: 1 }
    ).lean();

    if (!user) {
      console.log("User not found in DB, fetching from Clerk and creating...");
      
      // Fetch user from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      
      // Determine role from Clerk's publicMetadata
      const role = clerkUser.publicMetadata?.role === 'educator' ? 'educator' : 'user';
      
      // Create user in MongoDB
      user = await User.create({
        _id: userId,
        name: {
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName || ''
        },
        email: clerkUser.emailAddresses[0].emailAddress,
        imageUrl: clerkUser.imageUrl,
        role: role,
        enrolledCourses: []
      });
      
      console.log("User created successfully:", userId);
    }

    res.status(200).json({
      success: true,
      user: {
        name: user.name,
        imageUrl: user.imageUrl,
        role: user.role || 'user',
        enrolledCourses: user.enrolledCourses
      }
    });
  } catch (error) {
    console.error("Error in getUserData:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user data",
      error: error.message
    });
  }
};

export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;

    let user = await User.findById(userId)
      .populate({
        path: "enrolledCourses",
        select: "courseTitle courseThumbnail educator courseContent coursePrice discount",
        populate: {
          path: "educator",
          select: "name imageUrl",
        },
      })
      .lean();

    if (!user) {
      console.log("User not found in DB for enrolled courses, fetching from Clerk...");
      
      // Fetch user from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      
      // Determine role from Clerk's publicMetadata
      const role = clerkUser.publicMetadata?.role === 'educator' ? 'educator' : 'user';
      
      // Create user in MongoDB
      user = await User.create({
        _id: userId,
        name: {
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName || ''
        },
        email: clerkUser.emailAddresses[0].emailAddress,
        imageUrl: clerkUser.imageUrl,
        role: role,
        enrolledCourses: []
      });
      
      console.log("User created successfully:", userId);
    }

    // Filter out null courses (in case some were deleted from database)
    const validEnrolledCourses = (user.enrolledCourses || []).filter(course => course !== null);
    
    console.log(`Enrolled courses for user ${userId}:`, validEnrolledCourses.length);

    res.status(200).json({
      success: true,
      enrolledCourses: validEnrolledCourses,
    });
  } catch (error) {
    console.error("Error in userEnrolledCourses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load enrolled courses",
      error: error.message
    });
  }
};

export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.auth.userId;

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Payment system is not configured. Please contact support.",
      });
    }

    let user = await User.findById(userId);
    
    // If user doesn't exist in DB, create from Clerk data
    if (!user) {
      console.log("User not found in DB for purchase, fetching from Clerk...");
      const clerkUser = await clerkClient.users.getUser(userId);
      
      // Determine role from Clerk's publicMetadata
      const role = clerkUser.publicMetadata?.role === 'educator' ? 'educator' : 'user';
      
      user = await User.create({
        _id: userId,
        name: {
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName || ''
        },
        email: clerkUser.emailAddresses[0].emailAddress,
        imageUrl: clerkUser.imageUrl,
        role: role,
        enrolledCourses: []
      });
      
      console.log("User created successfully for purchase:", userId);
    }
    
    const course = await Course.findOne({
      _id: courseId,
      isPublished: true,
      isDeleted: false,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const discountedAmount =
      course.coursePrice -
      (course.coursePrice * course.discount) / 100;

    if (discountedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid course price",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/course-list`,
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY.toLowerCase(),
            product_data: {
              name: course.courseTitle,
              description: course.courseDescription ? 
                course.courseDescription.replace(/<[^>]*>/g, '').substring(0, 200) : 
                'Learn from the best',
              images: course.courseThumbnail ? [course.courseThumbnail] : [],
            },
            unit_amount: Math.round(discountedAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        courseId: course._id.toString(),
        userId: userId,
      },
    });

    await Purchase.create({
      courseId: course._id,
      userId,
      amount: Number(discountedAmount.toFixed(2)),
      currency: process.env.CURRENCY,
      paymentProvider: "stripe",
      paymentIntentId: session.id,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      session_url: session.url,
    });
  } catch (error) {
    console.error("Error in purchaseCourse:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate purchase",
      error: error.message
    });
  }
};

export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !lectureId) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId or lectureId",
      });
    }

    const course = await Course.findById(courseId, { courseContent: 1, courseTitle: 1 }).lean();
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const totalLectures = course.courseContent.reduce(
      (sum, chapter) => sum + chapter.chapterContent.length,
      0
    );

    const progress = await CourseProgress.findOneAndUpdate(
      { userId, courseId },
      {
        $addToSet: {
          lecturesCompleted: { lectureId },
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    const completedLectures = progress.lecturesCompleted.length;

    const progressPercent = Math.round(
      (completedLectures / totalLectures) * 100
    );

    const wasCompleted = progress.completed;
    progress.progressPercent = progressPercent;
    progress.completed = progressPercent === 100;

    await progress.save();

    // Award badge if course just became completed OR if it's at 100% but has no badge
    if (progress.completed && (!wasCompleted || progressPercent === 100)) {
      try {
        const courseName = course.courseTitle || 'Course';
        console.log(`[Badge Award] Course at 100%: "${courseName}"`);
        
        // Check if badge already exists
        const existingBadge = await Badge.findOne({ userId, courseId });
        
        if (!existingBadge) {
          console.log(`[Badge Award] No existing badge, creating new one...`);
          const badge = await Badge.generateBadge(userId, courseId, courseName);
          console.log(`[Badge Award] Badge generated:`, badge ? badge.badgeName : 'No badge created');
          
          // Auto-complete skill in tracker if badge earned
          if (badge) {
            const skillTracker = await SkillTracker.findOne({ userId });
            if (skillTracker) {
              console.log(`[Skill Tracker] Found tracker for user, attempting auto-complete with badge: "${badge.badgeName}"`);
              const skillCompleted = await skillTracker.autoCompleteSkill(badge.badgeName, badge._id);
              console.log(`[Skill Tracker] Auto-complete result:`, skillCompleted);
            } else {
              console.log(`[Skill Tracker] No tracker found for user ${userId}`);
            }
          }
        } else {
          console.log(`[Badge Award] Badge already exists: ${existingBadge.badgeName}`);
        }

        // Generate certificate if not already generated
        const existingCertificate = await Certificate.findOne({ userId, courseId });
        if (!existingCertificate) {
          console.log(`[Certificate] Generating certificate for completed course...`);
          
          // Get user info
          const user = await User.findOne({ clerkUserId: userId });
          const userName = user?.name ? `${user.name.firstName} ${user.name.lastName || ''}`.trim() : 'Student';
          
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

          const certificate = new Certificate({
            userId,
            userName,
            courseId,
            courseTitle: courseName,
            courseThumbnail: course.courseThumbnail,
            certificateId: `SKL-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            totalLectures,
            totalDuration
          });

          await certificate.save();
          console.log(`[Certificate] Certificate generated: ${certificate.certificateId}`);
        } else {
          console.log(`[Certificate] Certificate already exists: ${existingCertificate.certificateId}`);
        }
      } catch (badgeError) {
        console.error('Error generating badge, certificate, or completing skill:', badgeError);
        // Don't fail the request if badge/certificate generation fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Progress updated",
      progressPercent,
      completed: progress.completed,
      badgeAwarded: progress.completed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update progress",
    });
  }
};

export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId",
      });
    }

    const progressData = await CourseProgress.findOne(
      { userId, courseId },
      { _id: 0, lecturesCompleted: 1, progressPercent: 1, completed: 1 }
    ).lean();

    res.status(200).json({
      success: true,
      progressData: progressData || {
        lecturesCompleted: [],
        progressPercent: 0,
        completed: false,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch progress",
    });
  }
};

export const addUserRating = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, rating } = req.body;

    // 1. Validate input
    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      typeof rating !== "number" ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId or rating",
      });
    }

    
    const user = await User.findOne(
      { _id: userId, enrolledCourses: courseId },
      { _id: 1 }
    ).lean();

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "User has not purchased this course",
      });
    }

    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const existingRatingIndex = course.courseRatings.findIndex(
      r => r.userId === userId
    );

    if (existingRatingIndex !== -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      course.courseRatings.push({ userId, rating });
    }

    
    const totalRatings = course.courseRatings.length;
    const averageRating =
      course.courseRatings.reduce((sum, r) => sum + r.rating, 0) /
      totalRatings;

    course.averageRating = Number(averageRating.toFixed(2));
    course.totalRatings = totalRatings;

    await course.save();

    res.status(200).json({
      success: true,
      message: "Rating saved successfully",
      averageRating: course.averageRating,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit rating",
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.auth.userId;

    console.log("=== PAYMENT VERIFICATION ===");
    console.log("Session ID:", sessionId);
    console.log("User ID:", userId);

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Payment system is not configured",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("Stripe session status:", session.payment_status);
    console.log("Stripe session metadata:", session.metadata);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
      });
    }

    const { courseId, userId: sessionUserId } = session.metadata;

    // Verify the user matches
    if (sessionUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // Check if already enrolled
    const user = await User.findById(userId);
    const isAlreadyEnrolled = user.enrolledCourses.includes(courseId);

    if (isAlreadyEnrolled) {
      console.log("User already enrolled");
      return res.status(200).json({
        success: true,
        message: "Already enrolled in this course",
      });
    }

    // Start transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Update purchase status
      await Purchase.updateOne(
        { paymentIntentId: sessionId },
        { status: "completed" },
        { session: dbSession }
      );
      console.log("Purchase status updated");

      // Add course to user's enrolledCourses
      await User.updateOne(
        { _id: userId },
        { $addToSet: { enrolledCourses: courseId } },
        { session: dbSession }
      );
      console.log("Course added to user enrollments");

      // Add user to course's enrolledStudents
      await Course.updateOne(
        { _id: courseId },
        { $addToSet: { enrolledStudents: userId } },
        { session: dbSession }
      );
      console.log("User added to course students");

      await dbSession.commitTransaction();
      await dbSession.endSession();

      console.log("Payment verification successful");

      res.status(200).json({
        success: true,
        message: "Enrollment successful",
      });
    } catch (error) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message
    });
  }
};


