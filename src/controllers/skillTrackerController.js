import SkillTracker from '../models/SkillTracker.js';
import Badge from '../models/Badge.js';
import { Purchase } from '../models/Purchase.js';
import Course from '../models/Course.js';
import { uploadOnCloudinary } from '../config/cloudinary.js';

// Check if user has enrolled courses
const checkEnrollment = async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    const enrolledCourses = await Purchase.countDocuments({ userId });
    
    res.status(200).json({
      success: true,
      hasEnrollment: enrolledCourses > 0,
      enrollmentCount: enrolledCourses
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check enrollment status'
    });
  }
};

// Create or update skill tracker
const createSkillTracker = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      careerGoal,
      careerGoalLabel,
      currentSkillLevel,
      learningIntensity,
      goalTimeline,
      existingKnowledge
    } = req.body;

    // Validate required fields
    if (!careerGoal || !careerGoalLabel || !currentSkillLevel) {
      return res.status(400).json({
        success: false,
        message: 'Career goal and skill level are required'
      });
    }

    // Check if user has enrolled courses
    const enrolledCourses = await Purchase.countDocuments({ userId });
    if (enrolledCourses === 0) {
      return res.status(403).json({
        success: false,
        message: 'Please enroll in at least one course to use the Skill Tracker'
      });
    }

    // Check if tracker already exists
    let skillTracker = await SkillTracker.findOne({ userId });

    if (skillTracker) {
      // Update existing tracker
      skillTracker.careerGoal = careerGoal;
      skillTracker.careerGoalLabel = careerGoalLabel;
      skillTracker.currentSkillLevel = currentSkillLevel;
      skillTracker.learningIntensity = learningIntensity;
      skillTracker.goalTimeline = goalTimeline;
      skillTracker.existingKnowledge = existingKnowledge || [];
      skillTracker.initializeRoadmap();
      await skillTracker.save();
    } else {
      // Create new tracker
      skillTracker = new SkillTracker({
        userId,
        careerGoal,
        careerGoalLabel,
        currentSkillLevel,
        learningIntensity,
        goalTimeline,
        existingKnowledge: existingKnowledge || []
      });
      skillTracker.initializeRoadmap();
      await skillTracker.save();
    }

    res.status(201).json({
      success: true,
      message: 'Skill tracker created successfully',
      data: skillTracker
    });
  } catch (error) {
    console.error('Error creating skill tracker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create skill tracker'
    });
  }
};

// Get user's skill tracker
const getSkillTracker = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const skillTracker = await SkillTracker.findOne({ userId });

    if (!skillTracker) {
      return res.status(404).json({
        success: false,
        message: 'Skill tracker not found. Please create one first.'
      });
    }

    // Ensure roadmap is properly initialized (fix for corrupted data)
    if (!skillTracker.roadmap || skillTracker.roadmap.length === 0) {
      console.log('Roadmap empty, reinitializing...');
      skillTracker.initializeRoadmap();
      await skillTracker.save();
    }

    // Log roadmap status for debugging
    console.log('Roadmap data:', JSON.stringify({
      careerGoal: skillTracker.careerGoal,
      roadmapLength: skillTracker.roadmap?.length,
      firstSkill: skillTracker.roadmap?.[0]
    }, null, 2));

    res.status(200).json({
      success: true,
      data: skillTracker
    });
  } catch (error) {
    console.error('Error fetching skill tracker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch skill tracker'
    });
  }
};

// Update skill progress
const updateSkillProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { skillName, progress } = req.body;

    if (!skillName || progress === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Skill name and progress are required'
      });
    }

    const skillTracker = await SkillTracker.findOne({ userId });

    if (!skillTracker) {
      return res.status(404).json({
        success: false,
        message: 'Skill tracker not found'
      });
    }

    skillTracker.updateProgress(skillName, progress);
    await skillTracker.save();

    res.status(200).json({
      success: true,
      message: 'Skill progress updated',
      data: skillTracker
    });
  } catch (error) {
    console.error('Error updating skill progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update skill progress'
    });
  }
};

// Get user's badges
const getUserBadges = async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[Get Badges] Fetching badges for user: ${userId}`);

    const badges = await Badge.find({ userId })
      .populate('courseId', 'courseTitle courseThumbnail')
      .sort({ earnedAt: -1 });

    console.log(`[Get Badges] Found ${badges.length} badges for user ${userId}`);
    console.log(`[Get Badges] Badge details:`, badges.map(b => ({ name: b.badgeName, course: b.courseName })));

    res.status(200).json({
      success: true,
      count: badges.length,
      data: badges
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badges'
    });
  }
};

// Mark skill as complete with proof
const markSkillComplete = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { skillName, source, sourceDescription, proofImageUrl } = req.body;

    if (!skillName || !source) {
      return res.status(400).json({
        success: false,
        message: 'Skill name and source are required'
      });
    }

    // Validate source-specific requirements
    if (source === 'skillion' && !proofImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Proof image is mandatory for Skillion completions'
      });
    }

    const skillTracker = await SkillTracker.findOne({ userId });

    if (!skillTracker) {
      return res.status(404).json({
        success: false,
        message: 'Skill tracker not found'
      });
    }

    // Check if skill exists and is unlocked
    const skill = skillTracker.roadmap.find(s => s.name === skillName);
    if (!skill) {
      return res.status(404).json({
        success: false,
        message: 'Skill not found in roadmap'
      });
    }

    if (skill.status === 'locked') {
      return res.status(403).json({
        success: false,
        message: 'Please complete previous skills first'
      });
    }

    if (skill.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Skill already completed'
      });
    }

    // Check if user has a badge for this skill (reuse existing badge)
    let existingBadge = null;
    if (source === 'skillion') {
      // Try to find a badge that matches the skill name
      existingBadge = await Badge.findOne({
        userId,
        $or: [
          { courseName: new RegExp(skillName, 'i') },
          { badgeName: new RegExp(skillName, 'i') }
        ]
      });
    }

    // Mark skill as complete
    await skillTracker.markSkillComplete(
      skillName,
      source,
      sourceDescription,
      proofImageUrl,
      existingBadge?._id
    );

    res.status(200).json({
      success: true,
      message: 'Skill marked as complete',
      data: skillTracker,
      badgeReused: !!existingBadge,
      badge: existingBadge
    });
  } catch (error) {
    console.error('Error marking skill complete:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark skill as complete'
    });
  }
};

// Upload proof image
const uploadProofImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const result = await uploadOnCloudinary(req.file.path);

    res.status(200).json({
      success: true,
      imageUrl: result.secure_url
    });
  } catch (error) {
    console.error('Error uploading proof image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Get skill tracker
    const skillTracker = await SkillTracker.findOne({ userId });
    
    console.log('[Dashboard Stats] Roadmap from DB:', skillTracker?.roadmap?.map(s => ({ name: s.name, status: s.status })));
    
    // Get badges count
    const badgesCount = await Badge.countDocuments({ userId });
    
    // Get actual enrolled courses count from Purchase collection
    const enrolledCoursesCount = await Purchase.countDocuments({ userId });

    // Count completed skills from roadmap status, not completedSkills array
    const completedSkillsCount = skillTracker?.roadmap?.filter(s => s.status === 'completed').length || 0;
    
    console.log('[Dashboard Stats] Completed skills count:', completedSkillsCount, '/', skillTracker?.roadmap?.length);

    res.status(200).json({
      success: true,
      data: {
        overallProgress: skillTracker?.overallProgress || 0,
        completedSkills: completedSkillsCount,
        totalSkills: skillTracker?.roadmap?.length || 0,
        badges: badgesCount,
        enrolledCourses: enrolledCoursesCount,
        careerGoal: skillTracker?.careerGoalLabel || 'Not set',
        isCompleted: skillTracker?.isCompleted || false,
        verificationId: skillTracker?.verificationId || null
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
};

// Get available knowledge options based on career goal
const getKnowledgeOptions = async (req, res) => {
  try {
    const { careerGoal } = req.query;

    const knowledgeOptions = {
      frontend: ['HTML', 'CSS', 'JavaScript', 'React', 'Git & GitHub', 'UI/UX', 'Next.js'],
      backend: ['HTML & CSS', 'JavaScript', 'Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'Git'],
      fullstack: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Express.js', 'MongoDB', 'Git'],
      dataanalyst: ['Python', 'Excel', 'SQL', 'Statistics', 'Data Visualization'],
      datascientist: ['Python', 'Statistics', 'Machine Learning', 'Data Analysis', 'Mathematics'],
      cybersecurity: ['Networking', 'Linux', 'Windows', 'Web Security', 'Security Tools'],
      custom: []
    };

    res.status(200).json({
      success: true,
      options: knowledgeOptions[careerGoal] || []
    });
  } catch (error) {
    console.error('Error fetching knowledge options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch knowledge options'
    });
  }
};

// Update all existing badges with official logos
const updateBadgeLogos = async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    const badges = await Badge.find({ userId });
    console.log(`[Update Badge Logos] Found ${badges.length} badges to update`);

    const badgeLogoMap = {
      html: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
      css: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
      javascript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
      react: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
      node: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
      python: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
      java: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
      typescript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
      tailwind: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg',
      express: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg',
      mongodb: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
    };

    let updated = 0;

    for (const badge of badges) {
      const courseName = badge.courseName.toLowerCase();
      let logoUrl = null;

      // Find matching logo
      for (const [key, url] of Object.entries(badgeLogoMap)) {
        if (courseName.includes(key)) {
          logoUrl = url;
          break;
        }
      }

      if (logoUrl && !badge.badgeIcon.startsWith('http')) {
        badge.badgeIcon = logoUrl;
        await badge.save();
        updated++;
        console.log(`[Update Badge Logos] Updated badge: ${badge.badgeName}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated ${updated} badges with official logos`,
      data: {
        totalBadges: badges.length,
        updated
      }
    });
  } catch (error) {
    console.error('[Update Badge Logos] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update badge logos',
      error: error.message
    });
  }
};

// Force refresh tracker to unlock all skills and sync badges
const refreshTracker = async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[Refresh Tracker] Starting for user: ${userId}`);
    
    const tracker = await SkillTracker.findOne({ userId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: 'Skill tracker not found'
      });
    }

    console.log(`[Refresh Tracker] Current roadmap:`, tracker.roadmap.map(s => ({ name: s.name, status: s.status })));

    // Unlock all skills in roadmap
    if (tracker.roadmap && Array.isArray(tracker.roadmap)) {
      tracker.roadmap.forEach(skill => {
        if (skill.status === 'locked') {
          skill.status = 'unlocked';
          console.log(`[Refresh Tracker] Unlocked skill: ${skill.name}`);
        }
      });
    }

    await tracker.save();
    console.log(`[Refresh Tracker] Saved unlocked skills`);

    // Get all user badges and auto-complete matching skills
    const badges = await Badge.find({ userId });
    console.log(`[Refresh Tracker] Found ${badges.length} badges:`, badges.map(b => b.badgeName));

    let completedCount = 0;
    for (const badge of badges) {
      console.log(`[Refresh Tracker] Processing badge: "${badge.badgeName}"`);
      const completed = await tracker.autoCompleteSkill(badge.badgeName, badge._id);
      if (completed) {
        completedCount++;
        console.log(`[Refresh Tracker] Successfully completed skill for badge: ${badge.badgeName}`);
      }
    }

    console.log(`[Refresh Tracker] Completed ${completedCount} skills`);

    // Use the current tracker object (already has all changes saved)
    // Converting to plain object for JSON response
    const trackerObj = tracker.toObject();
    
    console.log(`[Refresh Tracker] Final roadmap state:`, trackerObj.roadmap.map(s => ({ name: s.name, status: s.status, progress: s.progress })));

    res.status(200).json({
      success: true,
      message: 'Tracker refreshed successfully',
      data: {
        unlockedSkills: trackerObj.roadmap.length,
        badgesProcessed: badges.length,
        skillsCompleted: completedCount,
        tracker: trackerObj
      }
    });
  } catch (error) {
    console.error('[Refresh Tracker] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh tracker'
    });
  }
};

// Force create badge for enrolled course (manual fix)
const forceCreateBadgeForCourse = async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[Force Create Badge] Starting for user: ${userId}`);

    // Get all enrolled courses
    const enrollments = await Purchase.find({ userId }).populate('courseId');
    console.log(`[Force Create Badge] Found ${enrollments.length} enrolled courses`);

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No enrolled courses found'
      });
    }

    const results = [];

    for (const enrollment of enrollments) {
      const course = enrollment.courseId;
      if (!course) continue;

      const courseId = course._id;
      const courseName = course.courseTitle;
      
      console.log(`[Force Create Badge] Processing: "${courseName}"`);

      // Import CourseProgress
      const { CourseProgress } = await import('../models/CourseProgress.js');

      // Check if progress exists
      let progress = await CourseProgress.findOne({ userId, courseId });
      
      if (!progress) {
        console.log(`[Force Create Badge] No progress found, creating as completed...`);
        
        // Get all lecture IDs from course
        const lectureIds = [];
        if (course.courseContent && Array.isArray(course.courseContent)) {
          course.courseContent.forEach(section => {
            if (section.lectures && Array.isArray(section.lectures)) {
              section.lectures.forEach(lecture => {
                lectureIds.push({ lectureId: lecture._id.toString() });
              });
            }
          });
        }

        // Create progress record with 100% completion
        progress = await CourseProgress.create({
          userId,
          courseId,
          lecturesCompleted: lectureIds,
          progressPercent: 100,
          completed: true
        });
        
        console.log(`[Force Create Badge] Created progress with ${lectureIds.length} lectures`);
      } else {
        console.log(`[Force Create Badge] Progress exists: ${progress.progressPercent}%`);
        
        // Update to 100% if needed
        if (progress.progressPercent !== 100) {
          const lectureIds = [];
          if (course.courseContent && Array.isArray(course.courseContent)) {
            course.courseContent.forEach(section => {
              if (section.lectures && Array.isArray(section.lectures)) {
                section.lectures.forEach(lecture => {
                  lectureIds.push({ lectureId: lecture._id.toString() });
                });
              }
            });
          }
          
          progress.lecturesCompleted = lectureIds;
          progress.progressPercent = 100;
          progress.completed = true;
          await progress.save();
          console.log(`[Force Create Badge] Updated progress to 100%`);
        }
      }

      // Check if badge exists
      const existingBadge = await Badge.findOne({ userId, courseId });
      
      if (existingBadge) {
        console.log(`[Force Create Badge] Badge already exists`);
        results.push({
          course: courseName,
          status: 'badge_already_exists',
          badge: existingBadge.badgeName
        });
      } else {
        // Generate badge
        const badge = await Badge.generateBadge(userId, courseId, courseName);
        console.log(`[Force Create Badge] Badge created: ${badge.badgeName}`);
        
        results.push({
          course: courseName,
          status: 'badge_created',
          badge: badge.badgeName
        });

        // Auto-complete skill
        const skillTracker = await SkillTracker.findOne({ userId });
        if (skillTracker) {
          await skillTracker.autoCompleteSkill(badge.badgeName, badge._id);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Force badge creation completed',
      data: {
        processedCourses: enrollments.length,
        results
      }
    });
  } catch (error) {
    console.error('[Force Create Badge] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to force create badges',
      error: error.message
    });
  }
};

// Generate badges for all completed courses (retroactive)
const generateMissingBadges = async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[Generate Missing Badges] Starting for user: ${userId}`);

    // Import CourseProgress model
    const { CourseProgress } = await import('../models/CourseProgress.js');

    // First, let's debug what progress data exists
    const allProgress = await CourseProgress.find({ userId }).populate('courseId');
    console.log(`[Generate Missing Badges] Total progress records: ${allProgress.length}`);
    
    for (const prog of allProgress) {
      console.log(`[Generate Missing Badges] Progress for "${prog.courseId?.courseTitle}":`, {
        progressPercent: prog.progressPercent,
        completed: prog.completed,
        lecturesCompleted: prog.lecturesCompleted?.length
      });
    }

    // Find all courses with 100% progress OR completed flag
    const completedCourses = await CourseProgress.find({
      userId,
      $or: [
        { completed: true },
        { progressPercent: 100 }
      ]
    }).populate('courseId');

    console.log(`[Generate Missing Badges] Found ${completedCourses.length} completed courses`);
    
    // Also update the completed flag if it's not set
    for (const progress of completedCourses) {
      if (progress.progressPercent === 100 && !progress.completed) {
        console.log(`[Generate Missing Badges] Updating completed flag for course`);
        progress.completed = true;
        await progress.save();
      }
    }

    let badgesCreated = 0;
    let badgesExisted = 0;
    const results = [];

    for (const progress of completedCourses) {
      if (!progress.courseId) {
        console.log(`[Generate Missing Badges] Skipping progress with no courseId`);
        continue;
      }

      const courseId = progress.courseId._id;
      const courseName = progress.courseId.courseTitle;

      console.log(`[Generate Missing Badges] Processing: "${courseName}"`);

      // Check if badge already exists
      const existingBadge = await Badge.findOne({ userId, courseId });
      
      if (existingBadge) {
        console.log(`[Generate Missing Badges] Badge already exists for "${courseName}"`);
        badgesExisted++;
        results.push({
          course: courseName,
          status: 'already_exists',
          badge: existingBadge.badgeName
        });
      } else {
        // Generate new badge
        const badge = await Badge.generateBadge(userId, courseId, courseName);
        console.log(`[Generate Missing Badges] Created badge for "${courseName}"`);
        badgesCreated++;
        results.push({
          course: courseName,
          status: 'created',
          badge: badge.badgeName
        });

        // Auto-complete skill in tracker
        const skillTracker = await SkillTracker.findOne({ userId });
        if (skillTracker) {
          await skillTracker.autoCompleteSkill(badge.badgeName, badge._id);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Generated ${badgesCreated} new badges, ${badgesExisted} already existed`,
      data: {
        totalProgress: allProgress.length,
        completedCourses: completedCourses.length,
        badgesCreated,
        badgesExisted,
        details: results
      }
    });
  } catch (error) {
    console.error('[Generate Missing Badges] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate missing badges',
      error: error.message
    });
  }
};

// Sync existing badges with skill tracker (for retroactive completion)
const syncExistingBadges = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const skillTracker = await SkillTracker.findOne({ userId });
    if (!skillTracker) {
      return res.status(404).json({
        success: false,
        message: 'Skill tracker not found'
      });
    }

    // Get all user badges
    const badges = await Badge.find({ userId });
    
    let completedCount = 0;
    const results = [];

    for (const badge of badges) {
      console.log(`[Sync] Processing badge: ${badge.badgeName}`);
      const completed = await skillTracker.autoCompleteSkill(badge.badgeName, badge._id);
      if (completed) {
        completedCount++;
        results.push({
          badge: badge.badgeName,
          skillCompleted: true
        });
      } else {
        results.push({
          badge: badge.badgeName,
          skillCompleted: false,
          reason: 'No matching skill or already completed'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Synced ${completedCount} skills from existing badges`,
      data: {
        totalBadges: badges.length,
        skillsCompleted: completedCount,
        details: results,
        tracker: skillTracker
      }
    });
  } catch (error) {
    console.error('Error syncing badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync badges'
    });
  }
};

export {
  checkEnrollment,
  createSkillTracker,
  getSkillTracker,
  updateSkillProgress,
  getUserBadges,
  getDashboardStats,
  getKnowledgeOptions,
  markSkillComplete,
  uploadProofImage,
  syncExistingBadges,
  generateMissingBadges,
  forceCreateBadgeForCourse,
  refreshTracker,
  updateBadgeLogos
};
